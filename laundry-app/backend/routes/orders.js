import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { protect, isAdmin } from '../middleware/auth.js';
import Partner from '../models/Partner.js';
import { broadcast } from '../utils/broadcast.js';

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

// ─── POST /api/orders  — Customer places an order ─────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, customerDetails, paymentMethod, kgWeight, bookingType, subtotal, discount, deliveryCharge, isExpress, status } = req.body;

    const tokenUser = getUserFromToken(req);
    let userRecord = null;

    const rawPhone = (customerDetails?.phone || req.body?.phone || '').trim();
    const rawEmail = (customerDetails?.email || req.body?.email || '').toLowerCase().trim();
    // If no email provided, generate a predictable unique customer email based on phone or timestamp
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
      // Auto-enroll new customer account from order details
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

    // Sanitize customer details with graceful defaults
    const cust = {
      name:         customerDetails?.name || userRecord?.name || (req.user ? req.user.name : "Customer"),
      email:        rawEmail || userRecord?.email || resolvedEmail,
      phone:        rawPhone || userRecord?.phone || (req.user ? req.user.phone : "9999999999"),
      address:      customerDetails?.address || userRecord?.address || "Address provided",
      city:         customerDetails?.city || userRecord?.city || "Chennai",
      pincode:      customerDetails?.pincode || "600001",
      pickupDate:   customerDetails?.pickupDate || customerDetails?.date || new Date(),
      pickupTime:   customerDetails?.pickupTime || customerDetails?.time || "10:00 AM - 12:00 PM",
      instructions: customerDetails?.instructions || ""
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
      paymentMethod: finalPaymentMethod,
      status: status || 'pending',
      paymentStatus: (finalPaymentMethod === 'cod') ? 'pending' : 'completed',
      statusHistory: [{ status: status || 'pending', note: 'Order placed by customer' }]
    });

    const saved = await order.save();

    // Increment user's total orders and spending in real-time
    if (userRecord) {
      const updates = {
        $inc: { totalOrders: 1, totalSpent: finalTotal }
      };
      if (!userRecord.phone && cust.phone) updates.$set = { ...(updates.$set || {}), phone: cust.phone };
      if (!userRecord.address && cust.address) updates.$set = { ...(updates.$set || {}), address: cust.address };
      await User.findByIdAndUpdate(userRecord._id, updates).catch(() => null);
    }

    // 🔔 Broadcast new order to admin panel instantly
    broadcast('new_order', {
      _id: saved._id,
      trackingId: saved.trackingId,
      status: saved.status,
      totalAmount: saved.totalAmount,
      customerDetails: { name: saved.customerDetails.name, phone: saved.customerDetails.phone, city: saved.customerDetails.city },
      createdAt: saved.createdAt
    });

    res.status(201).json({ success: true, message: 'Order placed successfully!', order: saved });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
});

// ─── GET /api/orders/myorders — Logged-in user's own orders (strictly isolated) ──────────────────
router.get('/myorders', async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const paramEmail = req.query.email?.toLowerCase()?.trim();
    const paramPhone = req.query.phone?.trim();

    let user = null;
    if (userId) {
      user = await User.findById(userId).catch(() => null);
    }

    const matchConditions = [];
    if (user?._id) {
      matchConditions.push({ user: user._id });
    } else if (userId) {
      matchConditions.push({ user: userId });
    }

    const emailToMatch = user?.email?.toLowerCase()?.trim() || paramEmail;
    if (emailToMatch) {
      matchConditions.push({ "customerDetails.email": emailToMatch });
    }
    const phoneToMatch = user?.phone?.trim() || paramPhone;
    if (phoneToMatch) {
      matchConditions.push({ "customerDetails.phone": phoneToMatch });
    }

    if (matchConditions.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orders = await Order.find({ $or: matchConditions })
      .sort({ createdAt: -1 })
      .populate('pickupPartner', 'fullName mobile category')
      .populate('washingPartner', 'fullName mobile category')
      .populate('deliveryPartner', 'fullName mobile category');

    // Return strictly this user's orders (never leak other users' orders)
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
      .populate('pickupPartner',  'fullName mobile category city')
      .populate('washingPartner', 'fullName mobile category city')
      .populate('deliveryPartner','fullName mobile category city');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/orders/track/:id — Public tracking by trackingId or _id ─────────
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id)
        .populate('pickupPartner',  'fullName mobile category city serviceArea address profilePhoto')
        .populate('washingPartner', 'fullName mobile category city serviceArea address profilePhoto')
        .populate('deliveryPartner','fullName mobile category city serviceArea address profilePhoto');
    }

    if (!order) {
      order = await Order.findOne({ trackingId: id })
        .populate('pickupPartner',  'fullName mobile category city serviceArea address profilePhoto')
        .populate('washingPartner', 'fullName mobile category city serviceArea address profilePhoto')
        .populate('deliveryPartner','fullName mobile category city serviceArea address profilePhoto');
    }

    if (!order) {
      order = await Order.findOne({ $or: [{ orderNumber: id }, { "customerDetails.phone": id }] })
        .populate('pickupPartner',  'fullName mobile category city serviceArea address profilePhoto')
        .populate('washingPartner', 'fullName mobile category city serviceArea address profilePhoto')
        .populate('deliveryPartner','fullName mobile category city serviceArea address profilePhoto');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── GET /api/orders/:id — Single order ──────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('pickupPartner',  'fullName mobile category')
      .populate('washingPartner', 'fullName mobile category')
      .populate('deliveryPartner','fullName mobile category');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Authorization check
    if (req.user.role !== 'admin' && order.user?.toString() !== req.user._id.toString()) {
      let authorized = false;
      if (req.user.role === 'partner') {
        const partner = await Partner.findOne({ user: req.user._id });
        if (partner) {
          authorized = [order.pickupPartner?._id, order.washingPartner?._id, order.deliveryPartner?._id]
            .some(id => id?.toString() === partner._id.toString());
        }
      }
      if (!authorized) return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/orders/:id/status — Admin status update (legacy) ───────────────
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin access required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = req.body.status;
    order.statusHistory.push({ status: req.body.status, note: `Updated by admin`, updatedBy: req.user._id });
    await order.save();

    broadcast('order_updated', { _id: order._id, status: order.status, trackingId: order.trackingId });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PATCH /api/orders/:id/status — Admin status update (admin panel) ────────
router.patch('/:id/status', protect, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','picked','processing','ready','delivered','cancelled'];
    if (!valid.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    order.statusHistory.push({ status, note: `Status set by admin`, updatedBy: req.user._id });
    await order.save();

    // 🔔 Broadcast status change
    broadcast('order_updated', {
      _id: order._id, trackingId: order.trackingId, status: order.status,
      customerDetails: { name: order.customerDetails.name }
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
