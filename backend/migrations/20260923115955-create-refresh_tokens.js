"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("refresh_tokens", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        jti: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true
        },
        tokenHash: {
          type: DataTypes.STRING(128),
          allowNull: false,
          unique: true
        },
        deviceInfo: {
          type: DataTypes.JSON,
          allowNull: true
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: true
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        lastUsedAt: {
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
    await queryInterface.dropTable("refresh_tokens");
  },
};
