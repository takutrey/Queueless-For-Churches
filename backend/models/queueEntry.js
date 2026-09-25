module.exports = (sequelize, DataTypes) => {
  const QueueEntry = sequelize.define(
    "queueEntries",
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

      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      customerIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },

      customerDeviceId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },

      queueNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "waiting",
          "standby",
          "called",
          "serving",
          "completed",
          "skipped",
          "left",
        ),
        allowNull: false,
        defaultValue: "waiting",
      },

      entryType: {
        type: DataTypes.ENUM("normal", "transfer"),
        allowNull: false,
        defaultValue: "normal",
      },

      customerToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      calledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      servingAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      skippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      calledBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        {
          fields: ["churchId", "queueId", "status"],
        },
        {
          fields: ["churchId", "customerIp", "status"],
        },
        {
          fields: ["churchId", "customerDeviceId", "status"],
        },
        {
          fields: ["queueId", "status"],
        },
        {
          unique: true,
          fields: ["queueId", "queueNumber"],
        },
      ],
    },
  );

  QueueEntry.associate = (models) => {
    QueueEntry.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });

    QueueEntry.belongsTo(models.queues, {
      foreignKey: "queueId",
      as: "queue",
    });

    QueueEntry.belongsTo(models.users, {
      foreignKey: "calledBy",
      as: "staff",
    });
  };

  return QueueEntry;
};
