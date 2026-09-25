const db = require("../models/index");
const AuditLog = db.auditlogs;
const User = db.users;
const { Op } = db.Sequelize;

/**
 * Get all audit logs with filtering and pagination
 */
const getAllAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entity,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
      churchId: queryChurchId,
    } = req.query;

    // Build where clause
    const user = req.user;
    const whereClause = {};

    // ─── Church filtering ──────────────────────────────
    if (user.role === "superadmin") {
      // Superadmin can see all; optional filter by churchId
      if (queryChurchId) {
        whereClause.churchId = queryChurchId;
      }
      // else no filter – see all
    } else {
      // admin, manager, staff: only their own church
      if (!user.churchId) {
        return res.status(403).json({
          success: false,
          message: "User has no church assigned",
        });
      }
      whereClause.churchId = user.churchId;
    }

    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entity) whereClause.entity = entity;

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Search in metadata (JSON field)
    if (search) {
      whereClause[Op.or] = [
        { metadata: { [Op.like]: `%${search}%` } },
        { "$user.name$": { [Op.like]: `%${search}%` } },
        { "$user.email$": { [Op.like]: `%${search}%` } },
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    // Get logs with user details
    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit: parsedLimit,
      distinct: true,
    });

    // Calculate summary statistics
    const summary = await getAuditSummary(whereClause);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        summary,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parsedLimit,
          totalPages: Math.ceil(count / parsedLimit),
          hasNextPage: offset + parsedLimit < count,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

/**
 * Get audit log by ID
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
      error: error.message,
    });
  }
};

/**
 * Get user audit trail
 */
const getUserAuditTrail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const user = req.user;

    // Check if user exists
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role !== "superadmin") {
      if (targetUser.churchId !== user.churchId) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    }

    const whereClause = { userId };
    if (user.role !== "superadmin") {
      whereClause.churchId = user.churchId;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: parseInt(limit),
    });

    // Group by action type
    const actionSummary = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: `${user.name}`,
          email: user.email,
        },
        logs,
        actionSummary,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user audit trail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user audit trail",
      error: error.message,
    });
  }
};

/**
 * Get entity audit history
 */
const getEntityAuditHistory = async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const user = req.user;

    const whereClause = { entity, entityId };
    if (user.role === "superadmin") {
      // optional churchId filter
      if (req.query.churchId) {
        whereClause.churchId = req.query.churchId;
      }
    } else {
      if (!user.churchId) {
        return res
          .status(403)
          .json({ success: false, message: "No church assigned" });
      }
      whereClause.churchId = user.churchId;
    }

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Track changes over time
    const timeline = logs.map((log) => ({
      action: log.action,
      user: log.user ? `${log.user.name}` : "System",
      timestamp: log.createdAt,
      metadata: log.metadata,
    }));

    return res.status(200).json({
      success: true,
      data: {
        entity,
        entityId,
        totalChanges: logs.length,
        timeline,
        logs,
      },
    });
  } catch (error) {
    console.error("Error fetching entity audit history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch entity audit history",
      error: error.message,
    });
  }
};

/**
 * Get audit statistics
 */
const getAuditStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const user = req.user;

    // Build where clause with church filter
    const whereClause = {};
    if (user.role === "superadmin") {
      // optionally allow churchId query param
      if (req.query.churchId) {
        whereClause.churchId = req.query.churchId;
      }
    } else {
      if (!user.churchId) {
        return res
          .status(403)
          .json({ success: false, message: "No church assigned" });
      }
      whereClause.churchId = user.churchId;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get counts by action
    const actionCounts = await AuditLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        ...whereClause,
      },
      attributes: [
        "action",
        [db.Sequelize.fn("COUNT", db.Sequelize.col("action")), "count"],
      ],
      group: ["action"],
    });

    // Get counts by entity
    const entityCounts = await AuditLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        ...whereClause,
      },
      attributes: [
        "entity",
        [db.Sequelize.fn("COUNT", db.Sequelize.col("entity")), "count"],
      ],
      group: ["entity"],
    });

    // Get daily activity
    const dailyActivity = await AuditLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        ...whereClause,
      },
      attributes: [
        [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "date"],
        [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "count"],
      ],
      group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))],
      order: [[db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "ASC"]],
    });

    // Get most active users
    const activeUsers = await AuditLog.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        userId: { [Op.ne]: null },
        ...whereClause,
      },
      attributes: [
        "userId",
        [db.Sequelize.fn("COUNT", db.Sequelize.col("userId")), "actionCount"],
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
      group: ["userId", "user.id"],
      order: [[db.Sequelize.fn("COUNT", db.Sequelize.col("userId")), "DESC"]],
      limit: 10,
    });

    // Total logs count for the period
    const totalLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: startDate },
        ...whereClause,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        period: `${days} days`,
        totalLogs,
        actionCounts: actionCounts.map((item) => ({
          action: item.action,
          count: parseInt(item.dataValues.count),
        })),
        entityCounts: entityCounts.map((item) => ({
          entity: item.entity,
          count: parseInt(item.dataValues.count),
        })),
        dailyActivity: dailyActivity.map((item) => ({
          date: item.dataValues.date,
          count: parseInt(item.dataValues.count),
        })),
        mostActiveUsers: activeUsers.map((item) => ({
          userId: item.userId,
          user: item.user ? `${item.user.name}` : "Unknown",
          email: item.user?.email,
          actionCount: parseInt(item.dataValues.actionCount),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching audit statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit statistics",
      error: error.message,
    });
  }
};

