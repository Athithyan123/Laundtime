import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  plan: {
    type: String,
    enum: ["10kg", "20kg", "30kg", "50kg"],
    required: true
  },
  kgTotal: {
    type: Number,
    required: true   // 10, 20, 30, 50
  },
  kgUsed: {
    type: Number,
    default: 0
  },
  kgRemaining: {
    type: Number
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled", "paused"],
    default: "active"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  renewDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ["card", "upi", "cod", "wallet"],
    default: "cod"
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  usageHistory: [{
    orderId:    { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    kgUsed:     Number,
    date:       { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Compute kgRemaining before saving
SubscriptionSchema.pre("save", function (next) {
  this.kgRemaining = Math.max(0, this.kgTotal - this.kgUsed);
  next();
});

export default mongoose.model("Subscription", SubscriptionSchema);
