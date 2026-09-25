"use strict";

/**
 * Migration note:
 * This migration was generated from the actual schema history.
 * The auditlogs table was created with churchId in earlier migrations,
 * and the live DB schema drift is that the column is missing.
 * This file is intentionally NOT executed here; review and run manually.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (error) {
        return false;
      }
    };

    const auditLogsExists = await tableExists("auditlogs");
    if (!auditLogsExists) {
      return;
    }

    const columns = await queryInterface
      .describeTable("auditlogs")
      .catch(() => ({}));
    if (columns.churchId) {
      return;
    }

    await queryInterface.addColumn("auditlogs", "churchId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "churches",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, _Sequelize) {
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (error) {
        return false;
      }
    };

    const auditLogsExists = await tableExists("auditlogs");
    if (!auditLogsExists) return;

    const columns = await queryInterface
      .describeTable("auditlogs")
      .catch(() => ({}));
    if (columns.churchId) {
      await queryInterface.removeColumn("auditlogs", "churchId");
    }
  },
};
