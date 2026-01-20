const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');

// Get all services
router.get('/', async (req,res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

// Add service (admin)
router.post('/', auth, async (req,res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
    const s = new Service(req.body);
    await s.save();
    res.json(s);
  } catch(err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
