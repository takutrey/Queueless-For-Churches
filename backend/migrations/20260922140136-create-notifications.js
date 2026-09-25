"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("notifications", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        businessId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        queueId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        queueEntryId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        type: {
          type: DataTypes.ENUM("queue_joined", "customer_called", "queue_paused", "queue_closed", "subscription", "system"),
          allowNull: false
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        readAt: {
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
    await queryInterface.dropTable("notifications");
  },
};
