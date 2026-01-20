// server.js - FULL CORRECTED CODE:
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Athithyan%402006@fooddeliveryapp.bjpbyzu.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err.message));

// Routes
app.use("/api/users", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" 
  });
});

// Root
app.get("/", (req, res) => {
  res.send("🚀 Laundry App Backend");
});

// Use port 5001 instead of 5000
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
});