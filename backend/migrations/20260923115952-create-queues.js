"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("queues", {
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
        businessId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        slug: {
          type: DataTypes.STRING,
          allowNull: false
        },
        joinCode: {
          type: DataTypes.STRING(12),
          allowNull: false
        },
        prefix: {
          type: DataTypes.STRING(5),
          allowNull: false,
          defaultValue: "Q"
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM("open", "paused", "closed"),
          allowNull: false,
          defaultValue: "open"
        },
        currentNumber: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        nextNumber: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        estimatedServiceTime: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
          comment: "Estimated service time per customer in minutes"
        },
        maxCustomers: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        allowWalkIns: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
    await queryInterface.dropTable("queues");
  },
};
