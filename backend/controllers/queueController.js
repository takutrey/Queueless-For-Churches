const db = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");

const Queue = db.queues;
const QueueEntry = db.queueEntries;
const QueueStaff = db.queueStaff;
const User = db.users;
const Church = db.churches;

const {
  generateUniqueSlug,
  generateQueuePrefix,
  generateJoinCode,
  validateQueuePrefix,
  formatTicketNumber,
  getActiveChurch,
  getChurchQueue,
  getChurchUser,
  getQueueStaffAssignment,
  getQueueStats,
} = require("../utils/queueHelpers");
const canControlAnyQueue = (user) =>
  ["admin", "manager", "super-admin", "superadmin"].includes(user.role?.name);

const {
  createNotification,
  emitQueueEvent,
  emitChurchEvent,
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
      prefix,
      estimatedServiceTime,
      maxCustomers,
      allowWalkIns,
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
    let queuePrefix = prefix
      ? prefix.trim().toUpperCase()
      : generateQueuePrefix(queueName);

    if (!validateQueuePrefix(queuePrefix)) {
      return res.status(400).json({
        message:
          "Queue prefix must contain only letters or numbers and be between 1 and 5 characters",
      });
    }

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

    /**
     * Maximum customers
     */
    let maximumCustomers = null;

    if (
      maxCustomers !== undefined &&
      maxCustomers !== null &&
      maxCustomers !== ""
    ) {
      maximumCustomers = Number(maxCustomers);

      if (!Number.isInteger(maximumCustomers) || maximumCustomers <= 0) {
        return res.status(400).json({
          message: "Maximum customers must be a positive number",
        });
      }
    }

    const slug = await generateUniqueSlug(churchId, queueName);

    let joinCode = generateJoinCode();
    while (await Queue.findOne({ where: { joinCode } })) {
      joinCode = generateJoinCode();
    }

    const queue = await Queue.create({
      churchId,
      name: queueName,
      slug,
      joinCode,
      prefix: queuePrefix,
      description:
        description && description.trim() ? description.trim() : null,
      status: "open",
      currentNumber: 0,
      nextNumber: 1,
      estimatedServiceTime: serviceTime,
      maxCustomers: maximumCustomers,
      allowWalkIns: allowWalkIns !== undefined ? Boolean(allowWalkIns) : true,
    });

    /**
     * Socket
     */
    emitChurchEvent(churchId, "queue:created", queue);

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
      queue,
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
          ...queue.toJSON(),
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
      queue,
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
      ],
      order: [["createdAt", "DESC"]],
    });

    const queuesWithStats = await Promise.all(
      queues.map(async (queue) => {
        await ensureJoinCode(queue);
        const stats = await getQueueStats(queue.id);

        return {
          ...queue.toJSON(),
          stats,
        };
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
      queue,
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
      prefix,
      status,
      estimatedServiceTime,
      maxCustomers,
      allowWalkIns,
    } = req.body;

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

      queue.slug = await generateUniqueSlug(churchId, newName, queueId);
    }

    /**
     * Prefix
     */
    if (prefix !== undefined) {
      const newPrefix = prefix.trim().toUpperCase();

      if (!validateQueuePrefix(newPrefix)) {
        return res.status(400).json({
          message:
            "Queue prefix must contain only letters or numbers and be between 1 and 5 characters",
        });
      }

      queue.prefix = newPrefix;
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

    /**
     * Maximum customers
     */
    if (maxCustomers !== undefined) {
      if (maxCustomers === null || maxCustomers === "") {
        queue.maxCustomers = null;
      } else {
        const value = Number(maxCustomers);

        if (!Number.isInteger(value) || value <= 0) {
          return res.status(400).json({
            message: "Maximum customers must be a positive number",
          });
        }

        queue.maxCustomers = value;
      }
    }

    /**
     * Walk-ins
     */
    if (allowWalkIns !== undefined) {
      queue.allowWalkIns = Boolean(allowWalkIns);
    }

    await queue.save();

    /**
     * Socket
     */
    emitQueueEvent(queue.id, "queue:updated", queue);

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
      queue,
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
    await transaction.rollback();

    console.error("Delete queue error:", error);

    return res.status(500).json({
      message: "Server error",
    });
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
     * Capacity
     */
    if (queue.maxCustomers) {
      const activeCount = await QueueEntry.count({
        where: {
          churchId: queue.churchId,
          queueId,
          status: {
            [Op.in]: ["waiting", "called", "serving"],
          },
        },
        transaction,
      });

      if (activeCount >= queue.maxCustomers) {
        await transaction.rollback();

        return res.status(409).json({
          message: "Queue is currently full",
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
    emitQueueEvent(queue.id, "queue:customerJoined", {
      queueId: queue.id,
      entry: response,
    });

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

    if (queue.maxCustomers) {
      const activeCount = await QueueEntry.count({
        where: {
          queueId: entry.queueId,
          status: { [Op.in]: ["waiting", "called", "serving"] },
        },
      });

      if (activeCount >= queue.maxCustomers) {
        return res.status(409).json({ message: "Queue is currently full" });
      }
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

    emitQueueEvent(entry.queueId, "queue:customerRejoined", response);
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
    const assignment = canOperateAnyQueue
      ? true
      : await QueueStaff.findOne({
          where: {
            churchId,
            queueId,
            userId: staffId,
            status: "active",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

    if (!assignment) {
      await transaction.rollback();

      return res.status(403).json({
        message: "You are not assigned to this queue",
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

      emitQueueEvent(queueId, "queue:customerServing", entryResponse);
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
    await transaction.rollback();

    console.error("Call next customer error:", error);

    return res.status(500).json({
      message: "Server error",
    });
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

    emitQueueEvent(queueId, "queue:customerServing", response);

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

    if (targetQueue.maxCustomers) {
      const activeCount = await QueueEntry.count({
        where: {
          queueId: targetQueue.id,
          status: { [Op.in]: ["waiting", "called", "serving"] },
        },
        transaction,
      });

      if (activeCount >= targetQueue.maxCustomers) {
        await transaction.rollback();
        return res
          .status(409)
          .json({ message: "The destination queue is full" });
      }
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

    emitQueueEvent(sourceQueue.id, "queue:customerTransferred", response);
    emitQueueEvent(targetQueue.id, "queue:customerJoined", {
      queueId: targetQueue.id,
      entry: response,
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

      emitQueueEvent(queueId, "queue:staffAssigned", existing);
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

    emitQueueEvent(queueId, "queue:staffAssigned", assignment);
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

    emitQueueEvent(queueId, "queue:staffRemoved", {
      queueId,
      userId,
    });

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
