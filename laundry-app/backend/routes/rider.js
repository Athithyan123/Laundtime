import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { protect, isRider, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/rider/assigned — rider sees their assigned pickups/deliveries
router.get("/assigned", protect, isRider, async (req, res) => {
  try {
    const orders = await Order.find({
      rider: req.user._id,
      status: { $in: ["confirmed", "picked", "ready"] }
    })
      .populate("user", "name phone address")
      .populate("branch", "name address")
      .sort({ "customerDetails.pickupDate": 1 });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rider/history — rider's completed deliveries
router.get("/history", protect, isRider, async (req, res) => {
  try {
    const orders = await Order.find({
      rider: req.user._id,
      status: { $in: ["delivered", "cancelled"] }
    })
      .populate("user", "name phone")
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/rider/pickup/:id — mark order as picked up (with optional photo)
router.put("/pickup/:id", protect, isRider, async (req, res) => {
  try {
    const { photoUrl, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.rider?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized for this order" });
    }

    order.status = "picked";
    order.statusHistory.push({ status: "picked", note: note || "Picked up by rider", updatedBy: req.user._id });
    if (photoUrl) {
      order.beforePhotos.push({ url: photoUrl, uploadedAt: new Date() });
    }
    await order.save();

    res.json({ message: "Order marked as picked up", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/rider/deliver/:id — mark order as delivered
router.put("/deliver/:id", protect, isRider, async (req, res) => {
  try {
    const { photoUrl, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "delivered";
    order.statusHistory.push({ status: "delivered", note: note || "Delivered successfully", updatedBy: req.user._id });
    if (photoUrl) {
      order.afterPhotos.push({ url: photoUrl, uploadedAt: new Date() });
    }

    // Credit loyalty points: 10 pts per ₹100 spent
    const pointsToAdd = Math.floor(order.totalAmount / 100) * 10;
    if (pointsToAdd > 0) {
      order.pointsEarned = pointsToAdd;
      await User.findByIdAndUpdate(order.user, {
        $inc: { loyaltyPoints: pointsToAdd, totalOrders: 1, totalSpent: order.totalAmount },
        $push: { pointsHistory: { points: pointsToAdd, action: "earned", orderId: order._id } }
      });
    }

    await order.save();
    res.json({ message: "Order delivered! Customer earned " + pointsToAdd + " points", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/rider/location/:id — update rider's live location for an order
router.put("/location/:id", protect, isRider, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Order.findByIdAndUpdate(req.params.id, {
      riderLocation: { lat, lng, updatedAt: new Date() }
    });
    res.json({ message: "Location updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rider/all — admin sees all riders
router.get("/all", protect, isAdmin, async (req, res) => {
  try {
    const riders = await User.find({ role: "rider" }).select("-password");
    res.json({ riders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rider/assign — admin assigns a rider to an order
router.post("/assign", protect, isAdmin, async (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        rider: riderId,
        status: "confirmed",
        $push: { statusHistory: { status: "confirmed", note: "Rider assigned", updatedBy: req.user._id } }
      },
      { new: true }
    ).populate("rider", "name phone");

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Rider assigned successfully", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
