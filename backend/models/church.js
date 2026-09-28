module.exports = (sequelize, DataTypes) => {
  const Church = sequelize.define(
    "churches",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
      image: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.ENUM(["active", "inactive"]), allowNull: false, defaultValue: "active" },
    },
    { freezeTableName: true, timestamps: true },
  );

  Church.associate = (models) => {
    Church.belongsTo(models.churchSettings, { foreignKey: "churchSettingsId", as: "churchSettings", allowNull: true });
    Church.hasMany(models.users, { foreignKey: "churchId", as: "users" });
    Church.hasMany(models.notifications, { foreignKey: "churchId", as: "notifications" });
    Church.hasMany(models.queues, { foreignKey: "churchId", as: "queues" });
    Church.hasMany(models.queueStaff, { foreignKey: "churchId", as: "queueStaff" });
    Church.hasMany(models.queueEntries, { foreignKey: "churchId", as: "queueEntries" });
    Church.hasOne(models.subscriptions, { foreignKey: "churchId", as: "subscription" });
    Church.hasMany(models.pledgeCampaigns, { foreignKey: "churchId", as: "pledgeCampaigns" });
  };

  return Church;
};