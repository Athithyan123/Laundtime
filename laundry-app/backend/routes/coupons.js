import express from "express";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { protect, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/coupons/available — public coupons (general/festival)
router.get("/available", async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      occasion: { $in: ["general", "festival"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    }).select("-usedBy");
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/coupons/validate — check if a coupon is valid for the user
router.post("/validate", protect, async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const now = new Date();
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

    if (!coupon) return res.status(404).json({ message: "Invalid coupon code" });

    // Check expiry
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return res.status(400).json({ message: "This coupon has expired" });
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "This coupon has reached its usage limit" });
    }

    // Check if user already used it
    const alreadyUsed = coupon.usedBy.some(u => u.user.toString() === req.user._id.toString());
    if (alreadyUsed) {
      return res.status(400).json({ message: "You have already used this coupon" });
    }

    // Check first-order restriction
    if (coupon.occasion === "first_order") {
      const orderCount = await Order.countDocuments({ user: req.user._id, status: { $ne: "cancelled" } });
      if (orderCount > 0) return res.status(400).json({ message: "This coupon is for first-time orders only" });
    }

    // Check birthday restriction
    if (coupon.occasion === "birthday") {
      if (!req.user.birthday) return res.status(400).json({ message: "Please add your birthday to your profile to use this coupon" });
      const today = new Date();
      const bday  = new Date(req.user.birthday);
      if (today.getMonth() !== bday.getMonth() || today.getDate() !== bday.getDate()) {
        return res.status(400).json({ message: "This coupon is only valid on your birthday 🎂" });
      }
    }

    // Check min order amount
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order of ₹${coupon.minOrderAmount} required for this coupon`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "percent") {
      discountAmount = Math.round((orderAmount * coupon.value) / 100);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else {
      discountAmount = Math.min(coupon.value, orderAmount);
    }

    res.json({
      valid: true,
      coupon: {
        code:        coupon.code,
        description: coupon.description,
        type:        coupon.type,
        value:       coupon.value
      },
      discountAmount,
      finalAmount: orderAmount - discountAmount,
      message: `🎉 ${coupon.description} — You save ₹${discountAmount}!`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/coupons/apply — mark coupon as used (called when order placed)
router.post("/apply", protect, async (req, res) => {
  try {
    const { code, orderId } = req.body;
    await Coupon.findOneAndUpdate(
      { code: code.toUpperCase() },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: { user: req.user._id, orderId } }
      }
    );
    res.json({ message: "Coupon applied" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin routes ──

// POST /api/coupons/create — admin creates a coupon
router.post("/create", protect, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Coupon code already exists" });
    res.status(500).json({ message: err.message });
  }
});

// GET /api/coupons/all — admin sees all coupons
router.get("/all", protect, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/coupons/:id — admin updates coupon
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Updated", coupon });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/coupons/:id — admin deletes coupon
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
