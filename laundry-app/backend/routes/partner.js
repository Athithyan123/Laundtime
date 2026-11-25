import express from "express";
import Partner from "../models/Partner.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { protect, isAdmin } from "../middleware/auth.js";
import { broadcast } from "../utils/broadcast.js";

const router = express.Router();

const withPartner = async (req, res, next) => {
  if (!["partner", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Partner access required" });
  }
  if (req.user.role === "admin") return next();
  req.partner = await Partner.findOne({ user: req.user._id });
  if (!req.partner) return res.status(404).json({ message: "Partner profile not found" });
  if (req.partner.status !== "approved") {
    return res.status(403).json({ message: "Partner account is not approved" });
  }
  next();
};

const addHistory = (order, status, req, note) => {
  order.statusHistory.push({ status, note, updatedBy: req.user._id });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, category, address, city, pincode, serviceArea,
      identityDocuments, profilePhoto, paymentDetails } = req.body;
    if (!name || !email || !password || !phone || !category || !address || !city || !pincode || !serviceArea) {
      return res.status(400).json({ message: "All required partner registration fields must be provided" });
    }
    if (!["pickup", "washing", "delivery", "full-service"].includes(category)) {
      return res.status(400).json({ message: "Invalid partner category" });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "An account with this email already exists" });

    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password,
      phone: phone.trim(), address, role: "partner"
    });
    const partner = await Partner.create({
      user: user._id, fullName: name.trim(), mobile: phone.trim(), category,
      address: address.trim(), city: city.trim(), pincode: pincode.trim(),
      serviceArea: serviceArea.trim(), identityDocuments: identityDocuments || [],
      profilePhoto: profilePhoto || null, paymentDetails: paymentDetails || {}
    });
    res.status(201).json({
      message: "Partner registration submitted. Your account is pending approval.",
      partner: { id: partner._id, status: partner.status, category: partner.category }
    });
  } catch (err) {
    res.status(500).json({ message: "Partner registration failed", error: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  if (req.user.role !== "partner") return res.status(403).json({ message: "Partner access required" });
  const partner = await Partner.findOne({ user: req.user._id });
  if (!partner) return res.status(404).json({ message: "Partner profile not found" });
  res.json({ partner });
});

router.put("/me", protect, withPartner, async (req, res) => {
  const allowed = ["fullName", "mobile", "address", "city", "pincode", "serviceArea", "profilePhoto", "paymentDetails"];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) req.partner[field] = req.body[field];
  });
  await req.partner.save();
  res.json({ partner: req.partner });
});

router.get("/orders/available", protect, withPartner, async (req, res) => {
  const { category, serviceArea, pincode, city } = req.partner;
  let query = {};

  if (category === "pickup") {
    // Show orders ready for pickup: pending or confirmed, no pickupPartner assigned yet
    query = {
      status: { $in: ["pending", "confirmed"] },
      pickupPartner: null
    };
  } else if (category === "full-service") {
    query = {
      $or: [
        { status: { $in: ["pending", "confirmed"] }, pickupPartner: null },
        { status: "picked", washingPartner: null },
        { status: "processing", washingPartner: null },
        { status: "ready", deliveryPartner: null }
      ]
    };
  } else if (category === "washing") {
    query = { status: "picked", washingPartner: null };
  } else if (category === "delivery") {
    query = { status: "ready", deliveryPartner: null };
  }

  const orders = await Order.find(query).populate("user", "name phone").sort({ createdAt: -1 });
  res.json({ orders });
});

router.get("/orders/assigned", protect, withPartner, async (req, res) => {
  const id = req.partner._id;
  const orders = await Order.find({
    $or: [{ pickupPartner: id }, { washingPartner: id }, { deliveryPartner: id }]
  }).populate("user", "name phone").sort({ updatedAt: -1 });
  res.json({ orders });
});

router.post("/orders/:id/accept", protect, withPartner, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const category = req.partner.category;
  if (["pickup", "full-service"].includes(category) && ["pending", "confirmed"].includes(order.status) && !order.pickupPartner) {
    order.pickupPartner = req.partner._id;
    if (order.status === "pending") order.status = "confirmed";
  } else if (["washing", "full-service"].includes(category) && order.status === "picked" && !order.washingPartner) {
    order.washingPartner = req.partner._id;
  } else if (["delivery", "full-service"].includes(category) && order.status === "ready" && !order.deliveryPartner) {
    order.deliveryPartner = req.partner._id;
  } else {
    return res.status(409).json({ message: "This order is not eligible or has already been assigned" });
  }
  addHistory(order, order.status, req, `${category} partner accepted order`);
  await order.save();
  // 🔔 Broadcast assignment update to admin panel
  broadcast("order_updated", {
    _id: order._id,
    trackingId: order.trackingId,
    status: order.status,
    pickupPartner: order.pickupPartner,
    washingPartner: order.washingPartner,
    deliveryPartner: order.deliveryPartner
  });
  res.json({ order });
});

