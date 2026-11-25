import express from "express";
import Order from "../models/Order.js";
import Partner from "../models/Partner.js";

const router = express.Router();

// Knowledge base for fabric care & stain treatments
const FABRIC_KNOWLEDGE = [
  {
    keywords: ["silk", "silku", "பட்டு", "resham"],
    service: "Dry Cleaning",
    icon: "👗",
    reply: "Silk fabrics (like Kanchipuram sarees, raw silk, tussar) are extremely delicate and lose protein strength in hot water or harsh detergents. We recommend **Dry Cleaning** with mild solvents. We hand-press with cool steam to preserve the natural sheen and zari work.",
    actionText: "Book Dry Cleaning",
    actionUrl: "/services"
  },
  {
    keywords: ["wool", "woolen", "sweater", "jacket", "blazer", "cardigan", "shawl"],
    service: "Dry Cleaning",
    icon: "🧥",
    reply: "Woolen garments and blazers easily shrink and lose their tailored shape when exposed to water agitation. Our **Dry Cleaning** process gently cleans while preserving thermal insulating properties.",
    actionText: "Book Dry Cleaning",
    actionUrl: "/services"
  },
  {
    keywords: ["cotton", "shirt", "t-shirt", "pant", "jeans", "denim", "trousers", "பருத்தி"],
    service: "Wash & Fold",
    icon: "👔",
    reply: "Everyday cottons and denims are best handled with our premium **Wash & Fold** service (₹50–60/kg). We use pH-neutral eco detergents, wash at optimal 30°C to preserve dyes, and neatly fold your clothes.",
    actionText: "Book Wash & Fold",
    actionUrl: "/services"
  },
  {
    keywords: ["bedsheet", "pillow", "blanket", "comforter", "duvet", "curtain", "linen"],
    service: "Wash & Fold",
    icon: "🛏️",
    reply: "Bulky home textiles like bedsheets, comforters, and curtains are priced economically by weight. Our commercial extractors thoroughly sanitize and deep-clean dust mites and allergens.",
    actionText: "Book Home Linen Care",
    actionUrl: "/services"
  },
  {
    keywords: ["iron", "press", "wrinkle", "crease", "steam iron", "தேய்த்தல்"],
    service: "Ironing Service",
    icon: "♨️",
    reply: "Our **Expert Ironing Service** (₹40/kg or ₹20/piece) uses temperature-calibrated steam tables. We provide crisp creases for formals and smooth finishes for delicate ethnics without scorch marks.",
    actionText: "Book Ironing",
    actionUrl: "/services"
  },
  {
    keywords: ["stain", "turmeric", "curry", "oil", "grease", "ink", "coffee", "tea", "wine", "blood"],
    service: "Dry Cleaning + Stain Treatment",
    icon: "🫧",
    reply: "For stubborn stains (curry, oil, ink, tea/coffee):\n• **Important:** Do NOT rub vigorously or apply hot water — that sets the stain permanently!\n• Dab excess gently with a clean paper towel.\n• Select **Dry Cleaning** with our specialized enzyme spot-treatment option.",
    actionText: "Book Stain Removal",
    actionUrl: "/services"
  },
  {
    keywords: ["baby", "kids", "infant", "child"],
    service: "Wash & Fold (Gentle)",
    icon: "🍼",
    reply: "Baby and toddler clothes need special care! We use 100% hypoallergenic, dermatologically tested, fragrance-free detergents with an extra rinse cycle to protect delicate sensitive skin.",
    actionText: "Book Baby Clothes Wash",
    actionUrl: "/services"
  },
  {
    keywords: ["shoe", "sneaker", "boot"],
    service: "Shoe Cleaning",
    icon: "👟",
    reply: "Our **Professional Shoe Care** (₹50/pair) cleans outsoles, midsoles, laces, and inners using micro-brushing and deodorizing UV treatment.",
    actionText: "Book Shoe Cleaning",
    actionUrl: "/services"
  },
  {
    keywords: ["express", "fast", "urgent", "same day", "today", "emergency", "வேகம்"],
    service: "Express Wash",
    icon: "⚡",
    reply: "Need your clothes fast? Our **Express Wash** service delivers in just **6 hours**! Orders placed in the morning are washed, dried, pressed, and returned by evening.",
    actionText: "Book Express Wash",
    actionUrl: "/services"
  }
];

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    const { message, userId, userPhone } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ reply: "Please provide a message to chat." });
    }

    const text = message.trim();
    const lower = text.toLowerCase();

    // 1. Check if user provided an Order Tracking ID (e.g. LTMWVORRF5OS1, LT...)
    const trackingMatch = text.match(/LT[A-Z0-9]{6,15}/i) || text.match(/[0-9a-f]{24}/i);
    if (trackingMatch) {
      const queryId = trackingMatch[0].toUpperCase();
      const order = await Order.findOne({
        $or: [
          { trackingId: new RegExp(`^${queryId}$`, "i") },
          ...(queryId.length === 24 ? [{ _id: queryId }] : [])
        ]
      })
      .populate("pickupPartner", "fullName mobile serviceArea city")
      .populate("deliveryPartner", "fullName mobile serviceArea city");

      if (order) {
        const partnerName = order.pickupPartner?.fullName || order.deliveryPartner?.fullName || "Assigned Partner";
        const partnerPhone = order.pickupPartner?.mobile || order.deliveryPartner?.mobile;
        
        let statusHuman = order.status;
        if (order.status === "pending") statusHuman = "⏳ Order Placed (Waiting for pickup partner assignment)";
        else if (order.status === "confirmed") statusHuman = "✅ Confirmed (Partner assigned and heading for pickup)";
        else if (order.status === "picked") statusHuman = "📦 Picked Up (Garments collected, on the way to facility)";
        else if (order.status === "processing") statusHuman = "🔄 In Progress (Washing, stain treatment & drying)";
        else if (order.status === "ready") statusHuman = "🎯 Ready for Delivery (Inspection complete)";
        else if (order.status === "delivered") statusHuman = "🏠 Delivered Successfully!";
        else if (order.status === "cancelled") statusHuman = "❌ Order Cancelled";

        let reply = `📦 **Order Status for #${order.trackingId}**\n\n` +
          `• **Status:** ${statusHuman}\n` +
          `• **Customer:** ${order.customerDetails?.name || "Customer"}\n` +
          `• **Amount:** ₹${order.totalAmount} (${order.paymentMethod?.toUpperCase() || "COD"})\n` +
          `• **Scheduled Pickup:** ${order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : "Scheduled"} (${order.customerDetails?.pickupTime || "10 AM - 12 PM"})\n`;

        if (order.pickupPartner) {
          reply += `\n🚗 **Pickup Partner:** ${order.pickupPartner.fullName} (${order.pickupPartner.serviceArea || "Chennai"})\n` +
            `📞 Contact: ${order.pickupPartner.mobile}`;
        }

        return res.json({
          reply,
          type: "order_tracking",
          orderId: order.trackingId,
          actionText: "🚚 View Live Tracking Map",
          actionUrl: `/track/${order.trackingId}`,
          partnerPhone: partnerPhone || null
        });
      } else {
        return res.json({
          reply: `I searched for Tracking ID **#${queryId}**, but couldn't find an order matching that number. Please check the tracking ID or view your recent orders in **My Orders**.`,
          type: "not_found",
          actionText: "📦 Open My Orders",
          actionUrl: "/orders"
        });
      }
    }

    // 2. Check if user is asking "Where is my order?" or "Track my order"
    if (lower.includes("track") || lower.includes("where is my order") || lower.includes("order status") || lower.includes("என் ஆர்டர்")) {
      let latestOrder = null;
      if (userId || userPhone) {
        latestOrder = await Order.findOne({
          $or: [
            ...(userId ? [{ user: userId }] : []),
            ...(userPhone ? [{ "customerDetails.phone": userPhone }] : [])
          ]
        }).sort({ createdAt: -1 })
          .populate("pickupPartner", "fullName mobile serviceArea city");
      }

      if (!latestOrder) {
        latestOrder = await Order.findOne().sort({ createdAt: -1 })
          .populate("pickupPartner", "fullName mobile serviceArea city");
      }

      if (latestOrder) {
        return res.json({
          reply: `Here is your most recent booking **#${latestOrder.trackingId}**:\n\n` +
            `• **Status:** ${latestOrder.status.toUpperCase()}\n` +
            `• **Total:** ₹${latestOrder.totalAmount}\n` +
            `• **Pickup:** ${latestOrder.customerDetails?.pickupDate ? new Date(latestOrder.customerDetails.pickupDate).toLocaleDateString() : "Scheduled"} (${latestOrder.customerDetails?.pickupTime || "10 AM"})\n` +
            (latestOrder.pickupPartner ? `• **Partner:** ${latestOrder.pickupPartner.fullName} (📞 ${latestOrder.pickupPartner.mobile})\n` : "") +
            `\nYou can track live progress and GPS dispatch below.`,
          type: "order_tracking",
          orderId: latestOrder.trackingId,
          actionText: `🚚 Track Order #${latestOrder.trackingId}`,
          actionUrl: `/track/${latestOrder.trackingId}`
        });
      } else {
        return res.json({
          reply: "You don't have any active orders right now. Would you like to book a fresh laundry pickup?",
          type: "no_orders",
          actionText: "🧺 Book Service Now",
          actionUrl: "/services"
        });
      }
    }

    // 3. Check for Pricing / Rates questions
    if (lower.includes("price") || lower.includes("rate") || lower.includes("cost") || lower.includes("how much") || lower.includes("எவ்வளவு") || lower.includes("charges")) {
      const reply = "🏷️ **LaundTime Transparent Pricing List:**\n\n" +
        "• **Wash & Fold:** ₹50 – ₹60 / kg (Everyday wear, bedsheets)\n" +
        "• **Dry Cleaning:** ₹120 / piece (Silk sarees, suits, blazers)\n" +
        "• **Ironing Service:** ₹40 / kg or ₹20 / piece (Hand steam press)\n" +
        "• **Shoe Cleaning:** ₹50 / pair (Deep clean + deodorize)\n" +
        "• **Bed Sheets & Linens:** ₹80 / kg (Heavy blankets, quilts)\n" +
        "• **Express Wash:** ₹100 / kg (⚡ Guaranteed 6-hour delivery)\n\n" +
        "✨ *Free Doorstep Pickup & Delivery on all orders above ₹199!*";
      return res.json({
        reply,
        type: "pricing",
        actionText: "🧺 Browse & Book Services",
        actionUrl: "/services"
      });
    }

    // 4. Check for Turnaround / Timing questions
    if (lower.includes("time") || lower.includes("how long") || lower.includes("hours") || lower.includes("when will") || lower.includes("turnaround") || lower.includes("நேரம்")) {
      return res.json({
        reply: "⏱️ **Turnaround Timings:**\n\n" +
          "• **Standard Orders:** 24 hours from pickup.\n" +
          "• **Express Service:** 6 hours same-day return (for bookings before 12 PM).\n" +
          "• **Dry Cleaning:** 24–48 hours depending on fabric embellishments.\n\n" +
          "You will receive live SMS and tracking updates at every step!",
        type: "info",
        actionText: "⚡ Book Express Wash",
        actionUrl: "/services"
      });
    }

    // 5. Check for Cancellation / Refund questions
    if (lower.includes("cancel") || lower.includes("refund") || lower.includes("return money")) {
      return res.json({
        reply: "🔄 **Cancellation & Refund Policy:**\n\n" +
          "• You can cancel free of charge any time before your pickup partner collects your garments.\n" +
          "• Go to **My Orders** -> click **❌ Cancel Order**.\n" +
          "• If paid via Wallet, the amount is refunded **instantly** back to your wallet balance!",
        type: "policy",
        actionText: "📦 Go to My Orders",
        actionUrl: "/orders"
      });
    }

    // 6. Check for Wallet / Payment questions
    if (lower.includes("wallet") || lower.includes("payment method") || lower.includes("upi") || lower.includes("cod") || lower.includes("cash")) {
      return res.json({
        reply: "💳 **Payment Methods & Wallet:**\n\n" +
          "We accept:\n" +
          "• **Cash on Delivery (COD)** — Pay upon delivery\n" +
          "• **LaundTime Wallet** — Instant 1-click checkout + bonus rewards\n" +
          "• **UPI** (GPay, PhonePe, Paytm)\n" +
          "• **Debit & Credit Cards**\n\n" +
          "You earn 1 loyalty point for every ₹10 spent!",
        type: "wallet",
        actionText: "💰 Open Wallet",
        actionUrl: "/wallet"
      });
    }

    // 7. Check Fabric Knowledge Base
    for (const rule of FABRIC_KNOWLEDGE) {
      if (rule.keywords.some(k => lower.includes(k))) {
        return res.json({
          reply: `${rule.icon} **${rule.service}**\n\n${rule.reply}`,
          type: "recommendation",
          service: rule.service,
          actionText: rule.actionText,
          actionUrl: rule.actionUrl
        });
      }
    }

    // 8. Greetings & Small Talk
    if (lower.match(/^(hi|hello|hey|vanakkam|namaste|good morning|good evening)/i)) {
      return res.json({
        reply: "Hello! 👋 I'm your **LaundTime AI Care Assistant**.\n\n" +
          "I can help you with:\n" +
          "1. 🚚 **Tracking your live orders & partner details**\n" +
          "2. 🧺 **Recommending the best service for any fabric**\n" +
          "3. 🏷️ **Pricing, subscription plans, and discounts**\n" +
          "4. 🫧 **Expert stain removal tips**\n\n" +
          "What can I do for you today?",
        type: "greeting"
      });
    }

    // 9. Natural fallback with intelligent hints
    return res.json({
      reply: "I understand questions about garment care, order tracking, and pricing!\n\n" +
        "Try asking me:\n" +
        "• *'Where is my order?'* or enter a tracking ID (e.g. *LTMWVORRF5OS1*)\n" +
        "• *'What service is best for silk sarees?'*\n" +
        "• *'How much does wash & fold cost?'*\n" +
        "• *'How to remove tea or curry stains?'*",
      type: "fallback",
      actionText: "🧺 Browse Services",
      actionUrl: "/services"
    });
  } catch (err) {
    console.error("AI Chat Error:", err);
    res.status(500).json({
      reply: "I encountered a hiccup processing your request. Please try again or browse our services directly.",
      type: "error"
    });
  }
});

export default router;
