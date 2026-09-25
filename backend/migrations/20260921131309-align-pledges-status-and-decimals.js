"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    const tableExists = await queryInterface.tableExists("pledges");
    if (!tableExists) {
      return;
    }

    // ── 1. Loosen `status` to a plain string so we can rewrite values.
    await queryInterface.changeColumn("pledges", "status", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "PLEDGED",
    });

    // ── 2. Map old ENUM values → new ones.
    //      UPPER() makes this case-insensitive so 'pending' also maps.
    await queryInterface.sequelize.query(`
      UPDATE pledges
      SET status = CASE UPPER(status)
        WHEN 'PENDING'             THEN 'PLEDGED'
        WHEN 'PARTIAL'             THEN 'PARTIALLY_FULFILLED'
        WHEN 'PARTIALLY_FULFILLED' THEN 'PARTIALLY_FULFILLED'
        WHEN 'FULFILLED'           THEN 'FULFILLED'
        WHEN 'CANCELLED'           THEN 'CANCELLED'
        WHEN 'PLEDGED'             THEN 'PLEDGED'
        ELSE 'PLEDGED'
      END
    `);

    // ── 3. Tighten to the real ENUM (matches models/pledge.js).
    await queryInterface.changeColumn("pledges", "status", {
      type: DataTypes.ENUM(
        "PLEDGED",
        "PARTIALLY_FULFILLED",
        "FULFILLED",
        "CANCELLED",
      ),
      allowNull: false,
      defaultValue: "PLEDGED",
    });

    // ── 4. DECIMAL precision — match models/pledge.js.
    await queryInterface.changeColumn("pledges", "monetaryAmount", {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    });

    await queryInterface.changeColumn("pledges", "fulfilledMonetaryAmount", {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: "0.00",
    });
  },

  async down(queryInterface, DataTypes) {
    const tableExists = await queryInterface.tableExists("pledges");
    if (!tableExists) {
      return;
    }

    // Best-effort reverse mapping.
    await queryInterface.changeColumn("pledges", "status", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "PENDING",
    });

    await queryInterface.sequelize.query(`
      UPDATE pledges
      SET status = CASE UPPER(status)
        WHEN 'PLEDGED'             THEN 'PENDING'
        WHEN 'PARTIALLY_FULFILLED' THEN 'PARTIAL'
        WHEN 'FULFILLED'           THEN 'FULFILLED'
        WHEN 'CANCELLED'           THEN 'CANCELLED'
        ELSE 'PENDING'
      END
    `);

    await queryInterface.changeColumn("pledges", "status", {
      type: DataTypes.ENUM("PENDING", "PARTIAL", "FULFILLED", "CANCELLED"),
      allowNull: false,
      defaultValue: "PENDING",
    });

    await queryInterface.changeColumn("pledges", "monetaryAmount", {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    });

    await queryInterface.changeColumn("pledges", "fulfilledMonetaryAmount", {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: "0.00",
    });
  },
};
