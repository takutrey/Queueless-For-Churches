module.exports = (sequelize, DataTypes) => {
  const ChurchSettings = sequelize.define(
    "churchSettings",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      churchName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "QueueLess Church",
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      favicon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      primaryColor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      secondaryColor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true },
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "USD",
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "UTC",
      },
      welcomeMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    },
  );

  ChurchSettings.associate = (models) => {
    ChurchSettings.hasMany(models.users, {
      foreignKey: "churchSettingsId",
      as: "users",
    });
  };

  return ChurchSettings;
};
