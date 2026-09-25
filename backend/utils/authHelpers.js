const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const db = require("../models");

const RefreshToken = db.refresh_tokens;

const { Op } = require("sequelize");

const BlacklistedToken = db.blacklistedtokens;

// ======================================================
// RSA KEYS
// ======================================================

const privateKey = fs.readFileSync(
  path.join(__dirname, "../private.key"),
  "utf8",
);

const publicKey = fs.readFileSync(
  path.join(__dirname, "../public.key"),
  "utf8",
);

if (!privateKey || !publicKey) {
  throw new Error("Failed to load RSA keys");
}

// ======================================================
// HASH TOKEN
// ======================================================

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// ======================================================
// ACCESS TOKEN
// ======================================================

const generateAccessToken = (user, jti = null) => {
  const tokenId = jti || uuidv4();
  const churchId = user.churchId || null;

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role?.name,

      churchId,

      jti: tokenId,
      type: "access",
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "15m",
    },
  );
};

// ======================================================
// REFRESH TOKEN
// ======================================================

const generateRefreshToken = async (user, deviceInfo = {}) => {
  const jti = uuidv4();

  const refreshToken = jwt.sign(
    {
      id: user.id,

      jti,

      type: "refresh",
    },

    privateKey,

    {
      algorithm: "RS256",
      expiresIn: "7d",
    },
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user.id,

    jti,

    tokenHash: hashToken(refreshToken),

    deviceInfo,

    ipAddress: deviceInfo.ip || null,

    userAgent: deviceInfo.userAgent || null,

    expiresAt,

    revokedAt: null,

    lastUsedAt: null,
  });

  return {
    refreshToken,
    jti,
  };
};

// ======================================================
// VERIFY JWT
// ======================================================

const verifyToken = (token, isRefreshToken = false) => {
  try {
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });

    if (isRefreshToken && decoded.type !== "refresh") {
      return null;
    }

    if (!isRefreshToken && decoded.type !== "access") {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

// ======================================================
// GET REFRESH TOKEN
// ======================================================

const getRefreshToken = async (jti) => {
  return await RefreshToken.findOne({
    where: {
      jti,
    },
  });
};

// ======================================================
// CHECK REFRESH TOKEN
// ======================================================

const isRefreshTokenRevoked = async (jti) => {
  const token = await getRefreshToken(jti);

  if (!token) {
    return true;
  }

  if (token.revokedAt) {
    return true;
  }

  if (new Date(token.expiresAt) <= new Date()) {
    return true;
  }

  return false;
};

// ======================================================
// UPDATE LAST USED
// ======================================================

const updateRefreshTokenUsage = async (jti) => {
  await RefreshToken.update(
    {
      lastUsedAt: new Date(),
    },
    {
      where: {
        jti,
      },
    },
  );
};

// ======================================================
// REVOKE ALL USER TOKENS
// ======================================================

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.update(
    {
      revokedAt: new Date(),
    },

    {
      where: {
        userId,

        revokedAt: null,
      },
    },
  );
};

// ======================================================
// REVOKE SPECIFIC TOKEN
// ======================================================

const revokeSpecificRefreshToken = async (userId, jti) => {
  await RefreshToken.update(
    {
      revokedAt: new Date(),
    },

    {
      where: {
        userId,

        jti,

        revokedAt: null,
      },
    },
  );
};

// ======================================================
// PASSWORD
// ======================================================

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// ======================================================
// DELETE EXPIRED TOKENS
// ======================================================

const cleanupExpiredRefreshTokens = async () => {
  try {
    await RefreshToken.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Refresh token cleanup error:", error);
  }
};

const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;
  const token = await BlacklistedToken.findOne({
    where: { jti, expiresAt: { [Op.gt]: new Date() } },
  });
  return !!token;
};

const blacklistAccessToken = async (jti, userId, expiresInSeconds = 900) => {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await BlacklistedToken.create({ jti, userId, expiresAt });
};

module.exports = {
  generateAccessToken,

  generateRefreshToken,

  verifyToken,

  getRefreshToken,

  isRefreshTokenRevoked,

  updateRefreshTokenUsage,

  revokeAllUserTokens,

  revokeSpecificRefreshToken,

  hashPassword,

  comparePassword,

  hashToken,

  cleanupExpiredRefreshTokens,

  blacklistAccessToken,
  isTokenBlacklisted,
};
