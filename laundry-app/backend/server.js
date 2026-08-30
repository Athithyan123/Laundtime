import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes          from "./routes/userRoutes.js";
import authRoutes          from "./routes/auth.js";
import orderRoutes         from "./routes/orders.js";
import serviceRoutes       from "./routes/services.js";
import subscriptionRoutes  from "./routes/subscriptions.js";
import couponRoutes        from "./routes/coupons.js";
import riderRoutes         from "./routes/rider.js";
import loyaltyRoutes       from "./routes/loyalty.js";

dotenv.config();

const app = express();

// ✅ CORS — allow localhost AND any device on the same local network (192.168.x.x etc.)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // Allow localhost on any port
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow local network IPs: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+\.\d+(:\d+)?$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Request logger (dev only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─────────────────────────────────────────────
// ✅ ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/orders",        orderRoutes);
app.use("/api/services",      serviceRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/coupons",       couponRoutes);
app.use("/api/rider",         riderRoutes);
app.use("/api/loyalty",       loyaltyRoutes);

// ✅ Health check (used by frontend to detect if backend is up)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime().toFixed(1) + "s"
  });
});

// ✅ Root
app.get("/", (req, res) => {
  res.json({
    message: "🚀 LaundTime Backend Running",
    version: "2.1.0",
    db: mongoose.connection.readyState === 1 ? "✅ Connected" : "❌ Disconnected"
  });
});

// ✅ 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ─────────────────────────────────────────────
// ✅ MONGODB CONNECTION
// ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/laundryapp";

const connectDB = async () => {
  try {
    console.log(`\n🔄 Connecting to MongoDB at: ${MONGO_URI}`);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,   // fail fast if MongoDB not running
      connectTimeoutMS: 8000,
    });

    console.log("✅ MongoDB Connected Successfully!");
    console.log(`📦 Database: ${mongoose.connection.name}`);

  } catch (err) {
    console.error("\n❌ MongoDB Connection Failed:", err.message);
    console.error("\n📋 To fix this:");
    console.error("   1. Make sure MongoDB is installed on your PC");
    console.error("   2. Open a new terminal and run: mongod");
    console.error("   3. OR install MongoDB: https://www.mongodb.com/try/download/community");
    console.error("   4. Then restart this server\n");
    console.error("⚠️  Server will run WITHOUT database (register/login will fail)\n");
    // Server keeps running — frontend can still load
  }
};

// ─────────────────────────────────────────────
// ✅ START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🎯 LaundTime Server running on port ${PORT}`);
  console.log(`📍 API:    http://localhost:${PORT}/api`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`${"=".repeat(50)}\n`);

  // Connect to DB after server starts
  connectDB();
});