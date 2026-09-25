const { Op } = require("sequelize");
const db = require("../models");

const Queue = db.queues;
const QueueEntry = db.queueEntries;
const QueueStaff = db.queueStaff;
const User = db.users;
const AuditLog = db.auditlogs;
const Campaign = db.pledgeCampaigns;
const Pledge = db.pledges;
const CampaignItem = db.pledgeCampaignItems;
const PledgeItem = db.pledgeItems;

const ACTIVE_STATUSES = ["waiting", "standby", "called", "serving"];
const DAY_MS = 24 * 60 * 60 * 1000;

const getRoleName = (user) => user.role?.name || user.role || "staff";

const round = (value) => Math.round(value * 10) / 10;

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

const buildFundraisingAnalytics = async (churchId, days) => {
  const campaigns = await Campaign.findAll({
    where: { churchId },
    attributes: ["id", "title", "targetAmount", "status", "createdAt"],
    include: [
      {
        model: Pledge,
        as: "pledges",
        required: false,
        where: { status: { [Op.ne]: "CANCELLED" } },
        attributes: [
          "id",
          "name",
          "phone",
          "monetaryAmount",
          "fulfilledMonetaryAmount",
          "createdAt",
        ],
        include: [
          {
            model: PledgeItem,
            as: "items",
            required: false,
            attributes: ["quantity", "fulfilledQuantity", "campaignItemId"],
            include: [
              {
                model: CampaignItem,
                as: "campaignItem",
                attributes: ["id", "name", "unit", "targetQuantity"],
              },
            ],
          },
        ],
      },
      {
        model: CampaignItem,
        as: "items",
        required: false,
        attributes: ["id", "name", "unit", "targetQuantity", "status"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const from = new Date(Date.now() - days * DAY_MS);
  const dailyMap = new Map();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * DAY_MS);
    dailyMap.set(dayKey(date), {
      date: dayKey(date),
      pledged: 0,
      collected: 0,
      pledges: 0,
    });
  }
  const donorMap = new Map();
  const materialMap = new Map();
  let totalPledged = 0;
  let totalCollected = 0;
  let totalTarget = 0;
  let pledgeCount = 0;

  const campaignAnalytics = campaigns.map((campaign) => {
    const pledges = campaign.pledges || [];
    const pledgedAmount = pledges.reduce(
      (sum, pledge) => sum + Number(pledge.monetaryAmount || 0),
      0,
    );
    const collectedAmount = pledges.reduce(
      (sum, pledge) => sum + Number(pledge.fulfilledMonetaryAmount || 0),
      0,
    );
    const materials = new Map();
    (campaign.items || []).forEach((item) =>
      materials.set(item.id, {
        id: item.id,
        name: item.name,
        unit: item.unit,
        targetQuantity: Number(item.targetQuantity || 0),
        pledgedQuantity: 0,
        fulfilledQuantity: 0,
      }),
    );

    pledges.forEach((pledge) => {
      const donorKey = `${pledge.phone || ""}:${pledge.name.trim().toLowerCase()}`;
      const donor = donorMap.get(donorKey) || {
        id: donorKey,
        name: pledge.name,
        phone: pledge.phone,
        pledged: 0,
        collected: 0,
        pledgeCount: 0,
      };
      donor.pledged += Number(pledge.monetaryAmount || 0);
      donor.collected += Number(pledge.fulfilledMonetaryAmount || 0);
      donor.pledgeCount += 1;
      donorMap.set(donorKey, donor);

      const date = dayKey(pledge.createdAt);
      if (new Date(pledge.createdAt) >= from && dailyMap.has(date)) {
        const daily = dailyMap.get(date);
        daily.pledged += Number(pledge.monetaryAmount || 0);
        daily.collected += Number(pledge.fulfilledMonetaryAmount || 0);
        daily.pledges += 1;
      }
      (pledge.items || []).forEach((pledgeItem) => {
        const item = materials.get(pledgeItem.campaignItemId) || {
          id: pledgeItem.campaignItemId,
          name: pledgeItem.campaignItem?.name || "Material",
          unit: pledgeItem.campaignItem?.unit || "unit",
          targetQuantity: Number(pledgeItem.campaignItem?.targetQuantity || 0),
          pledgedQuantity: 0,
          fulfilledQuantity: 0,
        };
        item.pledgedQuantity += Number(pledgeItem.quantity || 0);
        item.fulfilledQuantity += Number(pledgeItem.fulfilledQuantity || 0);
        materials.set(item.id, item);
        materialMap.set(item.id, item);
      });
    });

    totalPledged += pledgedAmount;
    totalCollected += collectedAmount;
    totalTarget += Number(campaign.targetAmount || 0);
    pledgeCount += pledges.length;
    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      targetAmount: Number(campaign.targetAmount || 0),
      pledgedAmount,
      collectedAmount,
      remainingAmount: Math.max(
        0,
        Number(campaign.targetAmount || 0) - pledgedAmount,
      ),
      pledgeCount: pledges.length,
      materials: Array.from(materials.values()),
    };
  });

  return {
    summary: {
      campaignCount: campaigns.length,
      activeCampaigns: campaigns.filter(
        (campaign) => campaign.status === "ACTIVE",
      ).length,
      pledgeCount,
      totalTarget: round(totalTarget),
      totalPledged: round(totalPledged),
      totalCollected: round(totalCollected),
      remainingToCollect: round(Math.max(0, totalPledged - totalCollected)),
    },
    daily: Array.from(dailyMap.values()).map((day) => ({
      ...day,
      pledged: round(day.pledged),
      collected: round(day.collected),
    })),
    campaigns: campaignAnalytics,
    topDonors: Array.from(donorMap.values())
      .sort((left, right) => right.pledged - left.pledged)
      .slice(0, 10)
      .map((donor) => ({
        ...donor,
        pledged: round(donor.pledged),
        collected: round(donor.collected),
      })),
    materials: Array.from(materialMap.values()).map((item) => ({
      ...item,
      pledgedQuantity: round(item.pledgedQuantity),
      fulfilledQuantity: round(item.fulfilledQuantity),
      remainingQuantity: round(
        Math.max(0, item.pledgedQuantity - item.fulfilledQuantity),
      ),
    })),
  };
};

const getAnalytics = async (req, res) => {
  try {
    const churchId = req.user.churchId;
    const role = getRoleName(req.user);
    const staffScope = role === "staff";
    const adminScope = ["admin", "super-admin", "superadmin"].includes(role);
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);

    if (!churchId) {
      return res.status(403).json({ message: "No church assigned" });
    }

    const queues = await Queue.findAll({
      where: { churchId },
      include: [
        {
          model: QueueStaff,
          as: "staffAssignments",
          where: { status: "active" },
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    const scopedQueues = staffScope
      ? queues.filter((queue) =>
          queue.staffAssignments?.some(
            (assignment) => assignment.userId === req.user.id,
          ),
        )
      : queues;
    const queueIds = scopedQueues.map((queue) => queue.id);
    const members = staffScope
      ? []
      : await User.findAll({
          where: { churchId, isActive: true },
          include: [{ model: db.role, as: "role", attributes: ["name"] }],
          attributes: ["id", "name"],
        });
    const visibleMembers = members.filter((member) => {
      const memberRole = member.role?.name;
      return adminScope || memberRole === "staff";
    });
    const fundraising = staffScope
      ? null
      : await buildFundraisingAnalytics(churchId, days);

    if (!queueIds.length) {
      return res.json({
        period: {
          days,
          from: new Date(Date.now() - days * DAY_MS).toISOString(),
        },
        scope: { role, queueCount: 0 },
        summary: {
          waitingNow: 0,
          servingNow: 0,
          completedServes: 0,
          skippedServes: 0,
          averageServiceMinutes: 0,
          averageWaitMinutes: 0,
          transfersReceived: 0,
          transfersOut: 0,
        },
        daily: [],
        queues: [],
        staff: visibleMembers.map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role?.name || "member",
          completed: 0,
          transfersOut: 0,
          serviceMinutes: 0,
          averageServiceMinutes: 0,
        })),
        statusBreakdown: [],
        fundraising,
      });
    }

    const from = new Date(Date.now() - days * DAY_MS);
    const entries = await QueueEntry.findAll({
      where: {
        churchId,
        queueId: { [Op.in]: queueIds },
        [Op.or]: [
          { createdAt: { [Op.gte]: from } },
          { status: { [Op.in]: ACTIVE_STATUSES } },
        ],
      },
      attributes: [
        "id",
        "queueId",
        "status",
        "entryType",
        "joinedAt",
        "servingAt",
        "completedAt",
        "calledBy",
        "createdAt",
      ],
      include: [
        {
          model: User,
          as: "staff",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    const transferAudits = await AuditLog.findAll({
      where: {
        churchId,
        userId: staffScope ? req.user.id : { [Op.ne]: null },
        createdAt: { [Op.gte]: from },
        entity: { [Op.like]: "%/transfer" },
      },
      attributes: ["userId", "createdAt"],
    });

    const visibleEntries = staffScope
      ? entries.filter((entry) =>
          entry.status !== "completed" && entry.status !== "skipped"
            ? true
            : entry.calledBy === req.user.id,
        )
      : entries;
    const completedEntries = visibleEntries.filter(
      (entry) => entry.status === "completed" && entry.completedAt,
    );
    const serviceDurations = completedEntries
      .map((entry) => {
        const start = entry.servingAt || entry.joinedAt;
        return start && entry.completedAt
          ? (new Date(entry.completedAt) - new Date(start)) / 60000
          : null;
      })
      .filter((value) => value !== null && value >= 0);
    const waitDurations = completedEntries
      .map((entry) =>
        entry.servingAt
          ? (new Date(entry.servingAt) - new Date(entry.joinedAt)) / 60000
          : null,
      )
      .filter((value) => value !== null && value >= 0);

    const transfersReceived = visibleEntries.filter(
      (entry) => entry.entryType === "transfer",
    ).length;
    const transfersOut = transferAudits.length;

    const dailyMap = new Map();
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date(Date.now() - index * DAY_MS);
      dailyMap.set(dayKey(date), {
        date: dayKey(date),
        completed: 0,
        transfers: 0,
      });
    }
    completedEntries.forEach((entry) => {
      const key = dayKey(entry.completedAt);
      if (dailyMap.has(key)) dailyMap.get(key).completed += 1;
    });
    visibleEntries.forEach((entry) => {
      if (entry.entryType !== "transfer") return;
      const key = dayKey(entry.createdAt);
      if (dailyMap.has(key)) dailyMap.get(key).transfers += 1;
    });

    const queueStats = scopedQueues.map((queue) => {
      const queueEntries = visibleEntries.filter(
        (entry) => entry.queueId === queue.id,
      );
      return {
        id: queue.id,
        name: queue.name,
        waiting: queueEntries.filter((entry) => entry.status === "waiting")
          .length,
        serving: queueEntries.filter((entry) =>
          ["called", "serving"].includes(entry.status),
        ).length,
        completed: queueEntries.filter((entry) => entry.status === "completed")
          .length,
        transfers: queueEntries.filter(
          (entry) => entry.entryType === "transfer",
        ).length,
      };
    });

    const staffMap = new Map(
      visibleMembers.map((member) => [
        member.id,
        {
          id: member.id,
          name: member.name,
          role: member.role?.name || "member",
          completed: 0,
          transfersOut: 0,
          serviceMinutes: 0,
        },
      ]),
    );
    completedEntries.forEach((entry) => {
      const staffId = entry.calledBy || "unassigned";
      const staffName =
        entry.staff?.name ||
        (staffId === req.user.id ? req.user.name : "Unassigned");
      const current = staffMap.get(staffId) || {
        id: staffId,
        name: staffName,
        role: "staff",
        completed: 0,
        transfersOut: 0,
        serviceMinutes: 0,
      };
      const duration = entry.servingAt
        ? (new Date(entry.completedAt) - new Date(entry.servingAt)) / 60000
        : 0;
      current.completed += 1;
      current.serviceMinutes += Math.max(duration, 0);
      staffMap.set(staffId, current);
    });
    transferAudits.forEach((audit) => {
      const current = staffMap.get(audit.userId) || {
        id: audit.userId,
        name: audit.userId === req.user.id ? req.user.name : "Staff member",
        role: "staff",
        completed: 0,
        transfersOut: 0,
        serviceMinutes: 0,
      };
      current.transfersOut += 1;
      staffMap.set(audit.userId, current);
    });

    const currentEntries = entries.filter((entry) =>
      ACTIVE_STATUSES.includes(entry.status),
    );
    return res.json({
      period: { days, from: from.toISOString() },
      scope: {
        role,
        queueCount: scopedQueues.length,
        memberCount: visibleMembers.length,
      },
      summary: {
        waitingNow: currentEntries.filter((entry) =>
          ["waiting", "standby"].includes(entry.status),
        ).length,
        servingNow: currentEntries.filter((entry) =>
          ["called", "serving"].includes(entry.status),
        ).length,
        completedServes: completedEntries.length,
        skippedServes: visibleEntries.filter(
          (entry) => entry.status === "skipped",
        ).length,
        averageServiceMinutes: serviceDurations.length
          ? round(
              serviceDurations.reduce((sum, value) => sum + value, 0) /
                serviceDurations.length,
            )
          : 0,
        averageWaitMinutes: waitDurations.length
          ? round(
              waitDurations.reduce((sum, value) => sum + value, 0) /
                waitDurations.length,
            )
          : 0,
        transfersReceived,
        transfersOut,
      },
      daily: Array.from(dailyMap.values()),
      queues: queueStats,
      staff: Array.from(staffMap.values()).map((staff) => ({
        ...staff,
        averageServiceMinutes: staff.completed
          ? round(staff.serviceMinutes / staff.completed)
          : 0,
      })),
      statusBreakdown: [
        "waiting",
        "standby",
        "called",
        "serving",
        "completed",
        "skipped",
      ].map((status) => ({
        status,
        count: visibleEntries.filter((entry) => entry.status === status).length,
      })),
      fundraising,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAnalytics };
