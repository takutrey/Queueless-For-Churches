// QueueCard.tsx
"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Users2, Pencil, Trash2, ArrowUpRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueueStatusMenu } from "./QueueStatusMenu";
import { cn } from "@/lib/utils";
import type { Queue, QueueStatus } from "@/types/QueueTypes";
import { usePermissions } from "@/hooks/usePermissions";
import { callNextCustomer } from "@/lib/QueueSlice";
import type { AppDispatch } from "@/store/store";
import { StaffAssignmentPopover } from "./StaffAssignmentPopover"; // <-- new import

interface QueueCardProps {
  queue: Queue;
  onStatusChange: (queueId: string, next: QueueStatus) => void;
  onManage: (queue: Queue) => void;
  onEdit: (queue: Queue) => void;
  onDelete: (queueId: string) => void;
}

const ACCENT: Record<QueueStatus, string> = {
  open: "before:bg-emerald-500",
  paused: "before:bg-amber-500",
  closed: "before:bg-slate-300",
};

export function QueueCard({
  queue,
  onStatusChange,
  onManage,
  onEdit,
  onDelete,
}: QueueCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    canDeleteQueue,
    canEditQueue,
    canCallNextForQueue,
    isAssignedToQueue,
    isStaff,
  } = usePermissions();
  const [isCalling, setIsCalling] = useState(false);

  const staffCount =
    queue.staffAssignments?.filter((s) => s.status === "active").length ?? 0;
  const canCall = canCallNextForQueue(queue.id, queue.staffAssignments);
  const isAssigned = isAssignedToQueue(queue.id, queue.staffAssignments);

  const handleCallNext = async () => {
    if (queue.status !== "open") {
      toast.error("This queue is not open.");
      return;
    }
    setIsCalling(true);
    try {
      await dispatch(callNextCustomer(queue.id)).unwrap();
      if (queue.serviceType === "PLEDGE_CAMPAIGN") onManage(queue);
      toast.success("Customer called!");
    } catch (err: any) {
      toast.error(err || "Failed to call next customer");
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-lg border bg-card p-5",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-lg",
        ACCENT[queue.status] ?? ACCENT.closed,
      )}
    >
      {/* Header: name, prefix, status menu */}
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight truncate">{queue.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {queue.prefix ? `Prefix ${queue.prefix}` : "No prefix set"}
          </p>
        </div>
        <QueueStatusMenu
          status={queue.status}
          onChange={(next) => onStatusChange(queue.id, next)}
          disabled={isStaff}
        />
      </div>

      {/* Now serving */}
      <div className="pl-2">
        <p className="text-xs text-muted-foreground mb-0.5">Now serving</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">
          {queue.prefix ? `${queue.prefix}-` : ""}
          {String(queue.currentNumber ?? 0).padStart(3, "0")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pl-2">
        <Stat label="Waiting" value={queue.stats?.waiting ?? 0} />
        <Stat label="Serving" value={queue.stats?.serving ?? 0} />
        <Stat label="Done today" value={queue.stats?.completed ?? 0} />
      </div>

      {/* Actions row — wraps instead of overflowing on narrow cards */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 pl-2 pt-1 border-t">
        {/* Left side: staff count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users2 className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">{staffCount} staff assigned</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          {/* Call Next */}
          {canCall && (
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCallNext}
              disabled={isCalling || queue.status !== "open"}
            >
              <PhoneCall className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {isCalling ? "Calling..." : "Call Next"}
              </span>
            </Button>
          )}

          {/* Edit */}
          {canEditQueue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Edit queue"
              onClick={() => onEdit(queue)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Delete */}
          {canDeleteQueue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Delete queue"
              onClick={() => onDelete(queue.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Staff Assignment */}
          <StaffAssignmentPopover queueId={queue.id} />

          {/* Manage */}
          <Button
            size="sm"
            className="h-7 gap-1"
            onClick={() => onManage(queue)}
          >
            {isStaff ? "View" : "Manage"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-2">
      <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
