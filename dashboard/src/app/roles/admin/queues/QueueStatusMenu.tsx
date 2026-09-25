"use client";

import { Circle, Pause, Play, XCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { QueueStatus } from "@/types/QueueTypes";

const STATUS_META: Record<
  QueueStatus,
  { label: string; dot: string; text: string }
> = {
  open: { label: "Open", dot: "bg-emerald-500", text: "text-emerald-700" },
  paused: { label: "Paused", dot: "bg-amber-500", text: "text-amber-700" },
  closed: { label: "Closed", dot: "bg-slate-400", text: "text-slate-600" },
};

/** Static badge only — no interaction. Used in table cells, view mode, etc. */
export function StatusBadge({ status }: { status: QueueStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.closed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        meta.text,
      )}
    >
      <Circle className={cn("h-2 w-2 fill-current", meta.dot)} />
      {meta.label}
    </span>
  );
}

/**
 * Interactive status control — click to pause, resume, or close a queue.
 * The current status is always the visible label; the menu only offers
 * the transitions that make sense from where the queue is now.
 */
export function QueueStatusMenu({
  status,
  onChange,
  disabled,
}: {
  status: QueueStatus;
  onChange: (next: QueueStatus) => void;
  disabled?: boolean;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.closed;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 px-2.5"
        >
          <Circle className={cn("h-2 w-2 fill-current", meta.dot)} />
          <span className={meta.text}>{meta.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {status !== "open" && (
          <DropdownMenuItem onClick={() => onChange("open")}>
            <Play className="h-4 w-4 mr-2 text-emerald-600" />
            {status === "paused" ? "Resume queue" : "Reopen queue"}
          </DropdownMenuItem>
        )}
        {status === "open" && (
          <DropdownMenuItem onClick={() => onChange("paused")}>
            <Pause className="h-4 w-4 mr-2 text-amber-600" />
            Pause queue
          </DropdownMenuItem>
        )}
        {status !== "closed" && (
          <DropdownMenuItem
            onClick={() => onChange("closed")}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Close queue
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
