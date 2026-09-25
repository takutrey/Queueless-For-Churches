"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("queueEntries", {
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
        queueId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        customerName: {
          type: DataTypes.STRING,
          allowNull: false
        },
        customerPhone: {
          type: DataTypes.STRING,
          allowNull: true
        },
        customerIp: {
          type: DataTypes.STRING(45),
          allowNull: true
        },
        customerDeviceId: {
          type: DataTypes.STRING(128),
          allowNull: true
        },
        queueNumber: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM("waiting", "standby", "called", "serving", "completed", "skipped", "left"),
          allowNull: false,
          defaultValue: "waiting"
        },
        entryType: {
          type: DataTypes.ENUM("normal", "transfer"),
          allowNull: false,
          defaultValue: "normal"
        },
        customerToken: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        joinedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        calledAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        servingAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        skippedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        leftAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        calledBy: {
          type: DataTypes.UUID,
          allowNull: true
        },
        notes: {
          type: DataTypes.TEXT,
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
    await queryInterface.dropTable("queueEntries");
  },
};
