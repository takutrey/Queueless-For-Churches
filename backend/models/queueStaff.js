module.exports = (sequelize, DataTypes) => {
  const QueueStaff = sequelize.define(
    "queueStaff",
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

      queueId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },

      assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      removedAt: {
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
          fields: ["queueId", "userId"],
        },
        {
          fields: ["churchId", "userId"],
        },
        {
          fields: ["churchId", "queueId"],
        },
      ],
    },
  );

  QueueStaff.associate = (models) => {
    QueueStaff.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });

    QueueStaff.belongsTo(models.queues, {
      foreignKey: "queueId",
      as: "queue",
    });

    QueueStaff.belongsTo(models.users, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return QueueStaff;
};
