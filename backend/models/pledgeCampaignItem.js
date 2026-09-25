module.exports = (sequelize, DataTypes) => {
  const PledgeCampaignItem = sequelize.define(
    "pledgeCampaignItems",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetQuantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      unit: {
        type: DataTypes.STRING(40),
        allowNull: false,
        validate: { notEmpty: true },
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ["campaignId"] },
        { fields: ["campaignId", "status"] },
        { fields: ["sortOrder"] },
      ],
    },
  );

  PledgeCampaignItem.associate = (models) => {
    PledgeCampaignItem.belongsTo(models.pledgeCampaigns, {
      foreignKey: "campaignId",
      as: "campaign",
    });
    PledgeCampaignItem.hasMany(models.pledgeItems, {
      foreignKey: "campaignItemId",
      as: "pledgeItems",
    });
  };

  return PledgeCampaignItem;
};