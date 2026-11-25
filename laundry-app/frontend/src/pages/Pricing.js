import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import API from "../api";
import "./Pricing.css";

// ── Default Plan Specifications ──
const DEFAULT_KG_PLANS = [
  {
    id: "10kg",
    name: "10 KG Starter Plan",
    price: 499,
    originalPrice: 599,
    pricePerKg: "₹49.9/kg",
    savings: "Save ₹100 / month",
    turnaround: "24h Turnaround",
    tag: null,
    popular: false,
    features: [
      "10 KG fresh wash & neat fold",
      "Free doorstep pickup & delivery",
      "Eco-friendly anti-bacterial wash",
      "Standard 24-hour delivery",
      "30 days validity with roll-over"
    ]
  },
  {
    id: "20kg",
    name: "20 KG Popular Family",
    price: 899,
    originalPrice: 1149,
    pricePerKg: "₹44.9/kg",
    savings: "Save ₹250 / month",
    turnaround: "24h Turnaround",
    tag: "Most Popular",
    popular: true,
    features: [
      "20 KG premium wash & steam iron",
      "Unlimited free pickups & returns",
      "Fabric softener & stain treatment",
      "Priority washing queue",
      "SMS & WhatsApp order tracking",
      "30 days validity"
    ]
  },
  {
    id: "30kg",
    name: "30 KG Mega Value",
    price: 1199,
    originalPrice: 1649,
    pricePerKg: "₹39.9/kg",
    savings: "Save ₹450 / month",
    turnaround: "24h Turnaround",
    tag: "Best Value",
    popular: false,
    features: [
      "30 KG full household laundry",
      "Free 1 express 6-hour delivery/mo",
      "Dedicated account care partner",
      "Custom folding & hanging options",
      "Curtain & bed linen eligible",
      "Valid for 45 days"
    ]
  },
  {
    id: "50kg",
    name: "50 KG Enterprise / Hostel",
    price: 1799,
    originalPrice: 2699,
    pricePerKg: "₹35.9/kg",
    savings: "Save ₹900 / month",
    turnaround: "Same-Day Priority",
    tag: "Max Savings",
    popular: false,
    features: [
      "50 KG heavy volume laundry",
      "Free 2 express deliveries/mo",
      "VIP partner assignment",
      "Multi-user family access (up to 4)",
      "Zero lost-clothes guarantee",
      "Complimentary shoe care voucher"
    ]
  }
];

// ── Standard Item-wise Services ──
const SERVICES_DATA = [
  {
    id: "8",
    name: "Wash & Fold",
    price: 50,
    unit: "per kg",
    turnaround: "24 hours",
    category: "Basic",
    image: "https://static.wixstatic.com/media/c1b522_233b9c951cac460bb2339d5cf8df634b~mv2.jpg/v1/fill/w_280,h_175,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/admin-ajax_php.jpg",
    desc: "Everyday clothes washed, sanitized, tumble dried and folded crisply."
  },
  {
    id: "7",
    name: "Steam Ironing",
    price: 40,
    unit: "per kg",
    turnaround: "12 hours",
    category: "Clothing",
    image: "https://5.imimg.com/data5/SELLER/Default/2023/10/353974717/LX/LQ/AX/126529570/steam-iron-service-250x250.jpg",
    desc: "Industrial steam press for wrinkle-free crisp finish on hangers or folded."
  },
  {
    id: "1",
    name: "Wash & Steam Iron",
    price: 60,
    unit: "per kg",
    turnaround: "24 hours",
    category: "Clothing",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=200&fit=crop",
    desc: "Complete garment care: thorough wash, fabric conditioner, and professional steam press."
  },
  {
    id: "3",
    name: "Dry Cleaning",
    price: 120,
    unit: "per piece",
    turnaround: "48 hours",
    category: "Premium",
    image: "https://images.unsplash.com/photo-1582735689255-65d9493badc5?w=300&h=200&fit=crop",
    desc: "Solvent-based deep care for delicate silks, woolens, blazers, and designer suits."
  },
  {
    id: "5",
    name: "Express Wash",
    price: 100,
    unit: "per kg",
    turnaround: "6 hours",
    category: "Express",
    image: "https://images.unsplash.com/photo-1604514628550-37477afdf4e3?w=300&h=200&fit=crop",
    desc: "Urgent rush laundry picked up, processed and returned to your door in 6 hours."
  },
  {
    id: "6",
    name: "Shoe Deep Cleaning",
    price: 50,
    unit: "per pair",
    turnaround: "24 hours",
    category: "Special",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&fit=crop",
    desc: "Midsole whitening, suede & leather stain extraction, and anti-odor deodorization."
  },
  {
    id: "4",
    name: "Bed Linens & Quilts",
    price: 80,
    unit: "per kg",
    turnaround: "48 hours",
    category: "Home",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
    desc: "Deep thermal sanitization for bedspreads, heavy comforters, and curtains."
  },
  {
    id: "2",
    name: "Jeans & Heavy Denim",
    price: 70,
    unit: "per kg",
    turnaround: "36 hours",
    category: "Clothing",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=200&fit=crop",
    desc: "Color-protect wash maintaining deep indigo dye with fabric-strengthening conditioner."
  }
];

