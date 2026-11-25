import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"]
  },
  phone: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "admin", "rider", "partner"]
  },

  // ── Loyalty Points ──
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  pointsHistory: [{
    points: Number,
    action: String,           // "earned" | "redeemed"
    orderId: String,
    date: { type: Date, default: Date.now }
  }],

  // ── Subscription reference ──
  activeSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    default: null
  },

  // ── Branch (for rider/admin) ──
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    default: null
  },

  // ── Profile extras ──
  avatar: { type: String, default: null },
  birthday: { type: Date, default: null },
  totalOrders: { type: Number, default: 0 },
  totalSpent:  { type: Number, default: 0 },

  // ── Referral ──
  referralCode: { type: String, unique: true, sparse: true },
  referredBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // ── Notification preferences ──
  notifications: {
    whatsapp: { type: Boolean, default: true },
    email:    { type: Boolean, default: true },
    sms:      { type: Boolean, default: false }
  }

}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Auto-generate referral code before first save
userSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode = "LT" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
