module.exports = (sequelize, DataTypes) => {
  const Queue = sequelize.define(
    "queues",
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

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      slug: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      joinCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
      },

      prefix: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: "Q",
      },

      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("open", "paused", "closed"),
        allowNull: false,
        defaultValue: "open",
      },

      currentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      nextNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      estimatedServiceTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: "Estimated service time per customer in minutes",
      },

      maxCustomers: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      allowWalkIns: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["churchId", "slug"],
        },
        {
          unique: true,
          fields: ["joinCode"],
        },
      ],
    },
  );

  Queue.associate = (models) => {
    Queue.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
    });

    Queue.hasMany(models.queueEntries, {
      foreignKey: "queueId",
      as: "entries",
    });

    Queue.hasMany(models.queueStaff, {
      foreignKey: "queueId",
      as: "staffAssignments",
    });
  };

  return Queue;
};
