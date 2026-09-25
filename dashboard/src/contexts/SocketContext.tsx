// contexts/SocketContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { socketService } from "@/utils/socket";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store/store";
import type { AppDispatch } from "@/store/store";
import {
  queueCreatedRealtime,
  queueUpdatedRealtime,
  queueDeletedRealtime,
  customerCalledRealtime,
  customerServingRealtime,
  customerCompletedRealtime,
  customerSkippedRealtime,
  customerJoinedRealtime,
  customerRejoinedRealtime,
  customerLeftRealtime,
  staffAssignedRealtime,
  staffRemovedRealtime,
  setAuthConnectionStatus,
  fetchQueues,
} from "@/lib/QueueSlice";
import type { Queue, QueueEntry, StaffAssignment } from "@/types/QueueTypes";
import { toast } from "sonner";

// ─── Context ──────────────────────────────────────────────

interface SocketContextType {
  isConnected: boolean;
  joinChurch: (churchId: string) => void;
  joinQueue: (churchId: string, queueId: string) => void;
  joinCustomer: (queueId: string, customerToken: string) => void;
  leaveQueue: (queueId: string) => void;
  joinCampaign: (churchId: string, campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

// ─── Provider ──────────────────────────────────────────────

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);

  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user?.id) return;

    socketService.connect();

    const onConnect = () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    };

    const onConnectError = (err: any) => {
      console.error("⚠️ Socket connect error:", err.message);
      setIsConnected(false);
    };

    socketService.on("connect", onConnect);
    socketService.on("disconnect", onDisconnect);
    socketService.on("connect_error", onConnectError);

    return () => {
      socketService.off("connect", onConnect);
      socketService.off("disconnect", onDisconnect);
      socketService.off("connect_error", onConnectError);
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [user?.id, isAuthenticated, isLoading]);

  const value: SocketContextType = {
    isConnected,
    joinChurch: useCallback((id) => socketService.joinChurch(id), []),
    joinQueue: useCallback(
      (churchId, queueId) => socketService.joinQueue(churchId, queueId),
      [],
    ),
    joinCustomer: useCallback(
      (queueId, token) => socketService.joinCustomer(queueId, token),
      [],
    ),
    leaveQueue: useCallback((queueId) => socketService.leaveQueue(queueId), []),
    joinCampaign: useCallback(
      (churchId, campaignId) =>
        socketService.joinCampaign(churchId, campaignId),
      [],
    ),
    leaveCampaign: useCallback(
      (campaignId) => socketService.leaveCampaign(campaignId),
      [],
    ),
    on: useCallback((event, cb) => socketService.on(event, cb), []),
    off: useCallback((event, cb) => socketService.off(event, cb), []),
    emit: useCallback((event, data) => socketService.emit(event, data), []),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

// ─── Custom Hooks ──────────────────────────────────────────

/**
 * Hook that registers all queue/customer socket listeners and dispatches
 * Redux actions accordingly. Call this once at the top of the page where
 * you want real‑time updates (e.g., the Queues page).
 */
export function useQueueSocketEvents() {
  const dispatch = useDispatch<AppDispatch>();
  const { on, off, isConnected } = useSocket();

  useEffect(() => {
    const handleConnect = () => {
      dispatch(setAuthConnectionStatus({ socketConnected: true }));
      // Refresh queues to catch up on missed events
      dispatch(fetchQueues());
    };

    const handleDisconnect = () => {
      dispatch(setAuthConnectionStatus({ socketConnected: false }));
    };

    // ── Queue lifecycle ──
    const onQueueCreated = (queue: Queue) =>
      dispatch(queueCreatedRealtime(queue));

    const onQueueUpdated = (queue: Queue) => {
      dispatch(queueUpdatedRealtime(queue));
      if (queue.status === "paused") {
        toast.info(`${queue.name} was paused`);
      } else if (queue.status === "closed") {
        toast.info(`${queue.name} was closed`);
      }
    };

    const onQueueDeleted = (payload: { queueId: string }) =>
      dispatch(queueDeletedRealtime(payload));

    // ── Customer movement ──
    const onCustomerJoined = (entry: QueueEntry) =>
      dispatch(customerJoinedRealtime(entry.entry ?? entry));

    const onCustomerRejoined = (entry: QueueEntry) =>
      dispatch(customerRejoinedRealtime(entry));

    const onChurchQueueUpdated = () => {
      dispatch(fetchQueues());
    };

    const onCustomerCalled = (entry: QueueEntry) =>
      dispatch(customerCalledRealtime(entry));

    const onCustomerServing = (entry: QueueEntry) =>
      dispatch(customerServingRealtime(entry));

    const onCustomerCompleted = (entry: { id: string; queueId: string }) =>
      dispatch(customerCompletedRealtime(entry));

    const onCustomerSkipped = (entry: { id: string; queueId: string }) =>
      dispatch(customerSkippedRealtime(entry));

    const onCustomerLeft = (entry: { id: string; queueId: string }) =>
      dispatch(customerLeftRealtime(entry));

    // ── Staff assignments ──
    const onStaffAssigned = (assignment: StaffAssignment) =>
      dispatch(staffAssignedRealtime(assignment));

    const onStaffRemoved = (payload: { queueId: string; userId: string }) =>
      dispatch(staffRemovedRealtime(payload));

    // Register listeners
    on("connect", handleConnect);
    on("disconnect", handleDisconnect);
    on("queue:created", onQueueCreated);
    on("queue:updated", onQueueUpdated);
    on("queue:deleted", onQueueDeleted);
    on("queue:customerJoined", onCustomerJoined);
    on("queue:customerRejoined", onCustomerRejoined);
    on("church:queueUpdated", onChurchQueueUpdated);
    on("queue:customerCalled", onCustomerCalled);
    on("queue:customerServing", onCustomerServing);
    on("queue:customerCompleted", onCustomerCompleted);
    on("queue:customerSkipped", onCustomerSkipped);
    on("queue:customerLeft", onCustomerLeft);
    on("queue:staffAssigned", onStaffAssigned);
    on("queue:staffRemoved", onStaffRemoved);

    // If socket is already connected, set the flag now
    if (isConnected) {
      dispatch(setAuthConnectionStatus({ socketConnected: true }));
    }

    return () => {
      off("connect", handleConnect);
      off("disconnect", handleDisconnect);
      off("queue:created", onQueueCreated);
      off("queue:updated", onQueueUpdated);
      off("queue:deleted", onQueueDeleted);
      off("queue:customerJoined", onCustomerJoined);
      off("queue:customerRejoined", onCustomerRejoined);
      off("church:queueUpdated", onChurchQueueUpdated);
      off("queue:customerCalled", onCustomerCalled);
      off("queue:customerServing", onCustomerServing);
      off("queue:customerCompleted", onCustomerCompleted);
      off("queue:customerSkipped", onCustomerSkipped);
      off("queue:customerLeft", onCustomerLeft);
      off("queue:staffAssigned", onStaffAssigned);
      off("queue:staffRemoved", onStaffRemoved);
    };
  }, [dispatch, on, off, isConnected]);
}

/**
 * Hook to join/leave a specific queue’s room while its Live Queue tab is open.
 * @param queueId - the queue ID
 * @param churchId - the church ID (required by the socket service)
 */
export function useQueueRoom(queueId: string | null, churchId: string | null) {
  const { joinQueue, leaveQueue } = useSocket();

  useEffect(() => {
    if (!queueId || !churchId) return;

    joinQueue(churchId, queueId);

    return () => {
      leaveQueue(queueId);
    };
  }, [queueId, churchId, joinQueue, leaveQueue]);
}
