const express = require("express");

const router = express.Router();

const { passport, requireRole } = require("../config/passport");

const {
  login,
  Logout,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
  validateResetToken,
  unLockAccount,
  unlockAllLockedAccounts,
  getLockedAccounts,
  getAccountStatus,
} = require("../controllers/authController");

// ======================================================
// PUBLIC
// ======================================================

router.post("/login", login);

router.post("/refresh-token", refreshAccessToken);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/validate-reset-token", validateResetToken);

// Single-church deployments are provisioned via seed scripts or deployment config.
// Public church signup is intentionally disabled.
// ======================================================
// AUTHENTICATED
// ======================================================

router.get(
  "/me",
  passport.authenticate("jwt", {
    session: false,
  }),
  getCurrentUser,
);

router.get(
  "/account-status",
  passport.authenticate("jwt", {
    session: false,
  }),
  getAccountStatus,
);

router.post(
  "/logout",
  passport.authenticate("jwt", {
    session: false,
  }),
  Logout,
);

router.post(
  "/change-password",
  passport.authenticate("jwt", {
    session: false,
  }),
  changePassword,
);

// ======================================================
// SUPPORT / SUPER ADMIN
// ======================================================

router.get(
  "/locked-accounts",
  passport.authenticate("jwt", {
    session: false,
  }),
  requireRole(["superadmin", "admin", "manager"]),
  getLockedAccounts,
);

router.patch(
  "/unlock/:userId",
  passport.authenticate("jwt", {
    session: false,
  }),
  requireRole(["super-admin", "admin", "manager"]),
  unLockAccount,
);

router.patch(
  "/unlock-all",
  passport.authenticate("jwt", {
    session: false,
  }),
  requireRole("super-admin"),
  unlockAllLockedAccounts,
);

module.exports = router;
