import express from "express";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Subscription plans config
const PLANS = {
  "10kg":  { kgTotal: 10,  price: 499,  savings: "Save ₹100" },
  "20kg":  { kgTotal: 20,  price: 899,  savings: "Save ₹250" },
  "30kg":  { kgTotal: 30,  price: 1199, savings: "Save ₹450" },
  "50kg":  { kgTotal: 50,  price: 1799, savings: "Save ₹900" },
};

// GET /api/subscriptions/plans — public, show available plans
router.get("/plans", (req, res) => {
  const plans = Object.entries(PLANS).map(([key, val]) => ({
    id: key,
    ...val,
    pricePerKg: (val.price / val.kgTotal).toFixed(1),
    features: [
      "Free pickup & delivery",
      "Priority processing",
      "24h turnaround",
      val.kgTotal >= 30 ? "Dedicated customer support" : null,
      val.kgTotal >= 50 ? "Free express delivery (2 orders/month)" : null,
    ].filter(Boolean)
  }));
  res.json({ plans });
});

// GET /api/subscriptions/mine — get current user's active subscription
router.get("/mine", protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      user: req.user._id,
      status: "active"
    }).sort({ createdAt: -1 });
    res.json({ subscription: sub || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscriptions/buy — purchase a plan
router.post("/buy", protect, async (req, res) => {
  try {
    const { plan, paymentMethod = "cod" } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: "Invalid plan selected" });

    // Cancel existing active sub if any
    await Subscription.updateMany(
      { user: req.user._id, status: "active" },
      { status: "cancelled" }
    );

    const config = PLANS[plan];
    const renewDate = new Date();
    renewDate.setDate(renewDate.getDate() + 30);  // 30 days validity

    const sub = await Subscription.create({
      user:          req.user._id,
      plan,
      kgTotal:       config.kgTotal,
      kgUsed:        0,
      price:         config.price,
      renewDate,
      paymentMethod,
      status:        "active"
    });

    // Link to user
    await User.findByIdAndUpdate(req.user._id, { activeSubscription: sub._id });

    res.status(201).json({
      message: `✅ ${plan} subscription activated!`,
      subscription: sub
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscriptions/use — deduct KG from active subscription
router.post("/use", protect, async (req, res) => {
  try {
    const { kg, orderId } = req.body;
    if (!kg || kg <= 0) return res.status(400).json({ message: "Invalid kg amount" });

    const sub = await Subscription.findOne({
      user: req.user._id,
      status: "active"
    });
    if (!sub) return res.status(404).json({ message: "No active subscription found" });
    if (sub.kgRemaining < kg) {
      return res.status(400).json({
        message: `Only ${sub.kgRemaining} KG remaining in your plan`,
        remaining: sub.kgRemaining
      });
    }

    sub.kgUsed += kg;
    sub.usageHistory.push({ orderId, kgUsed: kg });
    await sub.save();

    res.json({
      message: `${kg} KG deducted. ${sub.kgRemaining} KG remaining.`,
      subscription: sub
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/subscriptions/cancel — cancel active subscription
router.put("/cancel", protect, async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { user: req.user._id, status: "active" },
      { status: "cancelled" },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: "No active subscription" });
    await User.findByIdAndUpdate(req.user._id, { activeSubscription: null });
    res.json({ message: "Subscription cancelled", subscription: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
