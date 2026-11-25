import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import Service from './models/Service.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://Athithyan123:Athithyan%40123@cluster0.apnmtmb.mongodb.net/laundryapp?retryWrites=true&w=majority';

export const standardServices = [
  {
    name: 'Wash & Fold',
    description: 'Basic washing and neat folding service',
    pricePerKg: 50,
    pricePerPiece: 0,
    image: 'https://static.wixstatic.com/media/c1b522_233b9c951cac460bb2339d5cf8df634b~mv2.jpg/v1/fill/w_280,h_175,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/admin-ajax_php.jpg',
    turnaroundHours: 24,
    category: 'Basic',
    rating: 4.8,
    reviews: 240,
    isActive: true
  },
  {
    name: 'Dry Cleaning',
    description: 'Premium dry cleaning for suits, sarees, and delicate fabrics',
    pricePerKg: 120,
    pricePerPiece: 150,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS44UucPjEy2HSGNOFb3gYSJEX1nScEJqvt1Q&s',
    turnaroundHours: 48,
    category: 'Premium',
    rating: 4.9,
    reviews: 310,
    isActive: true
  },
  {
    name: 'Ironing Service',
    description: 'Professional steam ironing for crisp, wrinkle-free clothes',
    pricePerKg: 40,
    pricePerPiece: 20,
    image: 'https://5.imimg.com/data5/SELLER/Default/2023/10/353974717/LX/LQ/AX/126529570/steam-iron-service-250x250.jpg',
    turnaroundHours: 12,
    category: 'Clothing',
    rating: 4.7,
    reviews: 180,
    isActive: true
  },
  {
    name: 'Shoe Cleaning',
    description: 'Deep cleaning, stain removal, and polishing for sneakers and leather shoes',
    pricePerKg: 0,
    pricePerPiece: 120,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&fit=crop',
    turnaroundHours: 24,
    category: 'Special',
    rating: 4.8,
    reviews: 95,
    isActive: true
  },
  {
    name: 'Shirt Laundry',
    description: 'Professional washing, collar cleaning, and steam pressing for shirts',
    pricePerKg: 60,
    pricePerPiece: 40,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=200&fit=crop',
    turnaroundHours: 24,
    category: 'Clothing',
    rating: 4.6,
    reviews: 140,
    isActive: true
  },
  {
    name: 'Jeans & Pants',
    description: 'Special wash care for denim, trousers, and heavy bottom wear',
    pricePerKg: 70,
    pricePerPiece: 50,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=200&fit=crop',
    turnaroundHours: 36,
    category: 'Clothing',
    rating: 4.7,
    reviews: 115,
    isActive: true
  },
  {
    name: 'Bed Sheets & Linens',
    description: 'Hygienic deep wash and fabric softening for bed sheets, blankets, and curtains',
    pricePerKg: 80,
    pricePerPiece: 100,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
    turnaroundHours: 48,
    category: 'Home',
    rating: 4.6,
    reviews: 88,
    isActive: true
  },
  {
    name: 'Express Wash',
    description: 'Super-fast express wash & dry delivered in under 6 hours',
    pricePerKg: 100,
    pricePerPiece: 0,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5ydFE0oVsL5_ib_3eNnwuWN5dUNP1_q4Cwf-2noyvNjB5cn7nDKNp95Y&s',
    turnaroundHours: 6,
    category: 'Express',
    rating: 4.9,
    reviews: 260,
    isActive: true
  }
];

export async function seedServices() {
  try {
    const count = await Service.countDocuments();
    if (count === 0) {
      console.log('🌱 Inserting 8 official laundry services into MongoDB Atlas...');
      await Service.insertMany(standardServices);
      console.log('✅ 8 Services successfully stored in database!');
    } else {
      console.log(`ℹ️ Services collection already has ${count} records.`);
    }
  } catch (err) {
    console.error('❌ Failed to seed services:', err.message);
  }
}

if (process.argv[1]?.includes('seedServices.js')) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('✅ Connected to Atlas');
      await seedServices();
      await mongoose.disconnect();
      console.log('🔌 Disconnected');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
