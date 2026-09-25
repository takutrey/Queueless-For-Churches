import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { getSocket, joinQueueRoom, joinCustomerRoom } from "../contexts/Socket";
import {
  fetchQueueEntry,
  entryStatusChanged,
  queueStatsUpdated,
  setConnectionStatus,
} from "../lib/QueueSlice";

/**
 * Connects to Socket.IO for a queue (+ optional customer ticket) and mirrors
 * real-time events into Redux. Matches the event names from section 28 of the
 * backend spec.
 *
 * entryStatus is passed in (rather than read from the store internally) so the
 * refetch-on-activity logic below always sees the latest value without having
 * to re-subscribe every time status changes.
 */
export default function useQueueSocket({
  churchId,
  queueId,
  customerToken,
  entryStatus,
}) {
  const dispatch = useDispatch();
  const joinedRef = useRef(false);
  const statusRef = useRef(entryStatus);

  useEffect(() => {
    statusRef.current = entryStatus;
  }, [entryStatus]);

  useEffect(() => {
    if (!queueId) return undefined;
    const socket = getSocket();

    function handleConnect() {
      dispatch(setConnectionStatus({ socketConnected: true }));
      if (!joinedRef.current) {
        joinQueueRoom({ churchId, queueId });
        if (customerToken) joinCustomerRoom({ queueId, customerToken });
        joinedRef.current = true;
      }
    }

    function handleDisconnect() {
      dispatch(setConnectionStatus({ socketConnected: false }));
      joinedRef.current = false;
    }

    // Authoritative updates about *this* customer's own ticket
    const onCalled = (payload) =>
      dispatch(entryStatusChanged({ status: "called", ...payload }));
    const onServing = (payload) =>
      dispatch(entryStatusChanged({ status: "serving", ...payload }));
    const onCompleted = (payload) =>
      dispatch(entryStatusChanged({ status: "completed", ...payload }));
    const onSkipped = (payload) =>
      dispatch(entryStatusChanged({ status: "skipped", ...payload }));
    const onHoldChanged = (payload) => dispatch(entryStatusChanged(payload));
    const onTransferred = (payload) =>
      dispatch(
        entryStatusChanged({
          status: "waiting",
          entryType: "transfer",
          ...payload,
        }),
      );
    const onRejoined = (payload) =>
      dispatch(entryStatusChanged({ status: "waiting", ...payload }));

    // Church-wide stat changes (currentNumber, waiting count, etc.)
    const onChurchQueueUpdated = (payload) =>
      dispatch(queueStatsUpdated(payload));

    // Queue-room activity that can shift *this* customer's position. The backend
    // doesn't currently push a peopleAhead delta over the socket (see section 54,
    // item 5 in the spec), so re-derive it with a light refetch instead of guessing.
    function refetchIfStillWaiting() {
      if (
        customerToken &&
        ["waiting", "standby", "called"].includes(statusRef.current)
      ) {
        dispatch(fetchQueueEntry(customerToken));
      }
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("customer:called", onCalled);
    socket.on("customer:serving", onServing);
    socket.on("customer:completed", onCompleted);
    socket.on("customer:skipped", onSkipped);
    socket.on("customer:holdChanged", onHoldChanged);
    socket.on("customer:transferred", onTransferred);
    socket.on("customer:rejoined", onRejoined);
    socket.on("church:queueUpdated", onChurchQueueUpdated);
    socket.on("queue:customerCalled", refetchIfStillWaiting);
    socket.on("queue:customerCompleted", refetchIfStillWaiting);
    socket.on("queue:customerSkipped", refetchIfStillWaiting);
    socket.on("queue:customerLeft", refetchIfStillWaiting);
    socket.on("queue:customerHeld", refetchIfStillWaiting);
    socket.on("queue:customerTransferred", refetchIfStillWaiting);

    if (socket.connected) handleConnect();
    else socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("customer:called", onCalled);
      socket.off("customer:serving", onServing);
      socket.off("customer:completed", onCompleted);
      socket.off("customer:skipped", onSkipped);
      socket.off("customer:holdChanged", onHoldChanged);
      socket.off("customer:transferred", onTransferred);
      socket.off("customer:rejoined", onRejoined);
      socket.off("church:queueUpdated", onChurchQueueUpdated);
      socket.off("queue:customerCalled", refetchIfStillWaiting);
      socket.off("queue:customerCompleted", refetchIfStillWaiting);
      socket.off("queue:customerSkipped", refetchIfStillWaiting);
      socket.off("queue:customerLeft", refetchIfStillWaiting);
      socket.off("queue:customerHeld", refetchIfStillWaiting);
      socket.off("queue:customerTransferred", refetchIfStillWaiting);
    };
  }, [churchId, queueId, customerToken, dispatch]);
}
