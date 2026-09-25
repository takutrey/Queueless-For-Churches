import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5010";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function joinQueueRoom({ churchId, queueId }) {
  getSocket().emit("join:queue", { churchId, queueId });
}

export function joinCustomerRoom({ queueId, customerToken }) {
  getSocket().emit("join:customer", { queueId, customerToken });
}

export function joinCampaignRoom({ churchId, campaignId }) {
  getSocket().emit("join:campaign", { churchId, campaignId });
}
