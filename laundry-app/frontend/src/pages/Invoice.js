import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Invoice.css";

export default function Invoice() {
  const location = useLocation();
  const navigate  = useNavigate();
  const printRef  = useRef();

  // Accept order from location state or mock
  const order = location.state?.order || {
    _id: "DEMO123",
    invoiceNumber: "INV-2025-10042",
    trackingId: "LTABC123XY",
    createdAt: new Date().toISOString(),
    customerDetails: {
      name: "Demo Customer", email: "demo@laundryapp.com", phone: "9999999999",
      address: "123 Main Street", city: "Chennai", pincode: "600001",
      pickupDate: new Date().toISOString(), pickupTime: "10:00 AM"
    },
    items: [
      { name: "Wash & Fold",  quantity: 3, pricePerKg: 60,    price: 180 },
      { name: "Iron & Press", quantity: 5, pricePerPiece: 20,  price: 100 },
    ],
    subtotal: 280, couponDiscount: 30, loyaltyDiscount: 0,
    deliveryCharge: 0, totalAmount: 250,
    paymentMethod: "upi", paymentStatus: "completed",
    status: "delivered", pointsEarned: 25,
    isExpress: false
  };

  const handlePrint = () => window.print();

  const statusColor = {
    delivered: "#059669", completed: "#059669",
    pending: "#d97706", processing: "#1a6ea8", cancelled: "#e53e3e"
  };

  return (
    <div className="invoice-wrapper">
      <div className="invoice-actions no-print">
        <button className="invoice-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <button className="invoice-print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
      </div>

      <div className="invoice-sheet" ref={printRef}>
        {/* Invoice Header */}
        <div className="invoice-top">
          <div className="invoice-brand">
            <div className="invoice-logo">🧺 LaundTime</div>
            <div className="invoice-brand-sub">Premium Garment Care</div>
            <div className="invoice-brand-contact">support@laundtime.com · +91 99999 00000</div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-title">INVOICE</div>
            <div className="invoice-num">{order.invoiceNumber || `INV-${order._id?.slice(-6).toUpperCase()}`}</div>
            <div className="invoice-date">
              Date: {new Date(order.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}
            </div>
            <div className={`invoice-status-badge`} style={{ background: statusColor[order.status] || "#6e7d8e" }}>
              {order.status?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Customer & Order Info */}
        <div className="invoice-info-grid">
          <div className="invoice-info-box">
            <div className="invoice-info-label">BILLED TO</div>
            <div className="invoice-info-name">{order.customerDetails?.name}</div>
            <div>{order.customerDetails?.email}</div>
            <div>{order.customerDetails?.phone}</div>
            <div>{order.customerDetails?.address}, {order.customerDetails?.city} - {order.customerDetails?.pincode}</div>
          </div>
          <div className="invoice-info-box">
            <div className="invoice-info-label">ORDER DETAILS</div>
            <div><strong>Tracking ID:</strong> {order.trackingId}</div>
            <div><strong>Pickup Date:</strong> {new Date(order.customerDetails?.pickupDate).toLocaleDateString("en-IN")}</div>
            <div><strong>Pickup Time:</strong> {order.customerDetails?.pickupTime || "—"}</div>
            <div><strong>Payment:</strong> {order.paymentMethod?.toUpperCase()} · {order.paymentStatus}</div>
            {order.isExpress && <div className="invoice-express-badge">⚡ Express Order</div>}
          </div>
        </div>

        {/* QR Code */}
        <div className="invoice-qr-section">
          <div className="invoice-qr-box">
            <div className="invoice-qr-placeholder">
              <div className="qr-inner">
                {/* QR pattern using CSS */}
                <div className="qr-grid">
                  {Array.from({length:49}).map((_,i) => (
                    <div key={i} className={`qr-cell ${Math.random() > 0.5 ? "filled" : ""}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="invoice-qr-label">Scan to Track Order</div>
            <div className="invoice-qr-id">{order.trackingId}</div>
          </div>
        </div>

        {/* Line Items */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="th-item">Service / Item</th>
              <th className="th-qty">Qty</th>
              <th className="th-rate">Rate</th>
              <th className="th-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, i) => {
              const rate   = item.pricePerKg || item.pricePerPiece || item.price || 0;
              const unit   = item.pricePerKg ? "per KG" : "per piece";
              const amount = item.price || rate * item.quantity;
              return (
                <tr key={i}>
                  <td className="td-item">
                    <div className="td-item-name">{item.name}</div>
                    {item.description && <div className="td-item-desc">{item.description}</div>}
                  </td>
                  <td className="td-qty">{item.quantity}</td>
                  <td className="td-rate">₹{rate} <span className="td-unit">{unit}</span></td>
                  <td className="td-amt">₹{amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span>Subtotal</span>
            <span>₹{order.subtotal || order.totalAmount}</span>
          </div>
          {order.couponDiscount > 0 && (
            <div className="invoice-total-row discount">
              <span>Coupon Discount {order.couponCode && `(${order.couponCode})`}</span>
              <span>− ₹{order.couponDiscount}</span>
            </div>
          )}
          {order.loyaltyDiscount > 0 && (
            <div className="invoice-total-row discount">
              <span>Loyalty Points Redeemed</span>
              <span>− ₹{order.loyaltyDiscount}</span>
            </div>
          )}
          <div className="invoice-total-row">
            <span>Delivery Charge</span>
            <span className="free">{order.deliveryCharge === 0 ? "FREE" : `₹${order.deliveryCharge}`}</span>
          </div>
          <div className="invoice-grand-total">
            <span>TOTAL AMOUNT</span>
            <span>₹{order.totalAmount}</span>
          </div>
          {order.pointsEarned > 0 && (
            <div className="invoice-points-note">
              ⭐ You earned {order.pointsEarned} loyalty points on this order!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="invoice-footer">
          <div className="invoice-footer-line" />
          <div className="invoice-footer-text">
            Thank you for choosing LaundTime! · This is a computer-generated invoice and does not require a signature.
          </div>
          <div className="invoice-footer-brand">LaundTime · Premium Garment Care</div>
        </div>
      </div>
    </div>
  );
}
