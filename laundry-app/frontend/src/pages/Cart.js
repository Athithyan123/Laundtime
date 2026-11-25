import React from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-inner">
          <div className="empty-cart-page">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your Cart is Empty</h2>
            <p>Browse our services and add items to get started.</p>
            <Link to="/services" className="btn-primary" style={{ marginTop: 8 }}>
              Browse Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-inner">
        <div className="cart-page-header">
          <h1>Shopping Cart</h1>
          <p>{cart.items.length} item{cart.items.length !== 1 ? "s" : ""} in your cart</p>
        </div>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items-section">
            <div className="cart-items-header">
              <h2>Cart Items</h2>
              <button onClick={clearCart} className="clear-cart-btn">Clear All</button>
            </div>

            {cart.items.map((item) => (
              <div key={item._id} className="cart-item">
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-img"
                  onError={(e) => { e.target.src = "https://via.placeholder.com/80x80?text=🧺"; }}
                />

                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="cart-item-price-unit">
                    {item.pricePerKg ? `₹${item.pricePerKg}/kg` : `₹${item.pricePerPiece}/piece`}
                  </div>
                </div>

                <div className="qty-controls">
                  <button
                    className="qty-btn"
                    onClick={() => {
                      if (item.quantity === 1) removeFromCart(item._id);
                      else updateQuantity(item._id, item.quantity - 1);
                    }}
                  >
                    −
                  </button>
                  <div className="qty-value">{item.quantity}</div>
                  <button className="qty-btn" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                    +
                  </button>
                </div>

                <div className="cart-item-total">
                  ₹{(item.pricePerKg || item.pricePerPiece) * item.quantity}
                </div>

                <button className="remove-btn" onClick={() => removeFromCart(item._id)} title="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary-card">
            <div className="summary-title">Order Summary</div>

            <div className="summary-rows">
              <div className="summary-row">
                <span>Subtotal ({cart.items.length} items)</span>
                <span className="value">₹{getCartTotal()}</span>
              </div>
              <div className="summary-row">
                <span>Pickup & Delivery</span>
                <span className="value free">FREE</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span className="value">—</span>
              </div>
            </div>

            <div className="summary-total">
              <span className="label">Total Amount</span>
              <span className="total-amount">₹{getCartTotal()}</span>
            </div>

            <button className="checkout-btn" onClick={() => navigate("/checkout")}>
              Proceed to Checkout →
            </button>
            <Link to="/services" className="continue-link">← Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}