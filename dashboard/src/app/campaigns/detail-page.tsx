import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Megaphone, QrCode } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import api from "@/utils/axiosInstance";
import { useSocket } from "@/contexts/SocketContext";

type CampaignItem = {
  id: string;
  campaignId: string;
  name: string;
  description?: string | null;
  targetQuantity: string;
  unit: string;
  totalPledged?: string;
  remainingQuantity?: string;
  progressPercentage?: number;
  completed?: boolean;
  status?: string;
};

type Campaign = {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  targetAmount: string | null;
  status: string;
  slug: string;
  joinCode?: string;
  items?: CampaignItem[];
};

type Totals = {
  campaignId: string;
  targetAmount: string | null;
  totalPledged: string;
  remainingAmount: string;
  progressPercentage: number;
  pledgeCount: number;
};

type PledgeItem = {
  id: string;
  campaignItemId: string;
  quantity: string;
  campaignItem?: {
    id: string;
    name: string;
    unit: string;
  };
};

type Pledge = {
  id: string;
  name: string;
  monetaryAmount?: string | number | null;
  createdAt: string;
  items?: PledgeItem[];
};

type PledgeCreatedEvent = {
  campaignId: string;
  pledge: Pledge;
  totals: Totals;
};

const money = (value: string | number) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const { joinCampaign, leaveCampaign, on, off, isConnected } = useSocket();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const seenPledgeIds = useRef(new Set<string>());

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    const response = await api.get<{
      campaign: Campaign;
      totals: Totals;
      items?: CampaignItem[];
    }>(`/campaigns/${campaignId}`);
    setCampaign({
      ...response.data.campaign,
      items: response.data.items || [],
    });
    setTotals(response.data.totals);
  }, [campaignId]);

  const loadPledges = useCallback(async () => {
    if (!campaignId) return;
    const response = await api.get<{ pledges: Pledge[] }>(
      `/campaigns/${campaignId}/pledges`,
      { params: { page: 1, limit: 25 } },
    );
    setPledges((current) => {
      const merged = new Map(
        [...current, ...response.data.pledges].map((pledge) => [
          pledge.id,
          pledge,
        ]),
      );
      const next = Array.from(merged.values())
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 25);
      next.forEach((pledge) => seenPledgeIds.current.add(pledge.id));
      return next;
    });
  }, [campaignId]);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadCampaign(), loadPledges()]);
    } catch (error) {
      toast.error("Unable to load campaign activity");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadCampaign, loadPledges]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!campaign || !campaignId) return;

    const handlePledgeCreated = (event: PledgeCreatedEvent) => {
      if (event.campaignId !== campaignId) return;
      if (seenPledgeIds.current.has(event.pledge.id)) return;
      seenPledgeIds.current.add(event.pledge.id);
      setPledges((current) => [event.pledge, ...current].slice(0, 25));
      setTotals(event.totals);
    };
    const handleCampaignUpdated = (event: {
      campaignId: string;
      campaign?: Campaign;
      item?: CampaignItem;
      totals?: Totals;
    }) => {
      if (event.campaignId !== campaignId) return;

      if (event.item && event.totals) {
        setCampaign((current) => {
          const nextItems = (current?.items ?? []).map((item) =>
            item.id === event.item!.id
              ? { ...item, ...event.item, ...event.totals }
              : item,
          );
          return {
            ...(current ?? {
              id: campaignId,
              churchId: "",
              title: "",
              status: "ACTIVE",
              slug: "",
              targetAmount: null,
            }),
            ...current,
            items: nextItems.length
              ? nextItems
              : [{ ...event.item, ...event.totals }],
          };
        });
      }

      if (event.campaign) {
        setCampaign((current) => ({
          ...(current ?? event.campaign),
          ...event.campaign,
          items: current?.items ?? event.campaign.items ?? [],
        }));
      }
      if (event.totals) setTotals(event.totals);
    };

    const handleConnect = () => {
      joinCampaign(campaign.churchId, campaign.id);
      void refresh();
    };

    on("pledge-created", handlePledgeCreated);
    on("campaign:updated", handleCampaignUpdated);
    on("campaign:statusChanged", handleCampaignUpdated);
    on("campaign:itemUpdated", handleCampaignUpdated);
    on("connect", handleConnect);
    joinCampaign(campaign.churchId, campaign.id);

    return () => {
      off("pledge-created", handlePledgeCreated);
      off("campaign:updated", handleCampaignUpdated);
      off("campaign:statusChanged", handleCampaignUpdated);
      off("campaign:itemUpdated", handleCampaignUpdated);
      off("connect", handleConnect);
      leaveCampaign(campaign.id);
    };
  }, [campaign, campaignId, joinCampaign, leaveCampaign, on, off, refresh]);

  if (loading && !campaign) {
    return (
      <div className="container mx-auto p-5 py-10 text-muted-foreground">
        Loading campaign monitor...
      </div>
    );
  }

  if (!campaign || !totals) {
    return (
      <div className="container mx-auto space-y-4 p-5 py-10">
        <p>Campaign not found.</p>
        <Button asChild variant="outline">
          <Link to="../campaigns">Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  const progress = Math.min(100, Number(totals.progressPercentage || 0));
  const publicUrl = `${window.location.origin.replace("/admin", "")}/campaign/${campaign.slug}`;
  const publicLiveUrl = `${window.location.origin.replace("/admin", "")}/campaign/${campaign.slug}/live`;
  const materialItems = campaign.items || [];

  return (
    <div className="container mx-auto space-y-6 p-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Megaphone className="h-7 w-7 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Live campaign monitor</p>
          <h1 className="truncate text-2xl font-bold">{campaign.title}</h1>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm font-medium">
          {campaign.status}
        </span>
        <span className="text-sm text-muted-foreground">
          {isConnected ? "Live" : "Reconnecting..."}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="../campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Campaigns
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Public page
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={publicLiveUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View live view
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`../pledges?campaignId=${campaign.id}`}>
            View all pledges
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Target",
            totals.targetAmount
              ? money(totals.targetAmount)
              : "No money target",
          ],
          ["Money available", money(totals.totalPledged)],
          ["Money left", money(Math.max(0, Number(totals.remainingAmount)))],
          ["Pledges", totals.pledgeCount.toLocaleString()],
        ].map(([label, value]) => (
          <section className="rounded-lg border bg-card p-5" key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </section>
        ))}
      </div>

      {materialItems.length > 0 && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Material requirements</h2>
            <span className="text-sm text-muted-foreground">Live totals</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {materialItems.map((item) => {
              const itemProgress = Math.min(
                100,
                Number(item.progressPercentage || 0),
              );
              const isComplete = item.completed || item.status === "COMPLETED";
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 ${isComplete ? "border-emerald-500/60 bg-emerald-500/5" : "bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.totalPledged || "0"} / {item.targetQuantity}{" "}
                        {item.unit}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${isComplete ? "bg-emerald-600 text-white" : "bg-muted text-foreground"}`}
                    >
                      {isComplete ? "✓ Target reached" : "Active"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${isComplete ? "bg-emerald-600" : "bg-primary"}`}
                      style={{ width: `${itemProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isComplete
                      ? "Completed"
                      : `${Math.max(0, Number(item.remainingQuantity || 0))} remaining`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-5 rounded-lg border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">
              {campaign.description || "Campaign progress"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totals.targetAmount
                ? `${money(totals.totalPledged)} of ${money(totals.targetAmount)} pledged`
                : `${money(totals.totalPledged)} pledged toward materials only`}
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>{progress}% complete</span>
            <span>{totals.pledgeCount} total pledges</span>
          </div>
        </section>

        <section className="flex items-center gap-4 rounded-lg border bg-card p-5">
          <div className="rounded-md border bg-white p-2">
            <QRCodeSVG value={publicUrl} size={112} includeMargin />
          </div>
          <div>
            <QrCode className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Scan to pledge</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {campaign.joinCode || campaign.slug}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Current activity</h2>
            <p className="text-sm text-muted-foreground">
              New pledges appear here automatically.
            </p>
          </div>
          <span className="text-sm text-muted-foreground">Live feed</span>
        </div>
        <div className="divide-y">
          {pledges.map((pledge) => {
            const monetaryValue = pledge.monetaryAmount ?? null;
            const itemsSummary = (pledge.items || [])
              .map((item) => {
                const itemName = item.campaignItem?.name || "Item";
                return `${item.quantity} ${item.campaignItem?.unit || "unit"} ${itemName}`;
              })
              .join(" • ");

            return (
              <div
                className="flex items-center justify-between gap-4 py-4"
                key={pledge.id}
              >
                <div>
                  <p className="font-medium">{pledge.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(pledge.createdAt)}
                  </p>
                  {itemsSummary && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {itemsSummary}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  {monetaryValue !== null &&
                  monetaryValue !== undefined &&
                  monetaryValue !== ""
                    ? money(String(monetaryValue))
                    : itemsSummary || "Pledge"}
                </p>
              </div>
            );
          })}
          {!pledges.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pledges recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
