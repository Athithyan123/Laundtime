// Run once: node seeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Service = require('./models/Service');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');

  // create admin
  const adminEmail = 'admin@laundry.com';
  let admin = await User.findOne({ email: adminEmail });
  if(!admin) {
    const hashed = await bcrypt.hash('admin123', 10);
    admin = new User({ name: 'Admin', email: adminEmail, password: hashed, role: 'admin' });
    await admin.save();
    console.log('admin created');
  }

  // sample services
  const services = [
    { name: 'Wash & Fold', description: 'Standard wash and fold', pricePerKg: 50, turnaroundHours: 48 },
    { name: 'Dry Clean', description: 'Dry cleaning for delicate clothes', pricePerKg: 120, turnaroundHours: 72 },
    { name: 'Ironing', description: 'Separate ironing service', pricePerKg: 30, turnaroundHours: 24 }
  ];
  for(const s of services) {
    const exists = await Service.findOne({ name: s.name });
    if(!exists) {
      await new Service(s).save();
      console.log('created', s.name);
    }
  }

  mongoose.disconnect();
}
seed();
