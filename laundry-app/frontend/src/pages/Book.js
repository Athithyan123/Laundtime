import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWallet } from "../context/WalletContext";
import API from "../api"; // eslint-disable-line no-unused-vars
import { saveOrder } from "./Orders";
import "./Book.css";

// Static services list — defined outside component so it never changes between renders
const sampleServices = [
    {
      _id: "1",
      name: "Shirt Laundry",
      description: "Professional washing and ironing for shirts",
      pricePerKg: 60,
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=200&fit=crop",
      turnaroundHours: 24,
      category: "Clothing"
    },
    {
      _id: "2", 
      name: "Jeans & Pants",
      description: "Special care for denim and trousers",
      pricePerKg: 70,
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=200&fit=crop",
      turnaroundHours: 36,
      category: "Clothing"
    },
    {
      _id: "3",
      name: "Dry Cleaning",
      description: "Premium dry cleaning for delicate fabrics",
      pricePerKg: 120,
      image: "https://images.unsplash.com/photo-1582735689255-65d9493badc5?w=300&h=200&fit=crop",
      turnaroundHours: 48,
      category: "Premium"
    },
    {
      _id: "4",
      name: "Bed Sheets & Linens",
      description: "Fresh and clean bedding laundry",
      pricePerKg: 80,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
      turnaroundHours: 72,
      category: "Home"
    },
    {
      _id: "5",
      name: "Express Wash",
      description: "Quick 6-hour delivery service",
      pricePerKg: 100,
      image: "https://images.unsplash.com/photo-1604514628550-37477afdf4e3?w=300&h=200&fit=crop",
      turnaroundHours: 6,
      category: "Express"
    },
    {
      _id: "6",
      name: "Shoe Cleaning",
      description: "Professional shoe cleaning and polishing",
      pricePerPiece: 50,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&fit=crop",
      turnaroundHours: 24,
      category: "Special"
    },
    {
        _id: "7",
        name: "Ironing Service",
        description: "Professional ironing for all types of clothes",
        pricePerKg: 40,
        image: "https://5.imimg.com/data5/SELLER/Default/2023/10/353974717/LX/LQ/AX/126529570/steam-iron-service-250x250.jpg",
        turnaroundHours: 12,
        category: "Clothing"
      },
      {
        _id: "8",
        name: "Wash & Fold",
        description: "Basic washing and neat folding service",
        pricePerKg: 50,
        image: "https://static.wixstatic.com/media/c1b522_233b9c951cac460bb2339d5cf8df634b~mv2.jpg/v1/fill/w_280,h_175,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/admin-ajax_php.jpg",
        turnaroundHours: 24,
        category: "Basic"
      }
];

