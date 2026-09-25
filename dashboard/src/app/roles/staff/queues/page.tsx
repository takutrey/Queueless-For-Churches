// app/(dashboard)/queues/page.tsx (modified)
"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Copy,
  ExternalLink,
  ListChecks,
  Plus,
  Printer,
  Search,
  Users,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchQueues,
  createQueue,
  deleteQueue,
  updateQueue,
  setQueueStatus,
} from "@/lib/QueueSlice";
import type {
  CreateQueuePayload,
  Queue,
  QueueStatus,
} from "@/types/QueueTypes";
import { useQueueSocketEvents } from "@/contexts/SocketContext";
import { usePermissions } from "@/hooks/usePermissions";
import { QueueStatsBar } from "./QueueStatsBar";
import { QueueCard } from "./QueueCard";
import { QueueManageSheet } from "./QueueManageSheet";
import AddEditViewQueue from "./AddEditViewQueue";
import { LiveQueueList } from "./LiveQueueList";
import { QueueStatusMenu, StatusBadge } from "./QueueStatusMenu";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

function StaffQueuesPage({
  forceLiveView = false,
}: {
  forceLiveView?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: queues,
    status,
    error,
  } = useSelector((state: RootState) => state.authQueue.queues);
  const { socketConnected } = useSelector(
    (state: RootState) => state.authQueue.connection,
  );
  const { canCreateQueue, isStaff, userId } = usePermissions();

  useQueueSocketEvents();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdQueue, setCreatedQueue] = useState<Queue | null>(null);
  const [manageQueue, setManageQueue] = useState<Queue | null>(null);
  const [manageTab, setManageTab] = useState<"live" | "staff" | "settings">(
    "live",
  );
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{
    name: string;
    joinCode: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchQueues());
  }, [dispatch]);

  // Print the QR code + join code once the printable section has
  // rendered with the right data, then clear it once the print
  // dialog is dismissed.
  useEffect(() => {
    if (!printData) return;
    const frame = requestAnimationFrame(() => window.print());
    const clear = () => setPrintData(null);
    window.addEventListener("afterprint", clear);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", clear);
    };
  }, [printData]);

  const handlePrintJoinCode = (queue: Pick<Queue, "name" | "joinCode">) => {
    if (!queue.joinCode) {
      toast.error("This queue does not have a join code yet");
      return;
    }

    setPrintData({
      name: queue.name,
      joinCode: queue.joinCode,
      url: `${window.location.origin}/q/${queue.joinCode}`,
    });
  };

  const handleCopyJoinCode = (joinCode: string | null | undefined) => {
    if (!joinCode) {
      toast.error("This queue does not have a join code yet");
      return;
    }

    void navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied");
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // ---- Filter queues for staff ----
  const visibleQueues = isStaff
    ? queues.filter((q) =>
        q.staffAssignments?.some(
          (a) => a.userId === userId && a.status === "active",
        ),
      )
    : queues;

  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff && !forceLiveView) return;
    setSelectedQueueId((current) =>
      current && visibleQueues.some((queue) => queue.id === current)
        ? current
        : (visibleQueues[0]?.id ?? null),
    );
  }, [isStaff, forceLiveView, visibleQueues]);

  // ---- Handlers ----
  const handleCreateQueue = async (data: CreateQueuePayload) => {
    setIsSubmitting(true);
    try {
      const queue = await dispatch(createQueue(data)).unwrap();
      toast.success("Queue created");
      setIsCreateOpen(false);
      setCreatedQueue(queue);
    } catch (err: any) {
      toast.error(err || "Failed to create queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQueue = async (data: any) => {
    const { id, ...updateData } = data;
    return dispatch(updateQueue({ queueId: id, data: updateData })).unwrap();
  };

  const handleStatusChange = async (queueId: string, next: QueueStatus) => {
    try {
      await dispatch(setQueueStatus({ queueId, status: next })).unwrap();
      const label =
        next === "paused"
          ? "paused"
          : next === "closed"
            ? "closed"
            : "reopened";
      toast.success(`Queue ${label}`);
      if (manageQueue?.id === queueId) {
        setManageQueue({ ...manageQueue, status: next });
      }
    } catch (err: any) {
      toast.error(err || "Failed to update queue status");
    }
  };

  const handleManage = (
    queue: Queue,
    tab: "live" | "staff" | "settings" = "live",
  ) => {
    setManageQueue(queue);
    setManageTab(tab);
    setIsManageOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteQueue(deleteTarget)).unwrap();
      toast.success("Queue deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err || "Failed to delete queue");
    }
  };

  const liveManageQueue = manageQueue
    ? (queues.find((q) => q.id === manageQueue.id) ?? manageQueue)
    : null;

  const filteredQueues = visibleQueues.filter((q) =>
    q.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selectedQueue = visibleQueues.find((q) => q.id === selectedQueueId);

  // ---- Render ----
  return (
    <div className="container mx-auto py-10 p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <ListChecks className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? "View and manage your assigned queues"
              : "Monitor live activity and manage service queues for your church"}
          </p>
        </div>
        {canCreateQueue && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Queue
          </Button>
        )}
      </div>

      {/* Loading */}
      {status === "loading" && !queues.length ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <QueueStatsBar
            queues={visibleQueues}
            socketConnected={socketConnected}
          />

          {isStaff || forceLiveView ? (
            <div className="space-y-6">
              {visibleQueues.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {visibleQueues.map((queue) => (
                    <Button
                      key={queue.id}
                      variant={
                        selectedQueueId === queue.id ? "default" : "outline"
                      }
                      onClick={() => setSelectedQueueId(queue.id)}
                    >
                      {queue.name}
                    </Button>
                  ))}
                </div>
              )}

              {selectedQueue && (
                <section className="rounded-lg border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedQueue.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedQueue.description ||
                          "Manage customers in this assigned queue."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center gap-2 rounded-full border bg-muted/40 py-1 pl-3 pr-1">
                        <span className="text-xs text-muted-foreground">
                          Join code
                        </span>
                        <span className="font-mono text-sm font-semibold tracking-[0.15em]">
                          {selectedQueue.joinCode || "Unavailable"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          aria-label="Copy join code"
                          title="Copy join code"
                          onClick={() =>
                            handleCopyJoinCode(selectedQueue.joinCode)
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <a
                          href={`${window.location.origin}/q/${selectedQueue.joinCode}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open join page"
                          title="Open join page"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          aria-label="Print QR code"
                          title="Print QR code"
                          onClick={() => handlePrintJoinCode(selectedQueue)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {forceLiveView && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleManage(selectedQueue, "staff")}
                          >
                            <Users className="h-3.5 w-3.5" />
                            Assign staff
                          </Button>
                        )}
                        <StatusBadge status={selectedQueue.status} />
                        <QueueStatusMenu
                          status={selectedQueue.status}
                          onChange={(next) =>
                            handleStatusChange(selectedQueue.id, next)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <LiveQueueList queue={selectedQueue} />
                </section>
              )}
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Empty state */}
              {!filteredQueues.length ? (
                <div className="text-center text-sm text-muted-foreground py-16 rounded-lg border border-dashed">
                  {visibleQueues.length
                    ? "No queues match your search."
                    : isStaff
                      ? "You are not assigned to any queues yet."
                      : 'No queues yet. Click "Add Queue" to create your first one.'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredQueues.map((queue) => (
                    <QueueCard
                      key={queue.id}
                      queue={queue}
                      onStatusChange={handleStatusChange}
                      onManage={(q) => handleManage(q, "live")}
                      onEdit={(q) => handleManage(q, "settings")}
                      onDelete={(id) => setDeleteTarget(id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create dialog – only for owner/manager */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Queue</DialogTitle>
          </DialogHeader>
          <AddEditViewQueue
            mode="add"
            onSubmit={handleCreateQueue}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!createdQueue}
        onOpenChange={(open) => !open && setCreatedQueue(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Queue created</DialogTitle>
            <DialogDescription>
              Share this generated code or QR code with customers.
            </DialogDescription>
          </DialogHeader>
          {createdQueue && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-md border bg-white p-3">
                <QRCodeSVG
                  value={`${window.location.origin}/q/${createdQueue.joinCode}`}
                  size={200}
                  includeMargin
                />
              </div>
              <p className="text-center font-mono text-2xl font-semibold tracking-[0.25em]">
                {createdQueue.joinCode}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleCopyJoinCode(createdQueue.joinCode)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrintJoinCode(createdQueue)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage sheet */}
      <QueueManageSheet
        queue={liveManageQueue}
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        onUpdateQueue={handleUpdateQueue}
        defaultTab={manageTab}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Queue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this queue? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only QR code + join code sheet. Hidden on screen; the
          stylesheet below hides everything else on the page while this
          section is printed, so it comes out as a single clean page. */}
      {printData && (
        <div
          id="queue-print-section"
          className="fixed -left-[9999px] top-0 flex flex-col items-center justify-center gap-6 p-16 text-black"
        >
          <h1 className="text-3xl font-bold">{printData.name}</h1>
          <div className="rounded-md border bg-white p-4">
            <QRCodeSVG value={printData.url} size={260} includeMargin />
          </div>
          <p className="font-mono text-4xl font-semibold tracking-[0.3em]">
            {printData.joinCode}
          </p>
          <p className="text-sm text-muted-foreground">
            Scan the QR code or enter the code above to join the queue
          </p>
        </div>
      )}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #queue-print-section,
          #queue-print-section * {
            visibility: visible;
          }
          #queue-print-section {
            position: fixed;
            inset: 0;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default StaffQueuesPage;
