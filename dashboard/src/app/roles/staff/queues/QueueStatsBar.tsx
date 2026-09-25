"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Queue } from "@/types/QueueTypes";

interface QueueStatsBarProps {
  queues: Queue[];
  socketConnected: boolean;
}

export function QueueStatsBar({ queues, socketConnected }: QueueStatsBarProps) {
  const open = queues.filter((q) => q.status === "open").length;
  const paused = queues.filter((q) => q.status === "paused").length;
  const closed = queues.filter((q) => q.status === "closed").length;
  const totalWaiting = queues.reduce(
    (sum, q) => sum + (q.stats?.waiting ?? 0),
    0,
  );
  const totalServing = queues.reduce(
    (sum, q) => sum + (q.stats?.serving ?? 0),
    0,
  );

  const stats = [
    { label: "Queues", value: queues.length },
    { label: "Open", value: open },
    { label: "Paused", value: paused },
    { label: "Closed", value: closed },
    { label: "Waiting now", value: totalWaiting },
    { label: "Being served", value: totalServing },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-semibold tabular-nums leading-none">
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1",
          socketConnected
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700",
        )}
        title={
          socketConnected
            ? "Receiving live updates"
            : "Reconnecting — data may be stale"
        }
      >
        {socketConnected ? (
          <Wifi className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
        {socketConnected ? "Live" : "Reconnecting…"}
      </div>
    </div>
  );
}
