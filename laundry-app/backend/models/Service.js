const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  pricePerKg: { type: Number, required: true },
  turnaroundHours: Number
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
