import { useEffect, useState, type ReactNode } from "react";
import { BarChart4, Church, Download, Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/utils/axiosInstance";
import type { AnalyticsData } from "@/types/AnalyticsTypes";
import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";

const money = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD" });
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );

/** One consistent page gutter for every render state. */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

/** Label + value row used inside the detail cards. */
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function downloadCsv(data: AnalyticsData) {
  const rows = [
    ["section", "name", "status", "pledged", "collected", "pledgeCount"],
    ...data.fundraising!.campaigns.map((item) => [
      "campaign",
      item.title,
      item.status,
      item.pledgedAmount,
      item.collectedAmount,
      item.pledgeCount,
    ]),
    ...data.fundraising!.topDonors.map((item) => [
      "donor",
      item.name,
      "",
      item.pledged,
      item.collected,
      item.pledgeCount,
    ]),
    ...data.fundraising!.materials.map((item) => [
      "material",
      item.name,
      item.unit,
      item.pledgedQuantity,
      item.fulfilledQuantity,
      "",
    ]),
  ];
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "church-analytics.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function DetailedAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<AnalyticsData>("/analytics/dashboard")
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return (
      <PageShell>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Analytics are temporarily unavailable.
          </CardContent>
        </Card>
      </PageShell>
    );

  if (!data)
    return (
      <PageShell>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="h-32 animate-pulse" />
          ))}
        </div>
      </PageShell>
    );

  const fundraising = data.fundraising;
  const queueChart = data.queues.map((queue) => ({
    ...queue,
    shortName:
      queue.name.length > 15 ? `${queue.name.slice(0, 15)}...` : queue.name,
  }));
  const materialChart =
    fundraising?.materials
      .slice()
      .sort((left, right) => right.pledgedQuantity - left.pledgedQuantity)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        shortName:
          item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
      })) || [];

  return (
    <PageShell>
      <div id="analytics-report" className="space-y-6">
        <style>
          {
            "@media print { .analytics-report-actions, [data-sidebar], [data-slot='sidebar'] { display: none !important; } #analytics-report { padding: 0 !important; } }"
          }
        </style>

        {/* ---------- Header ---------- */}
        <header className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator
              orientation="vertical"
              className="shrink-0 data-[orientation=vertical]:h-8"
            />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart4 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Queue operations, fundraising, donors, and materials for the
                last {data.period.days} days.{" "}
              </p>
            </div>
          </div>

          <div className="analytics-report-actions flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print report
            </Button>
            <Button
              onClick={() => fundraising && downloadCsv(data)}
              disabled={!fundraising}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* ---------- Tabs ---------- */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="analytics-report-actions grid h-auto w-full max-w-2xl grid-cols-2 gap-1 p-1 md:grid-cols-4">
            <TabsTrigger value="overview" className="py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="queues" className="py-2">
              Queues
            </TabsTrigger>
            <TabsTrigger value="fundraising" className="py-2">
              Fundraising
            </TabsTrigger>
            <TabsTrigger value="donors" className="py-2">
              Donors &amp; materials
            </TabsTrigger>
          </TabsList>

          {/* ---------- Overview ---------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
              <Metric
                label="Queues"
                value={data.scope.queueCount}
                detail="Church queues"
              />
              <Metric
                label="Waiting now"
                value={data.summary.waitingNow}
                detail={`${data.summary.servingNow} serving`}
              />
              <Metric
                label="Completed serves"
                value={data.summary.completedServes}
                detail={`${data.summary.skippedServes} skipped`}
              />
              <Metric
                label="Average wait"
                value={`${data.summary.averageWaitMinutes} min`}
                detail={`${data.summary.averageServiceMinutes} min service`}
              />
            </div>

            {fundraising && (
              <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
                <Metric
                  label="Total pledged"
                  value={money(fundraising.summary.totalPledged)}
                  detail={`${fundraising.summary.pledgeCount} pledges`}
                />
                <Metric
                  label="Collected"
                  value={money(fundraising.summary.totalCollected)}
                  detail={`${money(fundraising.summary.remainingToCollect)} remaining`}
                />
                <Metric
                  label="Campaigns"
                  value={fundraising.summary.campaignCount}
                  detail={`${fundraising.summary.activeCampaigns} active`}
                />
                <Metric
                  label="Campaign target"
                  value={money(fundraising.summary.totalTarget)}
                  detail="Across all campaigns"
                />
              </div>
            )}
          </TabsContent>

          {/* ---------- Queues ---------- */}
          <TabsContent value="queues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queueChart}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="shortName" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="waiting"
                        name="Waiting"
                        fill="var(--chart-2)"
                      />
                      <Bar
                        dataKey="serving"
                        name="Serving"
                        fill="var(--chart-1)"
                      />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="var(--chart-3)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {data.queues.map((queue) => (
                <Card key={queue.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{queue.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-x-6 gap-y-2 text-sm">
                    <Stat label="Waiting" value={queue.waiting} />
                    <Stat label="Serving" value={queue.serving} />
                    <Stat label="Completed" value={queue.completed} />
                    <Stat label="Transfers" value={queue.transfers} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ---------- Fundraising ---------- */}
          <TabsContent value="fundraising" className="space-y-6">
            {fundraising ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Pledged and collected over time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[360px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fundraising.daily}>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" tickFormatter={dateLabel} />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip
                            labelFormatter={(value) => dateLabel(String(value))}
                            formatter={(value) => money(Number(value))}
                          />
                          <Line
                            dataKey="pledged"
                            name="Pledged"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                          />
                          <Line
                            dataKey="collected"
                            name="Collected"
                            stroke="var(--chart-3)"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                  {fundraising.campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                        <CardTitle className="min-w-0 text-base">
                          {campaign.title}
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0">
                          {campaign.status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="grid gap-x-6 gap-y-2 text-sm">
                        <Stat
                          label="Target"
                          value={money(campaign.targetAmount)}
                        />
                        <Stat label="Pledges" value={campaign.pledgeCount} />
                        <Stat
                          label="Pledged"
                          value={money(campaign.pledgedAmount)}
                        />
                        <Stat
                          label="Collected"
                          value={money(campaign.collectedAmount)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No fundraising analytics available.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------- Donors & materials ---------- */}
          <TabsContent
            value="donors"
            className="grid gap-4 md:gap-6 xl:grid-cols-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Top donors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fundraising?.topDonors.length ? (
                  fundraising.topDonors.map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{donor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {donor.phone} · {donor.pledgeCount} pledges
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular-nums">
                          {money(donor.pledged)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {money(donor.collected)} collected
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No donors yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material fulfillment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[360px] w-full">
                  {materialChart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={materialChart}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="shortName" />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="pledgedQuantity"
                          name="Pledged"
                          fill="var(--chart-2)"
                        />
                        <Bar
                          dataKey="fulfilledQuantity"
                          name="Fulfilled"
                          fill="var(--chart-4)"
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
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
