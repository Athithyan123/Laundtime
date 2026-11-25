import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./TrackOrder.css";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",       desc: "Order received by LaundTime",           icon: "📝" },
  { key: "confirmed",  label: "Order Confirmed",    desc: "Partner assigned & pickup scheduled",   icon: "✔️" },
  { key: "picked",     label: "Clothes Picked Up",  desc: "Partner collected your laundry",        icon: "📦" },
  { key: "processing", label: "Washing & Care",     desc: "Garments being washed & sanitized",      icon: "🔄" },
  { key: "ready",      label: "Ready for Delivery", desc: "Cleaned, ironed & packed for dispatch",  icon: "🎯" },
  { key: "delivered",  label: "Delivered",          desc: "Delivered safely to your doorstep",     icon: "🏠" },
];

const STATUS_ORDER = ["pending", "confirmed", "picked", "processing", "ready", "delivered"];

export default function TrackOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Fetch real order from backend ──────────────────────────────────────────
  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/orders/track/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
          setLastRefreshed(new Date());
          setError("");
          return;
        }
      }
      // Fallback: check localStorage
      const saved = JSON.parse(localStorage.getItem("laundryOrders") || "[]");
      const local = saved.find(o => o._id === orderId || o.trackingId === orderId || o.orderNumber === orderId);
      if (local) {
        setOrder(local);
        setError("");
      } else {
        setError("Order not found. Please check your tracking ID.");
      }
    } catch {
      // Local fallback on network error
      const saved = JSON.parse(localStorage.getItem("laundryOrders") || "[]");
      const local = saved.find(o => o._id === orderId || o.trackingId === orderId || o.orderNumber === orderId);
      if (local) {
        setOrder(local);
        setError("");
      } else {
        setError("Could not connect to tracking server. Please try again.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    // Auto-poll every 5 seconds for real-time status & partner assignment updates
    const interval = setInterval(() => fetchOrder(true), 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const currentStatus = order?.status || "pending";
  const currentStepIndex = STATUS_ORDER.indexOf(currentStatus);

  // ── Determine active real partner for current phase ───────────────────────
  const getActivePartner = () => {
    if (!order) return null;
    if (["ready", "delivered"].includes(currentStatus)) {
      if (order.deliveryPartner) return { ...order.deliveryPartner, roleTitle: "Delivery Partner", roleIcon: "📦" };
      if (order.pickupPartner) return { ...order.pickupPartner, roleTitle: "Delivery Partner", roleIcon: "📦" };
    }
    if (currentStatus === "processing") {
      if (order.washingPartner) return { ...order.washingPartner, roleTitle: "Washing Partner", roleIcon: "🧺" };
      if (order.pickupPartner) return { ...order.pickupPartner, roleTitle: "Pickup & Care Partner", roleIcon: "🚗" };
    }
    if (order.pickupPartner) {
      return { ...order.pickupPartner, roleTitle: "Pickup Partner", roleIcon: "🚗" };
    }
    return null;
  };

  const activePartner = getActivePartner();

  // Helper for timeline step time
  const getStepTime = (stepKey) => {
    if (!order?.statusHistory) return null;
    const historyEntry = order.statusHistory.find(h => h.status === stepKey);
    if (historyEntry?.timestamp) {
      return new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return null;
  };

  if (loading) {
    return (
      <div className="track-order-container">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h2>⏳ Loading Live Tracking...</h2>
          <p style={{ color: "#666" }}>Connecting to real-time dispatch network...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="track-order-container">
        <div className="error-state">
          <h2>Order Not Found</h2>
          <p>{error || "We couldn't locate this order."}</p>
          <button onClick={() => navigate("/orders")} className="back-btn">
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const trackingNumber = order.trackingId || order.orderNumber || order._id?.slice(-8);

  return (
    <div className="track-order-container">
      {/* Header */}
      <div className="track-header">
        <button onClick={() => navigate("/orders")} className="back-btn">
          ← Back to Orders
        </button>
        <div>
          <h1>Live Order Tracking</h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: "0.85rem" }}>
            Real-time status · {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : "Live"}
          </p>
        </div>
        <div className="order-info">
          <strong style={{ fontSize: "1.1rem", color: "#232f3e" }}>#{trackingNumber}</strong>
          <span>Placed on {new Date(order.createdAt || order.orderDate || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      <div className="track-content">
        {/* Left: Status Timeline & Real Partner Info */}
        <div className="status-section">
          <h2>Order Progress</h2>

          <div className="status-timeline">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = currentStepIndex >= index;
              const isCurrent = currentStepIndex === index;
              const stepTime = getStepTime(step.key);

              return (
                <div
                  key={step.key}
                  className={`timeline-item ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-marker">
                    <div
                      className="marker"
                      style={{
                        backgroundColor: isCompleted ? "#10b981" : "#e5e7eb",
                        color: isCompleted ? "#ffffff" : "#6b7280"
                      }}
                    >
                      {isCompleted ? "✓" : step.icon}
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className="timeline-line"
                        style={{ backgroundColor: currentStepIndex > index ? "#10b981" : "#e5e7eb" }}
                      />
                    )}
                  </div>
                  <div className="timeline-content">
                    <h4 style={{ margin: "0 0 2px", color: isCompleted ? "#111827" : "#6b7280" }}>
                      {step.label}
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280" }}>
                      {step.desc}
                    </p>
                    {stepTime && (
                      <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
                        {stepTime}
                      </span>
                    )}
                    {isCurrent && (
                      <div className="current-status-badge" style={{ marginTop: "4px" }}>
                        ● In Progress
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── REAL PARTNER INFORMATION CARD ── */}
          <div className="driver-info">
            <h3>{activePartner ? `${activePartner.roleIcon} ${activePartner.roleTitle}` : "🚗 Assigned Partner"}</h3>

            {activePartner ? (
              <>
                <div className="driver-details">
                  <div className="driver-avatar">
                    {activePartner.fullName
                      ? activePartner.fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                      : "P"}
                  </div>
                  <div className="driver-text">
                    <strong style={{ fontSize: "1.05rem" }}>{activePartner.fullName}</strong>
                    <p style={{ color: "#10b981", fontWeight: 600 }}>
                      ✔ Verified LaundTime Partner ({activePartner.category?.toUpperCase()})
                    </p>
                    <p>📞 {activePartner.mobile || "Mobile available upon call"}</p>
                    {activePartner.city && (
                      <p style={{ color: "#6b7280" }}>📍 Service Area: {activePartner.serviceArea || activePartner.city}</p>
                    )}
                  </div>
                </div>

                {activePartner.mobile && (
                  <a
                    href={`tel:${activePartner.mobile}`}
                    className="call-driver-btn"
                    style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                  >
                    📞 Call {activePartner.fullName.split(" ")[0]} ({activePartner.mobile})
                  </a>
                )}
              </>
            ) : (
              <div style={{ padding: "10px 0", color: "#6b7280" }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#f59e0b" }}>
                  ⏳ Finding nearest partner...
                </p>
                <small>A verified LaundTime partner will be assigned to your order shortly.</small>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map & Order Details */}
        <div className="map-section">
          {/* Simulated Live Location Tracking */}
          <div className="map-container">
            <div className="map-header">
              <h3>📍 Live Route Map</h3>
              <span className="eta" style={{ background: "#667eea", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600 }}>
                {currentStatus === "delivered" ? "Delivered ✅" : currentStatus === "ready" ? "Out for Delivery" : currentStatus === "picked" ? "En Route to Hub" : "Active"}
              </span>
            </div>

            <div className="simulated-map">
              <div className="map-background">
                <div className="road horizontal road-1"></div>
                <div className="road vertical road-2"></div>
                <div className="road horizontal road-3"></div>

                <div className="landmark your-location">
                  <div className="landmark-icon">🏠</div>
                  <span>{order.customerDetails?.city || "Your Address"}</span>
                </div>

                <div className="landmark laundry-shop">
                  <div className="landmark-icon">🧺</div>
                  <span>LaundTime Hub</span>
                </div>

                {/* Driver marker */}
                <div className="driver-marker" style={{ left: "55%", top: "45%" }}>
                  <div className="driver-pulse"></div>
                  <div className="driver-icon">
                    {["ready", "delivered"].includes(currentStatus) ? "📦" : "🚗"}
                  </div>
                </div>

                <div className="route-line"></div>
              </div>
            </div>

            <div className="map-legend">
              <div className="legend-item">
                <div className="legend-color your-location-marker"></div>
                <span>Your Location</span>
              </div>
              <div className="legend-item">
                <div className="legend-color driver-marker-legend"></div>
                <span>{activePartner ? activePartner.fullName : "Partner"}</span>
              </div>
              <div className="legend-item">
                <div className="legend-color shop-marker"></div>
                <span>LaundTime Facility</span>
              </div>
            </div>
          </div>

          {/* Real Order Details */}
          <div className="order-details-card">
            <h3>Order Details</h3>

            <div className="detail-row">
              <span>Items / Service:</span>
              <strong>
                {(order.items || []).map(i => `${i.name} ×${i.quantity || 1}`).join(", ") || "Laundry Service"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Pickup Schedule:</span>
              <span>
                {order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : "Scheduled"}
                {order.customerDetails?.pickupTime ? ` · ${order.customerDetails.pickupTime}` : ""}
              </span>
            </div>

            <div className="detail-row">
              <span>Delivery Address:</span>
              <span>{order.customerDetails?.address}, {order.customerDetails?.city} {order.customerDetails?.pincode}</span>
            </div>

            <div className="detail-row">
              <span>Payment:</span>
              <span>{(order.paymentMethod || "COD").toUpperCase()}</span>
            </div>

            <div className="detail-row">
              <span>Total Amount:</span>
              <span className="amount">₹{order.totalAmount}</span>
            </div>

            {order.customerDetails?.instructions && (
              <div className="instructions">
                <strong>Customer Note:</strong>
                <p>{order.customerDetails.instructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Live Activity Feed */}
      <div className="live-updates">
        <div className="update-indicator">
          <div className="pulse"></div>
          <span>Real-Time Activity Log</span>
        </div>

        <div className="updates-feed">
          {order.statusHistory && order.statusHistory.length > 0 ? (
            [...order.statusHistory].reverse().map((entry, idx) => (
              <div key={idx} className="update-item">
                <span className="update-time">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
                </span>
                <span className="update-text">
                  <strong style={{ textTransform: "capitalize" }}>{entry.status}</strong>: {entry.note || `Order status updated to ${entry.status}`}
                </span>
              </div>
            ))
          ) : (
            <div className="update-item">
              <span className="update-time">Just now</span>
              <span className="update-text">Order registered in LaundTime system.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}