"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Define the exact roles we want
    const targetRoles = ["manager", "superadmin", "admin", "staff"];

    // Check which of these already exist
    const existingRoles = await queryInterface.sequelize.query(
      `SELECT name FROM role WHERE name IN (${targetRoles.map(() => "?").join(",")})`,
      {
        replacements: targetRoles,
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const existingRoleNames = new Set(existingRoles.map((r) => r.name));

    // Build list of roles to insert (those not already present)
    const rolesToInsert = [];
    for (const roleName of targetRoles) {
      if (!existingRoleNames.has(roleName)) {
        rolesToInsert.push({
          id: uuidv4(),
          name: roleName,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert("role", rolesToInsert, {});
      console.log(
        `✅ Inserted ${rolesToInsert.length} new roles: ${rolesToInsert.map((r) => r.name).join(", ")}`,
      );
    } else {
      console.log("✅ All required roles already exist, skipping...");
    }
  },

  async down(queryInterface, Sequelize) {
    // Optionally, you could delete only these four roles, but the original
    // down deletes all roles. If you want to be safe, you can delete only
    // those that were inserted. But the original approach is fine.
    await queryInterface.bulkDelete("role", null, {});
  },
};
