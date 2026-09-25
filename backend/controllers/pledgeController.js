const db = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");
const {
  calculateCampaignTotals,
  calculateCampaignItemTotals,
  derivePledgeStatus,
  getCompletedItemStatus,
  parseAmount,
  parseQuantity,
  toSlug,
  generateCampaignJoinCode,
} = require("../utils/pledgeHelpers");
const { getIO } = require("../config/socket");

const Campaign = db.pledgeCampaigns;
const Pledge = db.pledges;
const Church = db.churches;

const allowedStatuses = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];

const normalizeZimbabwePhone = (value) => {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  let normalized = compact;
  if (/^0(7\d{8})$/.test(compact)) normalized = `+263${compact.slice(1)}`;
  else if (/^263(7\d{8})$/.test(compact)) normalized = `+${compact}`;
  else if (/^7\d{8}$/.test(compact)) normalized = `+263${compact}`;
  if (!/^\+2637\d{8}$/.test(normalized)) return null;
  return normalized;
};

const parseDateFilter = (value, endOfDay = false) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

const validateDates = (startDate, endDate) => {
  if (!startDate && !endDate) return true;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    (startDate && !datePattern.test(startDate)) ||
    (endDate && !datePattern.test(endDate))
  )
    return false;
  return !startDate || !endDate || startDate <= endDate;
};

