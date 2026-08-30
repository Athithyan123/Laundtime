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
    required: [true, 'Price per kg is required']
  },
  turnaroundHours: {
    type: Number,
    required: true,
    default: 24
  },
  category: {
    type: String,
    enum: ['Clothing', 'Premium', 'Home', 'Express', 'Special'],
    default: 'Clothing'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Service', ServiceSchema);
