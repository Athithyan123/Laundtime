const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Service = require('../models/Service');
const auth = require('../middleware/auth');

// Create order
router.post('/', auth, async (req,res) => {
  try {
    const { serviceId, weightKg, address, pickupDate } = req.body;
    if(!serviceId || !weightKg || !address || !pickupDate) return res.status(400).json({ message: 'Fill all' });
    const service = await Service.findById(serviceId);
    if(!service) return res.status(400).json({ message: 'Invalid service' });
    const totalPrice = service.pricePerKg * weightKg;
    const order = new Order({
      user: req.user._id,
      service: service._id,
      weightKg,
      address,
      pickupDate,
      totalPrice
    });
    await order.save();
    res.json(order);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

// Get logged-in user's orders
router.get('/myorders', auth, async (req,res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('service').sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

// Admin: get all orders
router.get('/', auth, async (req,res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
    const orders = await Order.find().populate('service user').sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

// Update order status (admin)
router.put('/:id/status', auth, async (req,res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(order);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
