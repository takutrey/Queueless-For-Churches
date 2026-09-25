module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "auditlogs",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: true, // system-level actions have null
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        {
          fields: ["churchId"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["action"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    },
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.users, {
      foreignKey: "userId",
      as: "user",
    });
    AuditLog.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });
  };

  return AuditLog;
};
