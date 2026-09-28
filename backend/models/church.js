module.exports = (sequelize, DataTypes) => {
  const Church = sequelize.define(
    "churches",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      image: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM(["active", "inactive"]),
        allowNull: false,
        defaultValue: "active",
      },
      // Declared explicitly (not only via the belongsTo below) so that migrations
      // and the migration generator can see it. Association-only foreign keys
      // are invisible to generateMigrations.js, which is what caused
      // "Unknown column 'churchSettingsId'".
      churchSettingsId: { type: DataTypes.UUID, allowNull: true },
    },
    { freezeTableName: true, timestamps: true },
  );

  Church.associate = (models) => {
    Church.belongsTo(models.churchSettings, {
      foreignKey: "churchSettingsId",
      as: "churchSettings",
      allowNull: true,
    });
    Church.hasMany(models.users, { foreignKey: "churchId", as: "users" });
    Church.hasMany(models.notifications, {
      foreignKey: "churchId",
      as: "notifications",
    });
    Church.hasMany(models.queues, { foreignKey: "churchId", as: "queues" });
    Church.hasMany(models.queueStaff, {
      foreignKey: "churchId",
      as: "queueStaff",
    });
    Church.hasMany(models.queueEntries, {
      foreignKey: "churchId",
      as: "queueEntries",
    });
    Church.hasOne(models.subscriptions, {
      foreignKey: "churchId",
      as: "subscription",
    });
    Church.hasMany(models.pledgeCampaigns, {
      foreignKey: "churchId",
      as: "pledgeCampaigns",
    });
  };

  return Church;
};
