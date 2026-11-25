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
import partnerRoutes       from "./routes/partner.js";
import aiRoutes            from "./routes/ai.js";

dotenv.config();

const app = express();

// ✅ CORS — allow localhost, local network, and all Render domains (*.onrender.com)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow localhost & 127.0.0.1 on any port (http and https)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow local network IPs: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+\.\d+(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow all Render app domains (*.onrender.com)
    if (/^https?:\/\/([a-zA-Z0-9-]+\.)*onrender\.com$/.test(origin)) return callback(null, true);
    // Allow any custom frontend domain defined in environment variables
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return callback(null, true);
    // Allow all in production/cloud environments
    return callback(null, true);
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
app.use("/api/partner",       partnerRoutes);
app.use("/api/ai",            aiRoutes);

// ✅ SSE — real-time live feed for admin panel
import { addClient, removeClient, broadcast as _broadcast } from "./utils/broadcast.js";

app.get("/api/admin/live", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control",  "no-cache");
  res.setHeader("Connection",     "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };
  send({ type: "connected", time: new Date().toISOString() });

  const heartbeat = setInterval(() => send({ type: "ping", time: new Date().toISOString() }), 20000);
  addClient(send);
  req.on("close", () => { clearInterval(heartbeat); removeClient(send); });
});

// ✅ Admin Stats endpoint
app.get("/api/admin/stats", async (req, res) => {
  try {
    const [Partner, Order, User] = await Promise.all([
      import("./models/Partner.js").then(m => m.default),
      import("./models/Order.js").then(m => m.default),
      import("./models/User.js").then(m => m.default),
    ]);
    const [
      totalPartners, pendingApps, approvedPartners,
      totalOrders, completedOrders, pendingOrders,
      totalCustomers
    ] = await Promise.all([
      Partner.countDocuments(),
      Partner.countDocuments({ status: "pending" }),
      Partner.countDocuments({ status: "approved" }),
      Order.countDocuments(),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "pending" }),
      User.countDocuments({ role: { $in: ["user", null] } })
    ]);
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    res.json({
      totalPartners, pendingApps, approvedPartners,
      totalOrders, completedOrders, pendingOrders,
      totalCustomers,
      totalRevenue: revenueAgg[0]?.total || 0,
      todayRevenue: todayAgg[0]?.total || 0,
      activeAreas: approvedPartners
    });
  } catch (err) {
    res.status(500).json({ message: "Stats error", error: err.message });
  }
});

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