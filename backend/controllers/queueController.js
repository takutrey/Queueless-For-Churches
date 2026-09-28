const db = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");

const Queue = db.queues;
const QueueEntry = db.queueEntries;
const QueueStaff = db.queueStaff;
const User = db.users;
const Church = db.churches;
const Campaign = db.pledgeCampaigns;
const Pledge = db.pledges;

const {
  generateUniqueSlug,
  generateQueuePrefix,
  generateJoinCode,
  formatTicketNumber,
  getActiveCampaign,
  getQueueCampaign,
  getChurchQueue,
  getChurchUser,
  getQueueStaffAssignment,
  getQueueStats,
  getActiveChurch,
} = require("../utils/queueHelpers");
const {
  normalizePhone,
  getMatchStatus,
} = require("../utils/queuePledgeHelpers");
const { getPledgeRemaining } = require("../utils/pledgeHelpers");
const { createPublicPledge } = require("./pledgeController");
const canControlAnyQueue = (user) =>
  ["admin", "manager", "super-admin", "superadmin"].includes(user.role?.name);

const {
  createNotification,
  emitQueueEvent,
  emitChurchEvent,
  emitPublicEvent,
  emitCustomerEvent,
} = require("../utils/notificationHelper");

const ensureJoinCode = async (queue) => {
  if (queue.joinCode) return queue;

  let joinCode = generateJoinCode();
  while (await Queue.findOne({ where: { joinCode } })) {
    joinCode = generateJoinCode();
  }

  await queue.update({ joinCode });
  return queue;
};

const queueCampaignInclude = {
  model: Campaign,
  as: "campaign",
  required: false,
  attributes: ["id", "title", "status"],
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
};

const serializeQueue = (queue) => {
  const result = queue.toJSON();
  result.serviceType = result.serviceType || "GENERAL";
  result.campaign = result.campaign
    ? {
        id: result.campaign.id,
        title: result.campaign.title,
        status: result.campaign.status,
        ...(result.campaign.church?.churchSettings?.currency
          ? { currency: result.campaign.church.churchSettings.currency }
          : {}),
      }
    : null;
  return result;
};

const serializePublicQueue = (queue, stats) => ({
  id: queue.id,
  churchId: queue.churchId,
  name: queue.name,
  slug: queue.slug,
  joinCode: queue.joinCode,
  prefix: queue.prefix,
  description: queue.description,
  status: queue.status,
  currentNumber: queue.currentNumber,
  nextNumber: queue.nextNumber,
  estimatedServiceTime: queue.estimatedServiceTime,
  maxCustomers: queue.maxCustomers,
  allowWalkIns: queue.allowWalkIns,
  serviceType: queue.serviceType || "GENERAL",
  campaignTitle: queue.campaign?.title || null,
  church: queue.church
    ? { id: queue.church.id, name: queue.church.name }
    : null,
  stats,
});

const getQueueService = async (queue, entry, transaction) => {
  const campaign = queue.campaignId
    ? await getQueueCampaign(queue.campaignId, queue.churchId)
    : null;
  let matchedPledges = [];

  if (queue.campaignId && entry.customerPhone) {
    const phone = normalizePhone(entry.customerPhone);
    if (phone) {
      const candidates = await Pledge.findAll({
        where: { campaignId: queue.campaignId },
        attributes: ["id", "phone"],
      });
      const matchingIds = candidates
        .filter((candidate) => normalizePhone(candidate.phone) === phone)
        .map((candidate) => candidate.id);

      if (matchingIds.length) {
        const pledges = await Pledge.findAll({
          where: { id: { [Op.in]: matchingIds }, campaignId: queue.campaignId },
          attributes: [
            "id",
            "name",
            "phone",
            "monetaryAmount",
            "fulfilledMonetaryAmount",
            "status",
          ],
          include: [
            {
              model: db.pledgeItems,
              as: "items",
              attributes: [
                "id",
                "campaignItemId",
                "quantity",
                "fulfilledQuantity",
              ],
              include: [
                {
                  model: db.pledgeCampaignItems,
                  as: "campaignItem",
                  attributes: ["name", "unit"],
                },
              ],
            },
          ],
          order: [["createdAt", "ASC"]],
        });

        matchedPledges = pledges.map((pledge) => {
          const remaining = getPledgeRemaining(pledge);
          return {
            id: pledge.id,
            name: pledge.name,
            phone: pledge.phone,
            monetaryAmount: pledge.monetaryAmount,
            fulfilledMonetaryAmount: pledge.fulfilledMonetaryAmount,
            remainingMonetaryAmount: remaining.monetaryRemaining,
            status: pledge.status,
            items: (pledge.items || []).map((item) => ({
              id: item.id,
              campaignItemId: item.campaignItemId,
              name: item.campaignItem?.name || "Material item",
              unit: item.campaignItem?.unit || "",
              quantity: item.quantity,
              fulfilledQuantity: item.fulfilledQuantity,
              remainingQuantity:
                remaining.items.find((entry) => entry.pledgeItemId === item.id)
                  ?.remainingQuantity || "0.000",
            })),
          };
        });
      }
    }
  }

  return {
    type: "PLEDGE_CAMPAIGN",
    campaign: campaign
      ? {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status,
          ...(campaign.church?.churchSettings?.currency
            ? { currency: campaign.church.churchSettings.currency }
            : {}),
        }
      : null,
    matchedPledges,
    matchStatus: getMatchStatus(matchedPledges),
  };
};

const parseQueueCallRange = (payload = {}) => {
  if (payload.entryId) {
    return {
      kind: "single",
      entryId: payload.entryId,
      queueNumbers: [],
    };
  }

  const rawRange = payload.range ?? payload.callRange ?? payload.rangeText;
  if (typeof rawRange === "string" && rawRange.trim()) {
    const normalized = rawRange
      .trim()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, "")
      .replace(/to/gi, "-");

    const rangeMatch = normalized.match(
      /^([A-Za-z0-9]{0,5})?(\d+)-([A-Za-z0-9]{0,5})?(\d+)$/i,
    );
    if (rangeMatch) {
      const startNumber = Number(rangeMatch[2]);
      const endNumber = Number(rangeMatch[4]);
      if (
        !Number.isNaN(startNumber) &&
        !Number.isNaN(endNumber) &&
        endNumber >= startNumber
      ) {
        return {
          kind: "batch",
          entryId: null,
          queueNumbers: Array.from(
            { length: endNumber - startNumber + 1 },
            (_, index) => startNumber + index,
          ),
        };
      }
    }

    const plainRange = normalized.match(/^(\d+)-(\d+)$/);
    if (plainRange) {
      const startNumber = Number(plainRange[1]);
      const endNumber = Number(plainRange[2]);
      if (endNumber >= startNumber) {
        return {
          kind: "batch",
          entryId: null,
          queueNumbers: Array.from(
            { length: endNumber - startNumber + 1 },
            (_, index) => startNumber + index,
          ),
        };
      }
    }
  }

  const fromNumber = Number(
    payload.fromNumber ?? payload.from ?? payload.startNumber ?? payload.start,
  );
  const toNumber = Number(
    payload.toNumber ?? payload.to ?? payload.endNumber ?? payload.end,
  );

  if (
    Number.isFinite(fromNumber) &&
    Number.isFinite(toNumber) &&
    fromNumber > 0 &&
    toNumber >= fromNumber
  ) {
    return {
      kind: "batch",
      entryId: null,
      queueNumbers: Array.from(
        { length: toNumber - fromNumber + 1 },
        (_, index) => fromNumber + index,
      ),
    };
  }

  return {
    kind: "single",
    entryId: null,
    queueNumbers: [],
  };
};

