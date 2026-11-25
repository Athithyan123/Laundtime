/**
 * LaundTime Admin Seeder
 * Run: node seeder.js
 * Creates the super admin account in MongoDB
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import dns from "node:dns";
import User from "./models/User.js";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://Athithyan123:Athithyan%40123@cluster0.apnmtmb.mongodb.net/laundryapp?retryWrites=true&w=majority";

async function seed() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existing = await User.findOne({ email: "admin@laundry.com" });
    if (existing) {
      console.log("⚠️  Admin account already exists:");
      console.log(`   Email: admin@laundry.com`);
      console.log(`   Role: ${existing.role}`);
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
        console.log("✅ Role updated to admin");
      }
    } else {
      await User.create({
        name: "Super Admin",
        email: "admin@laundry.com",
        password: "admin123",   // Will be hashed by pre-save hook
        phone: "9999999999",
        role: "admin"
      });
      console.log("✅ Admin account created:");
      console.log("   Email:    admin@laundry.com");
      console.log("   Password: admin123");
      console.log("   Role:     admin");
    }

    console.log("\n🎯 Admin login details:");
    console.log("   URL:      http://localhost:3001");
    console.log("   Email:    admin@laundry.com");
    console.log("   Password: admin123\n");

  } catch (err) {
    console.error("❌ Seeder error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

seed();
