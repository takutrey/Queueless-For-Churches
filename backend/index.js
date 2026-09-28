require("dotenv").config();
const express = require("express");
const db = require("./models/index");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const passport = require("passport");
const cookieParser = require("cookie-parser");

// ── Middleware ──────────────────────────────────────────
const auditMiddleware = require("./middleware/auditMiddleware");

// ── Routes ──────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const auditlogs = require("./routes/auditlogs");
const notifications = require("./routes/notifications");
const queue = require("./routes/queue");
const users = require("./routes/user");
const analytics = require("./routes/analytics");
const campaigns = require("./routes/campaigns");

// ── Socket.IO initialiser ──────────────────────────────
const { initializeSocket } = require("./config/socket");

// ─────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// ── CORS Configuration ──────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

// Turn "https://example.com/" or "HTTPS://Example.com/path" into the exact
// value browsers send in the Origin header ("https://example.com").
// Returns null for anything that is not a full URL (e.g. "localhost:5173").
const normalizeOrigin = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    const { origin } = new URL(value.trim());
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
};

// Env vars may hold one URL or a comma-separated list.
const parseOriginList = (value) =>
  (value || "").split(",").map(normalizeOrigin).filter(Boolean);

// Explicit allowlist (for a frontend hosted on a DIFFERENT origin, e.g. a
// custom domain or a local dev server). RENDER_EXTERNAL_URL is set
// automatically by Render, so the deployed URL is always included.
const allowedOrigins = [
  ...new Set([
    ...parseOriginList(process.env.CLIENT_URL),
    ...parseOriginList(process.env.CLIENT_URLS),
    ...parseOriginList(process.env.HOST_URL),
    ...parseOriginList(process.env.RENDER_EXTERNAL_URL),
  ]),
];

// The admin dashboard and public site are served by THIS server, so their
// requests are same-origin. Browsers still attach an Origin header to
// same-origin POST/PUT/PATCH/DELETE requests, so we must recognise them.
const isSameOrigin = (origin, req) => {
  try {
    const host = (req.headers.host || "").toLowerCase();
    return !!host && new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
};

const isOriginAllowed = (origin, req) => {
  if (!origin) return true; // same-origin navigation, curl, server-to-server
  if (isDev) return true;
  if (allowedOrigins.includes(normalizeOrigin(origin))) return true;
  return isSameOrigin(origin, req);
};

// Per-request options so we can compare Origin against this request's Host.
// allowedHeaders is intentionally omitted: the cors package then echoes
// whatever headers the browser asks for in the preflight, so adding a new
// custom header on the client (Idempotency-Key, X-Pledge-Receipt-Key, ...)
// never requires a server change.
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header("Origin");

  if (!isOriginAllowed(origin, req)) {
    console.warn(`CORS blocked origin: ${origin} (host: ${req.headers.host})`);
    return callback(new Error("Not allowed by CORS"));
  }

  callback(null, {
    origin: true, // reflect the request origin (needed with credentials)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    maxAge: 600, // let browsers cache preflight results for 10 minutes
    optionsSuccessStatus: 200,
  });
};

// ── Socket.io with proper CORS ──────────────────────────
// Create a single Socket.IO server instance.
const io = socketIo(server, {
  cors: {
    // Reflect the origin; the real gatekeeping happens in allowRequest below.
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Runs on every new connection handshake, with access to the Host header,
  // so same-origin and allowlisted origins pass and everything else is refused.
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    const allowed = isOriginAllowed(origin, req);
    if (!allowed) {
      console.warn(`Socket.IO blocked origin: ${origin}`);
    }
    callback(null, allowed);
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
  transports: ["polling", "websocket"], // polling first for proxies
  allowEIO3: true,
  allowUpgrades: true,
  perMessageDeflate: false,
  httpCompression: false,
});

// ── Attach middleware & event handlers ──────────────────
initializeSocket(io); // ✅ Pass the same instance

// ── Attach io to every request ──────────────────────────
app.set("io", io);
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Database ────────────────────────────────────────────
db.sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection successful");
    if (process.env.NODE_ENV !== "production") {
      return db.sequelize.sync();
    }
  })
  .catch((error) => console.error("Database connection failed:", error));

// ── Global middleware ──────────────────────────────────
app.use(cors(corsOptionsDelegate));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Security headers
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader(
    "Content-Security-Policy",
    isProd
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
          "worker-src 'self' blob:", // ← was just "blob:" — this blocked /admin/sw.js
          "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://cdnjs.cloudflare.com https://fonts.googleapis.com",
          "img-src 'self' data: blob: https://*.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "connect-src 'self' https://*.mapbox.com https://events.mapbox.com wss://*.mapbox.com https://nominatim.openstreetmap.org https://api.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "font-src 'self' data: https://*.mapbox.com https://cdnjs.cloudflare.com https://fonts.gstatic.com",
        ].join("; ")
      : "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

app.use(auditMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/auditlogs", auditlogs);
app.use("/api/notifications", notifications);
app.use("/api/queues", queue);
app.use("/api/users", users);
app.use("/api/analytics", analytics);
app.use("/api/campaigns", campaigns);

// ── Error handling middleware ───────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS blocked" });
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.use(express.static("public"));

// ADMIN — must be registered BEFORE the public wildcard catch-all below.
// A broad regex route shadows every more-specific route registered after it,
// so with the old order every /admin/* request was answered by the public
// site's index.html and the admin app was unreachable.
const adminDistPath = path.join(__dirname, "admin/dist");
const adminIndexPath = path.join(adminDistPath, "index.html");

app.get(["/admin", "/admin/"], (_req, res) => {
  res.sendFile(adminIndexPath);
});

app.use("/admin", express.static(adminDistPath));

app.get(/^\/admin\/.+$/, (_req, res) => {
  res.sendFile(adminIndexPath);
});

// WEB — public catch-all, must stay last since /.*/ matches everything.
app.use(express.static(path.join(__dirname, "website/dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "website/dist", "index.html"));
});

// ── Start server ────────────────────────────────────────
const startServer = async () => {
  try {
    server.listen(process.env.APP_PORT || 3000, () => {
      console.log(`🚀 Server running on port ${process.env.APP_PORT || 3000}`);
      console.log(
        `📍 CORS allowlist: ${allowedOrigins.join(", ") || "(none — same-origin only)"}`,
      );
      console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