// ── VIP Memberships ──
const VIP_PASSES = [
  {
    id: "silver",
    name: "Silver Saver Pass",
    price: 299,
    duration: "/ month",
    discountPercent: 5,
    tag: null,
    features: [
      "5% OFF on every regular order",
      "2 free doorstep pickups per month",
      "Priority customer care on WhatsApp",
      "Free basic stain treatment",
      "Rollover unused discount benefits"
    ]
  },
  {
    id: "gold",
    name: "Gold VIP Club",
    price: 599,
    duration: "/ month",
    discountPercent: 10,
    tag: "Recommended",
    featured: true,
    features: [
      "10% OFF on all laundry & dry cleaning",
      "Unlimited free pickups & deliveries",
      "Free upgrade to Express Wash once/mo",
      "Dedicated partner assigned to your area",
      "Free premium hanger packaging",
      "Early bird festival discount vouchers"
    ]
  },
  {
    id: "platinum",
    name: "Platinum Elite Family",
    price: 899,
    duration: "/ month",
    discountPercent: 15,
    tag: "VIP Perks",
    features: [
      "15% OFF across the entire platform",
      "Unlimited 6-hour express turnaround",
      "Share benefits with up to 4 family phones",
      "Emergency same-day laundry guarantee",
      "1 Free deep carpet / quilt wash per month",
      "Dedicated LaundTime VIP concierge"
    ]
  }
];

