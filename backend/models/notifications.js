module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "notifications",
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

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      queueId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      queueEntryId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      type: {
        type: DataTypes.ENUM(
          "queue_joined",
          "customer_called",
          "queue_paused",
          "queue_closed",
          "subscription",
          "system",
        ),
        allowNull: false,
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      readAt: {
        type: DataTypes.DATE,
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
          fields: ["queueId"],
        },
        {
          fields: ["queueEntryId"],
        },
        {
          fields: ["churchId", "isRead"],
        },
        {
          fields: ["userId", "isRead"],
        },
      ],
    },
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });

    Notification.belongsTo(models.users, {
      foreignKey: "userId",
      as: "user",
    });

    Notification.belongsTo(models.queues, {
      foreignKey: "queueId",
      as: "queue",
    });

    Notification.belongsTo(models.queueEntries, {
      foreignKey: "queueEntryId",
      as: "queueEntry",
    });
  };

  return Notification;
};
