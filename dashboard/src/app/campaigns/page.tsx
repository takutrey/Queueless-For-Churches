import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Megaphone,
  Plus,
  Printer,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/utils/axiosInstance";
import { QRCodeSVG } from "qrcode.react";
import { useSocket } from "@/contexts/SocketContext";

type Campaign = {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  targetAmount: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  slug: string;
  joinCode?: string;
  totals: {
    totalPledged: string;
    remainingAmount: string;
    progressPercentage: number;
    pledgeCount: number;
  };
};

type CampaignRequirement = {
  id?: string;
  name: string;
  targetQuantity: string;
  unit: string;
};

const createRequirementId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `requirement-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type PledgeCreatedEvent = {
  campaignId: string;
  totals: Campaign["totals"];
};

const money = (value: string | number) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return response?.data?.message || fallback;
  }
  return fallback;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [printData, setPrintData] = useState<{
    title: string;
    description?: string;
    targetAmount: string;
    joinCode: string;
    url: string;
  } | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAmount: "",
    startDate: "",
    endDate: "",
    materialRequirements: [] as CampaignRequirement[],
  });
  const { joinCampaign, leaveCampaign, on, off } = useSocket();
  const joinedCampaigns = useRef(new Set<string>());
  const campaignsRef = useRef(campaigns);
  campaignsRef.current = campaigns;

  const loadCampaigns = async () => {
    const response = await api.get<{ campaigns: Campaign[] }>("/campaigns");
    setCampaigns(response.data.campaigns);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadCampaigns();
      } catch (error) {
        toast.error(errorMessage(error, "Unable to load campaigns"));
      }
    };
    void initialize();
  }, []);

  useEffect(() => {
    const handlePledgeCreated = (event: PledgeCreatedEvent) => {
      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === event.campaignId
            ? { ...campaign, totals: event.totals }
            : campaign,
        ),
      );
    };
    const handleCampaignCreated = (event: {
      campaignId: string;
      campaign: Campaign;
      totals: Campaign["totals"];
    }) => {
      setCampaigns((current) => {
        if (current.some((campaign) => campaign.id === event.campaignId)) {
          return current.map((campaign) =>
            campaign.id === event.campaignId
              ? { ...event.campaign, totals: event.totals }
              : campaign,
          );
        }
        return [{ ...event.campaign, totals: event.totals }, ...current];
      });
      joinCampaign(event.campaign.churchId, event.campaignId);
    };
    const handleCampaignUpdated = (event: {
      campaignId: string;
      campaign: Campaign;
      totals: Campaign["totals"];
    }) => {
      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === event.campaignId
            ? { ...event.campaign, totals: event.totals }
            : campaign,
        ),
      );
    };
    const handleReconnect = () => {
      void loadCampaigns();
    };

    on("pledge-created", handlePledgeCreated);
    on("campaign:created", handleCampaignCreated);
    on("campaign:updated", handleCampaignUpdated);
    on("campaign:statusChanged", handleCampaignUpdated);
    on("campaign:itemUpdated", handleCampaignUpdated);
    on("connect", handleReconnect);
    const subscribedIds = new Set<string>();
    campaignsRef.current.forEach((campaign) => {
      subscribedIds.add(campaign.id);
      joinedCampaigns.current.add(campaign.id);
      joinCampaign(campaign.churchId, campaign.id);
    });

    return () => {
      off("pledge-created", handlePledgeCreated);
      off("campaign:created", handleCampaignCreated);
      off("campaign:updated", handleCampaignUpdated);
      off("campaign:statusChanged", handleCampaignUpdated);
      off("campaign:itemUpdated", handleCampaignUpdated);
      off("connect", handleReconnect);
      subscribedIds.forEach((campaignId) => leaveCampaign(campaignId));
      subscribedIds.forEach((campaignId) =>
        joinedCampaigns.current.delete(campaignId),
      );
    };
  }, [campaigns.length, joinCampaign, leaveCampaign, on, off]);

  useEffect(() => {
    if (!printData) return;
    const frame = requestAnimationFrame(() => window.print());
    const clear = () => setPrintData(null);
    window.addEventListener("afterprint", clear);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", clear);
    };
  }, [printData]);

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await api.post("/campaigns", {
        title: form.title,
        description: form.description,
        targetAmount: form.targetAmount || "",
        startDate: form.startDate,
        endDate: form.endDate,
      });

      if (form.materialRequirements.length) {
        await Promise.all(
          form.materialRequirements.map((item) =>
            api.post(`/campaigns/${data.campaign.id}/items`, {
              name: item.name,
              targetQuantity: item.targetQuantity,
              unit: item.unit,
            }),
          ),
        );
      }

      setForm({
        title: "",
        description: "",
        targetAmount: "",
        startDate: "",
        endDate: "",
        materialRequirements: [],
      });
      setShowForm(false);
      await loadCampaigns();
      toast.success("Campaign created");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to create campaign"));
    }
  };

  const updateStatus = async (
    campaign: Campaign,
    status: Campaign["status"],
  ) => {
    try {
      await api.patch(`/campaigns/${campaign.id}`, { status });
      await loadCampaigns();
      toast.success(`Campaign ${status.toLowerCase()}`);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to update campaign"));
    }
  };

  const copyLink = async (campaign: Campaign) => {
    const url = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/campaign/${campaign.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Campaign link copied");
  };

  const copyCode = async (campaign: Campaign) => {
    if (!campaign.joinCode) {
      toast.error("This campaign does not have a join code yet");
      return;
    }
    await navigator.clipboard.writeText(campaign.joinCode);
    toast.success("Campaign code copied");
  };

  const shareCampaign = async (campaign: Campaign) => {
    const url = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/campaign/${campaign.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: `Support our campaign: ${campaign.title}`,
          url,
        });
        return;
      } catch {
        // fall through to copy link
      }
    }
    await copyLink(campaign);
  };

  const printCampaign = (campaign: Campaign) => {
    if (!campaign.joinCode) {
      toast.error("This campaign does not have a join code yet");
      return;
    }
    setPrintData({
      title: campaign.title,
      description: campaign.description,
      targetAmount: campaign.targetAmount,
      joinCode: campaign.joinCode,
      url: `${window.location.origin}/campaign/${campaign.slug}`,
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-5 py-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Megaphone className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pledge Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Track church commitments toward shared goals.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((visible) => !visible)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>
      {showForm && (
        <form
          onSubmit={createCampaign}
          className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2"
        >
          <Input
            required
            placeholder="Campaign title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional monetary target (leave blank for material-only)"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />

          <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Material requirements</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    materialRequirements: [
                      ...current.materialRequirements,
                      {
                        id: createRequirementId(),
                        name: "",
                        targetQuantity: "1",
                        unit: "units",
                      },
                    ],
                  }))
                }
              >
                + Add requirement
              </Button>
            </div>

            {form.materialRequirements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Optional: add water, fuel, laptops, chairs, or any other
                resource.
              </p>
            )}

            {form.materialRequirements.map((item, index) => (
              <div
                key={item.id ?? `requirement-${index}`}
                className="grid gap-3 md:grid-cols-[1.3fr_0.9fr_0.7fr_auto]"
              >
                <Input
                  placeholder="Requirement name"
                  value={item.name}
                  onChange={(e) => {
                    const next = [...form.materialRequirements];
                    next[index] = { ...next[index], name: e.target.value };
                    setForm((current) => ({
                      ...current,
                      materialRequirements: next,
                    }));
                  }}
                />
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="Target"
                  value={item.targetQuantity}
                  onChange={(e) => {
                    const next = [...form.materialRequirements];
                    next[index] = {
                      ...next[index],
                      targetQuantity: e.target.value,
                    };
                    setForm((current) => ({
                      ...current,
                      materialRequirements: next,
                    }));
                  }}
                />
                <Input
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => {
                    const next = [...form.materialRequirements];
                    next[index] = { ...next[index], unit: e.target.value };
                    setForm((current) => ({
                      ...current,
                      materialRequirements: next,
                    }));
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = form.materialRequirements.filter(
                      (_, itemIndex) => itemIndex !== index,
                    );
                    setForm((current) => ({
                      ...current,
                      materialRequirements: next,
                    }));
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="md:col-span-2">
            <Button type="submit">Create campaign</Button>
          </div>
        </form>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="space-y-4 rounded-lg border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{campaign.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {campaign.description || "No description"}
                </p>
              </div>
              <select
                className="rounded-md border bg-background px-2 py-1 text-sm"
                value={campaign.status}
                onChange={(e) =>
                  updateStatus(campaign, e.target.value as Campaign["status"])
                }
              >
                <option>DRAFT</option>
                <option>ACTIVE</option>
                <option>PAUSED</option>
                <option>COMPLETED</option>
                <option>CANCELLED</option>
              </select>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">
                  {money(campaign.totals.totalPledged)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaign.targetAmount
                    ? `of ${money(campaign.targetAmount)} pledged`
                    : "No money target set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  remaining:{" "}
                  {campaign.targetAmount
                    ? money(campaign.totals.remainingAmount)
                    : "Material-only goal"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaign.totals.pledgeCount} pledges
                </p>
              </div>
              <div className="flex items-center gap-2">
                <strong>{campaign.totals.progressPercentage}%</strong>
                <div className="rounded-md border bg-white p-2">
                  <QRCodeSVG
                    value={`${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/campaign/${campaign.slug}`}
                    size={68}
                    includeMargin
                  />
                </div>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${campaign.totals.progressPercentage}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" asChild>
                <a href={`./campaigns/${campaign.id}`}>Live monitor</a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyLink(campaign)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareCampaign(campaign)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyCode(campaign)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => printCampaign(campaign)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/campaign/${campaign.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`../pledges?campaignId=${campaign.id}`}>Pledges</a>
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!campaigns.length && (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No pledge campaigns yet.
        </p>
      )}

      {printData && (
        <div
          id="campaign-print-section"
          className="fixed -left-[9999px] top-0 flex flex-col items-center justify-center gap-5 p-16 text-black"
        >
          <h1 className="text-3xl font-bold uppercase tracking-wide text-center">
            {printData.title}
          </h1>
          {printData.description && (
            <p className="max-w-lg text-center text-sm text-muted-foreground">
              {printData.description}
            </p>
          )}
          <p className="text-xl font-semibold">
            Target: {money(printData.targetAmount)}
          </p>
          <div className="rounded-md border bg-white p-4">
            <QRCodeSVG value={printData.url} size={260} includeMargin />
          </div>
          <p className="font-mono text-4xl font-semibold tracking-[0.3em]">
            {printData.joinCode}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Scan the QR code or enter the code above to support this campaign.
          </p>
        </div>
      )}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #campaign-print-section,
          #campaign-print-section * {
            visibility: visible;
          }
          #campaign-print-section {
            position: fixed;
            inset: 0;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
