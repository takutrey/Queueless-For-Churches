"use strict";

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

    const addColumnIfMissing = async (tableName, columnName, definition) => {
      const columns = await queryInterface
        .describeTable(tableName)
        .catch(() => ({}));
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    const addMissingChurchId = async (tableName) => {
      const exists = await tableExists(tableName);
      if (!exists) return;

      const columns = await queryInterface
        .describeTable(tableName)
        .catch(() => ({}));
      if (!columns.churchId && columns.businessId) {
        await queryInterface.addColumn(tableName, "churchId", {
          type: Sequelize.UUID,
          allowNull: true,
        });

        await queryInterface.sequelize.query(
          `UPDATE \`${tableName}\` SET \`churchId\` = \`businessId\` WHERE \`churchId\` IS NULL AND \`businessId\` IS NOT NULL`,
        );

        await queryInterface.changeColumn(tableName, "churchId", {
          type: Sequelize.UUID,
          allowNull: false,
        });
      }
    };

    const ensureChurchTable = async () => {
      const exists = await tableExists("churches");
      if (exists) return;
      await queryInterface.createTable("churches", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        slug: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        image: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        address: {
          type: Sequelize.STRING,
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
    };

    await ensureChurchTable();

    const tables = ["users", "pledgeCampaigns", "queues", "queueEntries"];
    for (const tableName of tables) {
      await addMissingChurchId(tableName);
    }
  },

  async down(queryInterface, Sequelize) {
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (error) {
        return false;
      }
    };

    for (const tableName of [
      "users",
      "pledgeCampaigns",
      "queues",
      "queueEntries",
    ]) {
      const exists = await tableExists(tableName);
      if (!exists) continue;
      const columns = await queryInterface
        .describeTable(tableName)
        .catch(() => ({}));
      if (columns.churchId) {
        await queryInterface.removeColumn(tableName, "churchId");
      }
    }
  },
};
