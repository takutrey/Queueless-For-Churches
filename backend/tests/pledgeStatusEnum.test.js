const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../models");

let business;
let campaign;
let pledge;

test("PLEDGED status persists when creating a public pledge", async () => {
  await db.sequelize.authenticate();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  business = await db.businesses.create({
    name: `Status Test Church ${suffix}`,
    slug: `status-test-${suffix}`,
    phone: "+263771234567",
    email: `status-test-${suffix}@example.com`,
  });

  campaign = await db.pledgeCampaigns.create({
    businessId: business.id,
    title: "Status Test Campaign",
    targetAmount: "1000.00",
    status: "ACTIVE",
    slug: `status-test-campaign-${suffix}`,
  });

  pledge = await db.pledges.create({
    campaignId: campaign.id,
    monetaryAmount: "100.00",
    fulfilledMonetaryAmount: "0.00",
    status: "PLEDGED",
    name: "Grayson",
    phone: "+263773945632",
    idempotencyKey: `status-test-${suffix}`,
    requestHash: `hash-${suffix}`,
  });

  assert.equal(pledge.status, "PLEDGED");
  assert.equal(pledge.monetaryAmount, "100.00");
});

test("campaign item totals expose remainingQuantity for the public dashboard", async () => {
  const { calculateCampaignItemTotals } = require("../utils/pledgeHelpers");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const itemCampaign = await db.pledgeCampaigns.create({
    businessId: business.id,
    title: `Item Totals Campaign ${suffix}`,
    targetAmount: "500.00",
    status: "ACTIVE",
    slug: `item-totals-campaign-${suffix}`,
  });

  const item = await db.pledgeCampaignItems.create({
    campaignId: itemCampaign.id,
    name: "Water",
    targetQuantity: "10.000",
    unit: "buckets",
    status: "ACTIVE",
  });

  const totals = await calculateCampaignItemTotals(item.id);

  assert.ok(totals);
  assert.equal(totals.remainingQuantity, "10");
  assert.equal(totals.remainingToPledge, "10");

  await db.pledgeCampaignItems.destroy({ where: { id: item.id } });
  await db.pledgeCampaigns.destroy({ where: { id: itemCampaign.id } });
});

after(async () => {
  if (pledge) await db.pledges.destroy({ where: { id: pledge.id } });
  if (campaign)
    await db.pledgeCampaigns.destroy({ where: { id: campaign.id } });
  if (business) await db.businesses.destroy({ where: { id: business.id } });
  await db.sequelize.close();
});
