import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWallet } from "../context/WalletContext";
import API from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const { cart } = useCart();
  const { walletBalance } = useWallet();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await API.get("/orders/myorders", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(data.orders || []);
      } catch {
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusClass = (s) => {
    const m = { pending: "status-pending", picked: "status-picked", processing: "status-processing", completed: "status-completed", cancelled: "status-cancelled" };
    return m[s] || "status-pending";
  };

  const totalSpent = orders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-greeting">Welcome back</div>
          <h1>Hello, {user?.name?.split(" ")[0] || "Guest"} 👋</h1>
          <p>Here's what's happening with your laundry today.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon">📦</div>
            <div className="stat-card-value">{orders.length}</div>
            <div className="stat-card-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">⏳</div>
            <div className="stat-card-value">{orders.filter(o => ["pending","picked","processing"].includes(o.status)).length}</div>
            <div className="stat-card-label">Active Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">✅</div>
            <div className="stat-card-value">{orders.filter(o => o.status === "completed").length}</div>
            <div className="stat-card-label">Completed</div>
            <div className="stat-card-sub">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">💰</div>
            <div className="stat-card-value">₹{totalSpent}</div>
            <div className="stat-card-label">Total Spent</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="dashboard-grid">
          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3>Recent Orders</h3>
              <Link to="/orders" className="section-link">View All →</Link>
            </div>

            {loadingOrders ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--gray-400)" }}>
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--gray-400)" }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📦</div>
                <p style={{ marginBottom: 16 }}>No orders yet. Book your first wash!</p>
                <button className="btn-primary" onClick={() => navigate("/services")} style={{ margin: "0 auto" }}>
                  Book a Service
                </button>
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div 
                  key={order._id} 
                  className="recent-order-item" 
                  onClick={() => navigate(`/track/${order.trackingId || order._id}`)}
                  style={{ cursor: "pointer" }}
                  title="Click to track order"
                >
                  <div className="order-item-info">
                    <h4>Order #{order.trackingId || order._id?.slice(-6)?.toUpperCase()}</h4>
                    <p>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="order-item-right">
                    <div className="order-amount">₹{order.totalAmount}</div>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Wallet */}
            <div className="wallet-card">
              <div className="wallet-info">
                <div className="wallet-label">Wallet Balance</div>
                <div className="wallet-balance">₹{walletBalance || 0}</div>
              </div>
              <button className="wallet-add-btn" onClick={() => navigate("/wallet")}>
                + Add Money
              </button>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
              <div className="section-header"><h3>Quick Actions</h3></div>
              <div className="quick-actions">
                <Link to="/services" className="quick-action-btn">
                  <div className="qa-icon blue">🧺</div>
                  <div>
                    <div className="qa-label">Book a Service</div>
                    <div className="qa-sub">Schedule pickup</div>
                  </div>
                </Link>
                <Link to="/orders" className="quick-action-btn">
                  <div className="qa-icon navy">📦</div>
                  <div>
                    <div className="qa-label">Track Orders</div>
                    <div className="qa-sub">{orders.filter(o => o.status !== "completed").length} active</div>
                  </div>
                </Link>
                <Link to="/cart" className="quick-action-btn">
                  <div className="qa-icon green">🛒</div>
                  <div>
                    <div className="qa-label">My Cart</div>
                    <div className="qa-sub">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""}</div>
                  </div>
                </Link>
                <Link to="/profile" className="quick-action-btn">
                  <div className="qa-icon orange">👤</div>
                  <div>
                    <div className="qa-label">My Profile</div>
                    <div className="qa-sub">Edit details</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}