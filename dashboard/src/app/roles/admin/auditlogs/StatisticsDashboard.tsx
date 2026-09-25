"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  LabelList,
} from "recharts";
import { Activity, Users, FileText, Calendar } from "lucide-react";
import type { AuditStatistics } from "@/types/AuditLogTypes";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

interface StatisticsDashboardProps {
  statistics: AuditStatistics;
}

export function StatisticsDashboard({ statistics }: StatisticsDashboardProps) {
  // Transform entity counts data for radial chart
  const entityChartData = statistics.entityCounts.map((item, index) => ({
    entity: item.entity,
    count: item.count,
    fill: COLORS[index % COLORS.length],
  }));

  // Create chart config dynamically based on entities
  const entityChartConfig: ChartConfig = statistics.entityCounts.reduce(
    (config, item, index) => {
      config[item.entity] = {
        label: item.entity,
        color: COLORS[index % COLORS.length],
      };
      return config;
    },
    {} as ChartConfig,
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              Last {statistics.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Actions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.actionCounts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Different action types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.mostActiveUsers.length}
            </div>
            <p className="text-xs text-muted-foreground">Most active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Avg</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.dailyActivity.length > 0
                ? (
                    statistics.totalLogs / statistics.dailyActivity.length
                  ).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Logs per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statistics.actionCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="action" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Entities Affected - Radial Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Entities Affected</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {entityChartData.length > 0 ? (
              <ChartContainer
                config={entityChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <RadialBarChart
                  data={entityChartData}
                  startAngle={-90}
                  endAngle={380}
                  innerRadius={30}
                  outerRadius={110}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="entity" />}
                  />
                  <RadialBar dataKey="count" background>
                    <LabelList
                      position="insideStart"
                      dataKey="entity"
                      className="fill-white capitalize mix-blend-luminosity"
                      fontSize={11}
                    />
                  </RadialBar>
                </RadialBarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-muted-foreground">
                  No entity data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Activity Line Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Users */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statistics.mostActiveUsers.map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.user}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{user.actionCount} actions</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
