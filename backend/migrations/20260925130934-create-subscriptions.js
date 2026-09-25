"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("subscriptions", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        churchId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true
        },
        plan: {
          type: DataTypes.ENUM("trial", "starter", "pro", "church"),
          allowNull: false,
          defaultValue: "trial"
        },
        status: {
          type: DataTypes.ENUM("trialing", "active", "expired", "cancelled", "past_due"),
          allowNull: false,
          defaultValue: "trialing"
        },
        trialStartedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        trialEndsAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        currentPeriodStart: {
          type: DataTypes.DATE,
          allowNull: true
        },
        currentPeriodEnd: {
          type: DataTypes.DATE,
          allowNull: true
        },
        provider: {
          type: DataTypes.STRING,
          allowNull: true
        },
        providerCustomerId: {
          type: DataTypes.STRING,
          allowNull: true
        },
        providerSubscriptionId: {
          type: DataTypes.STRING,
          allowNull: true
        },
        cancelledAt: {
          type: DataTypes.DATE,
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
    await queryInterface.dropTable("subscriptions");
  },
};
