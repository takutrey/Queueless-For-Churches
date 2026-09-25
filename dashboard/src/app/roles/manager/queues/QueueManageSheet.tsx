// QueueManageSheet.tsx (modified)
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{queue.name}</SheetTitle>
            <StatusBadge status={queue.status} />
          </div>
          <SheetDescription>
            {queue.description ||
              "Manage this queue's live activity and staff."}
          </SheetDescription>
        </SheetHeader>

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
      </SheetContent>
    </Sheet>
  );
}
