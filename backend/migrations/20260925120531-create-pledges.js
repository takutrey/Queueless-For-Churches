"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("pledges", {
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
        monetaryAmount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true
        },
        fulfilledMonetaryAmount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: "0.00"
        },
        status: {
          type: DataTypes.ENUM("PLEDGED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PLEDGED"
        },
        name: {
          type: DataTypes.STRING(160),
          allowNull: false
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        idempotencyKey: {
          type: DataTypes.STRING(128),
          allowNull: true
        },
        requestHash: {
          type: DataTypes.STRING(64),
          allowNull: true
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
    await queryInterface.dropTable("pledges");
  },
};
