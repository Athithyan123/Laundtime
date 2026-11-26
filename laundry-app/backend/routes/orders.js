import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import auth from '../middleware/auth.js';
import { protect, isAdmin } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';
import {
  triggerAutoDispatch,
  getDistanceKm,
  resolveCoordinates,
  findNearbyEligiblePartners
} from '../utils/dispatchService.js';

const router = express.Router();

// Helper: extract user id from optional token
const getUserFromToken = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey123laundtime2024");
    return decoded.id;
  } catch { return null; }
};

// ─── POST /api/orders — Customer places an order with auto-dispatch within 7 KM ───
router.post('/', async (req, res) => {
  try {
    const {
      items, totalAmount, customerDetails, paymentMethod, kgWeight,
      bookingType, subtotal, discount, deliveryCharge, isExpress, status
    } = req.body;

    const tokenUser = getUserFromToken(req);
    let userRecord = null;

    const rawPhone = (customerDetails?.phone || req.body?.phone || '').trim();
    const rawEmail = (customerDetails?.email || req.body?.email || '').toLowerCase().trim();
    const resolvedEmail = rawEmail || (rawPhone ? `customer_${rawPhone.replace(/\D/g, '')}@laundtime.customer` : `customer_${Date.now()}@laundtime.customer`);

    if (tokenUser) {
      userRecord = await User.findById(tokenUser).catch(() => null);
    }
    if (!userRecord && rawEmail) {
      userRecord = await User.findOne({ email: rawEmail }).catch(() => null);
    }
    if (!userRecord && rawPhone) {
      userRecord = await User.findOne({ phone: rawPhone }).catch(() => null);
    }
    if (!userRecord) {
      userRecord = await User.create({
        name: customerDetails?.name || "Customer",
        email: resolvedEmail,
        phone: rawPhone || "9999999999",
        address: customerDetails?.address || "Address provided",
        city: customerDetails?.city || "Chennai",
        role: "user",
        password: "customer123"
      }).catch(err => {
        console.warn("Auto-enroll customer failed, falling back:", err.message);
        return null;
      });
    }

    // Resolve GPS coordinates for customer location
    let customerLat = Number(customerDetails?.lat);
    let customerLng = Number(customerDetails?.lng);
    if (!customerLat || !customerLng || isNaN(customerLat) || isNaN(customerLng)) {
      const resolved = resolveCoordinates((customerDetails?.city || "Chennai") + " " + (customerDetails?.address || ""));
      customerLat = resolved.lat;
      customerLng = resolved.lng;
    }

    const cust = {
      name:         customerDetails?.name || userRecord?.name || (req.user ? req.user.name : "Customer"),
      email:        rawEmail || userRecord?.email || resolvedEmail,
      phone:        rawPhone || userRecord?.phone || (req.user ? req.user.phone : "9999999999"),
      address:      customerDetails?.address || userRecord?.address || "Address provided",
      city:         customerDetails?.city || userRecord?.city || "Chennai",
      pincode:      customerDetails?.pincode || "600001",
      pickupDate:   customerDetails?.pickupDate || customerDetails?.date || new Date(),
      pickupTime:   customerDetails?.pickupTime || customerDetails?.time || "10:00 AM - 12:00 PM",
      instructions: customerDetails?.instructions || "",
      lat:          customerLat,
      lng:          customerLng
    };

    const normalizedPaymentMethod = (paymentMethod || 'cod').toLowerCase().trim();
    const finalPaymentMethod = (normalizedPaymentMethod === 'cash') ? 'cod' : normalizedPaymentMethod;

    const orderItems = (items && items.length > 0)
      ? items.map(it => ({
          name:          it.name || "Laundry Service",
          quantity:      Number(it.quantity) || 1,
          price:         Number(it.price || it.pricePerPiece || it.pricePerKg || totalAmount || 100),
          pricePerKg:    Number(it.pricePerKg) || 0,
          pricePerPiece: Number(it.pricePerPiece) || 0,
          unit:          it.unit || "unit"
        }))
      : [{
          name:     "Laundry Service",
          quantity: 1,
          price:    Number(totalAmount) || 100,
          unit:     "service"
        }];

    const finalTotal = Number(totalAmount) > 0 ? Number(totalAmount) : orderItems.reduce((s, i) => s + (i.price * i.quantity), 0);

    const order = new Order({
      user: tokenUser || userRecord?._id || null,
      items: orderItems,
      totalAmount: finalTotal,
      subtotal: subtotal ? Number(subtotal) : finalTotal,
      discount: discount ? Number(discount) : 0,
      deliveryCharge: deliveryCharge ? Number(deliveryCharge) : 0,
      kgWeight: kgWeight ? Number(kgWeight) : 0,
      bookingType: bookingType || 'item-wise',
      isExpress: Boolean(isExpress),
      customerDetails: cust,
      customerLocation: {
        lat: customerLat,
        lng: customerLng,
        address: cust.address
      },
      partnerLocation: {
        lat: customerLat + 0.015,
        lng: customerLng + 0.015,
        heading: 0,
        speed: 0,
        updatedAt: new Date()
      },
      dispatchInfo: {
        autoDispatched: true,
        stage: "pickup",
        searchRadiusKm: 7,
        notifiedPartners: [],
        rejectedPartners: [],
        trackingActive: false
      },
      paymentMethod: finalPaymentMethod,
      status: status || 'pending',
      paymentStatus: (finalPaymentMethod === 'cod') ? 'pending' : 'completed',
      statusHistory: [{ status: status || 'pending', note: 'Order placed by customer · Auto-detecting partners within 7 KM' }]
    });

    const saved = await order.save();

    // Increment user's total orders and spending in real-time
    if (userRecord) {
      const updates = { $inc: { totalOrders: 1, totalSpent: finalTotal } };
      if (!userRecord.phone && cust.phone) updates.$set = { ...(updates.$set || {}), phone: cust.phone };
      if (!userRecord.address && cust.address) updates.$set = { ...(updates.$set || {}), address: cust.address };
      await User.findByIdAndUpdate(userRecord._id, updates).catch(() => null);
    }

    // 🚀 AUTOMATIC PARTNER DETECTION WITHIN 7 KM (Requirement 7.1, 7.2, 7.3)
    // Run dispatch asynchronously without blocking customer response
    triggerAutoDispatch(saved._id, "pickup").then(dispatchResult => {
      console.log(`[Auto-Dispatch] Order ${saved.trackingId || saved._id}:`, dispatchResult);
    }).catch(err => {
      console.error("[Auto-Dispatch Error]:", err.message);
    });

    // 🔔 Broadcast new order to admin panel instantly
    broadcast('new_order', {
      _id: saved._id,
      trackingId: saved.trackingId,
      status: saved.status,
      totalAmount: saved.totalAmount,
      customerDetails: { name: saved.customerDetails.name, phone: saved.customerDetails.phone, city: saved.customerDetails.city },
      customerLocation: saved.customerLocation,
      dispatchInfo: saved.dispatchInfo,
      createdAt: saved.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Finding nearest available partner within 7 KM...',
      order: saved
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
});

// ─── GET /api/orders/myorders — Logged-in user's own orders ──────────────────
router.get('/myorders', async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const paramEmail = req.query.email?.toLowerCase()?.trim();
    const paramPhone = req.query.phone?.trim();

    let user = null;
    if (userId) user = await User.findById(userId).catch(() => null);

    const matchConditions = [];
    if (user?._id) matchConditions.push({ user: user._id });
    else if (userId) matchConditions.push({ user: userId });

    const emailToMatch = user?.email?.toLowerCase()?.trim() || paramEmail;
    if (emailToMatch) matchConditions.push({ "customerDetails.email": emailToMatch });

    const phoneToMatch = user?.phone?.trim() || paramPhone;
    if (phoneToMatch) matchConditions.push({ "customerDetails.phone": phoneToMatch });

    if (matchConditions.length === 0) return res.json({ success: true, orders: [] });

    const orders = await Order.find({ $or: matchConditions })
      .sort({ createdAt: -1 })
      .populate('pickupPartner', 'fullName mobile category profilePhoto')
      .populate('washingPartner', 'fullName mobile category profilePhoto')
      .populate('deliveryPartner', 'fullName mobile category profilePhoto');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/orders — All orders (admin only) ───────────────────────────────
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone')
      .populate('pickupPartner',  'fullName mobile category city serviceArea location isAvailable')
      .populate('washingPartner', 'fullName mobile category city serviceArea location isAvailable')
      .populate('deliveryPartner','fullName mobile category city serviceArea location isAvailable')
      .populate('dispatchInfo.notifiedPartners', 'fullName mobile category isAvailable location');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/orders/track/:id — Full Live Tracking Data (Zomato/Rapido style) ─
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    const populateFields = 'fullName mobile category city serviceArea address profilePhoto location isAvailable';

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id)
        .populate('pickupPartner', populateFields)
        .populate('washingPartner', populateFields)
        .populate('deliveryPartner', populateFields)
        .populate('dispatchInfo.notifiedPartners', 'fullName mobile isAvailable');
    }

    if (!order) {
      order = await Order.findOne({ trackingId: id })
        .populate('pickupPartner', populateFields)
        .populate('washingPartner', populateFields)
        .populate('deliveryPartner', populateFields)
        .populate('dispatchInfo.notifiedPartners', 'fullName mobile isAvailable');
    }

    if (!order) {
      order = await Order.findOne({ $or: [{ orderNumber: id }, { "customerDetails.phone": id }] })
        .populate('pickupPartner', populateFields)
        .populate('washingPartner', populateFields)
        .populate('deliveryPartner', populateFields)
        .populate('dispatchInfo.notifiedPartners', 'fullName mobile isAvailable');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Determine current active phase & partner
    const status = order.status;
    let activePartner = null;
    let phase = "pickup_enroute";
    let isTrackingActive = order.dispatchInfo?.trackingActive || false;

    if (["ready", "delivered"].includes(status)) {
      activePartner = order.deliveryPartner || order.pickupPartner;
      phase = status === "delivered" ? "delivered" : "delivery_enroute";
      if (status === "delivered") isTrackingActive = false; // Requirement 6: Automatic Tracking Stop
    } else if (status === "processing") {
      activePartner = order.washingPartner || order.pickupPartner;
      phase = "washing";
    } else if (status === "picked") {
      activePartner = order.pickupPartner;
      phase = "picked";
    } else {
      activePartner = order.pickupPartner;
      phase = status === "confirmed" ? "pickup_enroute" : "pickup_waiting";
    }

    // Customer destination location
    const customerLoc = {
      lat: order.customerLocation?.lat || order.customerDetails?.lat || 13.0827,
      lng: order.customerLocation?.lng || order.customerDetails?.lng || 80.2707,
      address: order.customerLocation?.address || order.customerDetails?.address || order.customerDetails?.city || "Customer Address"
    };

    // LaundTime Hub location (situated centrally relative to customer)
    const hubLoc = {
      lat: customerLoc.lat + 0.012,
      lng: customerLoc.lng + 0.015,
      name: "LaundTime Facility Hub",
      address: "LaundTime Central Care Hub, " + (order.customerDetails?.city || "Chennai")
    };

    // Partner live location
    let partnerLoc = {
      lat: order.partnerLocation?.lat || activePartner?.location?.lat || customerLoc.lat + 0.02,
      lng: order.partnerLocation?.lng || activePartner?.location?.lng || customerLoc.lng + 0.02,
      heading: order.partnerLocation?.heading || 0,
      speed: order.partnerLocation?.speed || 24,
      updatedAt: order.partnerLocation?.updatedAt || new Date()
    };

    // Distance and ETA calculation
    const targetDest = phase === "delivery_enroute" || phase === "pickup_enroute" ? customerLoc : hubLoc;
    const distanceKm = getDistanceKm(partnerLoc.lat, partnerLoc.lng, targetDest.lat, targetDest.lng);
    const etaMinutes = status === "delivered" ? 0 : Math.max(2, Math.round((distanceKm / 22) * 60));

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        liveTracking: {
          phase,
          trackingActive: isTrackingActive,
          distanceKm,
          etaMinutes,
          customerLocation: customerLoc,
          partnerLocation: partnerLoc,
          hubLocation: hubLoc,
          activePartner: activePartner ? {
            id: activePartner._id,
            fullName: activePartner.fullName,
            mobile: activePartner.mobile,
            category: activePartner.category,
            profilePhoto: activePartner.profilePhoto
          } : null
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/orders/admin/dispatch-monitor — Real-time Dispatch Overview ─────
router.get('/admin/dispatch-monitor', protect, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["pending", "confirmed", "picked", "processing", "ready"] }
    })
      .sort({ createdAt: -1 })
      .populate('pickupPartner deliveryPartner washingPartner', 'fullName mobile category isAvailable location')
      .populate('dispatchInfo.notifiedPartners', 'fullName mobile isAvailable location');

    const availablePartners = await Partner.find({
      status: "approved",
      isAvailable: true
    }).select("fullName mobile category location serviceArea isAvailable");

    res.json({
      success: true,
      activeOrdersCount: orders.length,
      availablePartnersCount: availablePartners.length,
      orders,
      availablePartners
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── PATCH /api/orders/:id/override-assign — Admin Manual Override ───────────
router.patch('/:id/override-assign', protect, isAdmin, async (req, res) => {
  try {
    const { stage, partnerId } = req.body;
    if (!stage || !partnerId) return res.status(400).json({ message: "stage and partnerId are required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== "approved") return res.status(400).json({ message: "Approved partner required" });

    order[`${stage}Partner`] = partner._id;
    if (stage === "pickup" && order.status === "pending") order.status = "confirmed";
    if (stage === "delivery" && ["processing", "ready"].includes(order.status)) order.status = "ready";

    order.dispatchInfo.trackingActive = true;
    order.dispatchInfo.assignedAt = new Date();
    order.statusHistory.push({
      status: order.status,
      note: `Admin manually assigned ${stage} partner: ${partner.fullName}`,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    await order.save();

    broadcast("order_assigned", {
      orderId: order._id,
      trackingId: order.trackingId,
      status: order.status,
      assignedPartner: {
        id: partner._id,
        name: partner.fullName,
        mobile: partner.mobile,
        category: partner.category
      },
      overrideByAdmin: true
    });

    res.json({ success: true, message: `Partner ${partner.fullName} assigned successfully`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/orders/:id/status — Admin status update ─────────────────────
router.patch('/:id/status', protect, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','picked','processing','ready','delivered','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === "delivered") {
      order.dispatchInfo.trackingActive = false;
      order.dispatchInfo.trackingEndedAt = new Date();
    }
    order.statusHistory.push({ status, note: `Status set by admin to ${status}`, updatedBy: req.user._id });
    await order.save();

    broadcast('order_updated', {
      _id: order._id,
      trackingId: order.trackingId,
      status: order.status,
      customerDetails: { name: order.customerDetails?.name }
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
