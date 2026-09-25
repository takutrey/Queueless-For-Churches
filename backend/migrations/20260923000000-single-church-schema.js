"use strict";

/**
 * Draft single-church migration for a clean database.
 * This file is not executed here.
 */
module.exports = {
  async up(queryInterface, DataTypes) {
    const columnExists = async (tableName, columnName) => {
      try {
        const columns = await queryInterface.describeTable(tableName);
        return Boolean(columns[columnName]);
      } catch (error) {
        return false;
      }
    };

    const hasChurchTable = await queryInterface.tableExists("churches");
    const hasQueueTable = await queryInterface.tableExists("queues");
    const hasChurchSettingsTable =
      await queryInterface.tableExists("churchSettings");
    const hasChurchIdColumn = await columnExists("users", "churchId");

    if (
      hasChurchTable ||
      hasChurchSettingsTable ||
      hasChurchIdColumn ||
      hasQueueTable
    ) {
      return;
    }

    await queryInterface.createTable("churches", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      churchSettingsId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable("churchSettings", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "QueueLess Church",
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      favicon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      primaryColor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      secondaryColor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "USD",
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "UTC",
      },
      welcomeMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("churches", {
      fields: ["churchSettingsId"],
      type: "foreign key",
      name: "churches_churchSettingsId_fkey",
      references: {
        table: "churchSettings",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("roles", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable("users", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
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
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("users", {
      fields: ["churchId"],
      type: "foreign key",
      name: "users_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("users", {
      fields: ["churchSettingsId"],
      type: "foreign key",
      name: "users_churchSettingsId_fkey",
      references: {
        table: "churchSettings",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("users", {
      fields: ["roleId"],
      type: "foreign key",
      name: "users_roleId_fkey",
      references: {
        table: "roles",
        field: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("queues", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      joinCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
      },
      prefix: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: "Q",
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("open", "paused", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
      currentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nextNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      estimatedServiceTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      maxCustomers: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      allowWalkIns: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("queues", {
      fields: ["churchId"],
      type: "foreign key",
      name: "queues_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("queueEntries", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      queueId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      customerIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      customerDeviceId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      queueNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "waiting",
          "standby",
          "called",
          "serving",
          "completed",
          "skipped",
          "left",
        ),
        allowNull: false,
        defaultValue: "waiting",
      },
      entryType: {
        type: DataTypes.ENUM("normal", "transfer"),
        allowNull: false,
        defaultValue: "normal",
      },
      customerToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      calledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      servingAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      skippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      calledBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("queueEntries", {
      fields: ["churchId"],
      type: "foreign key",
      name: "queueEntries_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("queueEntries", {
      fields: ["queueId"],
      type: "foreign key",
      name: "queueEntries_queueId_fkey",
      references: {
        table: "queues",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("queueStaff", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      queueId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      removedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("queueStaff", {
      fields: ["churchId"],
      type: "foreign key",
      name: "queueStaff_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("queueStaff", {
      fields: ["queueId"],
      type: "foreign key",
      name: "queueStaff_queueId_fkey",
      references: {
        table: "queues",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("queueStaff", {
      fields: ["userId"],
      type: "foreign key",
      name: "queueStaff_userId_fkey",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("notifications", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      queueId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      queueEntryId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM(
          "queue_joined",
          "customer_called",
          "queue_paused",
          "queue_closed",
          "subscription",
          "system",
        ),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("notifications", {
      fields: ["churchId"],
      type: "foreign key",
      name: "notifications_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("subscriptions", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      plan: {
        type: DataTypes.ENUM("trial", "starter", "pro", "church"),
        allowNull: false,
        defaultValue: "trial",
      },
      status: {
        type: DataTypes.ENUM(
          "trialing",
          "active",
          "expired",
          "cancelled",
          "past_due",
        ),
        allowNull: false,
        defaultValue: "trialing",
      },
      trialStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      trialEndsAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      providerCustomerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      providerSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("subscriptions", {
      fields: ["churchId"],
      type: "foreign key",
      name: "subscriptions_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("pledgeCampaigns", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "ACTIVE",
          "PAUSED",
          "COMPLETED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      joinCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("pledgeCampaigns", {
      fields: ["churchId"],
      type: "foreign key",
      name: "pledgeCampaigns_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("pledgeCampaignItems", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetQuantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("pledgeCampaignItems", {
      fields: ["campaignId"],
      type: "foreign key",
      name: "pledgeCampaignItems_campaignId_fkey",
      references: {
        table: "pledgeCampaigns",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("pledges", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      monetaryAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      fulfilledMonetaryAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: "0.00",
      },
      status: {
        type: DataTypes.ENUM(
          "PLEDGED",
          "PARTIALLY_FULFILLED",
          "FULFILLED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "PLEDGED",
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      requestHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("pledges", {
      fields: ["campaignId"],
      type: "foreign key",
      name: "pledges_campaignId_fkey",
      references: {
        table: "pledgeCampaigns",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("pledgeItems", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      pledgeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campaignItemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      fulfilledQuantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("pledgeItems", {
      fields: ["pledgeId"],
      type: "foreign key",
      name: "pledgeItems_pledgeId_fkey",
      references: {
        table: "pledges",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("pledgeItems", {
      fields: ["campaignItemId"],
      type: "foreign key",
      name: "pledgeItems_campaignItemId_fkey",
      references: {
        table: "pledgeCampaignItems",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("auditlogs", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      churchId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("auditlogs", {
      fields: ["churchId"],
      type: "foreign key",
      name: "auditlogs_churchId_fkey",
      references: {
        table: "churches",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("blacklistedtokens", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
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
        allowNull: false,
      },
    });

    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      jti: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      tokenHash: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      deviceInfo: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("refresh_tokens", {
      fields: ["userId"],
      type: "foreign key",
      name: "refresh_tokens_userId_fkey",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("refresh_tokens");
    await queryInterface.dropTable("blacklistedtokens");
    await queryInterface.dropTable("auditlogs");
    await queryInterface.dropTable("pledgeItems");
    await queryInterface.dropTable("pledges");
    await queryInterface.dropTable("pledgeCampaignItems");
    await queryInterface.dropTable("pledgeCampaigns");
    await queryInterface.dropTable("subscriptions");
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("queueStaff");
    await queryInterface.dropTable("queueEntries");
    await queryInterface.dropTable("queues");
    await queryInterface.dropTable("users");
    await queryInterface.dropTable("roles");
    await queryInterface.dropTable("churchSettings");
    await queryInterface.dropTable("churches");
  },
};
