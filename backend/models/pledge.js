module.exports = (sequelize, DataTypes) => {
  const Pledge = sequelize.define(
    "pledges",
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
      monetaryAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      fulfilledMonetaryAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: "0.00",
      },
      status: {
        type: DataTypes.ENUM(
          "PLEDGED",
          "PARTIALLY_FULFILLED",
          "FULFILLED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "PLEDGED",
      },
      name: { type: DataTypes.STRING(160), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      idempotencyKey: { type: DataTypes.STRING(128), allowNull: true },
      requestHash: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ["campaignId"] },
        { fields: ["createdAt"] },
        { fields: ["name"] },
        { fields: ["phone"] },
        { fields: ["monetaryAmount"] },
        { unique: true, fields: ["campaignId", "idempotencyKey"] },
      ],
    },
  );

  Pledge.associate = (models) => {
    Pledge.belongsTo(models.pledgeCampaigns, {
      foreignKey: "campaignId",
      as: "campaign",
    });
    Pledge.hasMany(models.pledgeItems, {
      foreignKey: "pledgeId",
      as: "items",
    });
  };

  return Pledge;
};
