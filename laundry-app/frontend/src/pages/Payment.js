import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import "./Payment.css";

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { walletBalance, deductMoney } = useWallet();
  
  const [paymentData, setPaymentData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    address: "",
    city: "Chennai",
    pincode: "600001",
    phone: ""
  });
  const [pickupDetails, setPickupDetails] = useState({
    date: "",
    time: "10:00 AM - 12:00 PM",
    instructions: ""
  });

  useEffect(() => {
    if (location.state) {
      setPaymentData(location.state);
      
      // Default to wallet if sufficient balance, else cash
      if (walletBalance >= location.state.amount) {
        setSelectedMethod("wallet");
      } else {
        setSelectedMethod("cash");
      }

      // Set default pickup date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPickupDetails(prev => ({
        ...prev,
        date: tomorrow.toISOString().split('T')[0]
      }));

      // Load customer details from user profile or localStorage
      const savedCust = JSON.parse(localStorage.getItem('customerDetails') || '{}');
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setCustomerDetails({
        name:    savedCust.name || savedUser.name || "",
        phone:   savedCust.phone || savedUser.phone || "",
        address: savedCust.address || "",
        city:    savedCust.city || "Chennai",
        pincode: savedCust.pincode || "600001"
      });
    } else {
      navigate('/orders');
    }
  }, [location.state, navigate, walletBalance]);

  const handleCustomerDetailsChange = (field, value) => {
    setCustomerDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePickupDetailsChange = (field, value) => {
    setPickupDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!customerDetails.name.trim()) {
      alert("Please enter your name");
      return false;
    }
    if (!customerDetails.address.trim()) {
      alert("Please enter your address");
      return false;
    }
    if (!customerDetails.city.trim()) {
      alert("Please enter your city");
      return false;
    }
    if (!customerDetails.pincode.trim() || customerDetails.pincode.length !== 6) {
      alert("Please enter a valid 6-digit pincode");
      return false;
    }
    if (!customerDetails.phone.trim() || customerDetails.phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      return false;
    }
    if (!pickupDetails.date) {
      alert("Please select a pickup date");
      return false;
    }
    return true;
  };

  const handleWalletPayment = () => {
    if (walletBalance < paymentData.amount) {
      alert(`Insufficient wallet balance. You need ₹${paymentData.amount - walletBalance} more.`);
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);

    try {
      let paymentSuccess = false;
      let paymentMethod = selectedMethod;

      // Handle different payment methods
      switch (selectedMethod) {
        case "wallet":
          if (handleWalletPayment()) {
            deductMoney(paymentData.amount, `Payment for laundry order`);
            paymentSuccess = true;
          }
          break;

        case "card":
          // Simulate card payment
          paymentSuccess = await simulateCardPayment();
          break;

        case "upi":
          // Simulate UPI payment
          paymentSuccess = await simulateUPIPayment();
          break;

        case "cash":
          paymentSuccess = true; // Cash on delivery always succeeds
          break;

        default:
          alert("Please select a payment method");
          setIsProcessing(false);
          return;
      }

      if (paymentSuccess) {
        // Save customer details for future use
        localStorage.setItem('customerDetails', JSON.stringify(customerDetails));

        // Create and save order (to backend + localStorage fallback)
        const order = await createOrder(paymentMethod);
        
        // Show success message
        alert(`✅ Payment Successful!\n\nOrder #${order.trackingId || order.orderNumber} has been placed successfully.\n\nTotal Amount: ₹${paymentData.amount}\nPayment Method: ${getPaymentMethodText(paymentMethod)}\n\nWe'll pickup your laundry on ${pickupDetails.date} between ${pickupDetails.time}`);
        
        // Navigate to order confirmation or track order page
        navigate('/orders', { 
          state: { 
            showSuccess: true,
            orderNumber: order.trackingId || order.orderNumber,
            tab: 'history'
          } 
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateCardPayment = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        resolve(success);
      }, 2000);
    });
  };

  const simulateUPIPayment = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        resolve(success);
      }, 1500);
    });
  };

  const createOrder = async (paymentMethod) => {
    const orderPayload = {
      items: paymentData.services.map(service => ({
        name: service.name,
        quantity: service.quantity,
        unit: service.unit || 'kg',
        price: service.price,
        itemTotal: service.price * service.quantity,
      })),
      totalAmount: paymentData.amount,
      paymentMethod: paymentMethod,
      customerDetails: {
        ...customerDetails,
        pickupDate: pickupDetails.date,
        pickupTime: pickupDetails.time,
        instructions: pickupDetails.instructions,
      },
    };

    // Try posting to real backend first
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order;
      }
    } catch (err) {
      console.error('Backend order creation failed, falling back to local:', err);
    }

    // Fallback: local-only order (shown when backend is down)
    const newOrder = {
      _id: Date.now().toString(),
      orderNumber: `ORD${Date.now()}`,
      trackingId: `LT${Date.now()}`,
      items: orderPayload.items,
      totalAmount: paymentData.amount,
      discountApplied: paymentData.orderSummary?.discount || 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerDetails: orderPayload.customerDetails,
      paymentMethod: paymentMethod,
    };
    return newOrder;
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "wallet": return "Wallet";
      case "card": return "Credit/Debit Card";
      case "upi": return "UPI";
      case "cash": return "Cash on Delivery";
      default: return method;
    }
  };

  if (!paymentData) {
    return <div className="loading">Loading payment details...</div>;
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <button 
          onClick={() => navigate('/orders')}
          className="back-button"
        >
          ← Back to Orders
        </button>
        <h1>💳 Complete Your Payment</h1>
        <p>Review your order and choose payment method</p>
      </div>

      <div className="payment-layout">
        {/* Order Summary Section */}
        <div className="order-summary-section">
          <h2>Order Summary</h2>
          
          <div className="order-items-review">
            {paymentData.services.map((service, index) => (
              <div key={index} className="order-item-review">
                <div className="item-image">
                  <img src={service.image} alt={service.name} />
                </div>
                <div className="item-details">
                  <h4>{service.name}</h4>
                  <p>{service.quantity} {service.unit} × ₹{service.price}/{service.unit}</p>
                  <p className="item-total">₹{service.price * service.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal:</span>
              <span>₹{paymentData.orderSummary?.subtotal || paymentData.amount}</span>
            </div>
            
            {paymentData.orderSummary?.discount > 0 && (
              <div className="price-row discount">
                <span>
                  Subscription Discount ({paymentData.orderSummary?.discountPercentage}%):
                </span>
                <span>-₹{paymentData.orderSummary?.discount}</span>
              </div>
            )}
            
            <div className="price-row total">
              <span><strong>Total Amount:</strong></span>
              <span><strong>₹{paymentData.amount}</strong></span>
            </div>

            {paymentData.orderSummary?.discount > 0 && (
              <div className="savings-notice">
                🎉 You saved ₹{paymentData.orderSummary?.discount} with your subscription!
              </div>
            )}
          </div>
        </div>

        {/* Payment Details Section */}
        <div className="payment-details-section">
          {/* Customer Details Form */}
          <div className="form-section">
            <h3>👤 Customer Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={customerDetails.name}
                  onChange={(e) => handleCustomerDetailsChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => handleCustomerDetailsChange('phone', e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  maxLength="10"
                  required
                />
              </div>
              
              <div className="form-group full-width">
                <label>Address *</label>
                <textarea
                  value={customerDetails.address}
                  onChange={(e) => handleCustomerDetailsChange('address', e.target.value)}
                  placeholder="Enter your complete address"
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  value={customerDetails.city}
                  onChange={(e) => handleCustomerDetailsChange('city', e.target.value)}
                  placeholder="Enter your city"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  value={customerDetails.pincode}
                  onChange={(e) => handleCustomerDetailsChange('pincode', e.target.value)}
                  placeholder="Enter 6-digit pincode"
                  maxLength="6"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pickup Details Form */}
          <div className="form-section">
            <h3>📅 Pickup Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Pickup Date *</label>
                <input
                  type="date"
                  value={pickupDetails.date}
                  onChange={(e) => handlePickupDetailsChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Preferred Time Slot *</label>
                <select
                  value={pickupDetails.time}
                  onChange={(e) => handlePickupDetailsChange('time', e.target.value)}
                  required
                >
                  <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                  <option value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</option>
                  <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                  <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
                  <option value="6:00 PM - 8:00 PM">6:00 PM - 8:00 PM</option>
                </select>
              </div>
              
              <div className="form-group full-width">
                <label>Special Instructions (Optional)</label>
                <textarea
                  value={pickupDetails.instructions}
                  onChange={(e) => handlePickupDetailsChange('instructions', e.target.value)}
                  placeholder="Any special instructions for pickup..."
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="form-section">
            <h3>💰 Payment Method</h3>
            <div className="payment-methods">
              <label className={`payment-method ${selectedMethod === 'wallet' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={selectedMethod === 'wallet'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                />
                <div className="method-content">
                  <span className="method-icon">💳</span>
                  <div className="method-info">
                    <span className="method-name">Wallet</span>
                    <span className="method-balance">Balance: ₹{walletBalance}</span>
                    {selectedMethod === 'wallet' && walletBalance < paymentData.amount && (
                      <span className="insufficient-balance">
                        Insufficient balance. Need ₹{paymentData.amount - walletBalance} more.
                      </span>
                    )}
                  </div>
                </div>
              </label>

              <label className={`payment-method ${selectedMethod === 'upi' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={selectedMethod === 'upi'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                />
                <div className="method-content">
                  <span className="method-icon">📱</span>
                  <span className="method-name">UPI Payment</span>
                </div>
              </label>

              <label className={`payment-method ${selectedMethod === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={selectedMethod === 'card'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                />
                <div className="method-content">
                  <span className="method-icon">💳</span>
                  <span className="method-name">Credit/Debit Card</span>
                </div>
              </label>

              <label className={`payment-method ${selectedMethod === 'cash' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={selectedMethod === 'cash'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                />
                <div className="method-content">
                  <span className="method-icon">💵</span>
                  <span className="method-name">Cash on Delivery</span>
                </div>
              </label>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={processPayment}
            disabled={isProcessing}
            className={`pay-now-btn ${isProcessing ? 'processing' : ''}`}
          >
            {isProcessing ? (
              <>
                <div className="spinner"></div>
                Processing...
              </>
            ) : (
              `Pay Now - ₹${paymentData.amount}`
            )}
          </button>

          {selectedMethod === 'cash' && (
            <div className="cash-notice">
              💡 You'll pay ₹{paymentData.amount} in cash when we pickup your laundry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}