const createUniqueSlug = async (churchId, title, excludeId = null) => {
  const base = toSlug(title) || "campaign";
  let slug = base;
  let counter = 2;
  while (
    await Campaign.findOne({
      where: {
        churchId: churchId || null,
        slug,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const publicCampaign = (campaign, totals, items = []) => ({
  id: campaign.id,
  churchId: campaign.churchId,
  title: campaign.title,
  description: campaign.description,
  targetAmount: totals.targetAmount,
  startDate: campaign.startDate,
  endDate: campaign.endDate,
  status: campaign.status,
  image: campaign.image,
  slug: campaign.slug,
  joinCode: campaign.joinCode,
  items,
  ...totals,
});

const createUniqueCampaignJoinCode = async (excludeId = null) => {
  let joinCode = generateCampaignJoinCode();
  while (
    await Campaign.findOne({
      where: {
        joinCode,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
    })
  ) {
    joinCode = generateCampaignJoinCode();
  }
  return joinCode;
};

const emitCampaignState = (campaignId, eventName, payload) => {
  try {
    const io = getIO();
    const aliases = new Set([
      eventName,
      eventName.replace(":", "-"),
      eventName.replace(":", "_"),
    ]);

    for (const alias of aliases) {
      io.to(`campaign:${campaignId}`).emit(alias, payload);
      io.to(`campaign-admin:${campaignId}`).emit(alias, payload);
    }
  } catch (error) {
    console.error(`Campaign socket error (${eventName}):`, error.message);
  }
};

const emitTotals = (totals) => {
  emitCampaignState(totals.campaignId, "pledge-updated", totals);
  emitCampaignState(totals.campaignId, "campaign-totals-updated", totals);
  emitCampaignState(totals.campaignId, "campaign-progress-updated", totals);
};

const emitDashboardPledge = (pledge, totals, items = []) => {
  const payload = {
    campaignId: totals.campaignId,
    pledge: {
      id: pledge.id,
      name: pledge.name,
      monetaryAmount: pledge.monetaryAmount,
      fulfilledMonetaryAmount: pledge.fulfilledMonetaryAmount,
      status: pledge.status,
      items: items.map((item) => ({
        id: item.id,
        campaignItemId: item.campaignItemId,
        quantity: item.quantity,
        fulfilledQuantity: item.fulfilledQuantity,
        createdAt: item.createdAt,
      })),
      createdAt: pledge.createdAt,
    },
    totals,
  };
  emitCampaignState(totals.campaignId, "pledge-created", payload);
  emitCampaignState(totals.campaignId, "pledge-created", {
    ...payload,
    materialRequirements: totals.itemTotals || [],
  });
};

const requestHashFor = (campaignId, name, phone, amount) =>
  crypto
    .createHash("sha256")
    .update(`${campaignId}|${name}|${phone}|${amount}`)
    .digest("hex");

const getCampaignForChurch = (req) => ({
  id: req.params.campaignId,
  churchId: req.user.churchId,
});

const listCampaigns = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const campaigns = await Campaign.findAll({
      where: { churchId },
      order: [["createdAt", "DESC"]],
    });
    const result = await Promise.all(
      campaigns.map(async (campaign) => ({
        ...campaign.toJSON(),
        totals: await calculateCampaignTotals(campaign.id),
      })),
    );
    return res.json({ campaigns: result, count: result.length });
  } catch (error) {
    console.error("List campaigns error:", error);
    return res.status(500).json({ message: "Unable to load campaigns" });
  }
};

const listPublicCampaigns = async (_req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { status: { [Op.in]: ["ACTIVE", "PAUSED", "COMPLETED"] } },
      include: [
        {
          model: Church,
          as: "church",
          where: { status: "active" },
          attributes: ["id", "name"],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const result = await Promise.all(
      campaigns.map(async (campaign) => ({
        ...publicCampaign(campaign, await calculateCampaignTotals(campaign.id)),
        churchName: campaign.church?.name || null,
      })),
    );
    return res.json({ campaigns: result, count: result.length });
  } catch (error) {
    console.error("List public campaigns error:", error);
    return res.status(500).json({ message: "Unable to load public campaigns" });
  }
};

const createCampaign = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const {
      title,
      description,
      targetAmount,
      startDate,
      endDate,
      image,
      status = "ACTIVE",
    } = req.body;
    const parsedTarget =
      targetAmount === undefined || targetAmount === null || targetAmount === ""
        ? null
        : parseAmount(targetAmount);
    if (!title?.trim())
      return res.status(400).json({ message: "Title is required" });
    if (
      targetAmount !== undefined &&
      targetAmount !== null &&
      targetAmount !== "" &&
      !parsedTarget
    )
      return res
        .status(400)
        .json({ message: "Monetary target must be at least 1." });
    if (!allowedStatuses.includes(status) || !validateDates(startDate, endDate))
      return res
        .status(400)
        .json({ message: "Invalid campaign status or dates" });

    const campaign = await Campaign.create({
      churchId,
      title: title.trim(),
      description: description?.trim() || null,
      targetAmount: parsedTarget,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
      image: image || null,
      slug: await createUniqueSlug(churchId, title),
      joinCode: await createUniqueCampaignJoinCode(),
    });
    const totals = await calculateCampaignTotals(campaign.id);
    emitCampaignState(campaign.id, "campaign:created", {
      campaignId: campaign.id,
      campaign,
      totals,
    });
    return res.status(201).json({ campaign, totals });
  } catch (error) {
    console.error("Create campaign error:", error);
    return res.status(500).json({ message: "Unable to create campaign" });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const {
      title,
      description,
      targetAmount,
      startDate,
      endDate,
      image,
      status,
    } = req.body;
    const parsedTarget =
      targetAmount === undefined
        ? campaign.targetAmount
        : targetAmount === null || targetAmount === ""
          ? null
          : parseAmount(targetAmount);
    if (
      targetAmount !== undefined &&
      targetAmount !== null &&
      targetAmount !== "" &&
      !parsedTarget
    )
      return res
        .status(400)
        .json({ message: "Monetary target must be at least 1." });
    if (status !== undefined && !allowedStatuses.includes(status))
      return res.status(400).json({ message: "Invalid campaign status" });
    if (
      !validateDates(
        startDate ?? campaign.startDate,
        endDate ?? campaign.endDate,
      )
    )
      return res.status(400).json({ message: "Invalid campaign dates" });

    const previousStatus = campaign.status;
    await campaign.update({
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined
        ? { description: description?.trim() || null }
        : {}),
      ...(targetAmount !== undefined ? { targetAmount: parsedTarget } : {}),
      ...(startDate !== undefined ? { startDate: startDate || null } : {}),
      ...(endDate !== undefined ? { endDate: endDate || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(image !== undefined ? { image: image || null } : {}),
    });
    const totals = await calculateCampaignTotals(campaign.id);
    emitCampaignState(campaign.id, "campaign:updated", {
      campaignId: campaign.id,
      campaign,
      totals,
      previousStatus,
    });
    if (status !== undefined && status !== previousStatus) {
      emitCampaignState(campaign.id, "campaign:statusChanged", {
        campaignId: campaign.id,
        previousStatus,
        currentStatus: status,
        campaign,
        totals,
      });
    }
    return res.json({ campaign, totals });
  } catch (error) {
    console.error("Update campaign error:", error);
    return res.status(500).json({ message: "Unable to update campaign" });
  }
};

const getCampaign = async (req, res) => {
  const campaign = await Campaign.findOne({
    where: getCampaignForChurch(req),
  });
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const items = await db.pledgeCampaignItems.findAll({
    where: { campaignId: campaign.id },
    order: [
      ["sortOrder", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const totals = await calculateCampaignItemTotals(item.id);
      return {
        ...item.toJSON(),
        ...(totals || {}),
        campaignItemId: item.id,
      };
    }),
  );

  return res.json({
    campaign,
    totals: await calculateCampaignTotals(campaign.id),
    items: enrichedItems,
  });
};

const getPublicCampaign = async (req, res) => {
  try {
    const lookup = String(
      req.params.slugOrCode || req.params.slug || "",
    ).trim();
    if (!lookup) return res.status(404).json({ message: "Campaign not found" });

    const campaign = await Campaign.findOne({
      where: {
        [Op.or]: [{ slug: lookup }, { joinCode: lookup.toUpperCase() }],
        status: { [Op.in]: ["ACTIVE", "PAUSED", "COMPLETED"] },
      },
      include: [
        {
          model: Church,
          as: "church",
          attributes: ["id", "name", "status"],
        },
      ],
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const items = await db.pledgeCampaignItems.findAll({
      where: { campaignId: campaign.id, status: "ACTIVE" },
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
    const itemTotals = await Promise.all(
      items.map((item) => calculateCampaignItemTotals(item.id)),
    );
    return res.json({
      campaign: publicCampaign(
        campaign,
        await calculateCampaignTotals(campaign.id),
        itemTotals,
      ),
    });
  } catch (error) {
    console.error("Get public campaign error:", error);
    return res.status(500).json({ message: "Unable to load campaign" });
  }
};

const createPublicPledge = async (req, res) => {
  const { monetaryAmount, amount, name, phone, items } = req.body;
  const selectedAmount = monetaryAmount ?? amount;
  const parsedAmount = parseAmount(selectedAmount);
  if (
    selectedAmount !== undefined &&
    selectedAmount !== null &&
    selectedAmount !== "" &&
    !parsedAmount
  )
    return res.status(400).json({
      message: "Monetary pledge must be at least 1.",
    });
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedPhone = normalizeZimbabwePhone(phone);
  if (normalizedName.length < 2 || normalizedName.length > 160)
    return res.status(400).json({ message: "Name is required" });
  if (!normalizedPhone)
    return res
      .status(400)
      .json({ message: "Enter a valid Zimbabwean phone number" });

  /**
   * At least one pledge component is required: either a monetary
   * amount or at least one material item.
   */
  if (!parsedAmount && (!Array.isArray(items) || items.length === 0))
    return res.status(400).json({
      message:
        "Pledge must include a monetary amount or at least one material item",
    });

  const idempotencyKey =
    req.get("Idempotency-Key")?.trim().slice(0, 128) || null;
  if (!idempotencyKey)
    return res
      .status(400)
      .json({ message: "Idempotency-Key header is required" });

  /**
   * Parse and validate material items before entering the transaction.
   */
  const parsedItems = [];
  if (Array.isArray(items)) {
    for (const entry of items) {
      if (!entry || typeof entry !== "object") continue;
      const campaignItemId =
        typeof entry.campaignItemId === "string"
          ? entry.campaignItemId.trim()
          : typeof entry.id === "string"
            ? entry.id.trim()
            : "";
      const quantity = parseQuantity(entry.quantity);
      if (!campaignItemId || !quantity) {
        return res.status(400).json({
          message:
            "Each material item must reference a valid campaign item and a positive quantity",
        });
      }
      parsedItems.push({ campaignItemId, quantity });
    }
  }

  const uniqueItems = Array.from(
    new Map(parsedItems.map((entry) => [entry.campaignItemId, entry])).values(),
  );
  if (uniqueItems.length !== parsedItems.length) {
    return res.status(400).json({
      message:
        "Duplicate campaign item IDs are not allowed in a single pledge.",
    });
  }

  try {
    let wasDuplicate = false;
    const lookup = String(
      req.params.slugOrCode || req.params.slug || "",
    ).trim();
    const pledge = await db.sequelize.transaction(async (transaction) => {
      const campaign = await Campaign.findOne({
        where: {
          [Op.or]: [{ slug: lookup }, { joinCode: lookup.toUpperCase() }],
          status: "ACTIVE",
        },
        transaction,
      });
      if (!campaign) {
        const error = new Error("This campaign is not accepting pledges");
        error.code = "CAMPAIGN_INACTIVE";
        throw error;
      }

      /**
       * Validate that all referenced campaign items belong to this
       * campaign and are still ACTIVE (not already completed/cancelled).
       */
      if (uniqueItems.length) {
        const itemIds = uniqueItems.map((entry) => entry.campaignItemId);
        const campaignItems = await db.pledgeCampaignItems.findAll({
          where: { id: { [Op.in]: itemIds }, campaignId: campaign.id },
          transaction,
        });
        const foundIds = new Set(campaignItems.map((item) => item.id));
        const byId = new Map(campaignItems.map((item) => [item.id, item]));

        for (const entry of uniqueItems) {
          if (!foundIds.has(entry.campaignItemId)) {
            const error = new Error(
              "One or more material items are not part of this campaign",
            );
            error.code = "INVALID_CAMPAIGN_ITEM";
            throw error;
          }

          const item = byId.get(entry.campaignItemId);
          const itemTotals = await calculateCampaignItemTotals(
            item.id,
            transaction,
          );
          if (
            !item ||
            item.status !== "ACTIVE" ||
            Number(itemTotals?.remainingToPledge || 0) <= 0
          ) {
            const error = new Error(
              "One or more material items are already completed or unavailable",
            );
            error.code = "INVALID_CAMPAIGN_ITEM";
            throw error;
          }
        }
      }

      const requestHash = requestHashFor(
        campaign.id,
        normalizedName,
        normalizedPhone,
        parsedAmount || "",
      );

      const existing = await Pledge.findOne({
        where: { campaignId: campaign.id, idempotencyKey },
        transaction,
      });
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          const error = new Error(
            "Idempotency-Key was already used for a different pledge",
          );
          error.code = "IDEMPOTENCY_CONFLICT";
          throw error;
        }
        wasDuplicate = true;
        return { pledge: existing, items: [] };
      }

      const createdPledge = await Pledge.create(
        {
          campaignId: campaign.id,
          monetaryAmount: parsedAmount || null,
          fulfilledMonetaryAmount: "0.00",
          status: "PLEDGED",
          name: normalizedName,
          phone: normalizedPhone,
          idempotencyKey,
          requestHash,
        },
        { transaction },
      );

      const createdItems = [];
      for (const entry of uniqueItems) {
        const pledgeItem = await db.pledgeItems.create(
          {
            pledgeId: createdPledge.id,
            campaignItemId: entry.campaignItemId,
            quantity: entry.quantity,
            fulfilledQuantity: "0.000",
          },
          { transaction },
        );
        createdItems.push(pledgeItem);
      }

      const nextStatus = derivePledgeStatus({
        monetaryAmount: createdPledge.monetaryAmount,
        fulfilledMonetaryAmount: createdPledge.fulfilledMonetaryAmount,
        items: createdItems,
      });
      await createdPledge.update({ status: nextStatus }, { transaction });
      const refreshedPledge = await Pledge.findByPk(createdPledge.id, {
        transaction,
      });

      return { pledge: refreshedPledge, items: createdItems };
    });

    const totals = await calculateCampaignTotals(pledge.pledge.campaignId);
    const itemTotals = await Promise.all(
      uniqueItems.map((entry) =>
        calculateCampaignItemTotals(entry.campaignItemId),
      ),
    );
    if (!wasDuplicate) {
      emitTotals({ ...totals, itemTotals });
      emitDashboardPledge(pledge.pledge, totals, pledge.items);
    }
    return res.status(wasDuplicate ? 200 : 201).json({
      message: wasDuplicate
        ? "Pledge already recorded"
        : "Pledge recorded successfully",
      totals,
      itemTotals,
      pledgeId: pledge.pledge.id,
    });
  } catch (error) {
    if (error.code === "CAMPAIGN_INACTIVE")
      return res.status(409).json({ message: error.message });
    if (error.code === "IDEMPOTENCY_CONFLICT")
      return res.status(409).json({ message: error.message });
    if (error.code === "INVALID_CAMPAIGN_ITEM")
      return res.status(400).json({ message: error.message });
    if (error.name === "SequelizeUniqueConstraintError" && idempotencyKey) {
      const existingCandidates = await Pledge.findAll({
        where: { idempotencyKey },
      });
      const existing = existingCandidates.find(
        (candidate) =>
          !candidate.requestHash ||
          candidate.requestHash ===
            requestHashFor(
              candidate.campaignId,
              normalizedName,
              normalizedPhone,
              parsedAmount || "",
            ),
      );
      if (existing) {
        const requestHash = requestHashFor(
          existing.campaignId,
          normalizedName,
          normalizedPhone,
          parsedAmount || "",
        );
        if (existing.requestHash && existing.requestHash !== requestHash)
          return res.status(409).json({
            message: "Idempotency-Key was already used for a different pledge",
          });
        const totals = await calculateCampaignTotals(existing.campaignId);
        return res.status(200).json({
          message: "Pledge already recorded",
          totals,
          pledgeId: existing.id,
        });
      }
    }
    console.error("Create pledge error:", error);
    return res.status(500).json({ message: "Unable to record pledge" });
  }
};

const listChurchPledges = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const where = {};
    if (req.query.name)
      where.name = { [Op.like]: `%${String(req.query.name).trim()}%` };
    if (req.query.phone) {
      const phone = normalizeZimbabwePhone(String(req.query.phone));
      where.phone = phone || {
        [Op.like]: `%${String(req.query.phone).replace(/\D/g, "")}%`,
      };
    }
    if (req.query.amount) {
      const amount = parseAmount(req.query.amount);
      if (!amount)
        return res
          .status(400)
          .json({ message: "Invalid pledge amount filter" });
      where.monetaryAmount = amount;
    }
    const createdAt = {};
    if (req.query.from) createdAt[Op.gte] = parseDateFilter(req.query.from);
    if (req.query.to) createdAt[Op.lt] = parseDateFilter(req.query.to, true);
    if (
      (req.query.from && !createdAt[Op.gte]) ||
      (req.query.to && !createdAt[Op.lt])
    )
      return res.status(400).json({ message: "Invalid pledge date filter" });
    if (createdAt[Op.gte] && createdAt[Op.lt] <= createdAt[Op.gte]) {
      return res
        .status(400)
        .json({ message: "Pledge start date must be before the end date" });
    }
    if (Object.keys(createdAt).length) where.createdAt = createdAt;

    const campaignWhere = { churchId: req.user.churchId };
    if (req.query.campaignId) campaignWhere.id = req.query.campaignId;
    const { rows, count } = await Pledge.findAndCountAll({
      where,
      include: [
        {
          model: Campaign,
          as: "campaign",
          where: campaignWhere,
          attributes: ["id", "title", "slug"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      attributes: { exclude: ["idempotencyKey"] },
    });
    return res.json({
      pledges: rows,
      count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("List church pledges error:", error);
    return res.status(500).json({ message: "Unable to load pledges" });
  }
};

const listPledges = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { rows, count } = await Pledge.findAndCountAll({
      where: { campaignId: campaign.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      attributes: { exclude: ["idempotencyKey"] },
      include: [
        {
          model: db.pledgeItems,
          as: "items",
          include: [
            {
              model: db.pledgeCampaignItems,
              as: "campaignItem",
              attributes: ["id", "name", "unit"],
            },
          ],
        },
      ],
    });
    return res.json({
      pledges: rows,
      count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("List pledges error:", error);
    return res.status(500).json({ message: "Unable to load pledges" });
  }
};

/**
 * ==========================================
 * CAMPAIGN MATERIAL ITEMS
 * ==========================================
 */
const listCampaignItems = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const items = await db.pledgeCampaignItems.findAll({
      where: { campaignId: campaign.id },
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
    const result = await Promise.all(
      items.map(async (item) => {
        const totals = await calculateCampaignItemTotals(item.id);
        return { ...item.toJSON(), totals };
      }),
    );
    return res.json({ items: result });
  } catch (error) {
    console.error("List campaign items error:", error);
    return res.status(500).json({ message: "Unable to load campaign items" });
  }
};

const createCampaignItem = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const {
      name,
      description,
      targetQuantity,
      unit,
      status = "ACTIVE",
    } = req.body;
    if (!name?.trim() || !unit?.trim())
      return res
        .status(400)
        .json({ message: "Item name and unit are required" });
    const parsedQuantity = parseQuantity(targetQuantity);
    if (!parsedQuantity)
      return res
        .status(400)
        .json({ message: "Target quantity must be a positive number" });
    if (!["ACTIVE", "COMPLETED", "CANCELLED"].includes(status))
      return res.status(400).json({ message: "Invalid item status" });
    const maxSort = await db.pledgeCampaignItems.max("sortOrder", {
      where: { campaignId: campaign.id },
    });
    const item = await db.pledgeCampaignItems.create({
      campaignId: campaign.id,
      name: name.trim(),
      description: description?.trim() || null,
      targetQuantity: parsedQuantity,
      unit: unit.trim(),
      status,
      sortOrder: (maxSort || 0) + 1,
    });
    const totals = await calculateCampaignItemTotals(item.id);
    emitCampaignState(campaign.id, "campaign:itemUpdated", {
      campaignId: campaign.id,
      item,
      totals,
      action: "created",
    });
    return res.status(201).json({ item, totals });
  } catch (error) {
    console.error("Create campaign item error:", error);
    return res.status(500).json({ message: "Unable to create campaign item" });
  }
};

const updateCampaignItem = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const item = await db.pledgeCampaignItems.findOne({
      where: { id: req.params.itemId, campaignId: campaign.id },
    });
    if (!item)
      return res.status(404).json({ message: "Campaign item not found" });
    const { name, description, targetQuantity, unit, status, sortOrder } =
      req.body;
    if (name !== undefined) {
      if (!name?.trim())
        return res.status(400).json({ message: "Item name cannot be empty" });
      await item.update({ name: name.trim() });
    }
    if (description !== undefined)
      await item.update({ description: description?.trim() || null });
    if (targetQuantity !== undefined) {
      const parsedQuantity = parseQuantity(targetQuantity);
      if (!parsedQuantity)
        return res
          .status(400)
          .json({ message: "Target quantity must be a positive number" });
      await item.update({ targetQuantity: parsedQuantity });
    }
    if (unit !== undefined) {
      if (!unit?.trim())
        return res.status(400).json({ message: "Unit cannot be empty" });
      await item.update({ unit: unit.trim() });
    }
    if (status !== undefined) {
      if (!["ACTIVE", "COMPLETED", "CANCELLED"].includes(status))
        return res.status(400).json({ message: "Invalid item status" });
      await item.update({ status });
    }
    if (sortOrder !== undefined) {
      const sort = Number(sortOrder);
      if (!Number.isInteger(sort) || sort < 0)
        return res.status(400).json({ message: "Invalid sort order" });
      await item.update({ sortOrder: sort });
    }
    const totals = await calculateCampaignItemTotals(item.id);
    emitCampaignState(campaign.id, "campaign:itemUpdated", {
      campaignId: campaign.id,
      item,
      totals,
      action: "updated",
    });
    return res.json({ item, totals });
  } catch (error) {
    console.error("Update campaign item error:", error);
    return res.status(500).json({ message: "Unable to update campaign item" });
  }
};

const deleteCampaignItem = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: getCampaignForChurch(req),
    });
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });
    const item = await db.pledgeCampaignItems.findOne({
      where: { id: req.params.itemId, campaignId: campaign.id },
    });
    if (!item)
      return res.status(404).json({ message: "Campaign item not found" });
    await item.update({ status: "CANCELLED" });
    emitCampaignState(campaign.id, "campaign:itemUpdated", {
      campaignId: campaign.id,
      item,
      action: "removed",
    });
    return res.json({ message: "Campaign item cancelled" });
  } catch (error) {
    console.error("Delete campaign item error:", error);
    return res.status(500).json({ message: "Unable to delete campaign item" });
  }
};

module.exports = {
  listCampaigns,
  listPublicCampaigns,
  createCampaign,
  updateCampaign,
  getCampaign,
  getPublicCampaign,
  createPublicPledge,
  listChurchPledges,
  listPledges,
  listCampaignItems,
  createCampaignItem,
  updateCampaignItem,
  deleteCampaignItem,
};
