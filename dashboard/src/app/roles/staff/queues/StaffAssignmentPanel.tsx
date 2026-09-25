"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { UserPlus, UserMinus, User } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchChurchStaff,
  assignStaffToQueue,
  removeStaffFromQueue,
} from "@/lib/QueueSlice";
import type { Queue } from "@/types/QueueTypes";

export function StaffAssignmentPanel({ queue }: { queue: Queue }) {
  const dispatch = useDispatch<AppDispatch>();
  const { data: staffDirectory, status } = useSelector(
    (state: RootState) => state.authQueue.churchStaff,
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchChurchStaff());
  }, [dispatch, status]);

  const activeAssignments =
    queue.staffAssignments?.filter((s) => s.status === "active") ?? [];
  const assignedUserIds = new Set(activeAssignments.map((a) => a.userId));
  const availableStaff = staffDirectory.filter(
    (u) => !assignedUserIds.has(u.id),
  );

  // Fall back to the staff directory when an assignment record doesn't
  // carry a populated `user` — otherwise the list shows a raw user id.
  const displayName = (userId: string, userName?: string) =>
    userName ||
    staffDirectory.find((u) => u.id === userId)?.name ||
    "Assigned user";

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsAssigning(true);
    try {
      await dispatch(
        assignStaffToQueue({ queueId: queue.id, userId: selectedUserId }),
      ).unwrap();
      toast.success("Staff member assigned");
      setSelectedUserId("");
    } catch (err: any) {
      toast.error(err || "Failed to assign staff member");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await dispatch(
        removeStaffFromQueue({ queueId: queue.id, userId }),
      ).unwrap();
      toast.success("Staff member removed");
    } catch (err: any) {
      toast.error(err || "Failed to remove staff member");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-5 pt-2">
      <div>
        <p className="text-sm font-medium mb-2">Assign a staff member</p>
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue
                placeholder={
                  status === "loading"
                    ? "Loading staff directory…"
                    : availableStaff.length
                      ? "Choose a staff member"
                      : "No available staff to assign"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableStaff.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || isAssigning}
            className="gap-1.5 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">
          Currently assigned ({activeAssignments.length})
        </p>
        {status === "loading" && !staffDirectory.length ? (
          <Skeleton className="h-12 w-full rounded-md" />
        ) : !activeAssignments.length ? (
          <div className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
            No staff assigned to this queue yet.
          </div>
        ) : (
          <div className="space-y-2">
            {activeAssignments.map((assignment) => (
              <div
                key={assignment.userId}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">
                    {displayName(assignment.userId, assignment.user?.name)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  disabled={removingId === assignment.userId}
                  onClick={() => handleRemove(assignment.userId)}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
