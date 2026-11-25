import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Service name is required']
  },
  description: {
    type: String,
    required: true
  },
  pricePerKg: { 
    type: Number, 
    default: 0
  },
  pricePerPiece: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: ''
  },
  turnaroundHours: {
    type: Number,
    required: true,
    default: 24
  },
  category: {
    type: String,
    enum: ['Clothing', 'Premium', 'Home', 'Express', 'Special', 'Basic'],
    default: 'Clothing'
  },
  rating: {
    type: Number,
    default: 4.8
  },
  reviews: {
    type: Number,
    default: 50
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Service', ServiceSchema);