router.patch("/orders/:id/status", protect, withPartner, async (req, res) => {
  const { status, note, photoUrl } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const partnerId = req.partner._id.toString();
  let allowed = false;
  if (status === "picked" && order.pickupPartner?.toString() === partnerId && ["pending", "confirmed"].includes(order.status)) allowed = true;
  if (status === "processing" && order.washingPartner?.toString() === partnerId && order.status === "picked") allowed = true;
  if (status === "ready" && order.washingPartner?.toString() === partnerId && order.status === "processing") allowed = true;
  if (status === "delivered" && order.deliveryPartner?.toString() === partnerId && order.status === "ready") allowed = true;
  if (!allowed) return res.status(403).json({ message: "Not authorized to set this order status" });

  order.status = status;
  addHistory(order, status, req, note || `Status updated to ${status}`);
  if (photoUrl && status === "picked") order.beforePhotos.push({ url: photoUrl, uploadedAt: new Date() });
  if (photoUrl && status === "delivered") order.afterPhotos.push({ url: photoUrl, uploadedAt: new Date() });
  await order.save();
  // 🔔 Broadcast to admin panel
  broadcast('order_updated', { _id: order._id, trackingId: order.trackingId, status: order.status,
    customerDetails: { name: order.customerDetails?.name } });
  let earningTask = null;
  if (status === "picked") earningTask = "pickup";
  if (status === "ready") earningTask = "washing";
  if (status === "delivered") earningTask = "delivery";
  if (earningTask) {
    const alreadyRecorded = req.partner.earnings.some(item =>
      item.order?.toString() === order._id.toString() && item.task === earningTask
    );
    if (!alreadyRecorded) {
      const commission = req.partner.commission?.[earningTask] || 0;
      req.partner.earnings.push({
        order: order._id,
        task: earningTask,
        amount: Number(((order.totalAmount || 0) * commission / 100).toFixed(2)),
        status: "pending"
      });
      await req.partner.save();
    }
  }
  res.json({ order });
});

router.get("/earnings", protect, withPartner, async (req, res) => {
  const entries = req.partner.earnings || [];
  const total = entries.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pending = entries.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const paid = entries.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  res.json({ earnings: entries, summary: { total, pending, paid } });
});

router.get("/admin/partners", protect, isAdmin, async (req, res) => {
  const partners = await Partner.find().populate("user", "name email phone role").sort({ createdAt: -1 });
  res.json({ partners });
});

router.patch("/admin/partners/:id/status", protect, isAdmin, async (req, res) => {
  const { status, documentsVerified, reason, changeNote } = req.body;
  if (!["pending", "approved", "rejected", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Invalid partner status" });
  }
  const partner = await Partner.findById(req.params.id);
  if (!partner) return res.status(404).json({ message: "Partner not found" });
  partner.status = status;
  if (documentsVerified !== undefined) partner.documentsVerified = documentsVerified;
  if (reason)     partner.rejectionReason  = reason;
  if (changeNote) partner.changeRequest    = changeNote;
  await partner.save();

  // 🔔 Broadcast partner status change to admin
  broadcast('partner_updated', { _id: partner._id, fullName: partner.fullName, status: partner.status });
  res.json({
    partner,
    message: {
      approved:  "Partner approved successfully",
      rejected:  "Partner rejected" + (reason ? `: ${reason}` : ""),
      suspended: "Partner suspended" + (reason ? `: ${reason}` : ""),
      pending:   changeNote ? `Change request sent: ${changeNote}` : "Status updated",
    }[status] || "Status updated"
  });
});

router.patch("/admin/orders/:id/assign", protect, isAdmin, async (req, res) => {
  const { stage, partnerId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const partner = await Partner.findById(partnerId);
  if (!partner || partner.status !== "approved") return res.status(400).json({ message: "Approved partner required" });
  if (!["pickup", "washing", "delivery"].includes(stage)) return res.status(400).json({ message: "Invalid assignment stage" });
  order[`${stage}Partner`] = partner._id;
  addHistory(order, order.status, req, `${stage} partner assigned by admin`);
  await order.save();
  res.json({ order });
});

router.get("/admin/payouts", protect, isAdmin, async (req, res) => {
  const partners = await Partner.find({ "earnings.status": "pending" });
  const payouts = partners.flatMap(partner => partner.earnings
    .filter(entry => entry.status === "pending")
    .map(entry => ({ partnerId: partner._id, partnerName: partner.fullName, ...entry.toObject() })));
  res.json({ payouts });
});

router.patch("/admin/payouts/:partnerId/:earningId", protect, isAdmin, async (req, res) => {
  const partner = await Partner.findById(req.params.partnerId);
  if (!partner) return res.status(404).json({ message: "Partner not found" });
  const earning = partner.earnings.id(req.params.earningId);
  if (!earning) return res.status(404).json({ message: "Earning not found" });
  earning.status = "paid";
  earning.transactionId = req.body.transactionId || `PAYOUT-${Date.now()}`;
  earning.paidAt = new Date();
  await partner.save();
  res.json({ earning });
});

export default router;
