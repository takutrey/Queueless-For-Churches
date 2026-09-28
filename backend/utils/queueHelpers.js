const db = require("../models");
const { Op } = require("sequelize");

const Queue = db.queues;
const Church = db.churches;
const User = db.users;
const QueueStaff = db.queueStaff;
const Campaign = db.pledgeCampaigns;

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a URL-friendly slug
 */
const generateSlug = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Generate a unique queue slug for a church
 */
const generateUniqueSlug = async (churchId, name, excludeId = null) => {
  const baseSlug = generateSlug(name);

  let slug = baseSlug || "queue";
  let counter = 2;

  while (true) {
    const where = { churchId: churchId || null, slug };

    if (excludeId) {
      where.id = {
        [Op.ne]: excludeId,
      };
    }

    const existing = await Queue.findOne({ where });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Generate queue prefix from name
 *
 * Pharmacy -> P
 * Prescription Pickup -> PP
 * Customer Service -> CS
 */
const generateQueuePrefix = (name) => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return (
      words[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 2)
        .toUpperCase() || "Q"
    );
  }

  return words
    .map((word) => word[0])
    .join("")
    .substring(0, 5)
    .toUpperCase();
};

/**
 * Validate queue prefix
 */
const validateQueuePrefix = (prefix) => {
  if (!prefix) {
    return false;
  }

  return /^[A-Z0-9]{1,5}$/.test(prefix);
};

const generateJoinCode = () => {
  let code = "";

  for (let index = 0; index < 8; index++) {
    code +=
      JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }

  return code;
};

/**
 * Format ticket number
 *
 * P + 001
 * P + 002
 * CS + 001
 */
const formatTicketNumber = (prefix, number) => {
  return `${prefix}${String(number).padStart(3, "0")}`;
};

/**
 * Check church exists and is active
 */
const getActiveChurch = async (churchId) => {
  if (!churchId) {
    return null;
  }

  return await Church.findOne({
    where: {
      id: churchId,
      status: "active",
    },
  });
};

const getActiveCampaign = async (campaignId, churchId) => {
  if (!campaignId || !churchId) return null;

  return Campaign.findOne({
    where: { id: campaignId, churchId, status: "ACTIVE" },
    include: [
      {
        model: Church,
        as: "church",
        attributes: ["id"],
        include: [
          {
            model: db.churchSettings,
            as: "churchSettings",
            attributes: ["currency"],
            required: false,
          },
        ],
      },
    ],
  });
};

/**
 * Find a queue belonging to a church
 */
const getChurchQueue = async (queueId, churchId) => {
  return await Queue.findOne({
    where: {
      id: queueId,
      churchId,
    },
  });
};

const getQueueCampaign = async (campaignId, churchId) => {
  if (!campaignId || !churchId) return null;
  return Campaign.findOne({
    where: { id: campaignId, churchId },
    include: [
      {
        model: Church,
        as: "church",
        attributes: ["id"],
        include: [
          {
            model: db.churchSettings,
            as: "churchSettings",
            attributes: ["currency"],
            required: false,
          },
        ],
      },
    ],
  });
};

/**
 * Check whether a user belongs to a church
 */
const getChurchUser = async (userId, churchId) => {
  return await User.findOne({
    where: {
      id: userId,
      churchId,
      isActive: true,
    },
  });
};

/**
 * Check if staff member is assigned to queue
 */
const getQueueStaffAssignment = async (queueId, userId) => {
  return await QueueStaff.findOne({
    where: {
      queueId,
      userId,
      status: "active",
    },
  });
};

/**
 * Emit Socket.IO event if Socket.IO is configured
 */
const emitQueueEvent = (req, event, data, room = null) => {
  try {
    const io = req.app.get("io");

    if (!io) {
      return;
    }

    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  } catch (error) {
    console.error("Socket event error:", error.message);
  }
};

/**
 * Queue room
 *
 * Every queue gets its own Socket.IO room.
 */
const getQueueRoom = (queueId) => {
  return `queue:${queueId}`;
};

/**
 * Church room
 */
const getChurchRoom = (churchId) => {
  return `church:${churchId}`;
};

/**
 * Get queue statistics
 */
const getQueueStats = async (queueId) => {
  const entries = await db.queueEntries.findAll({
    where: {
      queueId,
    },
    attributes: ["status", "entryType"],
  });

  const stats = {
    total: entries.length,
    waiting: 0,
    standby: 0,
    transfer: 0,
    called: 0,
    serving: 0,
    completed: 0,
    skipped: 0,
    left: 0,
  };

  entries.forEach((entry) => {
    if (stats[entry.status] !== undefined) {
      stats[entry.status]++;
    }
    if (entry.entryType === "transfer" && entry.status === "waiting") {
      stats.transfer++;
    }
  });

  return stats;
};

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generateQueuePrefix,
  generateJoinCode,
  validateQueuePrefix,
  formatTicketNumber,
  getQueueStaffAssignment,
  getChurchQueue,
  getQueueCampaign,
  getChurchUser,
  getActiveCampaign,
  emitQueueEvent,
  getQueueRoom,
  getChurchRoom,
  getQueueStats,
  getActiveChurch,
};
