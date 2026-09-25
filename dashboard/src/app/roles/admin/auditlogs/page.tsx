"use client";

import { useEffect, useState, useCallback } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { StatisticsDashboard } from "./StatisticsDashboard";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
} from "@/lib/AuditLogSlice";
import { History, BarChart3, Download } from "lucide-react";
import type { GetAllLogsParams } from "@/types/AuditLogTypes";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";

function AuditLogsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, statistics, pagination, isLoading, error } = useSelector(
    (state: RootState) => state.auditlogs,
  );
  const [activeTab, setActiveTab] = useState("logs");
  const [filters, setFilters] = useState<GetAllLogsParams>({
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    dispatch(getAllAuditLogs(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (activeTab === "statistics") {
      dispatch(getAuditStatistics());
    }
  }, [dispatch, activeTab]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleExport = useCallback(
    async (format: "json" | "csv") => {
      try {
        const blob = await dispatch(
          exportAuditLogs({ format, ...filters }),
        ).unwrap();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(`Audit logs exported as ${format.toUpperCase()}`);
      } catch (error) {
        toast.error("Failed to export audit logs");
      }
    },
    [dispatch, filters],
  );

  if (isLoading && !logs.length) {
    return (
      <div className="container mx-auto py-10 p-5">
        <div className="flex items-center gap-3 mb-8">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track and monitor system activities
            </p>
          </div>
        </div>

        <Tabs defaultValue="logs" className="mb-6">
          <TabsList>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 p-5">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track and monitor system activities
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 px-4">
          <NotificationBell />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-6">
          <DataTable
            columns={columns()}
            data={logs}
            pagination={pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          {statistics ? (
            <StatisticsDashboard statistics={statistics} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No statistics available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AuditLogsPage;
