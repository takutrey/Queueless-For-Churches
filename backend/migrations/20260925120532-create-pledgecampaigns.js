"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("pledgeCampaigns", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        churchId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        title: {
          type: DataTypes.STRING(160),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        targetAmount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true,
          defaultValue: null
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        endDate: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ACTIVE"
        },
        image: {
          type: DataTypes.STRING,
          allowNull: true
        },
        slug: {
          type: DataTypes.STRING(180),
          allowNull: false
        },
        joinCode: {
          type: DataTypes.STRING(12),
          allowNull: false,
          defaultValue: undefined
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
    await queryInterface.dropTable("pledgeCampaigns");
  },
};
