"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("churchSettings", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        churchName: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "QueueLess Church"
        },
        slug: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: true
        },
        logo: {
          type: DataTypes.STRING,
          allowNull: true
        },
        favicon: {
          type: DataTypes.STRING,
          allowNull: true
        },
        primaryColor: {
          type: DataTypes.STRING,
          allowNull: true
        },
        secondaryColor: {
          type: DataTypes.STRING,
          allowNull: true
        },
        address: {
          type: DataTypes.STRING,
          allowNull: true
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true
        },
        website: {
          type: DataTypes.STRING,
          allowNull: true
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "USD"
        },
        timezone: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "UTC"
        },
        welcomeMessage: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
          defaultValue: "active"
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
    await queryInterface.dropTable("churchSettings");
  },
};
