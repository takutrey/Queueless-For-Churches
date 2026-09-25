const logAudit = require("../utils/logAudit");
const requestIp = require("request-ip");

/**
 * ============================================================
 * ENTITY MAP – no longer used for entity extraction.
 * We now use the request path as the entity.
 * Keep it only for the action mapping (if needed) or remove.
 * ============================================================
 */

/**
 * ============================================================
 * AUDIT MIDDLEWARE
 * ============================================================
 */
const auditMiddleware = (req, res, next) => {
  /**
   * Multipart requests – skip logging.
   */
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next();
  }

  /**
   * Capture response body.
   */
  const originalSend = res.send;
  res.send = function (data) {
    res.responseData = data;
    return originalSend.apply(this, arguments);
  };

  /**
   * Log after response has finished.
   */
  res.on("finish", async () => {
    try {
      // ─── Skip GET requests ──────────────────────────────
      if (req.method === "GET") {
        return;
      }

      // ─── Skip excluded paths ────────────────────────────
      if (!shouldLogRequest(req)) {
        return;
      }

      const userId = req.user?.id || null;
      const churchId = req.user?.churchId ?? null;

      // ─── Extract entity from request path ────────────────
      const entity = getEntityFromPath(req.path);
      const action = getActionFromMethod(req.method);
      const responseData = parseResponseData(res.responseData);
      const entityId = getEntityId(req, responseData);

      // ─── Build metadata ──────────────────────────────────
      const metadata = {
        method: req.method,
        path: req.path, // full path for debugging
        query: sanitizeObject(req.query),
        statusCode: res.statusCode,
        userId,
        churchId,
        userAgent: req.get("User-Agent"),
        ip: requestIp.getClientIp(req),
        timestamp: new Date().toISOString(),
      };

      // ─── Log audit ────────────────────────────────────────
      await logAudit({
        userId,
        churchId,
        action,
        entity, // now stores the route path
        entityId: entityId || "multiple",
        metadata,
      });
    } catch (error) {
      console.error("Audit middleware error:", error);
    }
  });

  next();
};

/**
 * ============================================================
 * ENTITY EXTRACTION
 * ============================================================
 *
 * Returns the request path without the "/api" prefix.
 * Optionally cleans UUIDs to avoid too many distinct values.
 */
function getEntityFromPath(path) {
  // Remove leading "/api" if present
  let cleaned = path.startsWith("/api") ? path.slice(4) : path;
  // Remove trailing slash if any
  if (cleaned.endsWith("/")) cleaned = cleaned.slice(0, -1);
  // Replace UUID patterns with :id to group similar routes
  cleaned = cleaned.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    "/:id",
  );
  return cleaned || "/";
}

/**
 * ============================================================
 * ACTION
 * ============================================================
 */
function getActionFromMethod(method) {
  const actions = {
    GET: "read",
    POST: "create",
    PUT: "update",
    PATCH: "update",
    DELETE: "delete",
  };
  return actions[method] || "other";
}

/**
 * ============================================================
 * SHOULD LOG
 * ============================================================
 */
function shouldLogRequest(req) {
  const excludedPaths = [
    "/health",
    "/static",
    "/favicon.ico",
    "/auth/refresh-token",
    "/auditlogs",
  ];
  return !excludedPaths.some((path) => req.path.includes(path));
}

/**
 * ============================================================
 * RESPONSE PARSER
 * ============================================================
 */
function parseResponseData(data) {
  if (!data) return null;
  if (typeof data === "object") return data;
  if (typeof data !== "string") return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * ============================================================
 * ENTITY ID EXTRACTION
 * ============================================================
 */
function getEntityId(req, responseData) {
  const possibleIds = [
    req.params?.queueId,
    req.params?.entryId,
    req.params?.userId,
    req.params?.entityId,
    req.params?.id,
    req.body?.queueId,
    req.body?.entryId,
    req.body?.userId,
    req.body?.id,
    responseData?.queue?.id,
    responseData?.entry?.id,
    responseData?.assignment?.id,
    responseData?.id,
  ];
  return (
    possibleIds.find((v) => v !== undefined && v !== null && v !== "") ||
    "multiple"
  );
}

/**
 * ============================================================
 * SANITIZE OBJECT
 * ============================================================
 */
function sanitizeObject(value) {
  if (!value || typeof value !== "object") return value;
  const sensitiveKeys = [
    "password",
    "currentPassword",
    "newPassword",
    "confirmPassword",
    "token",
    "accessToken",
    "refreshToken",
    "customerToken",
    "authorization",
    "secret",
    "privateKey",
  ];
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (sensitiveKeys.some((s) => key.toLowerCase() === s.toLowerCase())) {
      continue;
    }
    if (val && typeof val === "object") {
      result[key] = sanitizeObject(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

module.exports = auditMiddleware;
