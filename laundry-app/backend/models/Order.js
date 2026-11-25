import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // ── Booking type ──
  bookingType: {
    type: String,
    enum: ["item-wise", "kg-based", "subscription"],
    default: "item-wise"
  },

  // ── Items (item-wise) ──
  items: [{
    _id:          String,
    name:         String,
    price:        Number,
    pricePerKg:   Number,
    pricePerPiece:Number,
    quantity:     Number,
    image:        String,
    description:  String,
    category:     String
  }],

  // ── KG info (kg-based/subscription) ──
  kgWeight: { type: Number, default: 0 },

  // ── Pricing ──
  subtotal:       { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  couponCode:     { type: String, default: null },
  couponDiscount: { type: Number, default: 0 },
  loyaltyDiscount:{ type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },

  // ── Express ──
  isExpress: { type: Boolean, default: false },

  // ── Customer details ──
  customerDetails: {
    name:        { type: String, required: true, default: "Customer" },
    email:       { type: String, default: "" },
    phone:       { type: String, required: true, default: "9999999999" },
    address:     { type: String, required: true, default: "Address provided" },
    city:        { type: String, required: true, default: "Chennai" },
    pincode:     { type: String, required: true, default: "600001" },
    pickupDate:  { type: Date, required: true, default: Date.now },
    pickupTime:  { type: String, default: "10:00 AM - 12:00 PM" },
    instructions:{ type: String, default: "" }
  },

  // ── Payment ──
  paymentMethod: {
    type: String,
    enum: ["card", "upi", "cod", "cash", "wallet", "loyalty", "netbanking", "online"],
    default: "cod"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "paid", "failed"],
    default: "pending"
  },

  // ── Status ──
  status: {
    type: String,
    enum: ["pending", "confirmed", "picked", "processing", "ready", "delivered", "cancelled"],
    default: "pending"
  },
  statusHistory: [{
    status:    String,
    note:      String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now }
  }],

  // ── Rider ──
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  pickupPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    default: null
  },
  washingPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    default: null
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    default: null
  },
  riderLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },

  // ── Branch ──
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    default: null
  },

  // ── QR & Tracking ──
  qrCode:    { type: String, default: null },   // unique QR payload
  trackingId:{ type: String, unique: true, sparse: true },

  // ── Photos (before pickup) ──
  beforePhotos: [{ url: String, uploadedAt: Date }],
  afterPhotos:  [{ url: String, uploadedAt: Date }],

  // ── Loyalty ──
  pointsEarned: { type: Number, default: 0 },
  pointsUsed:   { type: Number, default: 0 },

  // ── Subscription ──
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    default: null
  },

  // ── Invoice ──
  invoiceNumber: { type: String, unique: true, sparse: true },
  invoiceUrl:    { type: String, default: null },

  // ── Review ──
  rating:  { type: Number, min: 1, max: 5, default: null },
  review:  { type: String, default: null },

  // ── Estimated delivery ──
  estimatedDelivery: { type: Date, default: null }

}, { timestamps: true });

// Auto-generate trackingId and invoiceNumber
OrderSchema.pre("save", function (next) {
  if (!this.trackingId) {
    this.trackingId = "LT" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
  if (!this.invoiceNumber && this.status !== "pending") {
    const d = new Date();
    this.invoiceNumber = `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*90000+10000)}`;
  }
  next();
});

export default mongoose.model("Order", OrderSchema);
