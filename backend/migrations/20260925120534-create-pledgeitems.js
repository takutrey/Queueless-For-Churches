"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("pledgeItems", {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4
        },
        pledgeId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        campaignItemId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        quantity: {
          type: DataTypes.DECIMAL(12, 3),
          allowNull: false
        },
        fulfilledQuantity: {
          type: DataTypes.DECIMAL(12, 3),
          allowNull: false,
          defaultValue: "0.000"
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
    await queryInterface.dropTable("pledgeItems");
  },
};
