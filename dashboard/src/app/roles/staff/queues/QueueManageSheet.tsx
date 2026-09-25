// QueueManageSheet.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "./QueueStatusMenu";
import { LiveQueueList } from "./LiveQueueList";
import { StaffAssignmentPanel } from "./StaffAssignmentPanel";
import AddEditViewQueue from "./AddEditViewQueue";
import type { Queue, CreateQueuePayload } from "@/types/QueueTypes";
import { usePermissions } from "@/hooks/usePermissions";

interface QueueManageSheetProps {
  queue: Queue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateQueue: (data: any) => Promise<any>;
  defaultTab?: "live" | "staff" | "settings";
}

export function QueueManageSheet({
  queue,
  open,
  onOpenChange,
  onUpdateQueue,
  defaultTab = "live",
}: QueueManageSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { canAccessSettings, canAccessStaffTab } = usePermissions();

  if (!queue) return null;

  const handleSettingsSubmit = async (data: CreateQueuePayload) => {
    setIsSaving(true);
    try {
      await onUpdateQueue({ id: queue.id, ...data });
      toast.success("Queue settings saved");
    } catch (err: any) {
      toast.error(err || "Failed to save queue settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Determine which tabs to show
  const showStaffTab = canAccessStaffTab;
  const showSettingsTab = canAccessSettings;

  // For staff, default tab is always "live", and they can only see "live"
  const effectiveDefaultTab = showSettingsTab ? defaultTab : "live";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(96vw,1100px)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{queue.name}</DialogTitle>
            <StatusBadge status={queue.status} />
          </div>
          <DialogDescription>
            {queue.description ||
              "Manage this queue's live activity and staff."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          key={`${queue.id}-${effectiveDefaultTab}`}
          defaultValue={effectiveDefaultTab}
          className="mt-4"
        >
          {/* Only show tabs that the user has permission to see */}
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${1 + (showStaffTab ? 1 : 0) + (showSettingsTab ? 1 : 0)}, 1fr)`,
            }}
          >
            <TabsTrigger value="live">Live Queue</TabsTrigger>
            {showStaffTab && <TabsTrigger value="staff">Staff</TabsTrigger>}
            {showSettingsTab && (
              <TabsTrigger value="settings">Settings</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="live">
            <LiveQueueList queue={queue} />
          </TabsContent>

          {showStaffTab && (
            <TabsContent value="staff">
              <StaffAssignmentPanel queue={queue} />
            </TabsContent>
          )}

          {showSettingsTab && (
            <TabsContent value="settings">
              <AddEditViewQueue
                record={queue}
                mode="edit"
                onSubmit={handleSettingsSubmit}
                isSubmitting={isSaving}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
