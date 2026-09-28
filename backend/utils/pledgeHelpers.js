const db = require("../models");
const { fn, col } = require("sequelize");

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const parseAmount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 1) return null;
  const [whole, decimal = ""] = normalized.split(".");
  const cents = decimal ? decimal.padEnd(2, "0").slice(0, 2) : "00";
  if (BigInt(whole || "0") > 9999999999999n) return null;
  return `${whole}.${cents}`;
};

const parseQuantity = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 1) return null;
  const [whole, decimal = ""] = normalized.split(".");
  const fixed = decimal ? decimal.padEnd(3, "0").slice(0, 3) : "000";
  return `${whole}.${fixed}`;
};

const generateCampaignJoinCode = () => {
  let code = "";
  for (let index = 0; index < 8; index++) {
    code +=
      JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
};

const toCents = (value) => {
  const [whole, decimal = ""] = String(value || "0").split(".");
  return (
    BigInt(whole || "0") * 100n +
    BigInt(decimal.padEnd(2, "0").slice(0, 2) || "0")
  );
};

const fromCents = (value) => {
  const cents = value < 0n ? -value : value;
  const result = `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
  return value < 0n ? `-${result}` : result;
};

const getPledgeRemaining = (pledge) => {
  const monetaryRemaining = pledge.monetaryAmount
    ? fromCents(
        toCents(pledge.monetaryAmount) -
          toCents(pledge.fulfilledMonetaryAmount),
      )
    : null;
  return {
    monetaryRemaining:
      monetaryRemaining && monetaryRemaining.startsWith("-")
        ? "0.00"
        : monetaryRemaining,
    items: (pledge.items || []).map((item) => {
      const scale = 1000n;
      const quantityUnits = (value) => {
        const [whole, fraction = ""] = String(value || "0").split(".");
        return (
          BigInt(whole || "0") * scale +
          BigInt(fraction.padEnd(3, "0").slice(0, 3) || "0")
        );
      };
      const remaining =
        quantityUnits(item.quantity) - quantityUnits(item.fulfilledQuantity);
      const safeRemaining = remaining > 0n ? remaining : 0n;
      return {
        pledgeItemId: item.id,
        remainingQuantity: `${safeRemaining / scale}.${String(safeRemaining % scale).padStart(3, "0")}`,
      };
    }),
  };
};

const derivePledgeStatus = ({
  monetaryAmount,
  fulfilledMonetaryAmount,
  items = [],
  cancelled = false,
}) => {
  if (cancelled) return "CANCELLED";

  const moneyPledged = monetaryAmount ? Number(monetaryAmount) : 0;
  const moneyFulfilled = fulfilledMonetaryAmount
    ? Number(fulfilledMonetaryAmount)
    : 0;
  const monetaryFullyFulfilled =
    moneyPledged > 0 && moneyFulfilled >= moneyPledged;
  const hasMonetaryFulfillment =
    moneyFulfilled > 0 && moneyFulfilled < moneyPledged;

  const materialEntries = items.map((item) => ({
    quantity: Number(item.quantity || 0),
    fulfilled: Number(item.fulfilledQuantity || 0),
  }));
  const materialFullyFulfilled =
    materialEntries.length > 0 &&
    materialEntries.every((item) => item.fulfilled >= item.quantity);
  const hasMaterialFulfillment =
    materialEntries.some(
      (item) => item.fulfilled > 0 && item.fulfilled < item.quantity,
    ) ||
    materialEntries.some(
      (item) => item.fulfilled > 0 && item.fulfilled === item.quantity,
    );

  const materialTotalPledged = materialEntries.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const materialTotalFulfilled = materialEntries.reduce(
    (sum, item) => sum + item.fulfilled,
    0,
  );
  const overallFulfilled =
    (moneyPledged === 0 || monetaryFullyFulfilled) &&
    (materialEntries.length === 0 ||
      materialFullyFulfilled ||
      materialTotalPledged === materialTotalFulfilled);

  if (overallFulfilled) return "FULFILLED";
  if (
    hasMonetaryFulfillment ||
    hasMaterialFulfillment ||
    materialTotalFulfilled > 0
  )
    return "PARTIALLY_FULFILLED";
  return "PLEDGED";
};

const calculateCampaignTotals = async (campaignId, transaction) => {
  const campaign = await db.pledgeCampaigns.findByPk(campaignId, {
    transaction,
  });
  if (!campaign) return null;

  const result = await db.pledges.findOne({
    attributes: [
      [fn("COALESCE", fn("SUM", col("monetaryAmount")), 0), "totalPledged"],
      [
        fn("COALESCE", fn("SUM", col("fulfilledMonetaryAmount")), 0),
        "fulfilledAmount",
      ],
      [fn("COUNT", col("id")), "pledgeCount"],
    ],
    where: { campaignId, status: { [db.Sequelize.Op.ne]: "CANCELLED" } },
    raw: true,
    transaction,
  });
  const totalPledged = fromCents(toCents(result?.totalPledged));
  const fulfilledAmount = fromCents(toCents(result?.fulfilledAmount));
  const targetAmount = campaign.targetAmount
    ? fromCents(toCents(campaign.targetAmount))
    : "0.00";
  const targetCents = toCents(targetAmount);
  const remainingAmount =
    Number(targetCents) > 0n
      ? fromCents(targetCents - toCents(totalPledged))
      : "0.00";
  const fulfillmentRemaining =
    Number(toCents(totalPledged)) > Number(toCents(fulfilledAmount))
      ? fromCents(toCents(totalPledged) - toCents(fulfilledAmount))
      : "0.00";
  const progressPercentage =
    targetCents > 0n
      ? Math.min(
          100,
          (Number(toCents(totalPledged)) / Number(targetCents)) * 100,
        )
      : 0;
  const fulfillmentProgress =
    Number(toCents(totalPledged)) > 0
      ? Math.min(
          100,
          (Number(toCents(fulfilledAmount)) / Number(toCents(totalPledged))) *
            100,
        )
      : 0;

  return {
    campaignId,
    totalPledged,
    fulfilledAmount,
    remainingAmount: campaign.targetAmount ? remainingAmount : "0.00",
    remainingToPledge: campaign.targetAmount ? remainingAmount : "0.00",
    remainingToFulfill: fulfillmentRemaining,
    progressPercentage: Number(progressPercentage.toFixed(2)),
    fulfillmentProgress: Number(fulfillmentProgress.toFixed(2)),
    pledgeCount: Number(result?.pledgeCount || 0),
    targetAmount: campaign.targetAmount ? targetAmount : null,
  };
};

const toSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 170);

/**
 * Calculate totals for a single material campaign item.
 */
const calculateCampaignItemTotals = async (campaignItemId, transaction) => {
  const item = await db.pledgeCampaignItems.findByPk(campaignItemId, {
    transaction,
  });
  if (!item) return null;

  const result = await db.pledgeItems.findOne({
    attributes: [
      [
        fn("COALESCE", fn("SUM", col("pledgeItems.quantity")), 0),
        "totalPledged",
      ],
      [
        fn("COALESCE", fn("SUM", col("pledgeItems.fulfilledQuantity")), 0),
        "totalFulfilled",
      ],
      [fn("COUNT", col("pledgeItems.id")), "pledgeCount"],
    ],
    include: [
      {
        model: db.pledges,
        as: "pledge",
        required: true,
        attributes: [],
        where: {
          status: { [db.Sequelize.Op.ne]: "CANCELLED" },
        },
      },
    ],
    where: { campaignItemId },
    raw: true,
    transaction,
  });

  const totalPledged = Number(result?.totalPledged ?? "0");
  const totalFulfilled = Number(result?.totalFulfilled ?? "0");
  const targetQuantity = Number(item.targetQuantity);
  const remainingToPledge = Math.max(0, targetQuantity - totalPledged);
  const remainingToFulfill = Math.max(0, totalPledged - totalFulfilled);
  const progressPercentage =
    targetQuantity > 0
      ? Math.min(100, (totalPledged / targetQuantity) * 100)
      : 0;
  const fulfillmentProgress =
    totalPledged > 0 ? Math.min(100, (totalFulfilled / totalPledged) * 100) : 0;
  const completed = totalPledged >= targetQuantity;

  return {
    campaignItemId: item.id,
    name: item.name,
    description: item.description,
    unit: item.unit,
    targetQuantity: String(item.targetQuantity),
    totalPledged: String(totalPledged),
    fulfilledQuantity: String(totalFulfilled),
    remainingToPledge: String(remainingToPledge),
    remainingQuantity: String(remainingToPledge),
    remainingToFulfill: String(remainingToFulfill),
    progressPercentage: Number(progressPercentage.toFixed(2)),
    fulfillmentProgress: Number(fulfillmentProgress.toFixed(2)),
    pledgeCount: Number(result?.pledgeCount || 0),
    completed,
    status: completed ? "COMPLETED" : item.status,
  };
};

const getCompletedItemStatus = (targetQuantity, totalPledged) => {
  return Number(totalPledged) >= Number(targetQuantity)
    ? "COMPLETED"
    : "ACTIVE";
};

module.exports = {
  calculateCampaignTotals,
  calculateCampaignItemTotals,
  derivePledgeStatus,
  getPledgeRemaining,
  getCompletedItemStatus,
  parseAmount,
  parseQuantity,
  toSlug,
  generateCampaignJoinCode,
};
