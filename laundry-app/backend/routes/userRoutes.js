import express from "express";
import User from "../models/User.js";
import Order from "../models/Order.js";
import generateToken from "../utils/generateToken.js";
import { protect, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// @desc    Register new user
// @route   POST /api/users/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address, city } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "Please fill all fields: name, email, password" 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ 
        message: "User already exists with this email" 
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      city: city?.trim() || "Chennai"
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        token: generateToken(user._id),
        message: "Registration successful!"
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ 
      message: "Server error during registration",
      error: error.message
    });
  }
});

// @desc    Login user
// @route   POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Please provide email and password" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        token: generateToken(user._id),
        message: "Login successful!"
      });
    } else {
      res.status(401).json({ 
        message: "Invalid email or password" 
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      message: "Server error during login" 
    });
  }
});

// @desc    Get all registered customers with real order counts & stats (Admin only)
// @route   GET /api/users/customers
router.get("/customers", protect, isAdmin, async (req, res) => {
  try {
    // 1. Fetch registered customer accounts (all non-admin/partner/rider accounts)
    const registeredUsers = await User.find({ 
      role: { $nin: ["admin", "partner", "rider"] } 
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Fetch all orders to compute live statistics per customer and discover guest customers
    const orders = await Order.find()
      .select("user totalAmount customerDetails createdAt status trackingId items")
      .sort({ createdAt: -1 })
      .lean();

    const customerMap = new Map();

    // Process registered users
    for (const cust of registeredUsers) {
      const emailKey = cust.email ? cust.email.toLowerCase().trim() : null;
      const phoneKey = cust.phone ? cust.phone.trim() : null;

      const userOrders = orders.filter(o => 
        (o.user && String(o.user) === String(cust._id)) ||
        (emailKey && o.customerDetails?.email && o.customerDetails.email.toLowerCase().trim() === emailKey) ||
        (phoneKey && o.customerDetails?.phone && o.customerDetails.phone.trim() === phoneKey)
      );

      const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const lastOrder = userOrders.length > 0 ? userOrders[0] : null;

      const customerObj = {
        _id: String(cust._id),
        name: cust.name,
        email: cust.email,
        phone: cust.phone || lastOrder?.customerDetails?.phone || "N/A",
        address: cust.address || lastOrder?.customerDetails?.address || "Address not provided",
        city: cust.city || lastOrder?.customerDetails?.city || "Chennai",
        createdAt: cust.createdAt,
        loyaltyPoints: cust.loyaltyPoints || Math.floor(totalSpent / 10),
        totalOrders: userOrders.length,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        recentStatus: lastOrder?.status || "none",
        recentTrackingId: lastOrder?.trackingId || null,
        recentOrders: userOrders.slice(0, 5).map(o => ({
          _id: o._id,
          trackingId: o.trackingId,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
          itemCount: (o.items || []).length
        }))
      };

      if (emailKey) customerMap.set(emailKey, customerObj);
      else customerMap.set(String(cust._id), customerObj);
    }

    // 3. Extract unique customer records from orders (for guest / direct bookings)
    for (const o of orders) {
      const custDetails = o.customerDetails;
      if (!custDetails || !custDetails.email) continue;

      const emailKey = custDetails.email.toLowerCase().trim();
      if (!customerMap.has(emailKey)) {
        const matchingOrders = orders.filter(go => 
          go.customerDetails?.email && go.customerDetails.email.toLowerCase().trim() === emailKey
        );
        const totalSpent = matchingOrders.reduce((sum, go) => sum + (Number(go.totalAmount) || 0), 0);
        const lastOrder = matchingOrders[0];

        customerMap.set(emailKey, {
          _id: o.user ? String(o.user) : String(o._id),
          name: custDetails.name || "Customer",
          email: custDetails.email,
          phone: custDetails.phone || "N/A",
          address: custDetails.address || "Address not provided",
          city: custDetails.city || "Chennai",
          createdAt: o.createdAt,
          loyaltyPoints: Math.floor(totalSpent / 10),
          totalOrders: matchingOrders.length,
          totalSpent,
          lastOrderDate: lastOrder?.createdAt || null,
          recentStatus: lastOrder?.status || "none",
          recentTrackingId: lastOrder?.trackingId || null,
          recentOrders: matchingOrders.slice(0, 5).map(go => ({
            _id: go._id,
            trackingId: go.trackingId,
            totalAmount: go.totalAmount,
            status: go.status,
            createdAt: go.createdAt,
            itemCount: (go.items || []).length
          }))
        });
      }
    }

    const customerList = Array.from(customerMap.values());

    res.json({
      success: true,
      count: customerList.length,
      customers: customerList
    });
  } catch (error) {
    console.error("Fetch customers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch customers", error: error.message });
  }
});

// @desc    Get single customer profile & all their orders
// @route   GET /api/users/customers/:id
router.get("/customers/:id", protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const orders = await Order.find({
      $or: [
        { user: user._id },
        ...(user.email ? [{ "customerDetails.email": user.email.toLowerCase().trim() }] : []),
        ...(user.phone ? [{ "customerDetails.phone": user.phone.trim() }] : [])
      ]
    }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      customer: user,
      orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

export default router;