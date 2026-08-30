import express from "express";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { protect, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/loyalty/balance — get user's points balance
router.get("/balance", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("loyaltyPoints pointsHistory");
    const worthInRupees = Math.floor(user.loyaltyPoints / 10);  // 10 pts = ₹1
    res.json({
      points:        user.loyaltyPoints,
      worthInRupees,
      history:       user.pointsHistory.slice(-20).reverse()  // last 20
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/loyalty/redeem — redeem points on an order
router.post("/redeem", protect, async (req, res) => {
  try {
    const { pointsToUse, orderId } = req.body;
    const user = await User.findById(req.user._id);

    if (user.loyaltyPoints < pointsToUse) {
      return res.status(400).json({ message: `You only have ${user.loyaltyPoints} points` });
    }

    const discountAmount = Math.floor(pointsToUse / 10);  // 10 pts = ₹1

    // Deduct points
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: -pointsToUse },
      $push: { pointsHistory: { points: -pointsToUse, action: "redeemed", orderId } }
    });

    res.json({
      message:        `✅ ${pointsToUse} points redeemed for ₹${discountAmount} discount`,
      discountAmount,
      pointsUsed:     pointsToUse,
      pointsRemaining: user.loyaltyPoints - pointsToUse
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/loyalty/insights — customer spending insights
router.get("/insights", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      user:   req.user._id,
      status: "delivered"
    }).sort({ createdAt: 1 });

    // Monthly spending (last 6 months)
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = { label: key, amount: 0, orders: 0, kg: 0 };
    }

    orders.forEach(o => {
      const d   = new Date(o.createdAt);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (months[key]) {
        months[key].amount += o.totalAmount;
        months[key].orders += 1;
        months[key].kg     += o.kgWeight || 0;
      }
    });

    // Favourite service
    const serviceCounts = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        serviceCounts[item.name] = (serviceCounts[item.name] || 0) + item.quantity;
      });
    });
    const favouriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    const user = await User.findById(req.user._id).select("totalOrders totalSpent loyaltyPoints");

    res.json({
      monthlyData:      Object.values(months),
      favouriteService,
      totalOrders:      user.totalOrders || orders.length,
      totalSpent:       user.totalSpent  || orders.reduce((s, o) => s + o.totalAmount, 0),
      loyaltyPoints:    user.loyaltyPoints,
      totalKg:          orders.reduce((s, o) => s + (o.kgWeight || 0), 0),
      avgOrderValue:    orders.length ? Math.round(orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length) : 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