/**
 * Search audit logs
 */
const searchAuditLogs = async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const user = req.user;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Build where clause with church filter
    const whereClause = {};
    if (user.role === "superadmin") {
      if (req.query.churchId) {
        whereClause.churchId = req.query.churchId;
      }
    } else {
      if (!user.churchId) {
        return res
          .status(403)
          .json({ success: false, message: "No church assigned" });
      }
      whereClause.churchId = user.churchId;
    }

    whereClause[Op.or] = [
      { action: { [Op.like]: `%${q}%` } },
      { entity: { [Op.like]: `%${q}%` } },
      { entityId: { [Op.like]: `%${q}%` } },
      { metadata: { [Op.like]: `%${q}%` } },
      { "$user.name$": { [Op.like]: `%${q}%` } },
      { "$user.email$": { [Op.like]: `%${q}%` } },
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: parseInt(limit),
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error searching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search audit logs",
      error: error.message,
    });
  }
};

/**
 * Export audit logs
 */
const exportAuditLogs = async (req, res) => {
  try {
    const {
      format = "json",
      startDate,
      endDate,
      userId,
      action,
      entity,
    } = req.query;
    const user = req.user;

    // Build where clause
    const whereClause = {};
    // apply church filter
    if (user.role === "superadmin") {
      if (req.query.churchId) {
        whereClause.churchId = req.query.churchId;
      }
    } else {
      if (!user.churchId) {
        return res
          .status(403)
          .json({ success: false, message: "No church assigned" });
      }
      whereClause.churchId = user.churchId;
    }
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (entity) whereClause.entity = entity;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (format === "csv") {
      // Convert to CSV
      const csvData = convertToCSV(logs);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${Date.now()}.csv`,
      );
      return res.status(200).send(csvData);
    } else {
      // Default JSON format
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${Date.now()}.json`,
      );
      return res.status(200).json(logs);
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export audit logs",
      error: error.message,
    });
  }
};

/**
 * Clean up old audit logs
 */
const cleanupAuditLogs = async (req, res) => {
  try {
    const { olderThan = 90 } = req.body; // Days to keep logs

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);

    const deletedCount = await AuditLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} audit logs older than ${olderThan} days`,
      data: {
        deletedCount,
        cutoffDate,
      },
    });
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cleanup audit logs",
      error: error.message,
    });
  }
};

/**
 * Helper function to get audit summary
 */
const getAuditSummary = async (whereClause) => {
  const totalLogs = await AuditLog.count({ where: whereClause });

  const actionBreakdown = await AuditLog.findAll({
    where: whereClause,
    attributes: [
      "action",
      [db.Sequelize.fn("COUNT", db.Sequelize.col("action")), "count"],
    ],
    group: ["action"],
  });

  const entityBreakdown = await AuditLog.findAll({
    where: whereClause,
    attributes: [
      "entity",
      [db.Sequelize.fn("COUNT", db.Sequelize.col("entity")), "count"],
    ],
    group: ["entity"],
  });

  // Get unique users count
  const uniqueUsers = await AuditLog.findAll({
    where: {
      ...whereClause,
      userId: { [Op.ne]: null },
    },
    attributes: [
      [db.Sequelize.fn("DISTINCT", db.Sequelize.col("userId")), "userId"],
    ],
  });

  return {
    totalLogs,
    uniqueUsers: uniqueUsers.length,
    actionBreakdown: actionBreakdown.map((item) => ({
      action: item.action,
      count: parseInt(item.dataValues.count),
    })),
    entityBreakdown: entityBreakdown.map((item) => ({
      entity: item.entity,
      count: parseInt(item.dataValues.count),
    })),
  };
};

/**
 * Helper function to convert logs to CSV
 */
const convertToCSV = (logs) => {
  const headers = [
    "Timestamp",
    "User",
    "Action",
    "Entity",
    "Entity ID",
    "IP Address",
    "User Agent",
    "Status Code",
  ];
  const rows = logs.map((log) => {
    const metadata = log.metadata || {};
    const userName = log.user ? `${log.user.name}` : "System";

    return [
      log.createdAt,
      userName,
      log.action,
      log.entity,
      log.entityId,
      metadata.ip || "N/A",
      metadata.userAgent || "N/A",
      metadata.statusCode || "N/A",
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  getUserAuditTrail,
  getEntityAuditHistory,
  getAuditStatistics,
  searchAuditLogs,
  exportAuditLogs,
  cleanupAuditLogs,
};
