module.exports = (sequelize, DataTypes) => {
  const PledgeCampaign = sequelize.define(
    "pledgeCampaigns",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: null,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "ACTIVE",
          "PAUSED",
          "COMPLETED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      joinCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
        defaultValue: () => {
          const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code = "";
          for (let index = 0; index < 8; index++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
          }
          return code;
        },
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["churchId", "slug"] },
        { unique: true, fields: ["joinCode"] },
        { fields: ["churchId", "status"] },
        { fields: ["status"] },
      ],
    },
  );

  PledgeCampaign.associate = (models) => {
    PledgeCampaign.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });
    PledgeCampaign.hasMany(models.pledges, {
      foreignKey: "campaignId",
      as: "pledges",
    });
    PledgeCampaign.hasMany(models.pledgeCampaignItems, {
      foreignKey: "campaignId",
      as: "items",
    });
  };

  return PledgeCampaign;
};