/**
 * ==========================================
 * CREATE QUEUE
 * ==========================================
 */
const createQueue = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const {
      name,
      description,
      estimatedServiceTime,
      allowWalkIns,
      serviceType = "GENERAL",
      campaignId,
    } = req.body;

    if (!churchId) {
      return res.status(400).json({
        message: "User is not associated with a church",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Queue name is required",
      });
    }

    const church = await getActiveChurch(churchId);

    if (!church) {
      return res.status(403).json({
        message: "Church not found or inactive",
      });
    }

    if (!["GENERAL", "PLEDGE_CAMPAIGN"].includes(serviceType)) {
      return res.status(400).json({
        message: "Service type must be GENERAL or PLEDGE_CAMPAIGN",
      });
    }

    let campaign = null;
    if (serviceType === "PLEDGE_CAMPAIGN") {
      if (!campaignId) {
        return res.status(400).json({
          message: "A pledge campaign is required for this service type",
        });
      }
      campaign = await getActiveCampaign(campaignId, churchId);
      if (!campaign) {
        const existingCampaign = await getQueueCampaign(campaignId, churchId);
        return res.status(existingCampaign ? 400 : 404).json({
          message: existingCampaign
            ? "The selected campaign is not active"
            : "The selected campaign was not found for this church",
        });
      }
    }

    const queueName = name.trim();

    /**
     * Prevent duplicate queue names
     * within the same church.
     */
    const existingQueue = await Queue.findOne({
      where: {
        churchId,
        name: queueName,
      },
    });

    if (existingQueue) {
      return res.status(409).json({
        message: "A queue with this name already exists",
      });
    }

    /**
     * Prefix
     */
    const queuePrefix = generateQueuePrefix(queueName);

    /**
     * Service time
     */
    const serviceTime =
      estimatedServiceTime !== undefined ? Number(estimatedServiceTime) : 10;

    if (!Number.isInteger(serviceTime) || serviceTime <= 0) {
      return res.status(400).json({
        message: "Estimated service time must be a positive number",
      });
    }

    const slug = await generateUniqueSlug(churchId, queueName);

    let joinCode = generateJoinCode();
    while (await Queue.findOne({ where: { joinCode } })) {
      joinCode = generateJoinCode();
    }

    const queue = await Queue.create({
      churchId,
      name: queueName,
      serviceType,
      campaignId: serviceType === "PLEDGE_CAMPAIGN" ? campaign.id : null,
      slug,
      joinCode,
      prefix: queuePrefix,
      description:
        description && description.trim() ? description.trim() : null,
      status: "open",
      currentNumber: 0,
      nextNumber: 1,
      estimatedServiceTime: serviceTime,
      maxCustomers: null,
      allowWalkIns: allowWalkIns !== undefined ? Boolean(allowWalkIns) : true,
    });

    /**
     * Socket
     */
    if (campaign) queue.setDataValue("campaign", campaign);
    emitChurchEvent(churchId, "queue:created", queue);
    queue.setDataValue("church", { id: church.id, name: church.name });
    emitPublicEvent(
      "public:queueCreated",
      serializePublicQueue(queue, await getQueueStats(queue.id)),
    );

    /**
     * Notification
     */
    await createNotification({
      churchId,
      type: "system",
      title: "Queue created",
      message: `The ${queue.name} queue has been created.`,
    });

    return res.status(201).json({
      message: "Queue created successfully",
      queue: serializeQueue(queue),
    });
  } catch (error) {
    console.error("Create queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET ALL QUEUES
 * ==========================================
 */
const getQueues = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    if (!churchId) {
      return res.status(400).json({
        message: "User is not associated with a church",
      });
    }

    const queues = await Queue.findAll({
      where: {
        churchId,
      },
      include: [
        queueCampaignInclude,
        {
          model: QueueStaff,
          as: "staffAssignments",
          where: { status: "active" },
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const queuesWithStats = await Promise.all(
      queues.map(async (queue) => {
        await ensureJoinCode(queue);
        const stats = await getQueueStats(queue.id);

        return {
          ...serializeQueue(queue),
          stats,
        };
      }),
    );

    return res.status(200).json({
      count: queuesWithStats.length,
      queues: queuesWithStats,
    });
  } catch (error) {
    console.error("Get queues error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET SINGLE QUEUE
 * ==========================================
 */
const getQueue = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const { queueId } = req.params;

    const queue = await Queue.findOne({
      where: {
        id: queueId,
        churchId,
      },
      include: [
        queueCampaignInclude,
        {
          model: QueueEntry,
          as: "entries",
          required: false,
        },
        {
          model: QueueStaff,
          as: "staffAssignments",
          required: false,
          where: {
            status: "active",
          },
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    await ensureJoinCode(queue);

    const stats = await getQueueStats(queue.id);

    return res.status(200).json({
      queue: serializeQueue(queue),
      stats,
    });
  } catch (error) {
    console.error("Get queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * LIST PUBLIC QUEUES (customer-facing, no auth)
 * ==========================================
 *
 * Powers a "browse queues" landing page. Only surfaces
 * queues that are currently open — paused/closed queues
 * aren't joinable, so there's no reason to list them here.
 */
const listPublicQueues = async (req, res) => {
  try {
    const queues = await Queue.findAll({
      where: {
        status: "open",
      },
      include: [
        {
          model: Church,
          as: "church",
          attributes: ["id", "name"],
        },
        {
          model: Campaign,
          as: "campaign",
          attributes: ["title"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const queuesWithStats = await Promise.all(
      queues.map(async (queue) => {
        await ensureJoinCode(queue);
        const stats = await getQueueStats(queue.id);

        return serializePublicQueue(queue, stats);
      }),
    );

    return res.status(200).json({
      count: queuesWithStats.length,
      queues: queuesWithStats,
    });
  } catch (error) {
    console.error("List public queues error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET PUBLIC QUEUE (customer-facing, no auth)
 * ==========================================
 *
 * Powers the QueueLanding page. Accepts either the
 * queue's slug or its id so /q/:queueId works with
 * either value.
 */
const getPublicQueue = async (req, res) => {
  try {
    const { slugOrId } = req.params;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );

    const queue = await Queue.findOne({
      where: isUuid
        ? { id: slugOrId }
        : {
            [Op.or]: [{ slug: slugOrId }, { joinCode: slugOrId.toUpperCase() }],
          },
      include: [
        {
          model: Church,
          as: "church",
          attributes: ["id", "name"],
        },
        {
          model: Campaign,
          as: "campaign",
          attributes: ["title"],
          required: false,
        },
      ],
    });

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    await ensureJoinCode(queue);

    const stats = await getQueueStats(queue.id);

    return res.status(200).json({
      queue: serializePublicQueue(queue, stats),
      stats,
    });
  } catch (error) {
    console.error("Get public queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * UPDATE QUEUE
 * ==========================================
 */
const updateQueue = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const { queueId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    if (!canControlAnyQueue(req.user)) {
      const assignment = await QueueStaff.findOne({
        where: { churchId, queueId, userId: req.user.id, status: "active" },
      });
      if (!assignment) {
        return res.status(403).json({
          message: "You are not assigned to this queue",
        });
      }
    }

    const {
      name,
      description,
      status,
      estimatedServiceTime,
      allowWalkIns,
      serviceType,
      campaignId,
    } = req.body;

    if (
      serviceType !== undefined &&
      !["GENERAL", "PLEDGE_CAMPAIGN"].includes(serviceType)
    ) {
      return res.status(400).json({
        message: "Service type must be GENERAL or PLEDGE_CAMPAIGN",
      });
    }

    const nextServiceType = serviceType ?? queue.serviceType ?? "GENERAL";
    const nextCampaignId =
      nextServiceType === "PLEDGE_CAMPAIGN"
        ? campaignId !== undefined
          ? campaignId || null
          : queue.campaignId
        : null;
    const serviceChanged =
      nextServiceType !== (queue.serviceType || "GENERAL") ||
      nextCampaignId !== (queue.campaignId || null);

    if (serviceChanged) {
      const activeEntries = await QueueEntry.count({
        where: {
          queueId,
          status: { [Op.in]: ["waiting", "standby", "called", "serving"] },
        },
      });
      if (activeEntries > 0) {
        return res.status(409).json({
          message:
            "Service type or campaign cannot change while members are in this queue",
        });
      }
    }

    let linkedCampaign = null;
    if (nextServiceType === "PLEDGE_CAMPAIGN") {
      if (!nextCampaignId) {
        return res.status(400).json({
          message: "A pledge campaign is required for this service type",
        });
      }
      if (serviceChanged) {
        linkedCampaign = await getActiveCampaign(nextCampaignId, churchId);
        if (!linkedCampaign) {
          const existingCampaign = await getQueueCampaign(
            nextCampaignId,
            churchId,
          );
          return res.status(existingCampaign ? 400 : 404).json({
            message: existingCampaign
              ? "The selected campaign is not active"
              : "The selected campaign was not found for this church",
          });
        }
      }
    }

    /**
     * Name
     */
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Queue name cannot be empty",
        });
      }

      const newName = name.trim();

      const duplicate = await Queue.findOne({
        where: {
          churchId,
          name: newName,
          id: {
            [Op.ne]: queueId,
          },
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Another queue with this name already exists",
        });
      }

      queue.name = newName;
      queue.prefix = generateQueuePrefix(newName);

      queue.slug = await generateUniqueSlug(churchId, newName, queueId);
    }

    /**
     * Description
     */
    if (description !== undefined) {
      queue.description = description?.trim() || null;
    }

    /**
     * Status
     */
    if (status !== undefined) {
      if (!["open", "paused", "closed"].includes(status)) {
        return res.status(400).json({
          message: "Status must be open, paused or closed",
        });
      }

      queue.status = status;
    }

    /**
     * Service time
     */
    if (estimatedServiceTime !== undefined) {
      const value = Number(estimatedServiceTime);

      if (!Number.isInteger(value) || value <= 0) {
        return res.status(400).json({
          message: "Estimated service time must be a positive number",
        });
      }

      queue.estimatedServiceTime = value;
    }

    queue.maxCustomers = null;

    /**
     * Walk-ins
     */
    if (allowWalkIns !== undefined) {
      queue.allowWalkIns = Boolean(allowWalkIns);
    }

    queue.serviceType = nextServiceType;
    queue.campaignId = nextCampaignId;

    await queue.save();

    if (nextCampaignId) {
      const campaignForResponse =
        linkedCampaign || (await getQueueCampaign(nextCampaignId, churchId));
      queue.setDataValue("campaign", campaignForResponse);
    } else {
      queue.setDataValue("campaign", null);
    }

    /**
     * Socket
     */
    emitQueueEvent(queue.id, "queue:updated", serializePublicQueue(queue));

    emitChurchEvent(churchId, "queue:updated", queue);

    /**
     * Notifications for pause/close
     */
    if (status === "paused") {
      await createNotification({
        churchId,
        queueId: queue.id,
        type: "queue_paused",
        title: "Queue paused",
        message: `${queue.name} is currently paused.`,
      });
    }

    if (status === "closed") {
      await createNotification({
        churchId,
        queueId: queue.id,
        type: "queue_closed",
        title: "Queue closed",
        message: `${queue.name} has been closed.`,
      });
    }

    return res.status(200).json({
      message: "Queue updated successfully",
      queue: serializeQueue(queue),
    });
  } catch (error) {
    console.error("Update queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * DELETE QUEUE
 * ==========================================
 */
const deleteQueue = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const churchId = req.user.churchId;
    const { queueId } = req.params;

    const queue = await Queue.findOne({
      where: {
        id: queueId,
        churchId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!queue) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const activeCustomers = await QueueEntry.count({
      where: {
        queueId,
        status: {
          [Op.in]: ["waiting", "called", "serving"],
        },
      },
      transaction,
    });

    if (activeCustomers > 0) {
      await transaction.rollback();

      return res.status(409).json({
        message:
          "Queue cannot be deleted while customers are waiting or being served",
        activeCustomers,
      });
    }

    await QueueEntry.destroy({
      where: {
        queueId,
      },
      transaction,
    });

    await QueueStaff.destroy({
      where: {
        queueId,
      },
      transaction,
    });

    await queue.destroy({
      transaction,
    });

    await transaction.commit();

    emitChurchEvent(churchId, "queue:deleted", {
      queueId,
    });

    await createNotification({
      churchId,
      type: "system",
      title: "Queue deleted",
      message: `${queue.name} has been deleted.`,
    });

    return res.status(200).json({
      message: "Queue deleted successfully",
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();

    console.error("Delete queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getCurrentQueueService = async (req, res) => {
  try {
    const { queueId } = req.params;
    const churchId = req.user.churchId;
    const queue = await Queue.findOne({ where: { id: queueId, churchId } });
    if (!queue) return res.status(404).json({ message: "Queue not found" });
    if (!(await getQueueStaffAssignment(queueId, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this queue" });
    }
    const entry = await QueueEntry.findOne({
      where: {
        queueId,
        calledBy: req.user.id,
        status: { [Op.in]: ["called", "serving"] },
      },
      order: [["calledAt", "DESC"]],
    });
    if (!entry) return res.json({ entry: null, service: null });
    return res.json({
      entry: {
        id: entry.id,
        queueId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        queueNumber: entry.queueNumber,
        ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
        status: entry.status,
      },
      ...(queue.serviceType === "PLEDGE_CAMPAIGN"
        ? { service: await getQueueService(queue, entry) }
        : { service: null }),
    });
  } catch (error) {
    console.error("Get current queue service error:", error);
    return res
      .status(500)
      .json({ message: "Unable to refresh current service" });
  }
};

/**
 * ==========================================
 * JOIN QUEUE
 * ==========================================
 */
const joinQueue = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { queueId } = req.params;

    const { customerName, customerPhone } = req.body;
    const requestedDeviceId = req.get("X-Device-Id");
    const customerDeviceId =
      requestedDeviceId && /^[a-zA-Z0-9_-]{16,128}$/.test(requestedDeviceId)
        ? requestedDeviceId
        : null;
    const customerIp = req.ip?.replace(/^::ffff:/, "") || null;

    if (!customerName || !customerName.trim()) {
      await transaction.rollback();

      return res.status(400).json({
        message: "Customer name is required",
      });
    }

    /**
     * Lock ONLY this queue.
     *
     * Therefore Queue A and Queue B can receive
     * customers simultaneously.
     */
    const queue = await Queue.findByPk(queueId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!queue) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Queue not found",
      });
    }

    // Hold the church row until commit so simultaneous joins cannot both
    // pass the active-ticket check before either insert becomes visible.
    await db.churches.findByPk(queue.churchId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (queue.status !== "open") {
      await transaction.rollback();

      return res.status(400).json({
        message:
          queue.status === "paused"
            ? "Queue is currently paused"
            : "Queue is closed",
      });
    }

    if (!queue.allowWalkIns) {
      await transaction.rollback();

      return res.status(403).json({
        message: "Walk-ins are not currently allowed for this queue",
      });
    }

    const identityField = customerDeviceId ? "customerDeviceId" : "customerIp";
    const identityValue = customerDeviceId || customerIp;

    if (identityValue) {
      const activeEntry = await QueueEntry.findOne({
        where: {
          churchId: queue.churchId,
          [identityField]: identityValue,
          status: {
            [Op.in]: ["waiting", "standby", "called", "serving"],
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (activeEntry) {
        await transaction.rollback();

        return res.status(409).json({
          message:
            "You already have an active ticket at this church. Please wait until it has been served.",
        });
      }
    }

    /**
     * Get next ticket number.
     *
     * Because this queue row is locked,
     * concurrent requests cannot generate
     * the same number.
     */
    const queueNumber = queue.nextNumber;

    queue.nextNumber += 1;

    await queue.save({
      transaction,
    });

    const customerToken = crypto.randomBytes(32).toString("hex");

    const entry = await QueueEntry.create(
      {
        churchId: queue.churchId,
        queueId,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        customerIp,
        customerDeviceId,
        queueNumber,
        customerToken,
        status: "waiting",
        entryType: "normal",
        joinedAt: new Date(),
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    const ticketNumber = formatTicketNumber(queue.prefix, queueNumber);

    const response = {
      id: entry.id,
      churchId: queue.churchId,
      queueId: queue.id,
      queueName: queue.name,
      queueNumber,
      ticketNumber,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      customerToken,
      status: entry.status,
      joinedAt: entry.joinedAt,
    };

    /**
     * Customer notification socket
     */
    emitCustomerEvent(customerToken, "queue:joined", response);

    /**
     * Queue dashboard
     */
    emitQueueEvent(queue.id, "queue:customerJoined", { queueId: queue.id });

    /**
     * Church dashboard
     */
    emitChurchEvent(queue.churchId, "church:queueUpdated", {
      queueId: queue.id,
      queueName: queue.name,
      ticketNumber,
      entryId: entry.id,
    });

    /**
     * Database notification
     */
    await createNotification({
      churchId: queue.churchId,
      queueId: queue.id,
      queueEntryId: entry.id,
      type: "queue_joined",
      title: "New customer",
      message: `${entry.customerName} joined ${queue.name} with ticket ${ticketNumber}.`,
    });

    return res.status(201).json({
      message: "Joined queue successfully",
      entry: response,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback().catch(() => {});
    }
    console.error("Join queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET QUEUE ENTRY
 * ==========================================
 */
const getQueueEntry = async (req, res) => {
  try {
    const { customerToken } = req.params;

    const entry = await QueueEntry.findOne({
      where: {
        customerToken,
      },
      include: [
        {
          model: Queue,
          as: "queue",
          include: [
            {
              model: Church,
              as: "church",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!entry) {
      return res.status(404).json({
        message: "Queue entry not found",
      });
    }

    const queue = entry.queue;

    const peopleAhead = await QueueEntry.count({
      where: {
        queueId: entry.queueId,
        status: "waiting",
        entryType: "normal",
        queueNumber: {
          [Op.lt]: entry.queueNumber,
        },
      },
    });

    const estimatedWaitTime = peopleAhead * queue.estimatedServiceTime;
    const transferCount = await QueueEntry.count({
      where: {
        queueId: entry.queueId,
        status: "waiting",
        entryType: "transfer",
      },
    });
    const standbyCount = await QueueEntry.count({
      where: { queueId: entry.queueId, status: "standby" },
    });

    return res.status(200).json({
      entry: {
        id: entry.id,
        churchId: entry.churchId,
        queueId: entry.queueId,
        customerToken: entry.customerToken,
        queueName: queue.name,
        churchName: queue.church?.name || null,
        ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
        queueNumber: entry.queueNumber,
        status: entry.status,
        entryType: entry.entryType,
        joinedAt: entry.joinedAt,
        calledAt: entry.calledAt,
        servingAt: entry.servingAt,
        completedAt: entry.completedAt,
      },

      peopleAhead,

      estimatedWaitTime,
      transferCount,
      standbyCount,
    });
  } catch (error) {
    console.error("Get queue entry error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * REJOIN QUEUE AFTER SKIP
 */
const rejoinQueue = async (req, res) => {
  try {
    const { customerToken } = req.params;
    const entry = await QueueEntry.findOne({
      where: { customerToken },
      include: [{ model: Queue, as: "queue" }],
    });

    if (!entry) {
      return res.status(404).json({ message: "Queue entry not found" });
    }

    if (entry.status !== "skipped") {
      return res.status(400).json({
        message: "Only skipped customers can rejoin the queue",
      });
    }

    const queue = entry.queue;
    if (!queue || queue.status !== "open") {
      return res.status(400).json({ message: "Queue is not currently open" });
    }

    entry.status = "waiting";
    entry.calledBy = null;
    entry.calledAt = null;
    entry.skippedAt = null;
    entry.joinedAt = new Date();
    await entry.save();

    const response = {
      ...entry.toJSON(),
      queueName: queue.name,
      ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
    };

    emitQueueEvent(entry.queueId, "queue:customerRejoined", {
      queueId: entry.queueId,
    });
    emitChurchEvent(entry.churchId, "church:queueUpdated", response);
    emitCustomerEvent(customerToken, "customer:rejoined", response);

    return res.status(200).json({
      message: "You have rejoined the queue",
      entry: response,
    });
  } catch (error) {
    console.error("Rejoin queue error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ==========================================
 * CALL NEXT CUSTOMER
 * ==========================================
 */
const callNext = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const churchId = req.user.churchId;
    const staffId = req.user.id;
    const { queueId } = req.params;
    const callRequest = parseQueueCallRange(req.body || {});

    /**
     * Lock only this queue.
     */
    const queue = await Queue.findOne({
      where: {
        id: queueId,
        churchId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      include: [queueCampaignInclude],
    });

    if (!queue) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Queue not found",
      });
    }

    if (queue.status !== "open") {
      await transaction.rollback();

      return res.status(400).json({
        message: "Queue must be open to call customers",
      });
    }

    /**
     * Verify staff assignment.
     */
    const canOperateAnyQueue = [
      "admin",
      "manager",
      "super-admin",
      "superadmin",
    ].includes(req.user.role?.name);
    const assignment =
      canOperateAnyQueue && queue.serviceType !== "PLEDGE_CAMPAIGN"
        ? true
        : await getQueueStaffAssignment(queueId, staffId);

    if (!assignment) {
      await transaction.rollback();

      return res.status(403).json({
        message: "You are not assigned to this queue",
      });
    }

    if (
      queue.serviceType === "PLEDGE_CAMPAIGN" &&
      callRequest.kind === "batch" &&
      callRequest.queueNumbers.length > 1
    ) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Pledge campaign queues must call one member at a time",
      });
    }

    /**
     * The next call advances this staff member's current customer and the
     * next customer together in one transaction.
     */
    const activeService = await QueueEntry.findOne({
      where: {
        queueId,
        calledBy: staffId,
        status: {
          [Op.in]: ["called", "serving"],
        },
      },
      transaction,
    });

    let entries = [];

    if (callRequest.kind === "batch") {
      const queueNumbers = callRequest.queueNumbers;

      if (!queueNumbers.length) {
        await transaction.rollback();
        return res.status(400).json({
          message: "A valid queue number range is required",
        });
      }

      entries = await QueueEntry.findAll({
        where: {
          queueId,
          queueNumber: {
            [Op.between]: [
              Math.min(...queueNumbers),
              Math.max(...queueNumbers),
            ],
          },
          status: {
            [Op.in]: ["waiting", "standby"],
          },
        },
        order: [["queueNumber", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      entries = entries.filter((entry) =>
        queueNumbers.includes(entry.queueNumber),
      );
    } else {
      const requestedEntryId = callRequest.entryId || req.body?.entryId;
      const entry = await QueueEntry.findOne({
        where: {
          queueId,
          ...(requestedEntryId
            ? { id: requestedEntryId }
            : { status: "waiting", entryType: "normal" }),
        },
        order: [["queueNumber", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!entry || !["waiting", "standby"].includes(entry.status)) {
        await transaction.rollback();

        return res.status(404).json({
          message: "No customers are waiting",
        });
      }

      entries = [entry];
    }

    if (!entries.length) {
      await transaction.rollback();

      return res.status(404).json({
        message: "No customers in the requested queue range are waiting",
      });
    }

    const now = new Date();

    if (activeService) {
      activeService.status = "completed";
      activeService.completedAt = now;
      await activeService.save({ transaction });
    }

    const updatedEntries = [];
    for (const entry of entries) {
      entry.status = "serving";
      entry.calledAt = now;
      entry.servingAt = now;
      entry.calledBy = staffId;
      await entry.save({ transaction });
      updatedEntries.push(entry);
    }

    queue.currentNumber = Math.max(
      queue.currentNumber,
      ...updatedEntries.map((entry) => entry.queueNumber),
    );

    await queue.save({ transaction });

    await transaction.commit();

    const primaryEntry = updatedEntries[0];
    const ticketNumber = formatTicketNumber(
      queue.prefix,
      primaryEntry.queueNumber,
    );

    const response = {
      id: primaryEntry.id,
      churchId,
      queueId,
      queueName: queue.name,
      customerName: primaryEntry.customerName,
      customerPhone: primaryEntry.customerPhone,
      customerToken: primaryEntry.customerToken,
      queueNumber: primaryEntry.queueNumber,
      ticketNumber,
      status: primaryEntry.status,
      entryType: primaryEntry.entryType,
      calledAt: primaryEntry.calledAt,
      staffId,
    };

    const callService =
      queue.serviceType === "PLEDGE_CAMPAIGN"
        ? await getQueueService(queue, primaryEntry)
        : null;

    for (const entry of updatedEntries) {
      const entryTicketNumber = formatTicketNumber(
        queue.prefix,
        entry.queueNumber,
      );
      const entryResponse = {
        id: entry.id,
        churchId,
        queueId,
        queueName: queue.name,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        customerToken: entry.customerToken,
        queueNumber: entry.queueNumber,
        ticketNumber: entryTicketNumber,
        status: entry.status,
        entryType: entry.entryType,
        calledAt: entry.calledAt,
        staffId,
      };

      emitQueueEvent(queueId, "queue:customerServing", {
        queueId,
        status: "updated",
      });
      emitChurchEvent(churchId, "church:queueUpdated", entryResponse);
      emitCustomerEvent(entry.customerToken, "customer:serving", {
        queueId,
        entryId: entry.id,
        ticketNumber: entryTicketNumber,
        queueName: queue.name,
        status: "serving",
        calledAt: entry.calledAt,
      });

      createNotification({
        churchId,
        queueId,
        queueEntryId: entry.id,
        type: "customer_called",
        title: "Customer serving",
        message: `${entryTicketNumber} is now being served at ${queue.name}.`,
      });
    }

    if (activeService) {
      emitCustomerEvent(activeService.customerToken, "customer:completed", {
        queueId,
        entryId: activeService.id,
        status: "completed",
        completedAt: activeService.completedAt,
      });
    }

    return res.status(200).json({
      message:
        updatedEntries.length > 1
          ? `${updatedEntries.length} customers are now being served`
          : activeService
            ? "Current customer completed and next customer is now serving"
            : "Customer is now serving",
      entry: response,
      ...(callService
        ? {
            queueEntry: {
              id: primaryEntry.id,
              name: primaryEntry.customerName,
              phone: primaryEntry.customerPhone,
            },
            service: callService,
          }
        : {}),
      entries: updatedEntries.map((entry) => ({
        ...response,
        id: entry.id,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        customerToken: entry.customerToken,
        queueNumber: entry.queueNumber,
        ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
        status: entry.status,
        entryType: entry.entryType,
        calledAt: entry.calledAt,
      })),
      completedEntryId: activeService?.id ?? null,
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();

    console.error("Call next customer error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getQueuePledges = async (req, res) => {
  try {
    const { queueId } = req.params;
    const churchId = req.user.churchId;
    const queue = await Queue.findOne({ where: { id: queueId, churchId } });
    if (!queue) return res.status(404).json({ message: "Queue not found" });
    if (!(await getQueueStaffAssignment(queueId, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this queue" });
    }
    if (queue.serviceType !== "PLEDGE_CAMPAIGN" || !queue.campaignId) {
      return res
        .status(409)
        .json({ message: "No pledge campaign is linked to this queue" });
    }

    const campaign = await getQueueCampaign(queue.campaignId, churchId);
    if (!campaign)
      return res.status(404).json({ message: "Linked campaign was not found" });
    const query = String(req.query.q || "").trim();
    if (query.length < 3)
      return res
        .status(400)
        .json({ message: "Search must be at least 3 characters" });

    const digits = normalizePhone(query);
    const pledges = await Pledge.findAll({
      where: {
        campaignId: queue.campaignId,
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { phone: { [Op.like]: `%${digits || query}%` } },
        ],
      },
      attributes: [
        "id",
        "name",
        "phone",
        "monetaryAmount",
        "fulfilledMonetaryAmount",
        "status",
      ],
      include: [
        {
          model: db.pledgeItems,
          as: "items",
          attributes: ["id", "campaignItemId", "quantity", "fulfilledQuantity"],
          include: [
            {
              model: db.pledgeCampaignItems,
              as: "campaignItem",
              attributes: ["name", "unit"],
            },
          ],
        },
      ],
      limit: 20,
      order: [["createdAt", "DESC"]],
    });
    return res.json({ pledges: pledges.map(serializeQueuePledge) });
  } catch (error) {
    console.error("Queue pledge search error:", error);
    return res
      .status(500)
      .json({ message: "Unable to search campaign pledges" });
  }
};

const serializeQueuePledge = (pledge) => ({
  ...(() => {
    const remaining = getPledgeRemaining(pledge);
    return {
      id: pledge.id,
      name: pledge.name,
      phone: pledge.phone,
      monetaryAmount: pledge.monetaryAmount,
      fulfilledMonetaryAmount: pledge.fulfilledMonetaryAmount,
      remainingMonetaryAmount: remaining.monetaryRemaining,
      status: pledge.status,
      items: (pledge.items || []).map((item) => ({
        id: item.id,
        campaignItemId: item.campaignItemId,
        name: item.campaignItem?.name || "Material item",
        unit: item.campaignItem?.unit || "",
        quantity: item.quantity,
        fulfilledQuantity: item.fulfilledQuantity,
        remainingQuantity:
          remaining.items.find((entry) => entry.pledgeItemId === item.id)
            ?.remainingQuantity || "0.000",
      })),
    };
  })(),
});

const createQueuePledge = async (req, res) => {
  let scopedCampaignId = null;
  try {
    const { queueId } = req.params;
    const churchId = req.user.churchId;
    const queue = await Queue.findOne({ where: { id: queueId, churchId } });
    if (!queue) return res.status(404).json({ message: "Queue not found" });
    if (!(await getQueueStaffAssignment(queueId, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this queue" });
    }
    if (queue.serviceType !== "PLEDGE_CAMPAIGN" || !queue.campaignId) {
      return res
        .status(409)
        .json({ message: "No pledge campaign is linked to this queue" });
    }
    const campaign = await getQueueCampaign(queue.campaignId, churchId);
    if (!campaign)
      return res.status(404).json({ message: "Linked campaign was not found" });
    if (campaign.status !== "ACTIVE") {
      return res
        .status(409)
        .json({ message: "This campaign is not accepting new pledges" });
    }
    scopedCampaignId = campaign.id;

    const { name, phone, idempotencyKey } = req.body;
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      typeof phone !== "string" ||
      !phone.trim()
    ) {
      return res
        .status(400)
        .json({ message: "Member name and phone are required" });
    }
    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return res
        .status(400)
        .json({ message: "A valid idempotencyKey UUID is required" });
    }

    let creationStatus = 500;
    let creationBody;
    const creationResponse = {
      status(code) {
        creationStatus = code;
        return this;
      },
      json(body) {
        creationBody = body;
        return body;
      },
    };
    await createPublicPledge(
      {
        params: { slugOrCode: campaign.slug },
        body: req.body,
        get: (header) =>
          header.toLowerCase() === "idempotency-key"
            ? idempotencyKey
            : req.get(header),
      },
      creationResponse,
    );
    if (creationStatus >= 400)
      return res.status(creationStatus).json(creationBody);

    const pledge = await Pledge.findOne({
      where: { campaignId: campaign.id, idempotencyKey },
      include: [
        {
          model: db.pledgeItems,
          as: "items",
          include: [
            {
              model: db.pledgeCampaignItems,
              as: "campaignItem",
              attributes: ["name", "unit"],
            },
          ],
        },
      ],
    });
    if (!pledge)
      return res
        .status(500)
        .json({ message: "Created pledge could not be loaded" });
    return res.status(creationStatus).json({
      ...creationBody,
      pledge: serializeQueuePledge(pledge),
      duplicate: creationStatus === 200,
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    if (error.name === "SequelizeUniqueConstraintError") {
      const existing = await Pledge.findOne({
        where: {
          campaignId: scopedCampaignId,
          idempotencyKey: req.body?.idempotencyKey,
        },
      });
      if (existing)
        return res
          .status(200)
          .json({ pledge: serializeQueuePledge(existing), duplicate: true });
    }
    console.error("Queue pledge create error:", error);
    return res.status(500).json({ message: "Unable to create pledge" });
  }
};

/**
 * ==========================================
 * START SERVING
 * ==========================================
 */
const startServing = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const staffId = req.user.id;

    const { queueId, entryId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const assignment = canControlAnyQueue(req.user)
      ? true
      : await getQueueStaffAssignment(queueId, staffId);

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this queue",
      });
    }

    const entry = await QueueEntry.findOne({
      where: {
        id: entryId,
        queueId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        message: "Queue entry not found",
      });
    }

    /**
     * Only the staff who called the customer
     * should start serving them.
     */
    if (!canControlAnyQueue(req.user) && entry.calledBy !== staffId) {
      return res.status(403).json({
        message: "You did not call this customer",
      });
    }

    if (entry.status !== "called") {
      return res.status(400).json({
        message: "Only a called customer can be marked as serving",
      });
    }

    entry.status = "serving";
    entry.servingAt = new Date();

    await entry.save();

    const ticketNumber = formatTicketNumber(queue.prefix, entry.queueNumber);

    const response = {
      id: entry.id,
      queueId,
      ticketNumber,
      status: entry.status,
      servingAt: entry.servingAt,
      staffId,
    };

    emitQueueEvent(queueId, "queue:customerServing", {
      queueId,
      status: "updated",
    });

    emitCustomerEvent(entry.customerToken, "customer:serving", response);

    return res.status(200).json({
      message: "Customer is now being served",
      entry,
    });
  } catch (error) {
    console.error("Start serving error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * COMPLETE CUSTOMER
 * ==========================================
 */
const completeCustomer = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const staffId = req.user.id;

    const { queueId, entryId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const assignment = canControlAnyQueue(req.user)
      ? true
      : await getQueueStaffAssignment(queueId, staffId);

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this queue",
      });
    }

    const entry = await QueueEntry.findOne({
      where: {
        id: entryId,
        queueId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        message: "Queue entry not found",
      });
    }

    if (!canControlAnyQueue(req.user) && entry.calledBy !== staffId) {
      return res.status(403).json({
        message: "You did not call this customer",
      });
    }

    if (!["called", "serving"].includes(entry.status)) {
      return res.status(400).json({
        message: "Customer cannot be completed from the current status",
      });
    }

    entry.status = "completed";
    entry.completedAt = new Date();

    await entry.save();

    const ticketNumber = formatTicketNumber(queue.prefix, entry.queueNumber);

    const response = {
      id: entry.id,
      queueId,
      ticketNumber,
      status: entry.status,
      completedAt: entry.completedAt,
      staffId,
    };

    emitQueueEvent(queueId, "queue:customerCompleted", response);

    emitChurchEvent(churchId, "church:queueUpdated", response);

    emitCustomerEvent(entry.customerToken, "customer:completed", response);

    return res.status(200).json({
      message: "Customer completed successfully",
      entry,
    });
  } catch (error) {
    console.error("Complete customer error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * SKIP CUSTOMER
 * ==========================================
 */
const skipCustomer = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const staffId = req.user.id;

    const { queueId, entryId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const assignment = canControlAnyQueue(req.user)
      ? true
      : await getQueueStaffAssignment(queueId, staffId);

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this queue",
      });
    }

    const entry = await QueueEntry.findOne({
      where: {
        id: entryId,
        queueId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        message: "Queue entry not found",
      });
    }

    if (
      !canControlAnyQueue(req.user) &&
      entry.calledBy &&
      entry.calledBy !== staffId
    ) {
      return res.status(403).json({
        message: "You did not call this customer",
      });
    }

    if (!["waiting", "standby", "called"].includes(entry.status)) {
      return res.status(400).json({
        message: "Customer cannot be skipped from the current status",
      });
    }

    entry.status = "skipped";
    entry.skippedAt = new Date();

    await entry.save();

    const ticketNumber = formatTicketNumber(queue.prefix, entry.queueNumber);

    const response = {
      id: entry.id,
      queueId,
      ticketNumber,
      status: entry.status,
      skippedAt: entry.skippedAt,
      staffId,
    };

    emitQueueEvent(queueId, "queue:customerSkipped", response);

    emitChurchEvent(churchId, "church:queueUpdated", response);

    emitCustomerEvent(entry.customerToken, "customer:skipped", response);

    return res.status(200).json({
      message: "Customer skipped successfully",
      entry,
    });
  } catch (error) {
    console.error("Skip customer error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

const holdCustomer = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const staffId = req.user.id;
    const { queueId, entryId } = req.params;
    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) return res.status(404).json({ message: "Queue not found" });
    if (
      !canControlAnyQueue(req.user) &&
      !(await getQueueStaffAssignment(queueId, staffId))
    ) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this queue" });
    }

    const entry = await QueueEntry.findOne({ where: { id: entryId, queueId } });
    if (!entry)
      return res.status(404).json({ message: "Queue entry not found" });
    if (
      !canControlAnyQueue(req.user) &&
      entry.calledBy &&
      entry.calledBy !== staffId
    ) {
      return res
        .status(403)
        .json({ message: "You did not call this customer" });
    }
    if (!["waiting", "called", "serving", "standby"].includes(entry.status)) {
      return res
        .status(400)
        .json({ message: "Customer cannot be held at this stage" });
    }

    const isResuming = entry.status === "standby";
    entry.status = isResuming ? "waiting" : "standby";
    if (!isResuming) {
      entry.calledBy = null;
      entry.calledAt = null;
      entry.servingAt = null;
    }
    await entry.save();

    const response = {
      id: entry.id,
      queueId,
      ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
      status: entry.status,
      entryType: entry.entryType,
    };
    emitQueueEvent(queueId, "queue:customerHeld", response);
    emitChurchEvent(churchId, "church:queueUpdated", response);
    emitCustomerEvent(entry.customerToken, "customer:holdChanged", response);

    return res.status(200).json({
      message: isResuming
        ? "Customer returned to the queue"
        : "Customer placed on standby",
      entry,
    });
  } catch (error) {
    console.error("Hold customer error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ==========================================
 * TRANSFER CUSTOMER
 * ==========================================
 */
const transferCustomer = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const churchId = req.user.churchId;
    const staffId = req.user.id;
    const { queueId, entryId } = req.params;
    const { targetQueueId } = req.body;

    if (!targetQueueId || targetQueueId === queueId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Choose a different destination queue" });
    }

    const sourceQueue = await Queue.findOne({
      where: { id: queueId, churchId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const targetQueue = await Queue.findOne({
      where: { id: targetQueueId, churchId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!sourceQueue || !targetQueue) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ message: "Source or destination queue not found" });
    }

    const sourceAssignment = await getQueueStaffAssignment(queueId, staffId);
    if (!sourceAssignment) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ message: "You are not assigned to this queue" });
    }

    if (targetQueue.status !== "open") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "The destination queue is not open" });
    }

    const entry = await QueueEntry.findOne({
      where: { id: entryId, queueId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!entry) {
      await transaction.rollback();
      return res.status(404).json({ message: "Queue entry not found" });
    }

    if (entry.calledBy && entry.calledBy !== staffId) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ message: "You did not call this customer" });
    }

    if (!["waiting", "called", "serving"].includes(entry.status)) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Only active customers can be transferred" });
    }

    const targetQueueNumber = targetQueue.nextNumber;
    targetQueue.nextNumber += 1;
    await targetQueue.save({ transaction });

    entry.queueId = targetQueue.id;
    entry.queueNumber = targetQueueNumber;
    entry.status = "waiting";
    entry.entryType = "transfer";
    entry.calledBy = null;
    entry.calledAt = null;
    entry.servingAt = null;
    await entry.save({ transaction });
    await transaction.commit();

    const response = {
      id: entry.id,
      churchId,
      sourceQueueId: sourceQueue.id,
      sourceQueueName: sourceQueue.name,
      queueId: targetQueue.id,
      queueName: targetQueue.name,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      customerToken: entry.customerToken,
      queueNumber: entry.queueNumber,
      ticketNumber: formatTicketNumber(targetQueue.prefix, entry.queueNumber),
      status: entry.status,
      entryType: entry.entryType,
    };

    emitQueueEvent(sourceQueue.id, "queue:customerTransferred", {
      queueId: sourceQueue.id,
      targetQueueId: targetQueue.id,
    });
    emitQueueEvent(targetQueue.id, "queue:customerJoined", {
      queueId: targetQueue.id,
    });
    emitChurchEvent(churchId, "church:queueUpdated", response);
    emitCustomerEvent(entry.customerToken, "customer:transferred", response);

    return res.status(200).json({
      message: `Customer transferred to ${targetQueue.name}`,
      entry: response,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Transfer customer error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ==========================================
 * CUSTOMER LEAVES QUEUE
 * ==========================================
 */
const leaveQueue = async (req, res) => {
  try {
    const { customerToken } = req.params;

    const entry = await QueueEntry.findOne({
      where: {
        customerToken,
      },
      include: [
        {
          model: Queue,
          as: "queue",
        },
      ],
    });

    if (!entry) {
      return res.status(404).json({
        message: "Queue entry not found",
      });
    }

    if (entry.status !== "waiting") {
      return res.status(400).json({
        message: "You cannot leave after you have been called",
      });
    }

    entry.status = "left";
    entry.leftAt = new Date();

    await entry.save();

    emitQueueEvent(entry.queueId, "queue:customerLeft", {
      entryId: entry.id,
      queueId: entry.queueId,
      queueNumber: entry.queueNumber,
    });

    emitChurchEvent(entry.churchId, "church:queueUpdated", {
      queueId: entry.queueId,
      entryId: entry.id,
      status: "left",
    });

    return res.status(200).json({
      message: "You have left the queue",
    });
  } catch (error) {
    console.error("Leave queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * GET WAITING CUSTOMERS
 * ==========================================
 */
const getWaitingCustomers = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const { queueId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const entries = await QueueEntry.findAll({
      where: {
        queueId,
        status: {
          [Op.in]: ["waiting", "standby", "called", "serving", "skipped"],
        },
      },
      order: [["queueNumber", "ASC"]],
    });

    const customers = entries.map((entry) => ({
      ...entry.toJSON(),

      ticketNumber: formatTicketNumber(queue.prefix, entry.queueNumber),
    }));

    return res.status(200).json({
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error("Get waiting customers error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * ASSIGN STAFF
 * ==========================================
 */
const assignStaff = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const { queueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const queue = await getChurchQueue(queueId, churchId);
    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const user = await getChurchUser(userId, churchId);
    if (!user) {
      return res.status(404).json({
        message: "Staff member not found in this church",
      });
    }

    const existing = await QueueStaff.findOne({
      where: {
        queueId,
        userId,
      },
    });

    if (existing) {
      if (existing.status === "active") {
        return res.status(409).json({
          message: "Staff member is already assigned to this queue",
        });
      }

      // Reactivate an inactive assignment
      existing.status = "active";
      existing.assignedAt = new Date();
      existing.removedAt = null;
      existing.churchId = churchId;
      await existing.save();

      emitChurchEvent(churchId, "church:queueStaffUpdated", {
        queueId,
        action: "updated",
      });
      emitChurchEvent(churchId, "church:queueStaffUpdated", {
        queueId,
        userId,
        action: "assigned",
      });

      return res.status(200).json({
        message: "Staff member assigned successfully",
        assignment: existing,
      });
    }

    // Create the assignment with the required churchId.
    const assignment = await QueueStaff.create({
      queueId,
      userId,
      churchId,
      status: "active",
      assignedAt: new Date(),
    });

    emitChurchEvent(churchId, "church:queueStaffUpdated", {
      queueId,
      action: "assigned",
    });
    emitChurchEvent(churchId, "church:queueStaffUpdated", {
      queueId,
      userId,
      action: "assigned",
    });

    return res.status(201).json({
      message: "Staff member assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("Assign staff error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * REMOVE STAFF
 * ==========================================
 */
const removeStaff = async (req, res) => {
  try {
    const churchId = req.user.churchId;

    const { queueId, userId } = req.params;

    const queue = await getChurchQueue(queueId, churchId);

    if (!queue) {
      return res.status(404).json({
        message: "Queue not found",
      });
    }

    const assignment = await QueueStaff.findOne({
      where: {
        queueId,
        userId,
        status: "active",
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Staff member is not assigned to this queue",
      });
    }

    /**
     * Don't allow removing staff who are
     * currently serving a customer.
     */
    const activeCustomer = await QueueEntry.findOne({
      where: {
        queueId,
        calledBy: userId,
        status: {
          [Op.in]: ["called", "serving"],
        },
      },
    });

    if (activeCustomer) {
      return res.status(409).json({
        message: "Staff member cannot be removed while serving a customer",
      });
    }

    assignment.status = "inactive";
    assignment.removedAt = new Date();

    await assignment.save();

    emitChurchEvent(churchId, "church:queueStaffUpdated", {
      queueId,
      userId,
      action: "removed",
    });

    return res.status(200).json({
      message: "Staff member removed from queue",
    });
  } catch (error) {
    console.error("Remove staff error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * ==========================================
 * EXPORT
 * ==========================================
 */
module.exports = {
  createQueue,
  getQueues,
  getQueue,
  listPublicQueues,
  getPublicQueue,
  updateQueue,
  deleteQueue,

  joinQueue,
  getQueueEntry,
  rejoinQueue,
  leaveQueue,

  getWaitingCustomers,
  getQueuePledges,
  createQueuePledge,
  getCurrentQueueService,

  callNext,
  startServing,
  completeCustomer,
  skipCustomer,
  holdCustomer,
  transferCustomer,

  assignStaff,
  removeStaff,
  parseQueueCallRange,
};
