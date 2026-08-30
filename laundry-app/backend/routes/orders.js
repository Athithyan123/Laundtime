import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ✅ Helper: extract user from token (optional)
const getUserFromToken = (req) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey123laundtime2024");
    return decoded.id;
  } catch {
    return null;
  }
};

// ✅ POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, customerDetails, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }

    if (!customerDetails || !customerDetails.name || !customerDetails.email ||
        !customerDetails.phone || !customerDetails.address ||
        !customerDetails.city || !customerDetails.pincode || !customerDetails.pickupDate) {
      return res.status(400).json({ message: 'All customer details are required' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    const userId = getUserFromToken(req);

    const order = new Order({
      user: userId,
      items,
      totalAmount,
      customerDetails,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      paymentStatus: 'pending'
    });

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: savedOrder
    });

  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: err.message
    });
  }
});

// ✅ GET /api/orders/myorders - Logged-in user's orders
router.get('/myorders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ GET /api/orders - All orders (admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name email');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ GET /api/orders/:id - Single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ PUT /api/orders/:id/status - Update status (admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
