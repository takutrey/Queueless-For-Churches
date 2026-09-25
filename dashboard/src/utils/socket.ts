// utils/socket.ts
import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  // Track joined rooms for reconnection
  private joinedRooms = {
    church: new Set<string>(),
    queue: new Set<string>(),
    customer: new Set<string>(),
    campaign: new Map<string, string>(),
  };

  connect() {
    if (this.socket && (this.socket.connected || this.socket.active)) {
      console.log("Socket already connected or connecting, reusing");
      return;
    }

    const rawUrl =
      import.meta.env.VITE_API_URL ??
      "https://queueless-for-churches.onrender.com";
    const serverOrigin = (() => {
      try {
        const u = new URL(rawUrl);
        return `${u.protocol}//${u.host}`;
      } catch {
        return "https://queueless-for-churches.onrender.com";
      }
    })();

    console.log(`Connecting to socket server at ${serverOrigin}`);

    // ✅ No auth token – cookies will be sent automatically
    this.socket = io(serverOrigin, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true, // sends cookies
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected successfully");
      this.restoreRooms(); // re‑join previous rooms
      this.listeners.get("connect")?.forEach((cb) => cb());
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.listeners.get("disconnect")?.forEach((cb) => cb(reason));
    });

    this.socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connect error:", err.message);
      this.listeners.get("connect_error")?.forEach((cb) => cb(err));
    });

    // Re‑attach any custom listeners
    this.listeners.forEach((callbacks, event) => {
      if (!["connect", "disconnect", "connect_error"].includes(event)) {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback as any);
        });
      }
    });
  }

  disconnect() {
    if (!this.socket) return;
    console.log("Disconnecting socket...");
    this.socket.disconnect();
    this.socket = null;
  }

  // ─── ROOM MANAGEMENT ────────────────────────────────

  joinChurch(churchId: string) {
    this.joinedRooms.church.add(churchId);
    if (this.socket?.connected) {
      this.socket.emit("join:church", churchId);
      console.log(`Joined church:${churchId}`);
    }
  }

  joinQueue(churchId: string, queueId: string) {
    this.joinedRooms.queue.add(queueId);
    if (this.socket?.connected) {
      this.socket.emit("join:queue", { churchId, queueId });
      console.log(`📋 Joined queue:${queueId}`);
    }
  }

  joinCustomer(queueId: string, customerToken: string) {
    this.joinedRooms.customer.add(customerToken);
    if (this.socket?.connected) {
      this.socket.emit("join:customer", { queueId, customerToken });
      console.log(`👤 Joined customer:${customerToken}`);
    }
  }

  leaveQueue(queueId: string) {
    this.joinedRooms.queue.delete(queueId);
    if (this.socket?.connected) {
      this.socket.emit("leave:queue", queueId);
      console.log(`📋 Left queue:${queueId}`);
    }
  }

  leaveChurch(churchId: string) {
    this.joinedRooms.church.delete(churchId);
    if (this.socket?.connected) {
      this.socket.emit("leave:church", churchId);
    }
  }

  joinCampaign(churchId: string, campaignId: string) {
    this.joinedRooms.campaign.set(campaignId, churchId);
    if (this.socket?.connected) {
      this.socket.emit("join:campaign", { churchId, campaignId });
    }
  }

  leaveCampaign(campaignId: string) {
    this.joinedRooms.campaign.delete(campaignId);
    if (this.socket?.connected) {
      this.socket.emit("leave:campaign:admin", campaignId);
    }
  }

  // ─── RESTORE ROOMS AFTER RECONNECTION ──────────────

  private restoreRooms() {
    if (!this.socket?.connected) return;
    console.log("Restoring rooms after reconnection...");

    // Restore church rooms and campaign/admin rooms after reconnect.
    this.joinedRooms.church.forEach((id) => {
      this.socket?.emit("join:church", id);
      this.socket?.emit("join:church", id);
    });
    this.joinedRooms.campaign.forEach((churchId, campaignId) => {
      this.socket?.emit("join:campaign", { churchId, campaignId });
    });
  }

  // ─── GENERIC EVENT HANDLERS ─────────────────────────

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    if (!set.has(callback)) {
      set.add(callback);
      if (this.socket) {
        this.socket.on(event, callback as any);
      }
    }
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.listeners.get(event)?.forEach((cb) => {
        if (this.socket) {
          this.socket.off(event, cb as any);
        }
      });
      this.listeners.delete(event);
    }
  }

  emit(event: string, data?: any) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected - cannot emit", event);
      return;
    }
    this.socket.emit(event, data);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
