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

    const slug =
      churchName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "church";

    // Wrap every write in one transaction so a failure partway through
    // (e.g. churchSettings insert succeeds, churches insert fails) rolls
    // back cleanly instead of leaving orphaned rows that break a retry.
    await queryInterface.sequelize.transaction(async (t) => {
      // Guard against re-running this migration on an already-provisioned
      // database. Check both tables (not just "churches") and also check
      // for a leftover churchSettings row with the same slug, in case a
      // prior run failed after creating churchSettings but before creating
      // churches (which is exactly what caused the unique-constraint error
      // seen previously).
      const [churchCountRows, existingSettingsRows] = await Promise.all([
        queryInterface.sequelize.query(
          "SELECT COUNT(*) AS count FROM churches",
          {
            type: Sequelize.QueryTypes.SELECT,
            transaction: t,
          },
        ),
        queryInterface.sequelize.query(
          "SELECT id FROM churchSettings WHERE slug = ? LIMIT 1",
          {
            replacements: [slug],
            type: Sequelize.QueryTypes.SELECT,
            transaction: t,
          },
        ),
      ]);

      const churchCount = Number(churchCountRows[0]?.count || 0);
      const orphanedSettings = existingSettingsRows[0] || null;

      if (churchCount > 0) {
        // A church already exists — nothing to do.
        return;
      }

      if (orphanedSettings) {
        // A churchSettings row exists for this slug but no church was ever
        // created for it — almost certainly a leftover from a prior failed
        // run. Clean it up before re-provisioning rather than colliding
        // with it on insert.
        await queryInterface.bulkDelete(
          "churchSettings",
          { id: orphanedSettings.id },
          { transaction: t },
        );
      }

      const churchId = uuidv4();
      const churchSettingsId = uuidv4();

      const adminRoleRows = await queryInterface.sequelize.query(
        "SELECT id FROM `role` WHERE name = 'admin' LIMIT 1",
        { type: Sequelize.QueryTypes.SELECT, transaction: t },
      );
      const adminRoleId = adminRoleRows[0]?.id || null;

      if (!adminRoleId) {
        throw new Error(
          "No admin role exists. Create the application roles before provisioning the church.",
        );
      }

      await queryInterface.bulkInsert(
        "churchSettings",
        [
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
        ],
        { transaction: t },
      );

      await queryInterface.bulkInsert(
        "churches",
        [
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
        ],
        { transaction: t },
      );

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await queryInterface.bulkInsert(
        "users",
        [
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
        ],
        { transaction: t },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      const churchCount = await queryInterface.sequelize.query(
        "SELECT COUNT(*) AS count FROM churches",
        { type: Sequelize.QueryTypes.SELECT, transaction: t },
      );

      if (Number(churchCount[0]?.count || 0) === 0) {
        return;
      }

      await queryInterface.bulkDelete("users", null, { transaction: t });
      await queryInterface.bulkDelete("churches", null, { transaction: t });
      await queryInterface.bulkDelete("churchSettings", null, {
        transaction: t,
      });
    });
  },
};
