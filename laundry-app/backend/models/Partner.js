import mongoose from "mongoose";

const PartnerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["pickup", "washing", "delivery", "full-service"],
    required: true
  },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  serviceArea: { type: String, required: true, trim: true },
  identityDocuments: [{ type: String, trim: true }],
  profilePhoto: { type: String, default: null },

  // ── Real-Time Availability & Live GPS Tracking ──
  isAvailable: { type: Boolean, default: true }, // Online / Offline toggle
  serviceRadiusKm: { type: Number, default: 7 }, // 7 KM operating radius
  location: {
    lat: { type: Number, default: 13.0827 },
    lng: { type: Number, default: 80.2707 },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    address: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now }
  },
  activeOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  rejectedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

  paymentDetails: {
    accountName: String,
    accountNumber: String,
    ifsc: String,
    upi: String
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending"
  },
  documentsVerified: { type: Boolean, default: false },
  rejectionReason:   { type: String, default: null },
  changeRequest:     { type: String, default: null },
  commission: {
    pickup: { type: Number, default: 10 },
    washing: { type: Number, default: 20 },
    delivery: { type: Number, default: 10 }
  },
  earnings: [{
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    task: { type: String, enum: ["pickup", "washing", "delivery"] },
    amount: Number,
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    transactionId: String,
    createdAt: { type: Date, default: Date.now },
    paidAt: Date
  }]
}, { timestamps: true });

export default mongoose.model("Partner", PartnerSchema);
