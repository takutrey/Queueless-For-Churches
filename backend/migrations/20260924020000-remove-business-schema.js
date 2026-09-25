"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      "auditlogs",
      "notifications",
      "pledgecampaigns",
      "queueentries",
      "queues",
      "queuestaff",
      "subscriptions",
      "users",
    ];
    const descriptions = {};

    for (const table of tables) {
      descriptions[table] = await queryInterface.describeTable(table);
      if (!descriptions[table].churchId && descriptions[table].businessId) {
        await queryInterface.addColumn(table, "churchId", {
          type: Sequelize.UUID,
          allowNull: true,
        });
      }
      if (descriptions[table].businessId && descriptions[table].churchId) {
        await queryInterface.sequelize.query(
          `UPDATE \`${table}\` SET churchId = businessId WHERE churchId IS NULL AND businessId IS NOT NULL`,
        );
      }
    }

    for (const table of tables) {
      const columns = await queryInterface.describeTable(table);
      if (columns.businessId) {
        await queryInterface.removeColumn(table, "businessId");
      }
    }

    if (await queryInterface.tableExists("businesses")) {
      await queryInterface.dropTable("businesses");
    }
  },

  async down() {
    throw new Error("The business schema has been permanently removed");
  },
};