// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const {
  bulkActivateUsers,
  bulkDeactivateUsers,
  createUser,
  updateUser,
  deleteUser,
  getUser,
  getUsers,
  getMyProfile,
} = require("../controllers/userController");
const { passport, requireRole } = require("../config/passport");

router.use(
  passport.authenticate("jwt", {
    session: false,
  }),
);

// List users (with optional role filter)
router.get("/get-users", getUsers);

router.get("/my-profile", getMyProfile);

// Get single user
router.get("/get-user/:id", getUser);

// Create user (manager/staff)
router.post("/create-user", requireRole(["admin", "manager"]), createUser);

// Update user
router.patch("/update-user/:id", updateUser);

// Delete user (hard delete)
router.delete(
  "/delete-user/:id",
  requireRole(["admin", "manager", "superadmin"]),
  deleteUser,
);

// Bulk actions
router.post(
  "/bulk/deactivate",
  requireRole(["admin", "manager", "superadmin"]),
  bulkDeactivateUsers,
);
router.post(
  "/bulk/activate",
  requireRole(["admin", "manager", "superadmin"]),
  bulkActivateUsers,
);

module.exports = router;
