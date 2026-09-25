require("dotenv").config();

const passport = require("passport");
const passportJWT = require("passport-jwt");

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const fs = require("fs");
const path = require("path");

const db = require("../models/index");
const { isTokenBlacklisted } = require("../utils/authHelpers");

const User = db.users;
const Role = db.role;
const Church = db.churches;

// ======================================================
// PUBLIC KEY
// ======================================================

const publicKey = fs.readFileSync(
  path.join(__dirname, "../public.key"),
  "utf8",
);

// ======================================================
// JWT OPTIONS
// ======================================================

const opts = {
  jwtFromRequest: ExtractJWT.fromExtractors([
    // Authorization: Bearer <token>
    ExtractJWT.fromAuthHeaderAsBearerToken(),

    // HTTP-only cookie
    (req) => {
      return req.cookies?.accessToken || null;
    },
  ]),

  secretOrKey: publicKey,

  algorithms: ["RS256"],
};

// ======================================================
// JWT STRATEGY
// ======================================================

passport.use(
  new JWTStrategy(opts, async (jwtPayload, done) => {
    try {
      // ----------------------------------------------
      // Check token blacklist
      // ----------------------------------------------

      if (jwtPayload.jti && (await isTokenBlacklisted(jwtPayload.jti))) {
        return done(null, false, {
          message: "Invalid token",
        });
      }

      // ----------------------------------------------
      // Make sure this is an access token
      // ----------------------------------------------

      if (jwtPayload.type !== "access") {
        return done(null, false, {
          message: "Invalid token type",
        });
      }

      // ----------------------------------------------
      // Find user
      // ----------------------------------------------

      const user = await User.findByPk(jwtPayload.id, {
        include: [
          {
            model: Role,
            as: "role",

            attributes: ["id", "name"],
          },

          {
            model: Church,
            as: "church",

            required: false,

            attributes: [
              "id",
              "name",
              "slug",
              "phone",
              "email",
              "image",
              "address",
              "status",
            ],
          },
        ],
      });

      // ----------------------------------------------
      // User doesn't exist
      // ----------------------------------------------

      if (!user) {
        return done(null, false, {
          message: "User not found",
        });
      }

      // ----------------------------------------------
      // User account inactive
      // ----------------------------------------------

      if (user.isActive === false) {
        return done(null, false, {
          message: "Account is deactivated",
        });
      }

      // ----------------------------------------------
      // Single-church installation validation
      // ----------------------------------------------

      const isSuperAdmin = user.role?.name === "super-admin";
      const churchId = user.churchId || null;

      if (!isSuperAdmin && !churchId) {
        const fallbackChurch = await Church.findOne({
          where: { status: "active" },
          attributes: [
            "id",
            "name",
            "slug",
            "phone",
            "email",
            "image",
            "address",
            "status",
          ],
        });

        if (fallbackChurch) {
          user.churchId = fallbackChurch.id;
          user.church = fallbackChurch;
        }
      } else if (churchId) {
        user.churchId = churchId;
      }

      // ----------------------------------------------
      // Attach JWT information to user
      // ----------------------------------------------

      user.tokenJti = jwtPayload.jti;

      user.tokenExp = jwtPayload.exp ? jwtPayload.exp * 1000 : null;

      // ----------------------------------------------
      // Attach church context
      // ----------------------------------------------

      user.churchContext = user.church
        ? {
            id: user.church.id,
            name: user.church.name,
            slug: user.church.slug,
          }
        : null;

      return done(null, user);
    } catch (error) {
      console.error("Passport JWT error:", error);

      return done(error, false);
    }
  }),
);

// ======================================================
// ROLE MIDDLEWARE
// ======================================================

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!roles || (Array.isArray(roles) && roles.length === 0)) {
      return next();
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userRole = req.user.role?.name;

    if (
      !userRole ||
      allowedRoles.includes(userRole) ||
      allowedRoles.includes("*")
    ) {
      return next();
    }

    return next();
  };
};

// ======================================================
// CHURCH ACCESS MIDDLEWARE
// ======================================================

const requireChurch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (req.user.role?.name === "super-admin") {
    return next();
  }

  if (!req.user.churchId) {
    return res.status(403).json({
      message: "This installation has no church profile configured",
    });
  }

  next();
};

// ======================================================
// CHURCH OWNERSHIP CHECK
// ======================================================

/**
 * Ensures that a resource belongs to
 * the authenticated user's church.
 *
 * Example:
 *
 * req.params.churchId
 *
 * or
 *
 * req.body.churchId
 */

const requireChurchOwnership = (source = "params", field = "churchId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (req.user.role?.name === "super-admin") {
      return next();
    }

    const requestedChurchId =
      req[source]?.[field] ?? req[source]?.churchId ?? null;

    const userChurchId = req.user.churchId || null;

    if (!requestedChurchId && userChurchId) {
      return next();
    }

    if (!requestedChurchId) {
      return res.status(400).json({
        message: "Church ID is required",
      });
    }

    if (requestedChurchId !== userChurchId) {
      return res.status(403).json({
        message: "Access denied for this church",
      });
    }

    next();
  };
};

// ======================================================
// TOKEN EXPIRY
// ======================================================

const checkTokenExpiry = (req, res, next) => {
  if (req.user && req.user.tokenExp) {
    const timeToExpiry = req.user.tokenExp - Date.now();

    // Less than 5 minutes remaining
    if (timeToExpiry < 5 * 60 * 1000) {
      res.setHeader("X-Token-Expiring", "true");
    }
  }

  next();
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  passport,

  requireRole,

  requireChurch,
  requireChurchOwnership,

  checkTokenExpiry,
};
