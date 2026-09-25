"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("auditlogs", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        churchId: {
          type: DataTypes.UUID,
          allowNull: true
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false
        },
        entity: {
          type: DataTypes.STRING,
          allowNull: false
        },
        entityId: {
          type: DataTypes.STRING,
          allowNull: false
        },
        metadata: {
          type: DataTypes.JSON,
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
    await queryInterface.dropTable("auditlogs");
  },
};
