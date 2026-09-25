"use strict";

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const churchName =
      process.env.CHURCH_NAME || process.env.APP_NAME || "QueueLess Church";
    const churchPhone = process.env.CHURCH_PHONE || "+15551234567";
    const churchEmail = process.env.CHURCH_EMAIL || "admin@example.com";
    const churchAddress = process.env.CHURCH_ADDRESS || "1 Main Street";
    const churchCurrency = process.env.CHURCH_CURRENCY || "USD";
    const churchTimezone = process.env.CHURCH_TIMEZONE || "UTC";
    const adminName = process.env.INITIAL_ADMIN_NAME || "System Administrator";
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "Password123!";

    const churchesTableExists = await queryInterface.tableExists("churches");
    const churchSettingsTableExists =
      await queryInterface.tableExists("churchSettings");

    if (!churchesTableExists || !churchSettingsTableExists) {
      throw new Error(
        "The single-church schema tables are missing. Run the app migrations before this seeder.",
      );
    }

    const churchCount = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM churches",
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (Number(churchCount[0]?.count || 0) > 0) {
      return;
    }

    const churchId = uuidv4();
    const churchSettingsId = uuidv4();
    const adminRoleId = await queryInterface.sequelize
      .query("SELECT id FROM `role` WHERE name = 'admin' LIMIT 1", {
        type: Sequelize.QueryTypes.SELECT,
      })
      .then((rows) => rows[0]?.id || null);

    if (!adminRoleId) {
      throw new Error(
        "No admin role exists. Create the application roles before provisioning the church.",
      );
    }

    const slug =
      churchName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "church";

    await queryInterface.bulkInsert("churchSettings", [
      {
        id: churchSettingsId,
        churchName,
        slug,
        logo: null,
        favicon: null,
        primaryColor: null,
        secondaryColor: null,
        address: churchAddress,
        phone: churchPhone,
        email: churchEmail,
        website: null,
        currency: churchCurrency,
        timezone: churchTimezone,
        welcomeMessage: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await queryInterface.bulkInsert("churches", [
      {
        id: churchId,
        name: churchName,
        slug,
        phone: churchPhone,
        email: churchEmail,
        image: null,
        address: churchAddress,
        status: "active",
        churchSettingsId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await queryInterface.bulkInsert("users", [
      {
        id: uuidv4(),
        churchId,
        churchSettingsId,
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRoleId,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        isVerified: true,
        inviteToken: null,
        inviteExpires: null,
        loginAttempts: 0,
        lockUntil: null,
        lastLoginAttempt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    const churchCount = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM churches",
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (Number(churchCount[0]?.count || 0) === 0) {
      return;
    }

    await queryInterface.bulkDelete("users", null, {});
    await queryInterface.bulkDelete("churches", null, {});
    await queryInterface.bulkDelete("churchSettings", null, {});
  },
};
