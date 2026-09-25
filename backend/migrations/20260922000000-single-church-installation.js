"use strict";

/**
 * Migration note:
 * This file is intentionally not executed here.
 * It reflects the required single-church architecture for the current application.
 */
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

    const churchesExists = await queryInterface.tableExists("churches");
    const churchSettingsExists =
      await queryInterface.tableExists("churchSettings");
    const churchIdColumnExists = await columnExists("users", "churchId");
    const businessesExists = await queryInterface.tableExists("businesses");

    if (
      !businessesExists ||
      churchesExists ||
      churchSettingsExists ||
      churchIdColumnExists
    ) {
      return;
    }

    await queryInterface.createTable("churchSettings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      churchName: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "QueueLess Church",
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      favicon: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      primaryColor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      secondaryColor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "USD",
      },
      timezone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "UTC",
      },
      welcomeMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    const businessesHasChurchSettingsId = await columnExists(
      "businesses",
      "churchSettingsId",
    );
    if (!businessesHasChurchSettingsId) {
      await queryInterface.addColumn("businesses", "churchSettingsId", {
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

    const usersHasChurchSettingsId = await columnExists(
      "users",
      "churchSettingsId",
    );
    if (!usersHasChurchSettingsId) {
      await queryInterface.addColumn("users", "churchSettingsId", {
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

    const [existingBusiness] = await queryInterface.sequelize.query(
      "SELECT id, name, email, phone FROM businesses ORDER BY createdAt ASC LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (existingBusiness) {
      const [settings] = await queryInterface.sequelize.query(
        `INSERT INTO churchSettings (id, churchName, phone, email, address, currency, timezone, status, createdAt, updatedAt)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        {
          replacements: [
            existingBusiness.name || "QueueLess Church",
            existingBusiness.phone || null,
            existingBusiness.email || null,
            null,
            "USD",
            "UTC",
          ],
        },
      );

      const settingsId =
        settings && settings.insertId ? settings.insertId : null;

      if (settingsId) {
        await queryInterface.sequelize.query(
          "UPDATE businesses SET churchSettingsId = ? WHERE id = ?",
          { replacements: [settingsId, existingBusiness.id] },
        );
        await queryInterface.sequelize.query(
          "UPDATE users SET churchSettingsId = ? WHERE businessId = ?",
          { replacements: [settingsId, existingBusiness.id] },
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

    const usersHasChurchSettingsId = await columnExists(
      "users",
      "churchSettingsId",
    );
    if (usersHasChurchSettingsId) {
      await queryInterface.removeColumn("users", "churchSettingsId");
    }

    const businessesHasChurchSettingsId = await columnExists(
      "businesses",
      "churchSettingsId",
    );
    if (businessesHasChurchSettingsId) {
      await queryInterface.removeColumn("businesses", "churchSettingsId");
    }

    const churchSettingsExists =
      await queryInterface.tableExists("churchSettings");
    if (churchSettingsExists) {
      await queryInterface.dropTable("churchSettings");
    }
  },
};
