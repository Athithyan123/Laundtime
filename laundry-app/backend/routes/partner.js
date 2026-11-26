import express from "express";
import Partner from "../models/Partner.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { protect, isAdmin } from "../middleware/auth.js";
import { broadcast } from "../utils/broadcast.js";
import {
  assignFirstComeFirstServed,
  handlePartnerRejection,
  triggerAutoDispatch,
  getDistanceKm,
  resolveCoordinates
} from "../utils/dispatchService.js";

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
  order.statusHistory.push({ status, note, updatedBy: req.user._id, timestamp: new Date() });
};

// ─── POST /api/partner/register ──────────────────────────────────────────────
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

    const coords = resolveCoordinates(city + " " + serviceArea);

    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password,
      phone: phone.trim(), address, role: "partner"
    });
    const partner = await Partner.create({
      user: user._id, fullName: name.trim(), mobile: phone.trim(), category,
      address: address.trim(), city: city.trim(), pincode: pincode.trim(),
      serviceArea: serviceArea.trim(), identityDocuments: identityDocuments || [],
      profilePhoto: profilePhoto || null, paymentDetails: paymentDetails || {},
      isAvailable: true,
      serviceRadiusKm: 7,
      location: {
        lat: coords.lat,
        lng: coords.lng,
        address: `${serviceArea}, ${city}`,
        updatedAt: new Date()
      }
    });
    res.status(201).json({
      message: "Partner registration submitted. Your account is pending approval.",
      partner: { id: partner._id, status: partner.status, category: partner.category }
    });
  } catch (err) {
    res.status(500).json({ message: "Partner registration failed", error: err.message });
  }
});

// ─── GET /api/partner/me ─────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  if (req.user.role !== "partner") return res.status(403).json({ message: "Partner access required" });
  const partner = await Partner.findOne({ user: req.user._id }).populate("activeOrder");
  if (!partner) return res.status(404).json({ message: "Partner profile not found" });
  res.json({ partner });
});

// ─── PUT /api/partner/me ─────────────────────────────────────────────────────
router.put("/me", protect, withPartner, async (req, res) => {
  const allowed = ["fullName", "mobile", "address", "city", "pincode", "serviceArea", "profilePhoto", "paymentDetails", "isAvailable", "serviceRadiusKm"];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) req.partner[field] = req.body[field];
  });
  await req.partner.save();
  res.json({ partner: req.partner });
});

