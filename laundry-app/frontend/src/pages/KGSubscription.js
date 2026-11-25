import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./KGSubscription.css";

const PLANS = [
  {
    id: "10kg", label: "10 KG", price: 499, original: 599,
    pricePerKg: "₹49.9/kg", tag: null,
    color: "#1a6ea8", features: ["Free pickup & delivery","Priority processing","24h turnaround","Valid 30 days"]
  },
  {
    id: "20kg", label: "20 KG", price: 899, original: 1149,
    pricePerKg: "₹44.9/kg", tag: "Popular",
    color: "#0d2137", features: ["Free pickup & delivery","Priority processing","24h turnaround","Valid 30 days","SMS updates"]
  },
  {
    id: "30kg", label: "30 KG", price: 1199, original: 1649,
    pricePerKg: "₹39.9/kg", tag: "Best Value",
    color: "#059669", features: ["Free pickup & delivery","Priority processing","24h turnaround","Valid 30 days","Dedicated support","Express (1 free/month)"]
  },
  {
    id: "50kg", label: "50 KG", price: 1799, original: 2699,
    pricePerKg: "₹35.9/kg", tag: "Premium",
    color: "#d97706", features: ["Free pickup & delivery","Priority processing","24h turnaround","Valid 30 days","Dedicated support","Express (2 free/month)","Family plan perks"]
  }
];

export default function KGSubscription() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [activeSub, setActiveSub]   = useState(null);
  const [selected, setSelected]     = useState("20kg");
  const [loading, setLoading]       = useState(false); // eslint-disable-line no-unused-vars
  const [buying, setBuying]         = useState(false);
  const [payMethod, setPayMethod]   = useState("cod");
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

  useEffect(() => {
    if (user) fetchActiveSub();
  }, [user]);

  const fetchActiveSub = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/subscriptions/mine");
      setActiveSub(data.subscription);
    } catch { setActiveSub(null); }
    finally { setLoading(false); }
  };

  const handleBuy = async () => {
    if (!user) { navigate("/login"); return; }
    setBuying(true); setError(""); setSuccess("");
    try {
      const { data } = await API.post("/subscriptions/buy", { plan: selected, paymentMethod: payMethod });
      setSuccess(data.message);
      setActiveSub(data.subscription);
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed. Please try again.");
    } finally { setBuying(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription?")) return;
    try {
      await API.put("/subscriptions/cancel");
      setActiveSub(null);
      setSuccess("Subscription cancelled.");
    } catch (err) {
      setError(err.response?.data?.message || "Cancel failed.");
    }
  };

  const selectedPlan = PLANS.find(p => p.id === selected);

  return (
    <div className="sub-page">

      {/* Header */}
      <div className="sub-header">
        <div className="sub-header-inner">
          <div className="sub-header-tag">Monthly Plans</div>
          <h1>KG Subscription Plans</h1>
          <p>Choose your monthly laundry quota — save more with bigger plans</p>
        </div>
      </div>

      <div className="sub-content">

        {/* Active Subscription Banner */}
        {activeSub && (
          <div className="active-sub-card">
            <div className="active-sub-left">
              <div className="active-sub-icon">✅</div>
              <div>
                <div className="active-sub-title">Active Plan: {activeSub.plan.toUpperCase()}</div>
                <div className="active-sub-meta">
                  <span className="kg-bar-wrap">
                    <span className="kg-bar" style={{ width: `${(activeSub.kgUsed / activeSub.kgTotal) * 100}%` }} />
                  </span>
                  <span>{activeSub.kgUsed} KG used of {activeSub.kgTotal} KG</span>
                </div>
                <div className="active-sub-renew">
                  Renews: {new Date(activeSub.renewDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                </div>
              </div>
            </div>
            <button className="cancel-sub-btn" onClick={handleCancel}>Cancel Plan</button>
          </div>
        )}

        {success && <div className="sub-success">🎉 {success}</div>}
        {error   && <div className="sub-error">⚠️ {error}</div>}

        {/* Plan Cards */}
        <div className="plans-grid">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${selected === plan.id ? "selected" : ""}`}
              onClick={() => setSelected(plan.id)}
              style={{ "--plan-color": plan.color }}
            >
              {plan.tag && <div className="plan-tag">{plan.tag}</div>}

              <div className="plan-kg-label">{plan.label}</div>
              <div className="plan-price">
                <span className="plan-price-main">₹{plan.price}</span>
                <span className="plan-price-original">₹{plan.original}</span>
                <span className="plan-price-mo">/month</span>
              </div>
              <div className="plan-per-kg">{plan.pricePerKg}</div>

              <div className="plan-savings">
                Save ₹{plan.original - plan.price}
              </div>

              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}><span className="feat-check">✓</span>{f}</li>
                ))}
              </ul>

              <div className={`plan-select-indicator ${selected === plan.id ? "active" : ""}`}>
                {selected === plan.id ? "✓ Selected" : "Select Plan"}
              </div>
            </div>
          ))}
        </div>

        {/* Payment & CTA */}
        <div className="sub-checkout">
          <div className="sub-checkout-summary">
            <div className="sub-summary-row">
              <span>Plan</span>
              <span>{selectedPlan.label} / month</span>
            </div>
            <div className="sub-summary-row">
              <span>Price per KG</span>
              <span>{selectedPlan.pricePerKg}</span>
            </div>
            <div className="sub-summary-row strike">
              <span>Original Price</span>
              <span>₹{selectedPlan.original}</span>
            </div>
            <div className="sub-summary-row green">
              <span>You Save</span>
              <span>₹{selectedPlan.original - selectedPlan.price}</span>
            </div>
            <div className="sub-summary-total">
              <span>Total</span>
              <span>₹{selectedPlan.price}</span>
            </div>
          </div>

          <div className="sub-pay-methods">
            <label className="sub-pay-label">Payment Method</label>
            <div className="pay-options">
              {[["cod","💵 Cash on Delivery"],["upi","📱 UPI"],["card","💳 Card"],["wallet","👛 Wallet"]].map(([val, label]) => (
                <button
                  key={val}
                  className={`pay-opt ${payMethod === val ? "active" : ""}`}
                  onClick={() => setPayMethod(val)}
                >{label}</button>
              ))}
            </div>
          </div>

          <button
            className="sub-buy-btn"
            onClick={handleBuy}
            disabled={buying || (activeSub?.plan === selected)}
          >
            {buying ? <><span className="btn-spin" /> Activating...</> :
             activeSub?.plan === selected ? "✓ Current Plan" :
             activeSub ? `Switch to ${selectedPlan.label}` : `Subscribe — ₹${selectedPlan.price}/mo`}
          </button>

          <p className="sub-note">
            🔒 Cancel anytime · Unused KG does not carry over · Auto-renews unless cancelled
          </p>
        </div>
      </div>
    </div>
  );
}
