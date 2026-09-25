const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const fs = require("fs");
const path = require("path");
const db = require("../models");

const publicKey = fs.readFileSync(
  path.join(__dirname, "../public.key"),
  "utf8",
);

let io;

/**
 * ==========================================
 * INITIALIZE SOCKET.IO
 * ==========================================
 */
const initializeSocket = (ioInstance) => {
  io = ioInstance;

  /**
   * ========================================
   * SOCKET AUTHENTICATION
   * ========================================
   */
  io.use((socket, next) => {
    try {
      const cookies = cookie.parseCookie(socket.handshake.headers.cookie || "");
      const token = socket.handshake.auth?.token || cookies.accessToken;

      /**
       * Customers do not need an account.
       *
       * They can connect without a JWT.
       */
      if (!token) {
        socket.isCustomer = true;
        return next();
      }

      const decoded = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
      });

      if (decoded.type !== "access") {
        return next(new Error("Invalid access token"));
      }

      socket.user = decoded;
      socket.isCustomer = false;

      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);

      next(new Error("Invalid authentication token"));
    }
  });

  /**
   * ==========================================
   * CONNECTION
   * ==========================================
   */
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    /**
     * ========================================
     * AUTHENTICATED USER
     * ========================================
     */
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);

      console.log(`👤 Joined user:${socket.user.id}`);

      /**
       * Automatically join church room
       */
      if (socket.user.churchId) {
        const churchId = socket.user.churchId;
        socket.join(`church:${churchId}`);

        console.log(`🏛️ Joined church:${churchId}`);
      }
    }

    /**
     * ========================================
     * CHURCH ROOM
     * ========================================
     *
     * Only authenticated staff should be able
     * to join arbitrary church rooms.
     */
    socket.on("join:church", (churchId) => {
      if (!churchId) return;

      const currentChurchId = socket.user?.churchId;
      if (!currentChurchId || currentChurchId !== churchId) {
        return;
      }

      socket.join(`church:${churchId}`);
    });

    /**
     * ========================================
     * QUEUE ROOM
     * ========================================
     *
     * Customers and staff can join a queue.
     */
    socket.on("join:queue", ({ churchId, queueId } = {}) => {
      if (!churchId || !queueId) {
        return;
      }

      /**
       * Authenticated users can only access
       * their own church.
       */
      const currentChurchId = socket.user?.churchId;
      if (currentChurchId && currentChurchId !== churchId) {
        return;
      }

      socket.join(`church:${churchId}`);

      socket.join(`queue:${queueId}`);

      console.log(`📋 ${socket.id} joined queue:${queueId}`);
    });

    /**
     * ========================================
     * CUSTOMER ROOM
     * ========================================
     *
     * Customers use their unique token.
     */
    socket.on("join:customer", ({ queueId, customerToken } = {}) => {
      if (!queueId || !customerToken) {
        return;
      }

      socket.join(`customer:${customerToken}`);

      socket.join(`queue:${queueId}`);

      console.log(`👤 Customer joined queue:${queueId}`);
    });

    socket.on("join:campaign", ({ churchId, campaignId } = {}) => {
      if (!campaignId) return;
      const currentChurchId = socket.user?.churchId;
      if (currentChurchId && currentChurchId !== churchId) return;
      socket.join(`campaign:${campaignId}`);
    });

    socket.on("join:campaign:admin", async ({ churchId, campaignId } = {}) => {
      const currentChurchId = socket.user?.churchId;
      if (!currentChurchId || !churchId || !campaignId) return;
      if (currentChurchId !== churchId) return;
      const campaign = await db.pledgeCampaigns.findOne({
        where: { id: campaignId, churchId },
        attributes: ["id"],
      });
      if (!campaign) return;
      socket.join(`campaign-admin:${campaignId}`);
    });

    socket.on("leave:campaign:admin", (campaignId) => {
      if (!campaignId) return;
      socket.leave(`campaign-admin:${campaignId}`);
    });

    /**
     * ========================================
     * LEAVE QUEUE
     * ========================================
     */
    socket.on("leave:queue", (queueId) => {
      if (!queueId) return;

      socket.leave(`queue:${queueId}`);
    });

    /**
     * ========================================
     * DISCONNECT
     * ========================================
     */
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} - ${reason}`);
    });
  });

  return io;
};

/**
 * ==========================================
 * GET IO
 * ==========================================
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
