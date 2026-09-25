module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "subscriptions",
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
        unique: true,
      },

      plan: {
        type: DataTypes.ENUM("trial", "starter", "pro", "church"),
        allowNull: false,
        defaultValue: "trial",
      },

      status: {
        type: DataTypes.ENUM(
          "trialing",
          "active",
          "expired",
          "cancelled",
          "past_due",
        ),
        allowNull: false,
        defaultValue: "trialing",
      },

      trialStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      trialEndsAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      provider: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      providerCustomerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      providerSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    },
  );

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });
  };

  return Subscription;
};
