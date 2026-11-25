import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import "./Subscription.css";

export default function Subscription() {
  const navigate = useNavigate();
  const { wallet, deductMoney } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const subscriptionPlans = [
    {
      id: 1,
      name: "🧺 Basic Plan",
      price: 299,
      duration: "month",
      savings: "Save ₹200/month",
      features: [
        "Free delivery on all orders",
        "5% discount on all services", 
        "Priority customer support",
        "2 free pickups per month",
        "Basic stain treatment"
      ],
      popular: false
    },
    {
      id: 2,
      name: "⭐ Premium Plan",
      price: 599,
      duration: "month", 
      savings: "Save ₹500/month",
      features: [
        "Free express service upgrade",
        "10% discount on all services",
        "Unlimited free pickups",
        "Dedicated account manager",
        "Premium fabric care",
        "Early access to offers"
      ],
      popular: true
    },
    {
      id: 3,
      name: "👨‍👩‍👧‍👦 Family Plan",
      price: 899,
      duration: "month",
      savings: "Save ₹800/month",
      features: [
        "Up to 4 family members",
        "15% discount on all services",
        "Weekly laundry schedule",
        "Emergency service access",
        "Premium fabric care",
        "Monthly deep cleaning"
      ],
      popular: false
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentOptions(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    if (paymentMethod === "wallet" && wallet.balance < selectedPlan.price) {
      alert(`Insufficient wallet balance! You need ₹${selectedPlan.price - wallet.balance} more.`);
      navigate("/wallet");
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      if (paymentMethod === "wallet") {
        deductMoney(selectedPlan.price, `Subscription: ${selectedPlan.name}`);
      }
      
      // Save subscription to localStorage
      const subscription = {
        plan: selectedPlan.name,
        price: selectedPlan.price,
        paymentMethod: paymentMethod,
        subscribedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        status: "active"
      };
      localStorage.setItem('laundrySubscription', JSON.stringify(subscription));
      
      alert(`🎉 Successfully subscribed to ${selectedPlan.name}!\n\n💰 ₹${selectedPlan.price} paid via ${paymentMethod}\n✅ Benefits activated immediately`);
      setShowPaymentOptions(false);
      setSelectedPlan(null);
      navigate("/dashboard");
      setLoading(false);
    }, 2000);
  };

  const currentSubscription = JSON.parse(localStorage.getItem('laundrySubscription') || 'null');

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h1>🚀 Upgrade Your Laundry Experience</h1>
        <p>Save time and money with our subscription plans</p>
        
        {currentSubscription && (
          <div className="current-subscription">
            <h3>✅ Currently subscribed to: {currentSubscription.plan}</h3>
            <p>Expires: {new Date(currentSubscription.expiresAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      <div className="plans-grid">
        {subscriptionPlans.map(plan => (
          <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">MOST POPULAR</div>}
            
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <span className="amount">₹{plan.price}</span>
                <span className="duration">/{plan.duration}</span>
              </div>
              <p className="savings">{plan.savings}</p>
            </div>

            <div className="plan-features">
              {plan.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span>✅</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handlePlanSelect(plan)}
              disabled={currentSubscription}
              className={`subscribe-btn ${plan.popular ? 'popular-btn' : ''}`}
            >
              {currentSubscription ? "Currently Active" : "Choose Plan"}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Options Modal */}
      {showPaymentOptions && selectedPlan && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-header">
              <h2>Complete Subscription</h2>
              <button 
                onClick={() => setShowPaymentOptions(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="selected-plan-summary">
              <h3>{selectedPlan.name}</h3>
              <p className="plan-price">₹{selectedPlan.price} per month</p>
            </div>

            <div className="payment-methods">
              <h4>Select Payment Method</h4>
              
              <label className="payment-option">
                <input
                  type="radio"
                  value="wallet"
                  checked={paymentMethod === "wallet"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-method-info">
                  <span className="method-name">💰 Wallet Balance</span>
                  <span className="method-balance">Available: ₹{wallet.balance}</span>
                  {wallet.balance < selectedPlan.price && (
                    <span className="insufficient-balance">
                      Insufficient balance! Need ₹{selectedPlan.price - wallet.balance} more
                    </span>
                  )}
                </div>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-method-info">
                  <span className="method-name">💳 Credit/Debit Card</span>
                  <span className="method-desc">Pay securely with your card</span>
                </div>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-method-info">
                  <span className="method-name">📱 UPI Payment</span>
                  <span className="method-desc">Instant payment with UPI</span>
                </div>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  value="netbanking"
                  checked={paymentMethod === "netbanking"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-method-info">
                  <span className="method-name">🏦 Net Banking</span>
                  <span className="method-desc">Pay via your bank account</span>
                </div>
              </label>
            </div>

            <div className="payment-actions">
              <button 
                onClick={() => setShowPaymentOptions(false)}
                className="cancel-payment"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubscribe}
                disabled={loading || (paymentMethod === "wallet" && wallet.balance < selectedPlan.price)}
                className="confirm-payment"
              >
                {loading ? "Processing..." : `Pay ₹${selectedPlan.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-benefits">
        <h2>Why Subscribe?</h2>
        <div className="benefits-grid">
          <div className="benefit">
            <span>💰</span>
            <h4>Save Money</h4>
            <p>Up to 15% discount on all services</p>
          </div>
          <div className="benefit">
            <span>⚡</span>
            <h4>Save Time</h4>
            <p>Free pickup & delivery, no scheduling needed</p>
          </div>
          <div className="benefit">
            <span>🎁</span>
            <h4>Extra Benefits</h4>
            <p>Priority support, early access to offers</p>
          </div>
          <div className="benefit">
            <span>🔒</span>
            <h4>Flexible</h4>
            <p>Cancel anytime, no commitment</p>
          </div>
        </div>
      </div>
    </div>
  );
}