// ── FAQs List ──
const FAQS = [
  {
    q: "How does doorstep pickup and delivery work?",
    a: "Once you place an order or select a plan, our verified local pickup partner visits your doorstep with a LaundTime weighing bag. Clothes are weighed in front of you, tagged, and delivered back within your chosen turnaround time."
  },
  {
    q: "What happens if I don't finish my monthly KG quota?",
    a: "All unused KG automatically rolls over to the next month whenever your subscription renews! You never lose the laundry quota you paid for."
  },
  {
    q: "Can I pay using Cash on Delivery (COD)?",
    a: "Yes! You can choose Pay on Delivery (Cash or UPI) at pickup, or use your in-app LaundTime Wallet for instant 1-click payment."
  },
  {
    q: "Is there a minimum order amount for free delivery?",
    a: "For pay-as-you-go orders, delivery is 100% free on all orders above ₹199 (orders below ₹199 have a nominal ₹30 delivery fee). All monthly KG and VIP subscribers enjoy unlimited free delivery with no minimum threshold."
  },
  {
    q: "Are delicate clothes and formal wear handled separately?",
    a: "Yes. Every customer's clothes are washed in individual machines with zero co-mingling. Delicates and dry-clean garments are inspected and processed according to international textile care symbols."
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, deductMoney } = useWallet();

  // Navigation tab state: 'kg' | 'services' | 'vip' | 'calculator'
  const [activeTab, setActiveTab] = useState("kg");

  // Subscriptions state
  const [activeSub, setActiveSub] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [modalOpen, setModalOpen] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  // Calculator State
  const [calcWeight, setCalcWeight] = useState(6); // 6 KG default
  const [calcService, setCalcService] = useState("wash_iron"); // 'wash_fold', 'wash_iron', 'dry_clean'
  const [calcAddons, setCalcAddons] = useState({
    softener: true,
    stainTreatment: false,
    express: false
  });

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState(0);

  // Load active subscription from backend on mount
  useEffect(() => {
    if (user) {
      API.get("/subscriptions/mine")
        .then(res => {
          if (res.data?.subscription) {
            setActiveSub(res.data.subscription);
          }
        })
        .catch(() => {
          // fallback to localStorage
          const localSub = localStorage.getItem("laundrySubscription");
          if (localSub) {
            try { setActiveSub(JSON.parse(localSub)); } catch {}
          }
        });
    }
  }, [user]);

  const showToast = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Plan Subscription Handlers ──
  const handleOpenSubscribe = (plan) => {
    if (!user) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    setSelectedPlan(plan);
    setPaymentMethod(wallet.balance >= plan.price ? "wallet" : "cod");
    setModalOpen(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;
    setSubscribing(true);

    try {
      // 1. If wallet payment chosen, check and deduct
      if (paymentMethod === "wallet") {
        if (wallet.balance < selectedPlan.price) {
          showToast(`Insufficient wallet balance. You need ₹${selectedPlan.price - wallet.balance} more.`, "error");
          setSubscribing(false);
          return;
        }
        deductMoney(selectedPlan.price, `Subscription: ${selectedPlan.name}`);
      }

      // 2. Call backend subscription API
      const res = await API.post("/subscriptions/buy", {
        plan: selectedPlan.id,
        paymentMethod
      }).catch(() => null);

      const activatedSub = res?.data?.subscription || {
        plan: selectedPlan.id,
        kgTotal: selectedPlan.price ? parseInt(selectedPlan.id) || 20 : 20,
        kgRemaining: selectedPlan.price ? parseInt(selectedPlan.id) || 20 : 20,
        price: selectedPlan.price,
        status: "active",
        renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      setActiveSub(activatedSub);
      localStorage.setItem("laundrySubscription", JSON.stringify(activatedSub));

      setModalOpen(false);
      showToast(`🎉 ${selectedPlan.name} activated successfully! Enjoy your laundry perks.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to process subscription.", "error");
    } finally {
      setSubscribing(false);
    }
  };

  // ── Dynamic Calculator Calculation ──
  const calcBaseRate = {
    wash_fold: 50,
    wash_iron: 60,
    dry_clean: 120
  }[calcService] || 50;

  const addonsPerKg =
    (calcAddons.softener ? 10 : 0) +
    (calcAddons.stainTreatment ? 15 : 0) +
    (calcAddons.express ? 40 : 0);

  const calcSubtotal = calcWeight * (calcBaseRate + addonsPerKg);
  const calcDiscount = calcWeight >= 15 ? Math.round(calcSubtotal * 0.15) : (calcWeight >= 8 ? Math.round(calcSubtotal * 0.1) : 0);
  const calcFinalTotal = calcSubtotal - calcDiscount;
  const isFreeDelivery = calcFinalTotal >= 199;

  return (
    <div className="pricing-page">
      {/* ── Notification Toast ── */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* ── Hero Banner ── */}
      <section className="pricing-hero">
        <div className="pricing-hero-badge">💎 Transparent LaundTime Pricing</div>
        <h1>Fair, Simple & Honest Laundry Rates</h1>
        <p className="pricing-hero-desc" style={{ color: "#000000", fontWeight: 600 }}>
          No hidden pickup surcharges or surprise taxes. Choose a monthly KG quota for maximum savings, or pay as you go.
        </p>

        <div className="pricing-trust-pills">
          <div className="trust-pill"><span>🚚</span> Free Doorstep Pickup above ₹199</div>
          <div className="trust-pill"><span>⚡</span> 24h Standard • 6h Express Available</div>
          <div className="trust-pill"><span>🛡️</span> 100% Anti-Bacterial Sanitization</div>
          <div className="trust-pill"><span>🤖</span> Real-time AI Assistant & Tracking</div>
        </div>
      </section>

      {/* ── Main Container ── */}
      <div className="pricing-container">

        {/* ── Active Subscription Alert ── */}
        {activeSub && (
          <div className="active-subscription-banner">
            <div className="active-sub-info">
              <span className="active-sub-icon">🎉</span>
              <div>
                <div className="active-sub-title">
                  You Have an Active Plan: {(activeSub.plan || "VIP").toUpperCase()}
                </div>
                <div className="active-sub-desc">
                  {activeSub.kgRemaining !== undefined
                    ? `${activeSub.kgRemaining} KG remaining out of ${activeSub.kgTotal || 20} KG quota`
                    : "Active VIP Benefits: Unlimited Free Delivery & Priority Partner Allocation"}
                </div>
              </div>
            </div>
            <div className="active-sub-actions">
              <button className="btn-use-quota" onClick={() => navigate("/services")}>
                Book Laundry with Quota →
              </button>
            </div>
          </div>
        )}

        {/* ── Switcher Navigation Tabs ── */}
        <div className="pricing-nav-tabs">
          <button
            className={`pricing-tab-btn ${activeTab === "kg" ? "active" : ""}`}
            onClick={() => setActiveTab("kg")}
          >
            <span>🧺</span> Monthly KG Plans
          </button>
          <button
            className={`pricing-tab-btn ${activeTab === "services" ? "active" : ""}`}
            onClick={() => setActiveTab("services")}
          >
            <span>🏷️</span> Per-Service Rates
          </button>
          <button
            className={`pricing-tab-btn ${activeTab === "vip" ? "active" : ""}`}
            onClick={() => setActiveTab("vip")}
          >
            <span>⭐</span> VIP Memberships
          </button>
          <button
            className={`pricing-tab-btn ${activeTab === "calculator" ? "active" : ""}`}
            onClick={() => setActiveTab("calculator")}
          >
            <span>🧮</span> Live Price Estimator
          </button>
        </div>

        {/* ══════════════ TAB 1: MONTHLY KG PLANS ══════════════ */}
        {activeTab === "kg" && (
          <div>
            <div className="plans-grid">
              {DEFAULT_KG_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`pricing-card ${plan.popular ? "featured" : ""}`}
                >
                  {plan.tag && <div className="plan-badge">{plan.tag}</div>}

                  <div className="plan-header">
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-desc">{plan.turnaround} • Direct Doorstep Pickup</div>
                  </div>

                  <div className="plan-pricing-box">
                    <div className="plan-price">₹{plan.price}</div>
                    <div className="plan-period">/ month</div>
                    <div className="plan-original-price">₹{plan.originalPrice}</div>
                  </div>

                  <div className="plan-savings-tag">{plan.savings} ({plan.pricePerKg})</div>

                  <ul className="plan-features-list">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="plan-feature-item">
                        <span className="feature-check">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`plan-cta-btn ${plan.popular ? "primary" : "secondary"}`}
                    onClick={() => handleOpenSubscribe(plan)}
                  >
                    {activeSub?.plan === plan.id ? "Current Plan Active" : "Choose This Plan →"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TAB 2: PER-SERVICE RATES ══════════════ */}
        {activeTab === "services" && (
          <div>
            <div className="services-rate-grid">
              {SERVICES_DATA.map((srv) => (
                <div key={srv.id} className="service-rate-card">
                  <div className="service-rate-img-wrap">
                    <img src={srv.image} alt={srv.name} className="service-rate-img" />
                    <span className="service-rate-tag">{srv.turnaround}</span>
                  </div>

                  <div className="service-rate-body">
                    <div>
                      <div className="service-rate-title">{srv.name}</div>
                      <div className="service-rate-desc">{srv.desc}</div>
                    </div>

                    <div className="service-rate-footer">
                      <div>
                        <span className="service-price-tag">₹{srv.price}</span>
                        <span className="service-price-unit"> /{srv.unit}</span>
                      </div>

                      <button
                        className="btn-rate-book"
                        onClick={() => navigate(`/book/${srv.id}`)}
                      >
                        Book Now →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TAB 3: VIP MEMBERSHIPS ══════════════ */}
        {activeTab === "vip" && (
          <div>
            <div className="plans-grid">
              {VIP_PASSES.map((pass) => (
                <div
                  key={pass.id}
                  className={`pricing-card ${pass.featured ? "featured" : ""}`}
                >
                  {pass.tag && <div className="plan-badge">{pass.tag}</div>}

                  <div className="plan-header">
                    <div className="plan-name">{pass.name}</div>
                    <div className="plan-desc">Flat {pass.discountPercent}% Off All Orders & VIP Priority</div>
                  </div>

                  <div className="plan-pricing-box">
                    <div className="plan-price">₹{pass.price}</div>
                    <div className="plan-period">{pass.duration}</div>
                  </div>

                  <div className="plan-savings-tag">Instant {pass.discountPercent}% Savings On Everything</div>

                  <ul className="plan-features-list">
                    {pass.features.map((feat, i) => (
                      <li key={i} className="plan-feature-item">
                        <span className="feature-check">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`plan-cta-btn ${pass.featured ? "primary" : "secondary"}`}
                    onClick={() => handleOpenSubscribe(pass)}
                  >
                    Activate VIP Pass →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TAB 4: INTERACTIVE ESTIMATOR ══════════════ */}
        {activeTab === "calculator" && (
          <div className="calculator-card">
            <div className="calc-grid">
              {/* Left Column Controls */}
              <div className="calc-left">
                <h3>🧮 Interactive Laundry Cost Estimator</h3>
                <p>Drag the slider to your estimated weight and select add-on preferences for an instant price quote.</p>

                {/* Slider */}
                <div className="calc-control-group">
                  <div className="calc-label-row">
                    <label>Estimated Laundry Weight</label>
                    <span className="calc-highlight-val">{calcWeight} KG</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Number(e.target.value))}
                    className="calc-slider"
                  />
                  <div className="calc-slider-hint">
                    💡 {calcWeight} KG is approximately {calcWeight * 3} shirts, {calcWeight * 2} pairs of jeans, and linens.
                  </div>
                </div>

                {/* Service Type */}
                <div className="calc-control-group">
                  <div className="calc-label-row">
                    <label>Select Service Type</label>
                  </div>
                  <div className="calc-service-select">
                    <div
                      className={`calc-service-opt ${calcService === "wash_fold" ? "selected" : ""}`}
                      onClick={() => setCalcService("wash_fold")}
                    >
                      <div>🧺 Wash & Fold</div>
                      <small>₹50/kg</small>
                    </div>

                    <div
                      className={`calc-service-opt ${calcService === "wash_iron" ? "selected" : ""}`}
                      onClick={() => setCalcService("wash_iron")}
                    >
                      <div>👔 Wash & Steam Iron</div>
                      <small>₹60/kg</small>
                    </div>

                    <div
                      className={`calc-service-opt ${calcService === "dry_clean" ? "selected" : ""}`}
                      onClick={() => setCalcService("dry_clean")}
                    >
                      <div>✨ Dry Clean Care</div>
                      <small>₹120/kg</small>
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                <div className="calc-control-group">
                  <div className="calc-label-row">
                    <label>Optional Care Add-ons</label>
                  </div>
                  <div className="calc-addons-grid">
                    <label className="calc-addon-check">
                      <input
                        type="checkbox"
                        checked={calcAddons.softener}
                        onChange={(e) => setCalcAddons({ ...calcAddons, softener: e.target.checked })}
                      />
                      <span>🌸 Fabric Conditioner (+₹10/kg)</span>
                    </label>

                    <label className="calc-addon-check">
                      <input
                        type="checkbox"
                        checked={calcAddons.stainTreatment}
                        onChange={(e) => setCalcAddons({ ...calcAddons, stainTreatment: e.target.checked })}
                      />
                      <span>🛡️ Stain Treatment (+₹15/kg)</span>
                    </label>

                    <label className="calc-addon-check" style={{ gridColumn: "span 2" }}>
                      <input
                        type="checkbox"
                        checked={calcAddons.express}
                        onChange={(e) => setCalcAddons({ ...calcAddons, express: e.target.checked })}
                      />
                      <span>⚡ Express 6-Hour Turnaround (+₹40/kg)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column Summary Box */}
              <div className="calc-result-box">
                <div>
                  <div className="calc-result-header">
                    <h4>Instant Price Quote</h4>
                    <small style={{ color: "#94a3b8" }}>Real-time estimated invoice</small>
                  </div>

                  <div className="calc-result-rows">
                    <div className="calc-res-row">
                      <span>Weight ({calcWeight} KG × ₹{calcBaseRate})</span>
                      <span>₹{calcWeight * calcBaseRate}</span>
                    </div>

                    {addonsPerKg > 0 && (
                      <div className="calc-res-row">
                        <span>Add-on services</span>
                        <span>₹{calcWeight * addonsPerKg}</span>
                      </div>
                    )}

                    {calcDiscount > 0 && (
                      <div className="calc-res-row" style={{ color: "#34d399" }}>
                        <span>Bulk volume savings</span>
                        <span>-₹{calcDiscount}</span>
                      </div>
                    )}

                    <div className="calc-res-row">
                      <span>Doorstep Pickup & Delivery</span>
                      <span style={{ color: isFreeDelivery ? "#34d399" : "#ffffff", fontWeight: 700 }}>
                        {isFreeDelivery ? "FREE" : "₹30"}
                      </span>
                    </div>

                    <div className="calc-res-row highlight">
                      <span>Estimated Total:</span>
                      <span>₹{calcFinalTotal + (isFreeDelivery ? 0 : 30)}</span>
                    </div>
                  </div>

                  {isFreeDelivery && (
                    <div className="calc-free-delivery-badge">
                      <span>✓</span> Order qualifies for 100% Free Doorstep Delivery!
                    </div>
                  )}
                </div>

                <button
                  className="btn-book-estimate"
                  onClick={() => navigate("/book/1")}
                >
                  <span>Book with this Estimate →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Comparison Section ── */}
        <section className="comparison-section">
          <div className="comparison-header">
            <h3>Plan Comparison Matrix</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Find the model that fits your lifestyle</p>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Pay-As-You-Go</th>
                  <th>Monthly KG Subscriptions</th>
                  <th>VIP Membership Pass</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Pricing Model</strong></td>
                  <td>Per-item or standard ₹50–60/kg</td>
                  <td>Discounted from ₹35.9/kg</td>
                  <td>Flat 5–15% off all orders</td>
                </tr>
                <tr>
                  <td><strong>Doorstep Pickup & Drop</strong></td>
                  <td>Free above ₹199</td>
                  <td>100% Free on all pickups</td>
                  <td>Unlimited 100% Free</td>
                </tr>
                <tr>
                  <td><strong>Standard Turnaround</strong></td>
                  <td>24–48 hours</td>
                  <td>24 hours priority</td>
                  <td>Same-day & rush access</td>
                </tr>
                <tr>
                  <td><strong>Unused Quota Rollover</strong></td>
                  <td>Not applicable</td>
                  <td>Yes, rolls over monthly</td>
                  <td>Not applicable</td>
                </tr>
                <tr>
                  <td><strong>Express Wash Upgrades</strong></td>
                  <td>Paid add-on</td>
                  <td>Included in 30kg & 50kg plans</td>
                  <td>Included in Gold & Platinum</td>
                </tr>
                <tr>
                  <td><strong>Dedicated Partner Assignment</strong></td>
                  <td>Standard pool</td>
                  <td>Priority partner queue</td>
                  <td>Dedicated Top-Rated Partner</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="pricing-faq-section">
          <div className="faq-heading">
            <h3>Frequently Asked Questions</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Everything you need to know about our pricing and subscriptions</p>
          </div>

          <div className="faq-list">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <span>{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Subscription Confirmation Modal ── */}
      {modalOpen && selectedPlan && (
        <div className="sub-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Confirm Subscription</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="modal-plan-summary">
              <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "4px" }}>
                {selectedPlan.name}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "12px" }}>
                30 Days validity with rollover benefits
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2563eb" }}>
                ₹{selectedPlan.price}
              </div>
            </div>

            <div style={{ marginBottom: "14px", fontWeight: 700, fontSize: "0.9rem" }}>
              Select Payment Method:
            </div>

            <div className="modal-pay-options">
              <label className={`modal-pay-opt ${paymentMethod === "wallet" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="pay_method"
                  value="wallet"
                  checked={paymentMethod === "wallet"}
                  onChange={() => setPaymentMethod("wallet")}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>💰 In-App Wallet</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Current Balance: ₹{wallet.balance} {wallet.balance < selectedPlan.price && "(Insufficient balance)"}
                  </div>
                </div>
              </label>

              <label className={`modal-pay-opt ${paymentMethod === "cod" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="pay_method"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>💵 Pay on Doorstep Pickup (Cash / UPI)</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Pay the pickup partner when they collect your clothes
                  </div>
                </div>
              </label>
            </div>

            <button
              className="modal-submit-btn"
              onClick={handleConfirmSubscription}
              disabled={subscribing}
            >
              {subscribing ? "Activating Plan..." : `Pay ₹${selectedPlan.price} & Activate Now`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
