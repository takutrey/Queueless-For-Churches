module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    "refresh_tokens",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      jti: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },

      tokenHash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },

      deviceInfo: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["jti"],
        },
        {
          unique: true,
          fields: ["tokenHash"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["expiresAt"],
        },
      ],
    },
  );

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.users, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return RefreshToken;
};
