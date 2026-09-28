const db = require("../models/index");
const { getIO } = require("../config/socket");

const Notification = db.notifications;

/**
 * ==========================================
 * CREATE NOTIFICATION
 * ==========================================
 *
 * Creates the notification in the database and
 * immediately pushes it through Socket.IO.
 *
 * userId:
 *   Specific user notification.
 *
 * queueId:
 *   Notification related to a queue.
 *
 * churchId:
 *   Church-wide notification.
 */
const createNotification = async ({
  churchId,
  userId = null,
  queueId = null,
  queueEntryId = null,
  type,
  title,
  message,
}) => {
  const resolvedChurchId = churchId || null;

  try {
    const notification = await Notification.create({
      churchId: resolvedChurchId,
      userId,
      queueId,
      queueEntryId,
      type,
      title,
      message,
    });

    const payload = {
      id: notification.id,
      churchId: notification.churchId,
      userId: notification.userId,
      queueId: notification.queueId,
      queueEntryId: notification.queueEntryId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };

    /**
     * Socket notification
     *
     * Socket failures should NEVER cause the
     * main database operation to fail.
     */
    try {
      const io = getIO();

      /**
       * Specific user
       */
      if (userId) {
        io.to(`user:${userId}`).emit("notification:new", payload);
      }

      /**
       * Church
       */
      if (resolvedChurchId) {
        io.to(`church:${resolvedChurchId}`).emit("notification:new", payload);
      }
    } catch (socketError) {
      console.error("Notification socket error:", socketError.message);
    }

    return notification;
  } catch (error) {
    console.error("Notification creation error:", error);

    return null;
  }
};

/**
 * ==========================================
 * QUEUE EVENT
 * ==========================================
 */
const emitQueueEvent = (queueId, event, data) => {
  try {
    const io = getIO();

    io.to(`queue:${queueId}`).emit(event, data);
  } catch (error) {
    console.error("Queue socket event error:", error.message);
  }
};

/**
 * ==========================================
 * CHURCH EVENT
 * ==========================================
 */
const emitChurchEvent = (churchId, event, data) => {
  try {
    const io = getIO();

    io.to(`church:${churchId}`).emit(event, data);
  } catch (error) {
    console.error("Church socket event error:", error.message);
  }
};

const emitPublicEvent = (event, data) => {
  try {
    getIO().emit(event, data);
  } catch (error) {
    console.error("Public socket event error:", error.message);
  }
};

/**
 * ==========================================
 * CUSTOMER EVENT
 * ==========================================
 */
const emitCustomerEvent = (customerToken, event, data) => {
  try {
    const io = getIO();

    io.to(`customer:${customerToken}`).emit(event, data);
  } catch (error) {
    console.error("Customer socket event error:", error.message);
  }
};

/**
 * ==========================================
 * USER EVENT
 * ==========================================
 */
const emitUserEvent = (userId, event, data) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    console.error("User socket event error:", error.message);
  }
};

module.exports = {
  createNotification,
  emitQueueEvent,
  emitChurchEvent,
  emitPublicEvent,
  emitCustomerEvent,
  emitUserEvent,
};
