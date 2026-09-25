// models/blacklistedtoken.js
module.exports = (sequelize, DataTypes) => {
  const BlacklistedToken = sequelize.define("blacklistedtokens", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jti: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
  return BlacklistedToken;
};
