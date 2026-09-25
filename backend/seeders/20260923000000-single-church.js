"use strict";

const bcrypt = require("bcryptjs");

const CHURCH_ID = "00000000-0000-4000-8000-000000000001";
const SETTINGS_ID = "00000000-0000-4000-8000-000000000002";
const ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000003";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000004";
const QUEUE_ID = "00000000-0000-4000-8000-000000000005";
const CAMPAIGN_ID = "00000000-0000-4000-8000-000000000006";
const CAMPAIGN_ITEM_ID = "00000000-0000-4000-8000-000000000007";
const PLEDGE_ID = "00000000-0000-4000-8000-000000000008";
const PLEDGE_ITEM_ID = "00000000-0000-4000-8000-000000000009";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@schoolrun.co.zw";
    const password =
      process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMeImmediately!";
    const passwordHash = await bcrypt.hash(password, 12);

    await queryInterface.bulkInsert(
      "role",
      [{ id: ADMIN_ROLE_ID, name: "admin", createdAt: now, updatedAt: now }],
      { updateOnDuplicate: ["name", "updatedAt"] },
    );

    await queryInterface.bulkInsert(
      "churchsettings",
      [
        {
          id: SETTINGS_ID,
          churchName: "QueueLess Church",
          slug: "queueless-church",
          phone: "+263771234567",
          email: "office@queueless.church",
          address: "Harare, Zimbabwe",
          primaryColor: "#1f5c58",
          secondaryColor: "#d7a84b",
          currency: "USD",
          timezone: "Africa/Harare",
          welcomeMessage: "Welcome to QueueLess Church.",
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
      ],
      { updateOnDuplicate: ["churchName", "slug", "updatedAt"] },
    );

    await queryInterface.bulkInsert(
      "churches",
      [
        {
          id: CHURCH_ID,
          name: "QueueLess Church",
          slug: "queueless-church",
          phone: "+263771234567",
          email: "office@queueless.church",
          image: null,
          address: "Harare, Zimbabwe",
          status: "active",
          churchSettingsId: SETTINGS_ID,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "name",
          "slug",
          "phone",
          "email",
          "address",
          "status",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "users",
      [
        {
          id: ADMIN_USER_ID,
          churchId: CHURCH_ID,
          churchSettingsId: SETTINGS_ID,
          name: process.env.DEFAULT_ADMIN_NAME || "Church Admin",
          email,
          password: passwordHash,
          roleId: ADMIN_ROLE_ID,
          isVerified: true,
          loginAttempts: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "churchId",
          "churchSettingsId",
          "name",
          "password",
          "roleId",
          "isVerified",
          "isActive",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "queues",
      [
        {
          id: QUEUE_ID,
          churchId: CHURCH_ID,
          name: "Main Service",
          slug: "main-service",
          joinCode: "CHURCH01",
          prefix: "MS",
          description: "General church service queue",
          status: "open",
          currentNumber: 0,
          nextNumber: 1,
          estimatedServiceTime: 10,
          maxCustomers: 100,
          allowWalkIns: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "churchId",
          "name",
          "slug",
          "description",
          "status",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "pledgecampaigns",
      [
        {
          id: CAMPAIGN_ID,
          churchId: CHURCH_ID,
          title: "Community Outreach Fund",
          description:
            "Support food parcels and outreach materials for the community.",
          targetAmount: "5000.00",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          status: "ACTIVE",
          image: null,
          slug: "community-outreach-fund",
          joinCode: "OUTREACH01",
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "churchId",
          "title",
          "description",
          "targetAmount",
          "status",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "pledgecampaignitems",
      [
        {
          id: CAMPAIGN_ITEM_ID,
          campaignId: CAMPAIGN_ID,
          name: "Food parcels",
          description: "Complete food parcels for families in need.",
          targetQuantity: "250.000",
          unit: "parcel",
          status: "ACTIVE",
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "campaignId",
          "name",
          "description",
          "targetQuantity",
          "unit",
          "status",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "pledges",
      [
        {
          id: PLEDGE_ID,
          campaignId: CAMPAIGN_ID,
          monetaryAmount: "750.00",
          fulfilledMonetaryAmount: "250.00",
          status: "PARTIALLY_FULFILLED",
          name: "Grace Moyo",
          phone: "+263771234567",
          idempotencyKey: "seed-community-outreach-grace",
          requestHash: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "campaignId",
          "monetaryAmount",
          "fulfilledMonetaryAmount",
          "status",
          "name",
          "phone",
          "updatedAt",
        ],
      },
    );

    await queryInterface.bulkInsert(
      "pledgeitems",
      [
        {
          id: PLEDGE_ITEM_ID,
          pledgeId: PLEDGE_ID,
          campaignItemId: CAMPAIGN_ITEM_ID,
          quantity: "25.000",
          fulfilledQuantity: "10.000",
          createdAt: now,
          updatedAt: now,
        },
      ],
      {
        updateOnDuplicate: [
          "pledgeId",
          "campaignItemId",
          "quantity",
          "fulfilledQuantity",
          "updatedAt",
        ],
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("pledgeitems", { id: PLEDGE_ITEM_ID });
    await queryInterface.bulkDelete("pledges", { id: PLEDGE_ID });
    await queryInterface.bulkDelete("pledgecampaignitems", {
      id: CAMPAIGN_ITEM_ID,
    });
    await queryInterface.bulkDelete("pledgecampaigns", { id: CAMPAIGN_ID });
    await queryInterface.bulkDelete("queues", { id: QUEUE_ID });
    await queryInterface.bulkDelete("users", { id: ADMIN_USER_ID });
    await queryInterface.bulkDelete("churches", { id: CHURCH_ID });
    await queryInterface.bulkDelete("churchsettings", { id: SETTINGS_ID });
    await queryInterface.bulkDelete("role", { id: ADMIN_ROLE_ID });
  },
};
