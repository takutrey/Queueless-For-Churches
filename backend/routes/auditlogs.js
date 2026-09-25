const express = require("express");
const router = express.Router();
const { passport, requireRole } = require("../config/passport");
const {
  getAllAuditLogs,
  getAuditStatistics,
  searchAuditLogs,
  exportAuditLogs,
  getUserAuditTrail,
  getEntityAuditHistory,
  getAuditLogById,
  cleanupAuditLogs,
} = require("../controllers/auditLogsController");

// Main routes
router.get(
  "/all-logs",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  getAllAuditLogs,
);

router.get(
  "/logs-statistics",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  getAuditStatistics,
);

router.get(
  "/search-logs",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  searchAuditLogs,
);

router.get(
  "/export-logs",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  exportAuditLogs,
);

// User specific routes
router.get(
  "/user/:userId",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  getUserAuditTrail,
);

// Entity specific routes
router.get(
  "/entity/:entity/:entityId",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  getEntityAuditHistory,
);

// Single log routes
router.get(
  "/audit-log/:id",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  getAuditLogById,
);

// Maintenance routes (admin only)
router.delete(
  "/audit-logs-cleanup",
  passport.authenticate("jwt", { session: false }),
  requireRole("admin"),
  cleanupAuditLogs,
);

module.exports = router;
