import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Checkout.css";

export default function Checkout() {
  const { cart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    pickupDate: "",
    pickupTime: "",
    instructions: ""
  });

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvv: ""
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCardChange = (e) => {
    let value = e.target.value.replace(/\s/g, "");
    
    if (e.target.name === "cardNumber") {
      value = value.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    } else if (e.target.name === "expiryDate") {
      value = value.replace(/(\d{2})(?=\d)/, "$1/").trim();
    } else if (e.target.name === "cvv") {
      value = value.slice(0, 4);
    }

    setCardData({
      ...cardData,
      [e.target.name]: value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Phone number must be 10 digits";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }
    if (!formData.pickupDate) {
      newErrors.pickupDate = "Pickup date is required";
    }
    if (!formData.pickupTime) {
      newErrors.pickupTime = "Pickup time is required";
    }

    if (paymentMethod === "card") {
      if (!cardData.cardholderName.trim()) {
        newErrors.cardholderName = "Cardholder name is required";
      }
      if (!cardData.cardNumber.trim()) {
        newErrors.cardNumber = "Card number is required";
      } else if (!/^\d{16}/.test(cardData.cardNumber.replace(/\s/g, ""))) {
        newErrors.cardNumber = "Card number must be 16 digits";
      }
      if (!cardData.expiryDate.trim()) {
        newErrors.expiryDate = "Expiry date is required";
      } else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
        newErrors.expiryDate = "Expiry date must be MM/YY format";
      }
      if (!cardData.cvv.trim()) {
        newErrors.cvv = "CVV is required";
      } else if (!/^\d{3,4}$/.test(cardData.cvv)) {
        newErrors.cvv = "CVV must be 3-4 digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors above before proceeding");
      return;
    }

    if (cart.items.length === 0) {
      setError("Your cart is empty!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderData = {
        items: cart.items,
        totalAmount: getCartTotal(),
        customerDetails: formData,
        paymentMethod: paymentMethod === 'cash' ? 'cod' : paymentMethod,
        status: "pending",
        createdAt: new Date().toISOString()
      };

      const res = await API.post("/orders", orderData);
      const placedOrder = res.data?.order || { ...orderData, orderNumber: `ORD${Date.now()}` };

      // Cache locally for instant Order History update
      try {
        const laundryOrders = JSON.parse(localStorage.getItem('laundryOrders') || '[]');
        laundryOrders.unshift(placedOrder);
        localStorage.setItem('laundryOrders', JSON.stringify(laundryOrders.slice(0, 50)));
      } catch (e) {}

      setSuccess("✅ Order placed successfully!");
      
      setTimeout(() => {
        clearCart();
        navigate("/orders", { 
          state: { 
            showSuccess: true, 
            orderNumber: placedOrder.trackingId || placedOrder.orderNumber || placedOrder._id 
          } 
        });
      }, 1200);
      
    } catch (error) {
      console.error("Order error:", error);
      
      const placedOrder = {
        _id: Date.now().toString(),
        orderNumber: `ORD${Date.now()}`,
        trackingId: `LT${Date.now()}`,
        items: cart.items,
        totalAmount: getCartTotal(),
        customerDetails: formData,
        paymentMethod: paymentMethod === 'cash' ? 'cod' : paymentMethod,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      const laundryOrders = JSON.parse(localStorage.getItem('laundryOrders') || '[]');
      laundryOrders.unshift(placedOrder);
      localStorage.setItem('laundryOrders', JSON.stringify(laundryOrders.slice(0, 50)));
      
      setSuccess("✅ Order saved locally!");
      
      setTimeout(() => {
        clearCart();
        navigate("/orders", { 
          state: { 
            showSuccess: true, 
            orderNumber: placedOrder.trackingId || placedOrder.orderNumber 
          } 
        });
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>🧺 Complete Your Order</h1>
        <p>Review your details and payment information</p>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-alert">
          {success}
        </div>
      )}

      <div className="checkout-grid">
        {/* Customer Details Form */}
        <div className="checkout-form">
          <h2>Delivery Details</h2>
          
          <form onSubmit={handlePlaceOrder}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? "input-error" : ""}
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? "input-error" : ""}
                  required
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? "input-error" : ""}
                required
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={errors.address ? "input-error" : ""}
                required
                rows="3"
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className={errors.pincode ? "input-error" : ""}
                  required
                />
                {errors.pincode && <span className="error-text">{errors.pincode}</span>}
              </div>
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={errors.city ? "input-error" : ""}
                  required
                />
                {errors.city && <span className="error-text">{errors.city}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pickup Date *</label>
                <input
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                  className={errors.pickupDate ? "input-error" : ""}
                  required
                />
                {errors.pickupDate && <span className="error-text">{errors.pickupDate}</span>}
              </div>
              <div className="form-group">
                <label>Pickup Time *</label>
                <select
                  name="pickupTime"
                  value={formData.pickupTime}
                  onChange={handleInputChange}
                  className={errors.pickupTime ? "input-error" : ""}
                  required
                >
                  <option value="">Select Time</option>
                  <option value="09:00-11:00">9:00 AM - 11:00 AM</option>
                  <option value="11:00-13:00">11:00 AM - 1:00 PM</option>
                  <option value="14:00-16:00">2:00 PM - 4:00 PM</option>
                  <option value="16:00-18:00">4:00 PM - 6:00 PM</option>
                </select>
                {errors.pickupTime && <span className="error-text">{errors.pickupTime}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Special Instructions (Optional)</label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                rows="2"
                placeholder="Any special instructions for pickup..."
              />
            </div>

            <h3>💰 Payment Method</h3>
            <div className="payment-methods">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>💳 Credit/Debit Card</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>📱 UPI Payment</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>💵 Cash on Delivery</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={paymentMethod === "wallet"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>👝 Wallet</span>
              </label>
            </div>

            {paymentMethod === "card" && (
              <div className="card-payment-section">
                <h3>🎯 Card Details</h3>
                <div className="card-container">
                  <div className="card-display">
                    <div className="card-chip">💳</div>
                    <div className="card-number-display">
                      {cardData.cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="card-footer">
                      <span className="card-name">
                        {cardData.cardholderName || "CARDHOLDER NAME"}
                      </span>
                      <span className="card-expiry">
                        {cardData.expiryDate || "MM/YY"}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Cardholder Name *</label>
                    <input
                      type="text"
                      name="cardholderName"
                      value={cardData.cardholderName}
                      onChange={handleCardChange}
                      className={errors.cardholderName ? "input-error" : ""}
                      placeholder="Enter cardholder name"
                      required
                    />
                    {errors.cardholderName && <span className="error-text">{errors.cardholderName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Card Number *</label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={cardData.cardNumber}
                      onChange={handleCardChange}
                      className={errors.cardNumber ? "input-error" : ""}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                    {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date *</label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={cardData.expiryDate}
                        onChange={handleCardChange}
                        className={errors.expiryDate ? "input-error" : ""}
                        placeholder="MM/YY"
                        maxLength="5"
                        required
                      />
                      {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
                    </div>
                    <div className="form-group">
                      <label>CVV *</label>
                      <input
                        type="text"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleCardChange}
                        className={errors.cvv ? "input-error" : ""}
                        placeholder="123"
                        maxLength="4"
                        required
                      />
                      {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="place-order-btn"
              disabled={loading || cart.items.length === 0}
            >
              {loading ? "Placing Order..." : `Place Order - ₹${getCartTotal()}`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="summary-items">
            {cart.items.map(item => (
              <div key={item._id} className="summary-item">
                <img src={item.image} alt={item.name} />
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>Qty: {item.quantity}</p>
                </div>
                <div className="item-price">
                  ₹{(item.pricePerKg || item.pricePerPiece) * item.quantity}
                </div>
              </div>
            ))}
          </div>
          
          <div className="summary-total">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{getCartTotal()}</span>
            </div>
            <div className="total-row">
              <span>Delivery:</span>
              <span>FREE</span>
            </div>
            <div className="total-row final">
              <span>Total:</span>
              <span>₹{getCartTotal()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}