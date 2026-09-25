module.exports = (sequelize, DataTypes) => {
  const PledgeItem = sequelize.define(
    "pledgeItems",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      pledgeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campaignItemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      fulfilledQuantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ["pledgeId"] },
        { fields: ["campaignItemId"] },
        { unique: true, fields: ["pledgeId", "campaignItemId"] },
      ],
    },
  );

  PledgeItem.associate = (models) => {
    PledgeItem.belongsTo(models.pledges, {
      foreignKey: "pledgeId",
      as: "pledge",
    });
    PledgeItem.belongsTo(models.pledgeCampaignItems, {
      foreignKey: "campaignItemId",
      as: "campaignItem",
    });
  };

  return PledgeItem;
};
