import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./RiderPanel.css";

const STATUS_STEPS = ["confirmed","picked","processing","ready","delivered"];

export default function RiderPanel() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab]         = useState("assigned");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [msg, setMsg]         = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!["rider","admin"].includes(user.role)) { navigate("/dashboard"); return; }
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([
        API.get("/rider/assigned"),
        API.get("/rider/history")
      ]);
      setOrders(a.data.orders || []);
      setHistory(h.data.orders || []);
    } catch {
      setOrders([]);
      setHistory([]);
    } finally { setLoading(false); }
  };

  const handleAction = async (orderId, action) => {
    setUpdating(orderId); setMsg("");
    try {
      await API.put(`/rider/${action}/${orderId}`, {});
      setMsg(`Order ${action === "pickup" ? "picked up" : "delivered"} successfully!`);
      fetchOrders();
    } catch (err) {
      // Offline: update locally
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, status: action === "pickup" ? "picked" : "delivered" } : o
      ));
      setMsg(`Marked as ${action === "pickup" ? "picked" : "delivered"} (offline mode)`);
    } finally { setUpdating(null); }
  };

  const statusBadge = (s) => {
    const map = { confirmed:"🔵 Confirmed", picked:"🟡 Picked Up", processing:"🟠 Processing", ready:"🟢 Ready", delivered:"✅ Delivered" };
    return map[s] || s;
  };

  const showOrders = tab === "assigned" ? orders : history;

  return (
    <div className="rider-page">
      {/* Header */}
      <div className="rider-header">
        <div className="rider-header-inner">
          <div className="rider-avatar">🚴</div>
          <div>
            <h1>Rider Panel</h1>
            <p>Welcome, {user?.name} · {orders.length} active assignment{orders.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <div className="rider-content">
        {msg && <div className="rider-msg">{msg}</div>}

        {/* Tabs */}
        <div className="rider-tabs">
          <button className={`rider-tab ${tab === "assigned" ? "active" : ""}`} onClick={() => setTab("assigned")}>
            📋 Assigned ({orders.length})
          </button>
          <button className={`rider-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            🕐 History ({history.length})
          </button>
        </div>

        {loading ? (
          <div className="rider-loading"><div className="rider-spinner"/><span>Loading orders...</span></div>
        ) : showOrders.length === 0 ? (
          <div className="rider-empty">
            <div className="rider-empty-icon">{tab === "assigned" ? "🎉" : "📭"}</div>
            <h3>{tab === "assigned" ? "No active assignments!" : "No history yet"}</h3>
            <p>{tab === "assigned" ? "All caught up. Check back soon." : "Completed deliveries will appear here."}</p>
          </div>
        ) : (
          <div className="rider-orders">
            {showOrders.map(order => (
              <div key={order._id} className="rider-order-card">
                <div className="rider-order-header">
                  <div>
                    <div className="rider-order-id">#{order.trackingId || order._id?.slice(-6).toUpperCase()}</div>
                    <div className="rider-order-customer">{order.customerDetails?.name}</div>
                  </div>
                  <div className={`rider-status-badge status-${order.status}`}>{statusBadge(order.status)}</div>
                </div>

                {/* Progress bar */}
                <div className="rider-progress">
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s} className={`rider-step ${STATUS_STEPS.indexOf(order.status) >= i ? "done" : ""}`}>
                      <div className="rider-step-dot" />
                      {i < STATUS_STEPS.length - 1 && <div className="rider-step-line" />}
                    </div>
                  ))}
                </div>

                <div className="rider-order-body">
                  {/* Address */}
                  <div className="rider-info-row">
                    <span className="rider-info-icon">📍</span>
                    <span>{order.customerDetails?.address}</span>
                  </div>
                  <div className="rider-info-row">
                    <span className="rider-info-icon">📞</span>
                    <a href={`tel:${order.customerDetails?.phone}`} className="rider-phone">
                      {order.customerDetails?.phone}
                    </a>
                  </div>
                  <div className="rider-info-row">
                    <span className="rider-info-icon">🕐</span>
                    <span>
                      {new Date(order.customerDetails?.pickupDate).toLocaleDateString("en-IN")}
                      {order.customerDetails?.pickupTime && ` · ${order.customerDetails.pickupTime}`}
                    </span>
                  </div>
                  <div className="rider-info-row">
                    <span className="rider-info-icon">🧺</span>
                    <span>{order.items?.map(i => `${i.name} ×${i.quantity}`).join(", ")}</span>
                  </div>
                  <div className="rider-info-row">
                    <span className="rider-info-icon">💰</span>
                    <span className="rider-amount">₹{order.totalAmount}</span>
                  </div>
                </div>

                {/* Action buttons */}
                {tab === "assigned" && (
                  <div className="rider-actions">
                    {order.status === "confirmed" && (
                      <button
                        className="rider-action-btn pickup"
                        disabled={updating === order._id}
                        onClick={() => handleAction(order._id, "pickup")}
                      >
                        {updating === order._id ? "..." : "📦 Mark as Picked Up"}
                      </button>
                    )}
                    {order.status === "ready" && (
                      <button
                        className="rider-action-btn deliver"
                        disabled={updating === order._id}
                        onClick={() => handleAction(order._id, "deliver")}
                      >
                        {updating === order._id ? "..." : "✅ Mark as Delivered"}
                      </button>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(order.customerDetails?.address || "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rider-action-btn navigate"
                    >
                      🗺 Navigate
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
