const db = require("../models/index");
const { Op } = require("sequelize");

const Notification = db.notifications;
const Queue = db.queues;

/**
 * ==========================================
 * GET MY NOTIFICATIONS
 * ==========================================
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;

    if (!churchId) {
      return res.status(400).json({
        message: "User is not associated with a church",
      });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const offset = (pageNumber - 1) * limitNumber;

    /**
     * A notification can be:
     *
     * 1. Specifically for this user
     * 2. For the entire church
     *
     * Therefore we return:
     *
     * userId = current user
     * OR
     * userId IS NULL
     */
    const where = {
      churchId,
      [Op.or]: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
    };

    if (unreadOnly === true || unreadOnly === "true") {
      where.isRead = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name", "slug"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNumber,
      offset,
    });

    return res.status(200).json({
      notifications: rows,
      pagination: {
        total: count,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(count / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET UNREAD COUNT
 * ==========================================
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;

    if (!churchId) {
      return res.status(400).json({
        message: "User is not associated with a church",
      });
    }

    const count = await Notification.count({
      where: {
        churchId,
        isRead: false,
        [Op.or]: [
          {
            userId,
          },
          {
            userId: null,
          },
        ],
      },
    });

    return res.status(200).json({
      count,
    });
  } catch (error) {
    console.error("Get unread notification count error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * MARK ONE NOTIFICATION AS READ
 * ==========================================
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        churchId,
        [Op.or]: [
          {
            userId,
          },
          {
            userId: null,
          },
        ],
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();

      await notification.save();
    }

    /**
     * Tell the connected client immediately
     */
    const io = req.app.get("io");

    if (io) {
      io.to(`user:${userId}`).emit("notification:read", {
        notificationId: notification.id,
        readAt: notification.readAt,
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * MARK ALL NOTIFICATIONS AS READ
 * ==========================================
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;

    if (!churchId) {
      return res.status(400).json({
        message: "User is not associated with a church",
      });
    }

    const now = new Date();

    await Notification.update(
      {
        isRead: true,
        readAt: now,
      },
      {
        where: {
          churchId,
          isRead: false,
          [Op.or]: [
            {
              userId,
            },
            {
              userId: null,
            },
          ],
        },
      },
    );

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${userId}`).emit("notification:allRead", {
        readAt: now,
      });
    }

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * DELETE ONE NOTIFICATION
 * ==========================================
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        churchId,
        [Op.or]: [
          {
            userId,
          },
          {
            userId: null,
          },
        ],
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    await notification.destroy();

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${userId}`).emit("notification:deleted", {
        notificationId,
      });
    }

    return res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * DELETE ALL READ NOTIFICATIONS
 * ==========================================
 */
const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.churchId;

    await Notification.destroy({
      where: {
        churchId,
        isRead: true,
        [Op.or]: [
          {
            userId,
          },
          {
            userId: null,
          },
        ],
      },
    });

    return res.status(200).json({
      message: "Read notifications deleted successfully",
    });
  } catch (error) {
    console.error("Delete read notifications error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
};
