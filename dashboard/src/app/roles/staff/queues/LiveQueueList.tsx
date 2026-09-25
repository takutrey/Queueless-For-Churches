"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/QueueSlice";
import { useQueueRoom } from "@/contexts/SocketContext";
import type { Queue, QueueEntryStatus } from "@/types/QueueTypes";

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
  const queues = useSelector((state: RootState) => state.authQueue.queues.data);
  const [targetQueueByEntry, setTargetQueueByEntry] = useState<
    Record<string, string>
  >({});
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");

  useQueueRoom(queue.id, queue.churchId);

  useEffect(() => {
    dispatch(fetchWaitingCustomers(queue.id));
  }, [dispatch, queue.id]);

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

  const handleCallNext = async () => {
    try {
      await dispatch(callNextCustomer(queue.id)).unwrap();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to call next customer"));
    }
  };

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
      <div className="grid gap-4 md:grid-cols-2 items-start">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Queue</h3>
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
