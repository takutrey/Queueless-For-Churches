// components/StaffAssignmentPopover.tsx
"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/combobox-select";
import { UserPlus, UserMinus, Users } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchChurchStaff,
  assignStaffToQueue,
  removeStaffFromQueue,
} from "@/lib/QueueSlice";
import { toast } from "sonner";

interface StaffAssignmentPopoverProps {
  queueId: string;
}

/**
 * Assign / remove staff for a queue, right from the QueueCard.
 *
 * This used to be a Radix Popover with its own locally-fetched copy of
 * the queue. Two problems came from that:
 *  1. Popover positioning inside a card grid was unreliable (it could
 *     render pinned to the bottom of the viewport instead of anchored
 *     to the trigger).
 *  2. The local `queue` state was a separate copy from the one in
 *     Redux, so assigning staff here didn't update the staff count
 *     shown on the card, or the Staff tab in the manage sheet.
 *
 * Now this is a centered Dialog (reliable positioning on every screen
 * size) and reads the queue straight from the Redux `queues` list, the
 * same source of truth every other view uses — so an assignment made
 * here is reflected everywhere immediately.
 */
export function StaffAssignmentPopover({
  queueId,
}: StaffAssignmentPopoverProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigningId, setAssigningId] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const queue = useSelector((state: RootState) =>
    state.authQueue.queues.data.find((q) => q.id === queueId),
  );
  const { data: staffDirectory, status: staffStatus } = useSelector(
    (state: RootState) => state.authQueue.churchStaff,
  );

  useEffect(() => {
    if (open) {
      dispatch(fetchChurchStaff());
    }
  }, [open, dispatch]);

  const assigned =
    queue?.staffAssignments?.filter((s) => s.status === "active") ?? [];
  const assignedUserIds = new Set(assigned.map((a) => a.userId));
  const availableStaff = staffDirectory.filter(
    (u) => !assignedUserIds.has(u.id),
  );

  // Look up a name from the staff directory as a fallback, in case an
  // assignment came back from the API without a populated `user`.
  const displayName = (userId: string, userName?: string) =>
    userName || staffDirectory.find((u) => u.id === userId)?.name || userId;

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setAssigningId(true);
    try {
      await dispatch(
        assignStaffToQueue({ queueId, userId: selectedUserId }),
      ).unwrap();
      toast.success("Staff assigned");
      setSelectedUserId("");
    } catch (err: any) {
      toast.error(err || "Failed to assign staff");
    } finally {
      setAssigningId(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await dispatch(removeStaffFromQueue({ queueId, userId })).unwrap();
      toast.success("Staff removed");
    } catch (err: any) {
      toast.error(err || "Failed to remove staff");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-7 w-7 p-0"
        onClick={() => setOpen(true)}
        title="Assign staff"
      >
        <Users className="h-3.5 w-3.5" />
      </Button>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            Assign staff{queue ? ` — ${queue.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Choose who can serve customers in this queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Assign a staff member</p>
            <div className="flex gap-2">
              <ComboboxSelect
                options={availableStaff.map((u) => ({
                  label: `${u.name} (${u.email})`,
                  value: u.id,
                }))}
                value={selectedUserId}
                onChange={setSelectedUserId}
                placeholder={
                  staffStatus === "loading"
                    ? "Loading staff…"
                    : "Select staff..."
                }
                disabled={
                  staffStatus === "loading" || availableStaff.length === 0
                }
              />
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!selectedUserId || assigningId}
                className="shrink-0 gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                {assigningId ? "Assigning…" : "Assign"}
              </Button>
            </div>
            {staffStatus !== "loading" && availableStaff.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                All staff are already assigned to this queue.
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Assigned ({assigned.length})
            </p>
            {!assigned.length ? (
              <div className="text-sm text-muted-foreground rounded-md border border-dashed p-3 text-center">
                No staff assigned yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {assigned.map((assignment) => (
                  <div
                    key={assignment.userId}
                    className="flex items-center justify-between text-sm border-b pb-1.5 last:border-b-0"
                  >
                    <span className="truncate">
                      {displayName(assignment.userId, assignment.user?.name)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={removingId === assignment.userId}
                      onClick={() => handleRemove(assignment.userId)}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