// ─── PATCH /api/partner/availability — Toggle Online/Offline Status (Req 7.4) ─
router.patch("/availability", protect, withPartner, async (req, res) => {
  try {
    const { isAvailable, lat, lng } = req.body;
    if (isAvailable !== undefined) req.partner.isAvailable = Boolean(isAvailable);
    if (lat && lng) {
      req.partner.location.lat = Number(lat);
      req.partner.location.lng = Number(lng);
      req.partner.location.updatedAt = new Date();
    }
    await req.partner.save();

    broadcast("partner_availability_changed", {
      partnerId: req.partner._id,
      fullName: req.partner.fullName,
      category: req.partner.category,
      isAvailable: req.partner.isAvailable,
      location: req.partner.location
    });

    res.json({
      success: true,
      message: `You are now ${req.partner.isAvailable ? "Online & ready for orders within 7 KM" : "Offline"}`,
      isAvailable: req.partner.isAvailable,
      location: req.partner.location
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/partner/location — Live GPS Broadcaster (Req 1, 2, 5) ──────────
router.post("/location", protect, withPartner, async (req, res) => {
  try {
    const { lat, lng, heading, speed, orderId } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    const nHeading = Number(heading || 0);
    const nSpeed = Number(speed || 24);

    req.partner.location = {
      lat: nLat,
      lng: nLng,
      heading: nHeading,
      speed: nSpeed,
      updatedAt: new Date()
    };
    await req.partner.save();

    // Check if partner has an active in-transit order
    const targetOrderId = orderId || req.partner.activeOrder;
    let updatedOrder = null;

    if (targetOrderId) {
      const order = await Order.findById(targetOrderId);
      if (order && ["confirmed", "picked", "ready"].includes(order.status)) {
        order.partnerLocation = {
          lat: nLat,
          lng: nLng,
          heading: nHeading,
          speed: nSpeed,
          updatedAt: new Date()
        };
        await order.save();
        updatedOrder = order;

        // 🔔 Broadcast live GPS coordinates to customer and admin
        broadcast("partner_location_update", {
          orderId: order._id,
          trackingId: order.trackingId,
          partnerId: req.partner._id,
          partnerName: req.partner.fullName,
          partnerLocation: order.partnerLocation,
          status: order.status
        });
      }
    }

    res.json({
      success: true,
      location: req.partner.location,
      activeOrderUpdated: Boolean(updatedOrder)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/partner/orders/available — Filtered by 7 KM radius (Req 7.1) ────
router.get("/orders/available", protect, withPartner, async (req, res) => {
  try {
    const { category, location } = req.partner;
    const pLat = location?.lat || 13.0827;
    const pLng = location?.lng || 80.2707;
    const partnerRadius = req.partner.serviceRadiusKm || 7;

    let query = {};
    if (category === "pickup") {
      query = { status: { $in: ["pending", "confirmed"] }, pickupPartner: null };
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

    // Exclude orders rejected by this partner
    const rejectedIds = (req.partner.rejectedOrders || []).map(id => String(id));

    const orders = await Order.find(query)
      .populate("user", "name phone")
      .sort({ createdAt: -1 });

    // Calculate distance and filter orders within 7 KM or expanded search radius
    const filteredOrders = [];

    for (const order of orders) {
      if (rejectedIds.includes(String(order._id))) continue;

      const orderLat = order.customerLocation?.lat || order.customerDetails?.lat || 13.0827;
      const orderLng = order.customerLocation?.lng || order.customerDetails?.lng || 80.2707;
      const distanceKm = getDistanceKm(pLat, pLng, orderLat, orderLng);

      const effectiveRadius = Math.max(partnerRadius, order.dispatchInfo?.searchRadiusKm || 7);

      if (distanceKm <= effectiveRadius) {
        filteredOrders.push({
          ...order.toObject(),
          distanceKm,
          isWithin7Km: distanceKm <= 7,
          etaMinutes: Math.max(4, Math.round((distanceKm / 22) * 60))
        });
      }
    }

    // Sort closest orders first
    filteredOrders.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      partnerStatus: req.partner.isAvailable ? "online" : "offline",
      searchRadiusKm: partnerRadius,
      orders: filteredOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/partner/orders/assigned ─────────────────────────────────────────
router.get("/orders/assigned", protect, withPartner, async (req, res) => {
  try {
    const id = req.partner._id;
    const orders = await Order.find({
      $or: [{ pickupPartner: id }, { washingPartner: id }, { deliveryPartner: id }]
    }).populate("user", "name phone").sort({ updatedAt: -1 });

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/partner/orders/:id/accept — First-Come First-Served (Req 7.5, 7.6)
router.post("/orders/:id/accept", protect, withPartner, async (req, res) => {
  try {
    const category = req.partner.category;
    let stage = "pickup";
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["delivery", "full-service"].includes(category) && order.status === "ready") {
      stage = "delivery";
    } else if (["washing", "full-service"].includes(category) && order.status === "picked") {
      stage = "washing";
    }

    const result = await assignFirstComeFirstServed(order._id, req.partner._id, stage);
    if (!result.success) {
      return res.status(result.status || 400).json({ message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      order: result.order
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/partner/orders/:id/reject — Decline Order (Req 7.7) ────────────
router.post("/orders/:id/reject", protect, withPartner, async (req, res) => {
  try {
    const result = await handlePartnerRejection(req.params.id, req.partner._id);
    res.json({
      success: true,
      message: "Order declined. Searching other nearby partners...",
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/partner/orders/:id/status — Milestone Updates (Req 3, 4, 6) ────
router.patch("/orders/:id/status", protect, withPartner, async (req, res) => {
  try {
    const { status, note, photoUrl } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const partnerId = req.partner._id.toString();

    let allowed = false;
    // Requirement 3: Laundry Pickup Confirmation -> status becomes "picked"
    if (status === "picked" && order.pickupPartner?.toString() === partnerId && ["pending", "confirmed"].includes(order.status)) {
      allowed = true;
    }
    // Washing process
    if (status === "processing" && (order.washingPartner?.toString() === partnerId || order.pickupPartner?.toString() === partnerId) && order.status === "picked") {
      allowed = true;
    }
    // Requirement 4: Washing Completion Update -> status becomes "ready"
    if (status === "ready" && (order.washingPartner?.toString() === partnerId || order.pickupPartner?.toString() === partnerId) && ["picked", "processing"].includes(order.status)) {
      allowed = true;
    }
    // Requirement 6: Automatic Tracking Stop -> status becomes "delivered"
    if (status === "delivered" && (order.deliveryPartner?.toString() === partnerId || order.pickupPartner?.toString() === partnerId) && order.status === "ready") {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ message: "Not authorized to transition order to this status" });
    }

    order.status = status;

    // Requirement 3 Note
    if (status === "picked") {
      addHistory(order, status, req, note || "Laundry Picked Up from customer · En route to wash hub");
      order.dispatchInfo.stage = "washing";
    }
    // Requirement 4: Washing Completed -> Trigger Delivery Auto-Dispatch
    else if (status === "ready") {
      addHistory(order, status, req, note || "Washing Completed · Ready for delivery dispatch");
      order.dispatchInfo.stage = "delivery";
      order.dispatchInfo.trackingActive = true;

      // Automatically detect and notify delivery partners within 7 KM if separate delivery partner needed
      if (!order.deliveryPartner) {
        triggerAutoDispatch(order._id, "delivery").catch(err => {
          console.error("Delivery auto dispatch error:", err.message);
        });
      }
    }
    // Requirement 6: Delivered -> Automatic Tracking Stop
    else if (status === "delivered") {
      addHistory(order, status, req, note || "Delivered successfully to customer doorstep");
      order.dispatchInfo.trackingActive = false; // Live location tracking automatically stops!
      order.dispatchInfo.trackingEndedAt = new Date();
      order.dispatchInfo.stage = "completed";

      // Clear partner active order
      req.partner.activeOrder = null;
      await req.partner.save();
    } else {
      addHistory(order, status, req, note || `Status updated to ${status}`);
    }

    if (photoUrl && status === "picked") order.beforePhotos.push({ url: photoUrl, uploadedAt: new Date() });
    if (photoUrl && status === "delivered") order.afterPhotos.push({ url: photoUrl, uploadedAt: new Date() });

    await order.save();

    // 🔔 Broadcast real-time update
    broadcast('order_updated', {
      _id: order._id,
      trackingId: order.trackingId,
      status: order.status,
      trackingActive: order.dispatchInfo?.trackingActive,
      customerDetails: { name: order.customerDetails?.name }
    });

    // Record earnings commission
    let earningTask = null;
    if (status === "picked") earningTask = "pickup";
    if (status === "ready") earningTask = "washing";
    if (status === "delivered") earningTask = "delivery";

    if (earningTask) {
      const alreadyRecorded = req.partner.earnings.some(item =>
        item.order?.toString() === order._id.toString() && item.task === earningTask
      );
      if (!alreadyRecorded) {
        const commission = req.partner.commission?.[earningTask] || (earningTask === "washing" ? 20 : 10);
        req.partner.earnings.push({
          order: order._id,
          task: earningTask,
          amount: Number(((order.totalAmount || 0) * commission / 100).toFixed(2)),
          status: "pending"
        });
        await req.partner.save();
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/partner/earnings ───────────────────────────────────────────────
router.get("/earnings", protect, withPartner, async (req, res) => {
  const entries = req.partner.earnings || [];
  const total = entries.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pending = entries.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const paid = entries.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  res.json({ earnings: entries, summary: { total, pending, paid } });
});

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────
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

  broadcast('partner_updated', { _id: partner._id, fullName: partner.fullName, status: partner.status });
  res.json({ partner, message: "Status updated" });
});

router.patch("/admin/orders/:id/assign", protect, isAdmin, async (req, res) => {
  const { stage, partnerId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const partner = await Partner.findById(partnerId);
  if (!partner || partner.status !== "approved") return res.status(400).json({ message: "Approved partner required" });
  if (!["pickup", "washing", "delivery"].includes(stage)) return res.status(400).json({ message: "Invalid assignment stage" });
  order[`${stage}Partner`] = partner._id;
  addHistory(order, order.status, req, `${stage} partner assigned by admin override`);
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
