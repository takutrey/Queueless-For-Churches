"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  DollarSign,
  Inbox,
  LoaderCircle,
  PackageCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/utils/axiosInstance";
import type { AnalyticsData } from "@/types/AnalyticsTypes";
import { useSocket } from "@/contexts/SocketContext";

const STATUS_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

type LiveCampaign = {
  id: string;
  churchId: string;
  title: string;
  targetAmount: string;
  status: string;
  totals: {
    totalPledged: string;
    remainingAmount: string;
    progressPercentage: number;
    pledgeCount: number;
  };
};

type PledgeCreatedEvent = {
  campaignId: string;
  totals: LiveCampaign["totals"];
};

const campaignMoney = (value: string | number) =>
  Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

function LiveCampaignSummary() {
  const [campaigns, setCampaigns] = useState<LiveCampaign[]>([]);
  const { joinCampaign, leaveCampaign, on, off } = useSocket();
  const campaignsRef = useRef(campaigns);

  useEffect(() => {
    campaignsRef.current = campaigns;
  }, [campaigns]);

  const loadCampaigns = useCallback(async () => {
    const response = await api.get<{ campaigns: LiveCampaign[] }>("/campaigns");
    setCampaigns(response.data.campaigns);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCampaigns();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCampaigns]);

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
    const handleConnect = () => void loadCampaigns();
    const subscribedIds = new Set<string>();

    on("pledge-created", handlePledgeCreated);
    on("connect", handleConnect);
    campaignsRef.current.forEach((campaign) => {
      subscribedIds.add(campaign.id);
      joinCampaign(campaign.churchId, campaign.id);
    });

    return () => {
      off("pledge-created", handlePledgeCreated);
      off("connect", handleConnect);
      subscribedIds.forEach((campaignId) => leaveCampaign(campaignId));
    };
  }, [campaigns.length, joinCampaign, leaveCampaign, loadCampaigns, on, off]);

  if (!campaigns.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Pledge campaigns</h2>
        <p className="text-sm text-muted-foreground">
          Live fundraising progress across your campaigns.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((campaign) => {
          const progress = Math.min(
            100,
            Number(campaign.totals.progressPercentage || 0),
          );
          return (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="line-clamp-2 text-base">
                    {campaign.title}
                  </CardTitle>
                  <Badge variant="outline">{campaign.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold">
                      {campaignMoney(campaign.totals.totalPledged)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {campaignMoney(campaign.targetAmount)} pledged
                    </p>
                  </div>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{campaign.totals.pledgeCount} pledges</span>
                  <span>
                    {campaignMoney(
                      Math.max(0, Number(campaign.totals.remainingAmount)),
                    )}{" "}
                    left
                  </span>
                </div>
                <Link
                  className="text-sm font-medium text-primary hover:underline"
                  to={`../campaigns/${campaign.id}`}
                >
                  Open live monitor
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function FundraisingAnalytics({
  fundraising,
}: {
  fundraising: NonNullable<AnalyticsData["fundraising"]>;
}) {
  const campaignChart = fundraising.campaigns.map((campaign) => ({
    ...campaign,
    shortTitle:
      campaign.title.length > 14
        ? `${campaign.title.slice(0, 14)}...`
        : campaign.title,
  }));
  const materialChart = fundraising.materials
    .slice()
    .sort((left, right) => right.pledgedQuantity - left.pledgedQuantity)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      shortName:
        item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name,
    }));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fundraising analytics</h2>
          <p className="text-sm text-muted-foreground">
            Campaign money, materials, and donor activity.
          </p>
        </div>
        <Badge variant="outline">
          {fundraising.summary.activeCampaigns} active campaigns
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total pledged"
          value={campaignMoney(fundraising.summary.totalPledged)}
          detail={`${fundraising.summary.pledgeCount} pledges`}
          icon={DollarSign}
        />
        <MetricCard
          label="Money collected"
          value={campaignMoney(fundraising.summary.totalCollected)}
          detail={`${campaignMoney(fundraising.summary.remainingToCollect)} still to collect`}
          icon={Activity}
        />
        <MetricCard
          label="Campaign target"
          value={campaignMoney(fundraising.summary.totalTarget)}
          detail={`${fundraising.summary.campaignCount} campaigns`}
          icon={Trophy}
        />
        <MetricCard
          label="Material lines"
          value={fundraising.materials.length}
          detail="Pledged material requirements"
          icon={PackageCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Pledged vs collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={fundraising.daily}
                  margin={{ left: -20, right: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value) => campaignMoney(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="pledged"
                    name="Pledged"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Campaign performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChart} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortTitle"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => campaignMoney(Number(value))}
                  />
                  <Bar
                    dataKey="pledgedAmount"
                    name="Pledged"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="collectedAmount"
                    name="Collected"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Material requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {materialChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={materialChart}
                    margin={{ left: -20, right: 8 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="shortName"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar
                      dataKey="pledgedQuantity"
                      name="Pledged"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="fulfilledQuantity"
                      name="Fulfilled"
                      fill="var(--chart-4)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No material pledges yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Top donors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fundraising.topDonors.length ? (
              fundraising.topDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{donor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {donor.pledgeCount} pledges · {donor.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {campaignMoney(donor.pledged)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {campaignMoney(donor.collected)} collected
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No donors yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function DashboardAnalytics({
  detailed = false,
}: {
  detailed?: boolean;
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<AnalyticsData>("/analytics/dashboard")
      .then((response) => {
        if (active) setAnalytics(response.data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!analytics && !error) {
    return (
      <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4" />
          Analytics are temporarily unavailable.
        </CardContent>
      </Card>
    );
  }

  const { summary, scope } = analytics;
  const isStaff = scope.role === "staff";
  const isAdmin = ["admin", "super-admin", "superadmin"].includes(scope.role);
  const queueChart = analytics.queues.map((queue) => ({
    ...queue,
    shortName:
      queue.name.length > 14 ? `${queue.name.slice(0, 14)}...` : queue.name,
  }));
  const statusChart = analytics.statusBreakdown.filter(
    (item) => item.count > 0,
  );

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Operations overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Live queue health and the last {analytics.period.days} days of
            activity.
          </p>
        </div>
        <Badge variant="outline">
          {isStaff ? "My performance" : "Church performance"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isStaff ? "Assigned queues" : "Church queues"}
          value={scope.queueCount}
          detail={isStaff ? "Queues assigned to you" : "Queues in this church"}
          icon={Inbox}
        />
        <MetricCard
          label="Waiting now"
          value={summary.waitingNow}
          detail={`${summary.servingNow} currently being served`}
          icon={UsersRound}
        />
        <MetricCard
          label="Completed serves"
          value={summary.completedServes}
          detail={`${summary.skippedServes} skipped in this period`}
          icon={Activity}
        />
        <MetricCard
          label="Average serve time"
          value={`${summary.averageServiceMinutes} min`}
          detail={`${summary.averageWaitMinutes} min average wait`}
          icon={Clock3}
        />
        <MetricCard
          label="Transfers"
          value={`${summary.transfersReceived} / ${summary.transfersOut}`}
          detail="Received / sent in this period"
          icon={ArrowUpFromLine}
        />
      </div>

      {!isStaff && <LiveCampaignSummary />}
      {!detailed && !isStaff && analytics.fundraising && (
        <FundraisingAnalytics fundraising={analytics.fundraising} />
      )}

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Queue flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueChart} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="waiting"
                    name="Waiting"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="serving"
                    name="Serving"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Queue status mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {statusChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChart}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {statusChart.map((item, index) => (
                        <Cell
                          key={item.status}
                          fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No queue activity yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Daily throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.daily}
                  margin={{ left: -20, right: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="transfers"
                    name="Transfers"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>
              {isStaff
                ? "My transfer activity"
                : isAdmin
                  ? "Member performance"
                  : "Staff performance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isStaff ? (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                    Transfers received
                  </span>
                  <strong>{summary.transfersReceived}</strong>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
                    Transfers sent
                  </span>
                  <strong>{summary.transfersOut}</strong>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transfer counts cover the selected analytics period.
                </p>
              </>
            ) : analytics.staff.length ? (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {analytics.staff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {staff.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {staff.role || "Staff"} · {staff.averageServiceMinutes}{" "}
                        min average serve
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {staff.completed} completed
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed serves in this period.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
