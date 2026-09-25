const db = require("../models/index");
const AuditLog = db.auditlogs;
const getChanges = require("./getAuditChanges");

const logAudit = async ({
  userId,
  churchId,
  action,
  entity,
  entityId,
  metadata,
}) => {
  try {
    const resolvedChurchId = churchId ?? null;
    const normalizedMetadata = {
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    };

    // For update actions: compare old and new data
    if (
      action === "update" &&
      normalizedMetadata.before &&
      normalizedMetadata.after
    ) {
      normalizedMetadata.changes = getChanges(
        normalizedMetadata.before,
        normalizedMetadata.after,
      );
    }

    normalizedMetadata.churchId = resolvedChurchId;

    await AuditLog.create({
      userId,
      churchId: resolvedChurchId,
      action,
      entity,
      entityId,
      metadata: normalizedMetadata,
    });
  } catch (error) {
    console.error("Audit Logging Error", error);
  }
};

module.exports = logAudit;
