import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: null
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  riders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  location: {
    lat: Number,
    lng: Number
  },
  operatingHours: {
    open:  { type: String, default: "08:00" },
    close: { type: String, default: "20:00" },
    days:  { type: [String], default: ["Mon","Tue","Wed","Thu","Fri","Sat"] }
  },
  serviceRadius: {
    type: Number,
    default: 10      // km
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalOrders:  { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Branch", BranchSchema);
