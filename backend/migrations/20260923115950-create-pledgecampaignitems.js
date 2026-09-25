"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("pledgeCampaignItems", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        campaignId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(160),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        targetQuantity: {
          type: DataTypes.DECIMAL(12, 3),
          allowNull: false
        },
        unit: {
          type: DataTypes.STRING(40),
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ACTIVE"
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
    });
  },

  async down(queryInterface, _DataTypes) {
    await queryInterface.dropTable("pledgeCampaignItems");
  },
};
