module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      churchSettingsId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },

      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resetPasswordToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      inviteToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      inviteExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLoginAttempt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    },
  );

  User.prototype.getAccountLockStatus = function () {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;

    if (this.lockUntil && this.lockUntil > new Date()) {
      const remainingMs = this.lockUntil - new Date();
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockUntil: this.lockUntil,
        remainingMinutes,
        lockedAt: this.lockUntil,
      };
    }

    if (this.lockUntil && this.lockUntil <= new Date()) {
      this.loginAttempts = 0;
      this.lockUntil = null;
    }

    const remainingAttempts = maxAttempts - this.loginAttempts;

    return {
      isLocked: false,
      remainingAttempts: Math.max(0, remainingAttempts),
      lockUntil: null,
      remainingMinutes: 0,
    };
  };

  User.prototype.incrementLoginAttempts = async function () {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
    const lockTime = parseInt(process.env.ACCOUNT_LOCK_TIME) || 15;

    this.loginAttempts += 1;
    this.lastLoginAttempt = new Date();

    if (this.loginAttempts >= maxAttempts) {
      this.lockUntil = new Date(Date.now() + lockTime * 60 * 1000);
    }

    await this.save();

    return this.getAccountLockStatus();
  };

  User.prototype.resetLoginAttempts = async function () {
    this.loginAttempts = 0;
    this.lockUntil = null;
    this.lastLoginAttempt = null;
    await this.save();
  };

  User.prototype.isAccountLocked = function () {
    const status = this.getAccountLockStatus();
    return status.isLocked;
  };

  User.associate = (models) => {
    User.belongsTo(models.role, {
      foreignKey: "roleId",
      as: "role",
    });

    User.belongsTo(models.churches, {
      foreignKey: "churchId",
      as: "church",
      allowNull: true,
    });

    User.belongsTo(models.churchSettings, {
      foreignKey: "churchSettingsId",
      as: "churchSettings",
      allowNull: true,
    });

    User.hasMany(models.queueStaff, {
      foreignKey: "userId",
      as: "queueAssignments",
    });

    User.hasMany(models.refresh_tokens, {
      foreignKey: "userId",
      as: "refreshTokens",
    });
  };

  return User;
};
