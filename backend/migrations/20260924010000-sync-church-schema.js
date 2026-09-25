"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columnExists = async (tableName, columnName) => {
      try {
        const columns = await queryInterface.describeTable(tableName);
        return Boolean(columns[columnName]);
      } catch (error) {
        return false;
      }
    };

    const tables = {
      churches: await queryInterface.tableExists("churches"),
      churchSettings: await queryInterface.tableExists("churchSettings"),
    };

    if (
      tables.churches &&
      !(await columnExists("churches", "churchSettingsId"))
    ) {
      await queryInterface.addColumn("churches", "churchSettingsId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "churchSettings",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (tables.churches && tables.churchSettings) {
      const [defaultChurchSettings] = await queryInterface.sequelize.query(
        "SELECT id FROM churchSettings ORDER BY createdAt ASC LIMIT 1",
        { type: Sequelize.QueryTypes.SELECT },
      );

      if (defaultChurchSettings) {
        await queryInterface.sequelize.query(
          "UPDATE churches SET churchSettingsId = ? WHERE churchSettingsId IS NULL",
          { replacements: [defaultChurchSettings.id] },
        );
      }
    }

    if (
      tables.churches &&
      !(await columnExists("churches", "churchSettingsId"))
    ) {
      return;
    }

    if (
      (await columnExists("users", "businessId")) &&
      !(await columnExists("users", "churchId"))
    ) {
      await queryInterface.sequelize.query(
        "ALTER TABLE users ADD COLUMN churchId CHAR(36) NULL AFTER id",
      );
    }

    if (
      (await columnExists("users", "businessId")) &&
      (await columnExists("users", "churchId"))
    ) {
      await queryInterface.sequelize.query(
        "UPDATE users SET churchId = businessId WHERE churchId IS NULL AND businessId IS NOT NULL",
      );
    }

    if (
      (await columnExists("users", "churchSettingsId")) &&
      !(await columnExists("churchSettings", "id"))
    ) {
      return;
    }

    if (tables.churchSettings) {
      const [defaultSettings] = await queryInterface.sequelize.query(
        "SELECT id FROM churchSettings ORDER BY createdAt ASC LIMIT 1",
        { type: Sequelize.QueryTypes.SELECT },
      );

      if (defaultSettings) {
        await queryInterface.sequelize.query(
          "UPDATE users SET churchSettingsId = ? WHERE churchSettingsId IS NULL",
          { replacements: [defaultSettings.id] },
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const columnExists = async (tableName, columnName) => {
      try {
        const columns = await queryInterface.describeTable(tableName);
        return Boolean(columns[columnName]);
      } catch (error) {
        return false;
      }
    };

    if (await columnExists("churches", "churchSettingsId")) {
      await queryInterface.removeColumn("churches", "churchSettingsId");
    }
  },
};
