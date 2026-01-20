import mongoose from "mongoose";

const serviceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    pricePerKg: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Clothing', 'Premium', 'Home', 'Express', 'Special'],
      required: true
    },
    turnaroundHours: {
      type: Number,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;