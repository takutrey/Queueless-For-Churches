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
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
  process.env.HOST_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Device-Id",
    "Idempotency-Key",
    "X-Pledge-Receipt-Key",
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
};

// ── Socket.io with proper CORS ──────────────────────────
// Create a single Socket.IO server instance.
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      callback(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST"],
    credentials: true,
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
app.use(cors(corsOptions));
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
          "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://cdnjs.cloudflare.com",
          "img-src 'self' data: blob: https://*.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "connect-src 'self' https://*.mapbox.com https://events.mapbox.com wss://*.mapbox.com https://nominatim.openstreetmap.org https://api.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "font-src 'self' data: https://*.mapbox.com https://cdnjs.cloudflare.com",
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

// WEB
app.use(express.static(path.join(__dirname, "website/dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "website/dist", "index.html"));
});
// ADMIN
app.use("/admin", express.static(path.join(__dirname, "admin/dist")));

app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "admin/dist", "index.html"));
});

// ── Start server ────────────────────────────────────────
const startServer = async () => {
  try {
    server.listen(process.env.APP_PORT || 3000, () => {
      console.log(`🚀 Server running on port ${process.env.APP_PORT || 3000}`);
      console.log(`📍 CORS enabled for origins: ${allowedOrigins.join(", ")}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
