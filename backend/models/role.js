module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "role",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    },
  );

  Role.associate = (models) => {
    Role.hasMany(models.users, { foreignKey: "roleId" });
  };

  return Role;
};
