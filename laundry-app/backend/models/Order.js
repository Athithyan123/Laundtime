const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  weightKg: { type: Number, required: true },
  address: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending','Picked','InProcess','Completed','Cancelled'], default: 'Pending' },
  totalPrice: Number
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
