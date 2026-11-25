import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import User from './models/User.js';
import Order from './models/Order.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://Athithyan123:Athithyan%40123@cluster0.apnmtmb.mongodb.net/laundryapp?retryWrites=true&w=majority';

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const customers = await User.find({ role: { $nin: ['admin', 'partner', 'rider'] } });
    console.log(`Found ${customers.length} customers in Atlas.`);

    const c1 = customers[0];
    const c2 = customers[1] || customers[0];
    const c3 = customers[2] || customers[0];

    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && c1) {
      console.log('Seeding initial orders for customers...');
      await Order.create([
        {
          user: c1._id,
          trackingId: 'LT' + (Date.now() - 86400000 * 2),
          orderNumber: 'ORD' + (Date.now() - 86400000 * 2),
          items: [
            { name: 'Wash & Fold', quantity: 5, price: 70, unit: 'kg' },
            { name: 'Ironing Service', quantity: 3, price: 30, unit: 'piece' }
          ],
          totalAmount: 440,
          status: 'delivered',
          paymentMethod: 'wallet',
          paymentStatus: 'completed',
          customerDetails: {
            name: c1.name,
            email: c1.email,
            phone: c1.phone || '9876543210',
            address: c1.address || 'Flat 4B, Green Glen Layout',
            city: c1.city || 'Chennai',
            pincode: '600001',
            pickupDate: new Date(Date.now() - 86400000 * 2),
            pickupTime: '10:00 AM - 12:00 PM'
          }
        },
        {
          user: c1._id,
          trackingId: 'LT' + (Date.now() - 86400000),
          orderNumber: 'ORD' + (Date.now() - 86400000),
          items: [
            { name: 'Dry Cleaning', quantity: 2, price: 180, unit: 'piece' }
          ],
          totalAmount: 360,
          status: 'processing',
          paymentMethod: 'card',
          paymentStatus: 'completed',
          customerDetails: {
            name: c1.name,
            email: c1.email,
            phone: c1.phone || '9876543210',
            address: c1.address || 'Flat 4B, Green Glen Layout',
            city: c1.city || 'Chennai',
            pincode: '600001',
            pickupDate: new Date(Date.now() - 86400000),
            pickupTime: '02:00 PM - 04:00 PM'
          }
        },
        {
          user: c2._id,
          trackingId: 'LT' + (Date.now() - 3600000 * 5),
          orderNumber: 'ORD' + (Date.now() - 3600000 * 5),
          items: [
            { name: 'Dry Cleaning', quantity: 1, price: 250, unit: 'piece' },
            { name: 'Express Wash', quantity: 2, price: 100, unit: 'kg' }
          ],
          totalAmount: 450,
          status: 'picked',
          paymentMethod: 'upi',
          paymentStatus: 'completed',
          customerDetails: {
            name: c2.name,
            email: c2.email,
            phone: c2.phone || '9845123456',
            address: c2.address || 'No. 24, Anna Nagar 2nd Avenue',
            city: c2.city || 'Chennai',
            pincode: '600040',
            pickupDate: new Date(),
            pickupTime: '11:00 AM - 01:00 PM'
          }
        },
        {
          user: c3._id,
          trackingId: 'LT' + (Date.now() - 1800000),
          orderNumber: 'ORD' + (Date.now() - 1800000),
          items: [
            { name: 'Wash & Fold', quantity: 4, price: 70, unit: 'kg' }
          ],
          totalAmount: 280,
          status: 'pending',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          customerDetails: {
            name: c3.name,
            email: c3.email,
            phone: c3.phone || '9765432109',
            address: c3.address || 'Plot 12, Besant Nagar Beach Road',
            city: c3.city || 'Chennai',
            pincode: '600090',
            pickupDate: new Date(),
            pickupTime: '04:00 PM - 06:00 PM'
          }
        }
      ]);
      console.log('✅ 4 Orders linked to customers seeded successfully!');
    } else {
      console.log('Customers already exist in database.');
    }
  } catch (err) {
    console.error('❌ Seeder error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
    process.exit(0);
  }
}

seed();
