import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["percent", "flat"],
    required: true
  },
  value: {
    type: Number,
    required: true     // 20 = 20% off OR ₹20 off
  },
  maxDiscount: {
    type: Number,
    default: null      // cap for percent coupons (e.g. max ₹200 off)
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: null      // null = unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  usedBy: [{
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    usedAt:  { type: Date, default: Date.now }
  }],
  occasion: {
    type: String,
    enum: ["first_order", "birthday", "referral", "festival", "loyalty", "general"],
    default: "general"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null    // null = never expires
  },
  applicableServices: [String],  // empty = all services
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    default: null    // null = all branches
  }
}, { timestamps: true });

export default mongoose.model("Coupon", CouponSchema);
