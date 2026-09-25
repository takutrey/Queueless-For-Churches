// controllers/userController.js
const bcrypt = require("bcryptjs");
const db = require("../models/index");
const User = db.users;
const Role = db.role;
const Church = db.churches;
const { Op } = require("sequelize");

// ─── Removed generateRandomPassword() ──────────────────

/**
 * Get all users for the authenticated church.
 * Optional query param: ?role=manager|staff to filter by role name.
 */
const getUsers = async (req, res) => {
  try {
    const { churchId } = req.user;
    const { role } = req.query;

    const where = { churchId };
    if (role) {
      const roleRecord = await Role.findOne({ where: { name: role } });
      if (!roleRecord) {
        return res.status(400).json({ message: "Invalid role name" });
      }
      where.roleId = roleRecord.id;
    }

    const userList = await User.findAll({
      where,
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "resetPasswordToken",
          "resetPasswordExpires",
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json({ users: userList });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/**
 * Get a single user by ID (must belong to the church).
 */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { churchId } = req.user;

    const user = await User.findOne({
      where: { id, churchId },
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "resetPasswordToken",
          "resetPasswordExpires",
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

/**
 * Create a new user (manager or staff) under the current church.
 * Only owner or superadmin can do this.
 * Expects: { name, email: localPart, phone?, role } (role must be 'manager' or 'staff').
 * The email local part is automatically combined with the church slug:
 *   fullEmail = localPart + "@" + church.slug + ".co.zw"
 * Generates a password: firstName@currentYear.
 * Returns the user (without password) plus the plain password.
 */
const createUser = async (req, res) => {
  const { name, email: localPart, phone, role: roleName } = req.body;
  const { churchId } = req.user;

  // Validate required fields
  if (!name || !roleName) {
    return res.status(400).json({ message: "Name and role are required" });
  }

  // Only allow 'manager' or 'staff' roles via this endpoint
  if (!["manager", "staff"].includes(roleName)) {
    return res
      .status(400)
      .json({ message: "Invalid role. Allowed: manager, staff" });
  }

  // Find role ID
  const roleRecord = await Role.findOne({ where: { name: roleName } });
  if (!roleRecord) {
    return res.status(400).json({ message: "Role not found" });
  }

  // Check if church exists and get its slug
  const church = await Church.findByPk(churchId);
  if (!church) {
    return res.status(404).json({ message: "Church not found" });
  }

  // ─── Construct full email from local part and church slug ───
  // If localPart is provided, trim it; otherwise it's null.
  let fullEmail = null;
  if (localPart) {
    const trimmedLocal = localPart.trim();
    if (trimmedLocal.length === 0) {
      return res
        .status(400)
        .json({ message: "Email local part cannot be empty" });
    }
    // Use church slug for the domain.
    fullEmail = `${trimmedLocal}@${church.slug}.co.zw`;
  }

  // Check if fullEmail already exists (if provided)
  if (fullEmail) {
    const existing = await User.findOne({ where: { email: fullEmail } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
  }

  // ─── Generate password: firstName@currentYear ──────────
  const firstName = name.trim().split(/\s+/)[0] || "User";
  const currentYear = new Date().getFullYear();
  const plainPassword = `${firstName}@${currentYear}`;

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Create user
  const newUser = await User.create({
    churchId,
    name,
    email: fullEmail, // store the constructed full email
    phone: phone || null,
    password: hashedPassword,
    roleId: roleRecord.id,
    isActive: true,
    isVerified: false,
  });

  // Fetch the created user with role info (excluding sensitive fields)
  const createdUser = await User.findByPk(newUser.id, {
    attributes: {
      exclude: [
        "password",
        "refreshToken",
        "resetPasswordToken",
        "resetPasswordExpires",
      ],
    },
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["id", "name"],
      },
    ],
  });

  // Return the plain password so admin can share it
  res.status(201).json({
    user: createdUser,
    temporaryPassword: plainPassword,
  });
};

/**
 * Update an existing user (name, email, phone, role, isActive).
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { churchId } = req.user;
    const { name, email, phone, role: roleName, isActive } = req.body;

    const user = await User.findOne({
      where: { id, churchId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) user.name = name;
    // For email, we expect the full email in update; we don't auto-construct here.
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (roleName !== undefined) {
      if (!["manager", "staff"].includes(roleName)) {
        return res.status(400).json({
          message: "Invalid role. Allowed: manager, staff",
        });
      }
      const roleRecord = await Role.findOne({ where: { name: roleName } });
      if (!roleRecord) {
        return res.status(400).json({ message: "Role not found" });
      }
      user.roleId = roleRecord.id;
    }
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "resetPasswordToken",
          "resetPasswordExpires",
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

/**
 * Delete (hard delete) a user.
 * Prevents self-deletion and deletion of the church owner.
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { churchId, userId } = req.user;

    if (id === userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const user = await User.findOne({
      where: { id, churchId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleRecord = await Role.findByPk(user.roleId);
    if (roleRecord && roleRecord.name === "owner") {
      return res
        .status(403)
        .json({ message: "Cannot delete the church owner" });
    }

    await user.destroy();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

/**
 * Bulk deactivate users (set isActive=false).
 * Expects: { userIds: [] } in body.
 */
const bulkDeactivateUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const { churchId } = req.user;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const filteredIds = userIds.filter((id) => id !== req.user.userId);

    const result = await User.update(
      { isActive: false },
      {
        where: {
          id: filteredIds,
          churchId,
        },
      },
    );

    res.json({
      message: `${result[0]} user(s) deactivated`,
      updatedCount: result[0],
    });
  } catch (error) {
    console.error("Error bulk deactivating users:", error);
    res.status(500).json({ message: "Failed to deactivate users" });
  }
};

/**
 * Bulk activate users (set isActive=true).
 * Expects: { userIds: [] } in body.
 */
const bulkActivateUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const { churchId } = req.user;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const result = await User.update(
      { isActive: true },
      {
        where: {
          id: userIds,
          churchId,
        },
      },
    );

    res.json({
      message: `${result[0]} user(s) activated`,
      updatedCount: result[0],
    });
  } catch (error) {
    console.error("Error bulk activating users:", error);
    res.status(500).json({ message: "Failed to activate users" });
  }
};

/**
 * Get the current user's full profile.
 * Returns { user, roleDetails }.
 */
const getMyProfile = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await User.findByPk(id, {
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "resetPasswordToken",
          "resetPasswordExpires",
          "inviteToken",
          "inviteExpires",
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
        {
          model: Church,
          as: "church",
          attributes: ["id", "name", "slug", "status"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user,
      roleDetails: user.role,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

module.exports = {
  bulkActivateUsers,
  bulkDeactivateUsers,
  createUser,
  updateUser,
  deleteUser,
  getUser,
  getUsers,
  getMyProfile,
};
