import express from 'express';
import Service from '../models/Service.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch(err) { 
    res.status(500).json({ message: 'Server error', error: err.message }); 
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
    const s = new Service(req.body);
    await s.save();
    res.json(s);
  } catch(err) { 
    res.status(500).json({ message: 'Server error', error: err.message }); 
  }
});

export default router;
