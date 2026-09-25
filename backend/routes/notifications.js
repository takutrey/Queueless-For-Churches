const express = require("express");
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} = require("../controllers/notificationController");

const { passport } = require("../config/passport");

const authenticate = passport.authenticate("jwt", {
  session: false,
});

/**
 * GET /api/notifications
 */
router.get("/my-notifications", authenticate, getNotifications);

/**
 * GET /api/notifications/unread-count
 */
router.get("/unread-count", authenticate, getUnreadCount);

/**
 * PATCH /api/notifications/read-all
 */
router.patch("/read-all", authenticate, markAllAsRead);

/**
 * PATCH /api/notifications/:notificationId/read
 */
router.patch("/:notificationId/read", authenticate, markAsRead);

/**
 * DELETE /api/notifications/read
 */
router.delete("/read", authenticate, deleteReadNotifications);

/**
 * DELETE /api/notifications/:notificationId
 */
router.delete("/:notificationId", authenticate, deleteNotification);

module.exports = router;
