"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRightLeft,
  CheckCircle2,
  PauseCircle,
  PhoneCall,
  SkipForward,
  ListChecks,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchWaitingCustomers,
  callNextCustomer,
  completeEntry,
  skipEntry,
  holdEntry,
  callSpecificEntry,
  callQueueRange,
  transferEntry,
  setCurrentCall,
} from "@/lib/QueueSlice";
import { useQueueRoom } from "@/contexts/SocketContext";
import api from "@/utils/axiosInstance";
import type {
  Queue,
  QueueEntryStatus,
  QueuePledgeMatch,
  QueuePledgeService,
} from "@/types/QueueTypes";

const ENTRY_STATUS_META: Record<
  QueueEntryStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  waiting: { label: "Waiting", variant: "outline" },
  standby: { label: "Standby", variant: "secondary" },
  called: { label: "Serving", variant: "default" },
  serving: { label: "Serving", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  skipped: { label: "Skipped", variant: "outline" },
  left: { label: "Left", variant: "outline" },
};

const errorMessage = (error: unknown, fallback: string) =>
  typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : fallback;

export function LiveQueueList({ queue }: { queue: Queue }) {
  const dispatch = useDispatch<AppDispatch>();
  const { data: entries, status } = useSelector(
    (state: RootState) => state.authQueue.waitingCustomers,
  );
  const currentCall = useSelector((state: RootState) => state.authQueue.currentCall);
  const queues = useSelector((state: RootState) => state.authQueue.queues.data);
  const [targetQueueByEntry, setTargetQueueByEntry] = useState<
    Record<string, string>
  >({});
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [selectedPledgeId, setSelectedPledgeId] = useState<string | null>(null);
  const [pledgeSearch, setPledgeSearch] = useState("");
  const [pledgeSearchResults, setPledgeSearchResults] = useState<QueuePledgeMatch[]>([]);
  const [pledgeSearchLoading, setPledgeSearchLoading] = useState(false);
  const [pledgeSearchError, setPledgeSearchError] = useState<string | null>(null);
  const [pledgeName, setPledgeName] = useState("");
  const [pledgePhone, setPledgePhone] = useState("");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [fulfillmentAmount, setFulfillmentAmount] = useState("");
  const [fulfillmentQuantities, setFulfillmentQuantities] = useState<Record<string, string>>({});
  const [pledgeSaving, setPledgeSaving] = useState(false);
  const [pledgeSaveError, setPledgeSaveError] = useState<string | null>(null);
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);
  const [createdService, setCreatedService] = useState<{
    entryId: string;
    service: QueuePledgeService;
  } | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useQueueRoom(queue.id, queue.churchId);

  useEffect(() => {
    dispatch(fetchWaitingCustomers(queue.id));
  }, [dispatch, queue.id]);

  useEffect(() => {
    if (queue.serviceType !== "PLEDGE_CAMPAIGN") return;
    let active = true;
    api
      .get<{
        entry: Partial<QueueEntry> | null;
        service: QueuePledgeService | null;
      }>(`/queues/${queue.id}/current-service`)
      .then(({ data }) => {
        if (!active) return;
        if (data.entry && data.service) {
          dispatch(
            setCurrentCall({
              ...data.entry,
              service: data.service,
            } as QueueEntry),
          );
        } else if (currentCall?.queueId === queue.id) {
          dispatch(setCurrentCall(null));
        }
      })
      .catch((error: any) => {
        if (active) {
          toast.error(
            error.response?.data?.message || "Unable to refresh the current pledge service",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [currentCall?.queueId, dispatch, queue.id, queue.serviceType]);

  const activeCall = currentCall?.queueId === queue.id ? currentCall : null;
  const service =
    activeCall && createdService?.entryId === activeCall.id
      ? createdService.service
      : activeCall?.service || null;
  const allServicePledges = [
    ...(service?.matchedPledges || []),
    ...pledgeSearchResults.filter(
      (result) => !service?.matchedPledges.some((match) => match.id === result.id),
    ),
  ];
  const selectedPledge = allServicePledges.find(
    (pledge) => pledge.id === selectedPledgeId,
  );

  useEffect(() => {
    if (!activeCall) return;
    setSelectedPledgeId(
      activeCall.service?.matchStatus === "SINGLE_MATCH"
        ? activeCall.service.matchedPledges[0]?.id || null
        : null,
    );
    setPledgeSearchResults([]);
    setPledgeSearch(activeCall.customerPhone || activeCall.customerName || "");
    setPledgeSearchError(null);
    setPledgeSaveError(null);
    setFulfillmentError(null);
    setFulfillmentAmount("");
    setFulfillmentQuantities({});
    idempotencyKey.current = null;
    setCreatedService(null);
    setPledgeName(activeCall.customerName);
    setPledgePhone(activeCall.customerPhone || "");
    setPledgeAmount("");
  }, [activeCall?.id]);

  useEffect(() => {
    if (!activeCall || pledgeSearch.trim().length < 3) {
      setPledgeSearchResults([]);
      setPledgeSearchError(null);
      return;
    }
    let active = true;
    setPledgeSearchLoading(true);
    api
      .get<{ pledges: QueuePledgeMatch[] }>(
        `/queues/${queue.id}/pledges/search`,
        { params: { q: pledgeSearch.trim() } },
      )
      .then(({ data }) => {
        if (active) setPledgeSearchResults(data.pledges);
      })
      .catch((error: any) => {
        if (active) {
          setPledgeSearchError(
            error.response?.data?.message || "Unable to search campaign pledges",
          );
        }
      })
      .finally(() => {
        if (active) setPledgeSearchLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeCall?.id, pledgeSearch, queue.id]);

  useEffect(() => {
    if (service?.matchStatus === "NO_MATCH" && pledgeSearchResults.length === 1) {
      setSelectedPledgeId(pledgeSearchResults[0].id);
    }
  }, [pledgeSearchResults, service?.matchStatus]);

  const activeEntries = entries.filter((entry) =>
    ["waiting", "standby", "called", "serving"].includes(entry.status),
  );
  const transferEntries = activeEntries.filter(
    (entry) => entry.entryType === "transfer",
  );
  const regularEntries = activeEntries.filter(
    (entry) => entry.entryType !== "transfer",
  );
  const skippedEntries = entries.filter((entry) => entry.status === "skipped");
  const normalWaiting = regularEntries.some(
    (entry) => entry.status === "waiting",
  );
  const hasActiveEntry = activeEntries.some((entry) =>
    ["called", "serving"].includes(entry.status),
  );
  const waitingCustomersTotalCount = useSelector(
    (state: RootState) => state.authQueue.waitingCustomersTotalCount,
  );
  const waitingCustomersHasMore = useSelector(
    (state: RootState) => state.authQueue.waitingCustomersHasMore,
  );
  const money = (value: string | null, currency = "USD") =>
    value == null
      ? "Not set"
      : Number(value).toLocaleString(undefined, {
          style: "currency",
          currency,
        });

  const handleCallNext = async () => {
    try {
      await dispatch(callNextCustomer(queue.id)).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to call next customer"));
    }
  };

  const handleCreatePledge = async () => {
    if (!activeCall || !service || service.matchStatus !== "NO_MATCH") return;
    if (!idempotencyKey.current) {
      idempotencyKey.current = globalThis.crypto.randomUUID();
    }
    setPledgeSaving(true);
    setPledgeSaveError(null);
    try {
      const { data } = await api.post(`/queues/${queue.id}/pledges`, {
        name: pledgeName,
        phone: pledgePhone,
        monetaryAmount: pledgeAmount,
        idempotencyKey: idempotencyKey.current,
      });
      setCreatedService({
        entryId: activeCall.id,
        service: {
          ...service,
          matchedPledges: [data.pledge],
          matchStatus: "SINGLE_MATCH",
        },
      });
      setSelectedPledgeId(data.pledge.id);
      setPledgeSearchResults([]);
      idempotencyKey.current = null;
      toast.success("Pledge recorded");
    } catch (error: any) {
      setPledgeSaveError(
        error.response?.data?.message || "Unable to create pledge. Please retry.",
      );
    } finally {
      setPledgeSaving(false);
    }
  };

  const handleFulfillPledge = async (pledge: QueuePledgeMatch) => {
    if (!activeCall || !service) return;
    const items = pledge.items
      .filter((item) => fulfillmentQuantities[item.id])
      .map((item) => ({
        pledgeItemId: item.id,
        quantity: fulfillmentQuantities[item.id],
      }));
    if (!fulfillmentAmount && !items.length) return;
    setPledgeSaving(true);
    setFulfillmentError(null);
    try {
      const { data } = await api.patch(
        `/queues/${queue.id}/pledges/${pledge.id}/fulfill`,
        { amount: fulfillmentAmount || undefined, items },
      );
      const updatedPledge = data.pledge as QueuePledgeMatch;
      const nextService: QueuePledgeService = {
        ...service,
        matchedPledges: service.matchedPledges.map((item) =>
          item.id === updatedPledge.id ? updatedPledge : item,
        ),
      };
      setCreatedService({ entryId: activeCall.id, service: nextService });
      setSelectedPledgeId(updatedPledge.id);
      setFulfillmentAmount("");
      setFulfillmentQuantities({});
      toast.success("Pledge fulfillment recorded");
    } catch (error: any) {
      setFulfillmentError(
        error.response?.data?.message || "Unable to save fulfillment. Please retry.",
      );
    } finally {
      setPledgeSaving(false);
    }
  };

  const selectedPledge =
    service?.matchedPledges.find((pledge) => pledge.id === selectedPledgeId) ||
    pledgeSearchResults.find((pledge) => pledge.id === selectedPledgeId) ||
    null;

  const handleSkip = async (entryId: string) => {
    try {
      await dispatch(skipEntry({ queueId: queue.id, entryId })).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to skip customer"));
    }
  };

  const handleComplete = async (entryId: string) => {
    try {
      await dispatch(completeEntry({ queueId: queue.id, entryId })).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to complete customer"));
    }
  };

  const handleHold = async (entryId: string) => {
    try {
      await dispatch(holdEntry({ queueId: queue.id, entryId })).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to update standby status"));
    }
  };

  const handleCallSpecific = async (entryId: string) => {
    try {
      await dispatch(
        callSpecificEntry({ queueId: queue.id, entryId }),
      ).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to call customer"));
    }
  };

  const handleCallRange = async () => {
    if (!fromNumber.trim() || !toNumber.trim()) return;
    try {
      const range = `${queue.prefix}${fromNumber.trim()}-${queue.prefix}${toNumber.trim()}`;
      await dispatch(callQueueRange({ queueId: queue.id, range })).unwrap();
      toast.success(`Called ${range}`);
      setFromNumber("");
      setToNumber("");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to call ticket range"));
    }
  };

  const handleTransfer = async (entryId: string) => {
    const targetQueueId = targetQueueByEntry[entryId];
    if (!targetQueueId) {
      toast.error("Choose a destination queue first");
      return;
    }
    try {
      const transferred = await dispatch(
        transferEntry({ queueId: queue.id, entryId, targetQueueId }),
      ).unwrap();
      toast.success(`Customer moved to ${transferred.queueName}`);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to transfer customer"));
    }
  };

  const destinationQueues = queues.filter(
    (candidate) => candidate.id !== queue.id && candidate.status === "open",
  );

  const renderEntry = (entry: (typeof entries)[number]) => {
    const meta = ENTRY_STATUS_META[entry.status];
    return (
      <div key={entry.id} className="flex flex-col gap-3 rounded-md border p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">
              {entry.ticketNumber ??
                `${queue.prefix ?? ""}${entry.queueNumber}`}
            </span>
            <Badge variant={meta.variant} className="capitalize">
              {meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {entry.customerName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(entry.status === "waiting" || entry.status === "standby") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => handleCallSpecific(entry.id)}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Call
            </Button>
          )}
          {(entry.status === "waiting" || entry.status === "called") && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={() => handleSkip(entry.id)}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip
            </Button>
          )}
          {["called", "serving"].includes(entry.status) && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => handleComplete(entry.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete
            </Button>
          )}
          {["waiting", "called", "serving", "standby"].includes(
            entry.status,
          ) && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={() => handleHold(entry.id)}
            >
              <PauseCircle className="h-3.5 w-3.5" />
              {entry.status === "standby" ? "Return" : "Hold"}
            </Button>
          )}
        </div>
        {destinationQueues.length > 0 && entry.status === "waiting" && (
          <div className="flex items-center gap-2 border-t pt-2">
            <select
              aria-label={`Destination queue for ${entry.customerName}`}
              className="h-9 flex-1 min-w-0 rounded-md border bg-background px-2 text-xs"
              value={targetQueueByEntry[entry.id] ?? ""}
              onChange={(event) =>
                setTargetQueueByEntry((current) => ({
                  ...current,
                  [entry.id]: event.target.value,
                }))
              }
            >
              <option value="">Move to...</option>
              {destinationQueues.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => handleTransfer(entry.id)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfer
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (status === "loading" && !entries.length) {
    return (
      <div className="space-y-2 pt-2">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <Button
        onClick={handleCallNext}
        disabled={queue.status !== "open" || !normalWaiting}
        className="w-full gap-2"
      >
        <PhoneCall className="h-4 w-4" />
        Call next customer
      </Button>
      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row">
        <div className="flex-1">
          <p className="text-xs font-medium">Call a ticket range</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {queue.prefix}
            </span>
            <Input
              value={fromNumber}
              onChange={(event) =>
                setFromNumber(event.target.value.replace(/\D/g, ""))
              }
              placeholder="0001"
              aria-label="From ticket number"
            />
            <span className="text-muted-foreground">to</span>
            <span className="font-mono text-sm font-semibold">
              {queue.prefix}
            </span>
            <Input
              value={toNumber}
              onChange={(event) =>
                setToNumber(event.target.value.replace(/\D/g, ""))
              }
              placeholder="0003"
              aria-label="To ticket number"
            />
          </div>
        </div>
        <Button
          onClick={handleCallRange}
          disabled={
            queue.status !== "open" || !fromNumber.trim() || !toNumber.trim()
          }
          className="gap-2 sm:mt-5"
        >
          <ListChecks className="h-4 w-4" />
          Call range
        </Button>
      </div>
      {hasActiveEntry && normalWaiting && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Calling next completes the current customer and starts the next one.
        </p>
      )}
      {activeCall && service && (
        <section className="space-y-4 rounded-md border p-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Member being served</h3>
              <p className="text-sm">{activeCall.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {activeCall.customerPhone || "No phone provided"}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary">
                {service.campaign?.title || "Pledge campaign"}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeCall.ticketNumber || `${queue.prefix}${activeCall.queueNumber}`}
              </p>
            </div>
          </header>

          {service.campaign?.status !== "ACTIVE" && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {service.campaign
                ? `This campaign is ${service.campaign.status.toLowerCase()}. Existing pledges can still be fulfilled.`
                : "No campaign is linked. Members can still be called."}
            </p>
          )}

          {service.matchStatus === "MULTIPLE_MATCHES" && !selectedPledge && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Multiple pledges match this phone. Select the member’s existing pledge:
              </p>
              {allServicePledges.map((pledge) => (
                <button
                  key={pledge.id}
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => setSelectedPledgeId(pledge.id)}
                >
                  <span>
                    <strong>{pledge.name}</strong>
                    <span className="ml-2 text-sm text-muted-foreground">{pledge.phone}</span>
                  </span>
                  <span className="text-sm">
                    {money(pledge.monetaryAmount, service.campaign?.currency)} · {pledge.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedPledge && (
            <div className="space-y-3 rounded-md bg-muted/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">Existing pledge · {selectedPledge.name}</h4>
                  <p className="text-xs text-muted-foreground">{selectedPledge.phone}</p>
                </div>
                <Badge variant={selectedPledge.status === "FULFILLED" ? "default" : selectedPledge.status === "PARTIALLY_FULFILLED" ? "secondary" : "outline"}>
                  {selectedPledge.status === "PLEDGED" ? "Not fulfilled" : selectedPledge.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </div>
              {selectedPledge.monetaryAmount != null && (
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <p>Pledged: {money(selectedPledge.monetaryAmount, service.campaign?.currency)}</p>
                  <p>Fulfilled: {money(selectedPledge.fulfilledMonetaryAmount, service.campaign?.currency)}</p>
                  <p>Remaining: {money(selectedPledge.remainingMonetaryAmount, service.campaign?.currency)}</p>
                </div>
              )}
              {selectedPledge.items?.length > 0 && (
                <div className="divide-y rounded-md border bg-background">
                  {selectedPledge.items.map((item) => (
                        <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_10rem] sm:items-center">
                          <div className="text-sm">
                            <strong>{item.name}</strong>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} pledged · {item.fulfilledQuantity} fulfilled · {item.remainingQuantity} remaining
                            </p>
                          </div>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={fulfillmentQuantities[item.id] || ""}
                            onChange={(event) =>
                              setFulfillmentQuantities((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            aria-label={`Additional ${item.name} quantity fulfilled`}
                            placeholder={`Add ${item.unit}`}
                          />
                        </div>
                  ))}
                </div>
              )}
                  <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_12rem] sm:items-end">
                    <label className="text-sm font-medium" htmlFor={`fulfill-amount-${selectedPledge.id}`}>
                      Monetary amount received ({service.campaign?.currency || "USD"})
                    </label>
                    <Input
                      id={`fulfill-amount-${selectedPledge.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fulfillmentAmount}
                      onChange={(event) => setFulfillmentAmount(event.target.value)}
                      placeholder="Optional amount"
                    />
                    {fulfillmentError && (
                      <p role="alert" className="text-sm text-destructive sm:col-span-2">
                        {fulfillmentError}
                      </p>
                    )}
                    <Button
                      className="sm:col-span-2"
                      disabled={
                        pledgeSaving ||
                        (!fulfillmentAmount && !Object.values(fulfillmentQuantities).some(Boolean))
                      }
                      onClick={() => void handleFulfillPledge(selectedPledge)}
                    >
                      {pledgeSaving ? "Saving fulfillment…" : "Record fulfillment"}
                    </Button>
                  </div>
              {service.matchStatus === "MULTIPLE_MATCHES" && (
                <Button size="sm" variant="outline" onClick={() => setSelectedPledgeId(null)}>
                  Choose a different pledge
                </Button>
              )}
            </div>
          )}

          {service.matchStatus === "NO_MATCH" && !selectedPledge && (
            <div className="space-y-3">
              <p className="text-sm">
                No existing pledge matched this phone. Search this campaign before creating a new pledge.
              </p>
              <Input
                value={pledgeSearch}
                onChange={(event) => setPledgeSearch(event.target.value)}
                placeholder="Search by name or phone"
                aria-label="Search existing pledges"
              />
              {pledgeSearchLoading && <p className="text-xs text-muted-foreground">Searching pledges…</p>}
              {pledgeSearchError && <p role="alert" className="text-sm text-destructive">{pledgeSearchError}</p>}
              {pledgeSearchResults.map((pledge) => (
                <button
                  type="button"
                  key={pledge.id}
                  className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left hover:bg-muted"
                  onClick={() => setSelectedPledgeId(pledge.id)}
                >
                  <span><strong>{pledge.name}</strong><span className="ml-2 text-xs text-muted-foreground">{pledge.phone}</span></span>
                  <span className="text-sm">{pledge.status}</span>
                </button>
              ))}
              {pledgeSearch.trim().length >= 3 &&
                !pledgeSearchLoading &&
                !pledgeSearchError &&
                pledgeSearchResults.length === 0 &&
                service.campaign?.status === "ACTIVE" && (
                  <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                    <p className="text-sm font-medium sm:col-span-2">No pledge found. Create one for this member.</p>
                    <Input value={pledgeName} onChange={(event) => setPledgeName(event.target.value)} aria-label="Member name" placeholder="Member name" />
                    <Input value={pledgePhone} onChange={(event) => setPledgePhone(event.target.value)} aria-label="Member phone" placeholder="Member phone" />
                    <Input type="number" min="1" step="0.01" value={pledgeAmount} onChange={(event) => setPledgeAmount(event.target.value)} aria-label="Pledge amount" placeholder={`Amount (${service.campaign.currency || "USD"})`} className="sm:col-span-2" />
                    {pledgeSaveError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{pledgeSaveError}</p>}
                    <Button className="sm:col-span-2" disabled={pledgeSaving || !pledgeName.trim() || !pledgePhone.trim() || !pledgeAmount} onClick={() => void handleCreatePledge()}>
                      {pledgeSaving ? "Saving pledge…" : "Create pledge"}
                    </Button>
                  </div>
                )}
            </div>
          )}
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2 items-start">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Queue</h3>
            <span className="text-xs text-muted-foreground">
              Showing {regularEntries.length} of {waitingCustomersTotalCount} active members
            </span>
          </div>
          {waitingCustomersHasMore && (
            <p className="text-xs text-muted-foreground">Calling next advances through the full queue. Only the next 20 active members are shown here.</p>
          )}
          {regularEntries.length ? (
            <div className="space-y-2">{regularEntries.map(renderEntry)}</div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              No one is waiting in this queue right now.
            </div>
          )}
        </section>

        <section className="space-y-2 rounded-md border p-3">
          <div>
            <h3 className="text-sm font-semibold">
              Transfer queue
              {transferEntries.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {transferEntries.length}
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Customers transferred from another queue.
            </p>
          </div>
          {transferEntries.length ? (
            <div className="space-y-2">{transferEntries.map(renderEntry)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No transferred customers.
            </p>
          )}
        </section>
      </div>
      {skippedEntries.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Skipped customers</h3>
          {skippedEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3"
            >
              <div className="min-w-0">
                <span className="font-mono font-semibold">
                  {entry.ticketNumber ??
                    `${queue.prefix ?? ""}${entry.queueNumber}`}
                </span>
                <p className="text-sm text-muted-foreground truncate">
                  {entry.customerName}
                </p>
              </div>
              <Badge variant="outline">Skipped</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
