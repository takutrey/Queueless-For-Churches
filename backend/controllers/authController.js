const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  comparePassword,
  hashPassword,
  revokeAllUserTokens,
  revokeSpecificRefreshToken,
  getRefreshToken,
  updateRefreshTokenUsage,
  hashToken,
} = require("../utils/authHelpers");

const db = require("../models");

const User = db.users;
const Role = db.role;
const Church = db.churches;

const { Op } = require("sequelize");

const logAudit = require("../utils/logAudit");

const requestIp = require("request-ip");

const crypto = require("crypto");

const sendEmail = require("../middleware/emailTransporter");

const {
  forgotPasswordTemplate,
  passwordResetConfirmationTemplate,
  passwordChangeConfirmationTemplate,
} = require("../utils/emailTemplate");

// ======================================================
// SETTINGS
// ======================================================

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;

const ACCOUNT_LOCK_TIME = parseInt(process.env.ACCOUNT_LOCK_TIME) || 15;

const LOGIN_TIMEOUT = parseInt(process.env.LOGIN_TIMEOUT) || 60;

// Add near the top with your other requires
const CHURCH_OWNER_ROLE_NAME = process.env.CHURCH_OWNER_ROLE_NAME || "admin";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (name, transaction) => {
  const base = slugify(name) || "church";
  let slug = base;
  let suffix = 1;

  while (await Church.findOne({ where: { slug }, transaction })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

// ======================================================
// REGISTER CHURCH
// ======================================================

const registerChurch = async (_req, res) => {
  return res.status(403).json({
    message:
      "Public church signup is disabled for this single-church deployment. Use the deployment seeder or provisioning flow instead.",
  });
};

// ======================================================
// LOGIN
// ======================================================

const login = async (req, res) => {
  const userIp = requestIp.getClientIp(req);

  const userAgent = req.get("User-Agent");

  try {
    const { email, password, deviceInfo = {} } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and Password are required",
      });
    }

    // ----------------------------------------------
    // Find user
    // ----------------------------------------------

    const user = await User.findOne({
      where: {
        email,
      },

      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],
    });

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // ----------------------------------------------
    // Account active
    // ----------------------------------------------

    if (!user.isActive) {
      return res.status(401).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // ----------------------------------------------
    // Church active
    // ----------------------------------------------

    const isSuperAdmin = user.role?.name === "super-admin";

    if (!isSuperAdmin) {
      if (!user.churchId) {
        return res.status(403).json({
          message: "User is not assigned to a church.",
        });
      }

      const church = user.church;

      if (!church) {
        return res.status(403).json({
          message: "Church not found.",
        });
      }

      if (church.status !== "active") {
        return res.status(403).json({
          message: "Church account is inactive.",
        });
      }
    }

    // ----------------------------------------------
    // Account lock
    // ----------------------------------------------

    const lockStatus = user.getAccountLockStatus();

    if (lockStatus.isLocked) {
      return res.status(423).json({
        message: `Account is locked. Please try again in ${lockStatus.remainingMinutes} minutes`,

        lockUntil: lockStatus.lockUntil,

        remainingMinutes: lockStatus.remainingMinutes,

        isLocked: true,
      });
    }

    // ----------------------------------------------
    // Login timeout
    // ----------------------------------------------

    if (user.lastLoginAttempt) {
      const timeSinceLastAttempt =
        Date.now() - new Date(user.lastLoginAttempt).getTime();

      const timeoutMs = LOGIN_TIMEOUT * 1000;

      if (
        timeSinceLastAttempt < timeoutMs &&
        user.loginAttempts >= MAX_LOGIN_ATTEMPTS
      ) {
        const waitSeconds = Math.ceil(
          (timeoutMs - timeSinceLastAttempt) / 1000,
        );

        return res.status(429).json({
          message: `Please try again in ${waitSeconds} seconds`,

          waitSeconds,

          remainingAttempts: 0,
        });
      }
    }

    // ----------------------------------------------
    // Password
    // ----------------------------------------------

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      const newLockStatus = await user.incrementLoginAttempts();

      await user.reload();

      const remainingAttempts = Math.max(
        0,
        MAX_LOGIN_ATTEMPTS - user.loginAttempts,
      );

      if (remainingAttempts <= 0) {
        return res.status(423).json({
          message: `Account locked. Please try again in ${ACCOUNT_LOCK_TIME} minutes`,

          remainingAttempts: 0,

          lockUntil: newLockStatus.lockUntil,

          isLocked: true,
        });
      }

      return res.status(401).json({
        message: `Invalid credentials. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining`,

        remainingAttempts,

        attemptsUsed: user.loginAttempts,

        maxAttempts: MAX_LOGIN_ATTEMPTS,
      });
    }

    // ----------------------------------------------
    // Successful login
    // ----------------------------------------------

    await user.resetLoginAttempts();

    // ----------------------------------------------
    // Access token
    // ----------------------------------------------

    const accessToken = generateAccessToken(user);

    // ----------------------------------------------
    // Refresh token
    // ----------------------------------------------

    const { refreshToken, jti } = await generateRefreshToken(user, {
      ip: userIp,

      userAgent,

      ...deviceInfo,
    });

    // ----------------------------------------------
    // Access cookie
    // ----------------------------------------------

    res.cookie("accessToken", accessToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",

      maxAge: 15 * 60 * 1000,
    });

    // ----------------------------------------------
    // Refresh cookie
    // ----------------------------------------------

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",

      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ----------------------------------------------
    // Audit
    // ----------------------------------------------

    await logAudit({
      userId: user.id,

      action: "login",

      entity: "Auth",

      entityId: user.id,

      metadata: {
        email: user.email,

        role: user.role?.name,

        churchId: user.churchId,

        jti,

        ip: userIp,

        userAgent,

        timestamp: new Date().toISOString(),
      },
    });

    // ----------------------------------------------
    // Response
    // ----------------------------------------------

    return res.status(200).json({
      user: {
        id: user.id,

        name: user.name,

        email: user.email,

        phone: user.phone,

        role: user.role?.name,

        churchId: user.churchId,

        church: user.church
          ? {
              id: user.church.id,

              name: user.church.name,

              slug: user.church.slug,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// UNLOCK ACCOUNT
// ======================================================

const unLockAccount = async (req, res) => {
  const userIp = requestIp.getClientIp(req);

  const userAgent = req.get("User-Agent");

  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await user.resetLoginAttempts();

    await logAudit({
      userId: req.user?.id,

      action: "unlock_account",

      entity: "Auth",

      entityId: user.id,

      metadata: {
        email: user.email,

        role: user.role?.name,

        churchId: user.churchId,

        unlockedBy: req.user?.email,

        ip: userIp,

        userAgent,

        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      message: "Account unlocked successfully",
    });
  } catch (error) {
    console.error("Unlock account error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// UNLOCK ALL
// ======================================================

const unlockAllLockedAccounts = async (req, res) => {
  try {
    const [affectedCount] = await User.update(
      {
        loginAttempts: 0,

        lockUntil: null,

        lastLoginAttempt: null,
      },

      {
        where: {
          lockUntil: {
            [Op.ne]: null,
          },
        },
      },
    );

    await logAudit({
      userId: req.user?.id,

      action: "unlock_all_accounts",

      entity: "Auth",

      entityId: "multiple",

      metadata: {
        unlockedCount: affectedCount,

        unlockedBy: req.user?.email,

        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      message: `Unlocked ${affectedCount} accounts`,

      unlockedCount: affectedCount,
    });
  } catch (error) {
    console.error("Unlock all error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// GET LOCKED ACCOUNTS
// ======================================================

const getLockedAccounts = async (req, res) => {
  try {
    const lockedUsers = await User.findAll({
      where: {
        lockUntil: {
          [Op.gt]: new Date(),
        },
      },

      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],

      attributes: {
        exclude: ["password", "resetPasswordToken", "inviteToken"],
      },
    });

    return res.status(200).json({
      count: lockedUsers.length,

      users: lockedUsers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// ACCOUNT STATUS
// ======================================================

const getAccountStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const lockStatus = user.getAccountLockStatus();

    return res.status(200).json({
      success: true,

      data: {
        isLocked: lockStatus.isLocked,

        remainingAttempts: lockStatus.remainingAttempts,

        lockUntil: lockStatus.lockUntil,

        remainingMinutes: lockStatus.remainingMinutes,

        isActive: user.isActive,

        churchId: user.churchId,

        churchStatus: user.church?.status || null,

        totalAttemptsUsed: lockStatus.isLocked
          ? MAX_LOGIN_ATTEMPTS
          : user.loginAttempts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      message: "No refresh token provided",
    });
  }

  try {
    const payload = verifyToken(refreshToken, true);

    if (!payload) {
      return res.status(403).json({
        message: "Invalid or expired refresh token",
      });
    }

    const storedToken = await getRefreshToken(payload.jti);

    if (!storedToken) {
      return res.status(403).json({
        message: "Refresh session not found",
      });
    }

    if (storedToken.revokedAt) {
      return res.status(403).json({
        message: "Refresh token revoked",
      });
    }

    if (new Date(storedToken.expiresAt) <= new Date()) {
      return res.status(403).json({
        message: "Refresh token expired",
      });
    }

    const incomingHash = hashToken(refreshToken);

    if (storedToken.tokenHash !== incomingHash) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    const user = await User.findByPk(payload.id, {
      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],
    });

    if (!user) {
      return res.status(403).json({
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    const isSuperAdmin = user.role?.name === "super-admin";

    if (!isSuperAdmin) {
      const church = user.church;
      if (!church || church.status !== "active") {
        return res.status(403).json({
          message: "Church account is inactive",
        });
      }
    }

    const lockStatus = user.getAccountLockStatus();

    if (lockStatus.isLocked) {
      return res.status(423).json({
        message: "Account is locked",
      });
    }

    await updateRefreshTokenUsage(payload.jti);

    const newAccessToken = generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",

      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ======================================================
// LOGOUT
// ======================================================

const Logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (refreshToken) {
      const payload = verifyToken(refreshToken, true);

      if (payload?.jti) {
        await revokeSpecificRefreshToken(payload.id, payload.jti);
      }
    }

    res.clearCookie("accessToken", {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.clearCookie("accessToken");

    res.clearCookie("refreshToken");

    return res.status(200).json({
      message: "Logged out successfully",
    });
  }
};

// ======================================================
// CHANGE PASSWORD
// ======================================================

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Both old and new passwords are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Role,
          as: "role",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    const isMatch = await comparePassword(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    const isSame = await comparePassword(newPassword, user.password);

    if (isSame) {
      return res.status(400).json({
        message: "New password cannot be the same as old password",
      });
    }

    user.password = await hashPassword(newPassword);

    await user.save();

    // Revoke every existing session
    await revokeAllUserTokens(user.id);

    await logAudit({
      userId: user.id,

      action: "password_change",

      entity: "Auth",

      entityId: user.id,

      metadata: {
        email: user.email,

        role: user.role?.name,

        timestamp: new Date().toISOString(),
      },
    });

    // Don't fail the password change if email fails
    try {
      const emailHtml = passwordChangeConfirmationTemplate({
        fullname: user.name || "User",

        email: user.email,
      });

      await sendEmail({
        to: user.email,

        subject: "Password Changed Successfully",

        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Password confirmation email failed:", emailError);
    }

    return res.status(200).json({
      message: "Password updated successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// CURRENT USER
// ======================================================

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Role,
          as: "role",
        },

        {
          model: Church,
          as: "church",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    const lockStatus = user.getAccountLockStatus();

    if (lockStatus.isLocked) {
      return res.status(423).json({
        message: "Account is locked",

        isLocked: true,

        remainingMinutes: lockStatus.remainingMinutes,
      });
    }

    return res.status(200).json({
      id: user.id,

      name: user.name,

      email: user.email,

      phone: user.phone,

      role: user.role?.name,

      churchId: user.churchId,

      church: user.church
        ? {
            id: user.church.id,

            name: user.church.name,

            slug: user.church.slug,

            status: user.church.status,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      where: {
        email,
      },

      include: [
        {
          model: Role,
          as: "role",
        },
      ],
    });

    // Don't reveal whether account exists
    if (!user) {
      return res.status(200).json({
        message: "If an account exists, a password reset link has been sent.",
      });
    }

    if (!user.isActive) {
      return res.status(200).json({
        message: "If an account exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHash;

    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const emailHtml = forgotPasswordTemplate({
      fullname: user.name || "User",

      resetLink,

      expiryHours: 1,
    });

    await sendEmail({
      to: user.email,

      subject: "Reset your QueueLess password",

      html: emailHtml,
    });

    await logAudit({
      userId: user.id,

      action: "forgot_password_request",

      entity: "Auth",

      entityId: user.id,

      metadata: {
        email: user.email,

        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      message: "If an account exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      await transaction.rollback();

      return res.status(400).json({
        message: "Token, email and password are required",
      });
    }

    if (newPassword.length < 8) {
      await transaction.rollback();

      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      await transaction.rollback();

      return res.status(400).json({
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        email,

        resetPasswordToken: tokenHash,

        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },

      transaction,
    });

    if (!user) {
      await transaction.rollback();

      return res.status(400).json({
        message: "Invalid or expired reset token. Please request a new one.",
      });
    }

    if (!user.isActive) {
      await transaction.rollback();

      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    user.password = await hashPassword(newPassword);

    user.resetPasswordToken = null;

    user.resetPasswordExpires = null;

    user.loginAttempts = 0;

    user.lockUntil = null;

    user.lastLoginAttempt = null;

    await user.save({
      transaction,
    });

    await transaction.commit();

    // Revoke all old sessions
    await revokeAllUserTokens(user.id);

    try {
      const emailHtml = passwordResetConfirmationTemplate({
        fullname: user.name || "User",
      });

      await sendEmail({
        to: user.email,

        subject: "Password Reset Confirmation",

        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Reset confirmation email failed:", emailError);
    }

    await logAudit({
      userId: user.id,

      action: "password_reset",

      entity: "Auth",

      entityId: user.id,

      metadata: {
        email: user.email,

        timestamp: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// ======================================================
// VALIDATE RESET TOKEN
// ======================================================

const validateResetToken = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        valid: false,

        message: "Token and email are required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        email,

        resetPasswordToken: tokenHash,

        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        valid: false,

        message: "Invalid or expired token",
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        valid: false,

        message: "Account is deactivated",
      });
    }

    return res.status(200).json({
      valid: true,

      message: "Token is valid",

      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({
      valid: false,

      message: "Server error",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  login,

  registerChurch,

  unLockAccount,

  unlockAllLockedAccounts,

  getLockedAccounts,

  getAccountStatus,

  refreshAccessToken,

  Logout,

  changePassword,

  getCurrentUser,

  forgotPassword,

  resetPassword,

  validateResetToken,
};