export default function Book() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { wallet, deductMoney } = useWallet();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    weight: 1,
    address: "",
    pincode: "",
    city: "",
    pickupDate: "",
    pickupTime: "",
    instructions: ""
  });
  const [bookingOption, setBookingOption] = useState("bookNow");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  useEffect(() => {
    // Find the selected service
    const selectedService = sampleServices.find(s => s._id === id);
    setService(selectedService);
    setLoading(false);

    // Set default pickup date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      pickupDate: tomorrow.toISOString().split('T')[0]
    }));

    // Actual API call
    // API.get(`/services/${id}`)
    //   .then(res => setService(res.data))
    //   .catch(err => console.error(err))
    //   .finally(() => setLoading(false));
  }, [id]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddToCart = () => {
    if (!service) return;
    
    const cartItem = {
      ...service,
      weight: formData.weight,
      pickupDate: formData.pickupDate,
      pickupTime: formData.pickupTime,
      instructions: formData.instructions
    };
    
    addToCart(cartItem);
    alert(`${service.name} added to cart!`);
    navigate("/cart");
  };

  const handleBookNow = async (e) => {
    e.preventDefault();
    
    if (!service) return;

    // Validate form
    if (!formData.address || !formData.pincode || !formData.city || !formData.pickupDate || !formData.pickupTime) {
      alert("Please fill all required fields!");
      return;
    }

    // Show payment section
    setShowPayment(true);
  };

  const handlePayment = async () => {
    try {
      const totalAmount = calculateTotal();
      
      // Check if wallet has sufficient balance
      if (paymentMethod === 'wallet' && wallet.balance < totalAmount) {
        alert(`Insufficient wallet balance! You need ₹${totalAmount - wallet.balance} more.`);
        return;
      }

      const orderData = {
        serviceId: service._id,
        serviceName: service.name,
        weight: formData.weight,
        totalPrice: totalAmount,
        totalAmount: totalAmount,
        address: formData.address,
        pincode: formData.pincode,
        city: formData.city,
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        instructions: formData.instructions,
        customerDetails: {
          address: formData.address,
          pincode: formData.pincode,
          city: formData.city,
          pickupDate: formData.pickupDate,
          pickupTime: formData.pickupTime,
          instructions: formData.instructions
        },
        paymentMethod: paymentMethod,
        status: "pending",
        orderNumber: `LAUNDRY-${Date.now()}`,
        orderDate: new Date().toISOString()
      };

      // Deduct amount from wallet if payment method is wallet
      if (paymentMethod === 'wallet') {
        deductMoney(totalAmount, `Payment for Order #${orderData.orderNumber}`);
      }

      // Save order to history and real backend
      const saved = await saveOrder(orderData);
      const trackingId = saved?.trackingId || orderData.orderNumber;
      
      // Show success message
      let successMessage = `🎉 Booking Confirmed!\n\nOrder #${trackingId}\nAmount: ₹${orderData.totalPrice}\nPayment Method: ${paymentMethod.toUpperCase()}\nPickup: ${orderData.pickupDate} at ${orderData.pickupTime}`;
      
      if (paymentMethod === 'wallet') {
        successMessage += `\n\n💰 Wallet balance: ₹${wallet.balance - totalAmount}`;
      }
      
      successMessage += `\n\nWe'll contact you before pickup!`;
      
      alert(successMessage);
      navigate("/orders");
      
    } catch (error) {
      alert("Payment failed: " + (error.response?.data?.message || "Please try again"));
    }
  };

  const calculateTotal = () => {
    if (!service) return 0;
    return service.pricePerKg ? service.pricePerKg * formData.weight : service.pricePerPiece;
  };

  if (loading) {
    return <div className="loading">Loading service details...</div>;
  }

  if (!service) {
    return <div className="error">Service not found!</div>;
  }

  return (
    <div className="book-container">
      <div className="book-grid">
        {/* Service Details */}
        <div className="service-details-card">
          <div className="service-image">
            <img src={service.image} alt={service.name} />
          </div>
          <div className="service-info">
            <h1>{service.name}</h1>
            <p className="service-description">{service.description}</p>
            
            <div className="service-pricing">
              <div className="price">
                {service.pricePerKg ? (
                  <span>₹{service.pricePerKg}/kg</span>
                ) : (
                  <span>₹{service.pricePerPiece}/piece</span>
                )}
              </div>
              <div className="delivery-time">
                ⏱ Delivery in {service.turnaroundHours} hours
              </div>
            </div>

            {/* Weight Selection */}
            {service.pricePerKg && (
              <div className="weight-selection">
                <label htmlFor="weight">Select Weight (kg):</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  min="0.1"
                  step="0.1"
                  value={formData.weight}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {/* Total Calculation */}
            <div className="total-calculation">
              <h3>Total: ₹{calculateTotal()}</h3>
              {service.pricePerKg && (
                <small>({formData.weight} kg × ₹{service.pricePerKg}/kg)</small>
              )}
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="booking-form-card">
          <h2>Booking Details</h2>
          
          {!showPayment ? (
            // Booking Form
            <form onSubmit={bookingOption === "bookNow" ? handleBookNow : (e) => { e.preventDefault(); handleAddToCart(); }}>
              {/* Address Details */}
              <div className="form-section">
                <h3>📍 Delivery Address</h3>
                
                <div className="form-group">
                  <label>Full Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    placeholder="Enter your complete address with landmark"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter pincode"
                      maxLength="6"
                    />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Schedule */}
              <div className="form-section">
                <h3>📅 Pickup Schedule</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Pickup Date *</label>
                    <input
                      type="date"
                      name="pickupDate"
                      value={formData.pickupDate}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pickup Time *</label>
                    <select
                      name="pickupTime"
                      value={formData.pickupTime}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Time Slot</option>
                      <option value="09:00-11:00">9:00 AM - 11:00 AM</option>
                      <option value="11:00-13:00">11:00 AM - 1:00 PM</option>
                      <option value="14:00-16:00">2:00 PM - 4:00 PM</option>
                      <option value="16:00-18:00">4:00 PM - 6:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="form-section">
                <h3>📝 Special Instructions</h3>
                <div className="form-group">
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Any special instructions for pickup (e.g., call before coming, leave at security, etc.)"
                  />
                </div>
              </div>

              {/* Booking Options */}
              <div className="booking-options">
                <label className="booking-option">
                  <input
                    type="radio"
                    name="bookingOption"
                    value="bookNow"
                    checked={bookingOption === "bookNow"}
                    onChange={(e) => setBookingOption(e.target.value)}
                  />
                  <span>Book Now & Pay</span>
                </label>

                <label className="booking-option">
                  <input
                    type="radio"
                    name="bookingOption"
                    value="addToCart"
                    checked={bookingOption === "addToCart"}
                    onChange={(e) => setBookingOption(e.target.value)}
                  />
                  <span>Add to Cart</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                {bookingOption === "bookNow" ? (
                  <button type="submit" className="book-now-btn">
                    Proceed to Payment - ₹{calculateTotal()}
                  </button>
                ) : (
                  <button type="submit" className="add-to-cart-btn">
                    Add to Cart - ₹{calculateTotal()}
                  </button>
                )}
                
                <button 
                  type="button" 
                  className="back-btn"
                  onClick={() => navigate("/services")}
                >
                  Back to Services
                </button>
              </div>
            </form>
          ) : (
            // Payment Section
            <div className="payment-section">
              <h3>💳 Payment Method</h3>
              
              {/* Wallet Balance Info */}
              {paymentMethod === 'wallet' && (
                <div className="wallet-balance-info">
                  <div className="balance-display">
                    <span>Available Balance: ₹{wallet.balance}</span>
                    {calculateTotal() > wallet.balance && (
                      <span className="insufficient-balance">
                        ❌ Insufficient balance. Need ₹{calculateTotal() - wallet.balance} more.
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-details">
                    <span>💳 Credit/Debit Card</span>
                    <small>Pay securely with your card</small>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === "upi"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-details">
                    <span>📱 UPI Payment</span>
                    <small>Google Pay, PhonePe, Paytm</small>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-details">
                    <span>💰 Cash on Delivery</span>
                    <small>Pay when service is delivered</small>
                  </div>
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === "wallet"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="payment-details">
                    <span>👛 Wallet</span>
                    <small>Use LaundryApp wallet (Balance: ₹{wallet.balance})</small>
                  </div>
                </label>
              </div>

              {/* Order Summary */}
              <div className="order-summary-payment">
                <h4>Order Summary</h4>
                <div className="summary-item">
                  <span>{service.name}</span>
                  <span>₹{calculateTotal()}</span>
                </div>
                <div className="summary-item">
                  <span>Delivery Charge</span>
                  <span>FREE</span>
                </div>
                <div className="summary-total">
                  <span>Total Amount</span>
                  <span>₹{calculateTotal()}</span>
                </div>
              </div>

              {/* Payment Action Buttons */}
              <div className="payment-actions">
                <button 
                  onClick={handlePayment}
                  className="confirm-payment-btn"
                  disabled={paymentMethod === 'wallet' && calculateTotal() > wallet.balance}
                >
                  {paymentMethod === 'wallet' && calculateTotal() > wallet.balance 
                    ? 'Insufficient Balance' 
                    : `Confirm Payment - ₹${calculateTotal()}`
                  }
                </button>
                <button 
                  onClick={() => setShowPayment(false)}
                  className="back-to-booking-btn"
                >
                  Back to Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
