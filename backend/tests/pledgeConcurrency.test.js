const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../models");
const { calculateCampaignTotals } = require("../utils/pledgeHelpers");

let business;
let campaign;

test("persists and aggregates 100 concurrent pledges", async () => {
  await db.sequelize.authenticate();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  business = await db.businesses.create({
    name: `Concurrency Church ${suffix}`,
    slug: `concurrency-${suffix}`,
    phone: "+263771234567",
    email: `concurrency-${suffix}@example.com`,
  });
  campaign = await db.pledgeCampaigns.create({
    businessId: business.id,
    title: "Concurrency Campaign",
    targetAmount: "1000000.00",
    status: "ACTIVE",
    slug: `concurrency-campaign-${suffix}`,
  });

  const pledges = Array.from({ length: 100 }, (_, index) => ({
    campaignId: campaign.id,
    name: `Test User ${index}`,
    phone: `+26377${String(index).padStart(7, "0")}`,
    monetaryAmount: (100 + index).toFixed(2),
  }));
  await Promise.all(
    pledges.map((pledge) =>
      db.sequelize.transaction((transaction) =>
        db.pledges.create(pledge, { transaction }),
      ),
    ),
  );

  const count = await db.pledges.count({ where: { campaignId: campaign.id } });
  const sum = await db.pledges.sum("monetaryAmount", {
    where: { campaignId: campaign.id },
  });
  const totals = await calculateCampaignTotals(campaign.id);
  const expectedTotal = (100 * 100 + (99 * 100) / 2).toFixed(2);

  assert.equal(count, 100);
  assert.equal(Number(sum).toFixed(2), expectedTotal);
  assert.equal(totals.totalPledged, expectedTotal);
  assert.equal(totals.pledgeCount, 100);
});

after(async () => {
  if (campaign)
    await db.pledges.destroy({ where: { campaignId: campaign.id } });
  if (campaign)
    await db.pledgeCampaigns.destroy({ where: { id: campaign.id } });
  if (business) await db.businesses.destroy({ where: { id: business.id } });
  await db.sequelize.close();
});
