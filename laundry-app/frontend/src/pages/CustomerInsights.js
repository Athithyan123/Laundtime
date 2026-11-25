import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./CustomerInsights.css";

export default function CustomerInsights() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints]   = useState(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ins, pts] = await Promise.all([
        API.get("/loyalty/insights"),
        API.get("/loyalty/balance")
      ]);
      setData(ins.data);
      setPoints(pts.data);
    } catch {
      // mock data for offline
      setData({
        monthlyData: [
          { label: "Mar '25", amount: 450,  orders: 2, kg: 8  },
          { label: "Apr '25", amount: 820,  orders: 4, kg: 16 },
          { label: "May '25", amount: 390,  orders: 1, kg: 6  },
          { label: "Jun '25", amount: 1100, orders: 5, kg: 22 },
          { label: "Jul '25", amount: 670,  orders: 3, kg: 12 },
          { label: "Aug '25", amount: 940,  orders: 4, kg: 18 },
        ],
        favouriteService: "Wash & Fold",
        totalOrders:  19,
        totalSpent:   4370,
        loyaltyPoints: 437,
        totalKg:      82,
        avgOrderValue: 230
      });
      setPoints({ points: 437, worthInRupees: 43, history: [] });
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="insights-loading">
      <div className="insights-spinner" />
      <span>Loading your insights...</span>
    </div>
  );

  const maxAmount = Math.max(...(data?.monthlyData || []).map(m => m.amount), 1);

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="insights-header">
        <div className="insights-header-inner">
          <div className="insights-header-tag">Your Analytics</div>
          <h1>Customer Insights</h1>
          <p>Track your spending, usage and loyalty rewards</p>
        </div>
      </div>

      <div className="insights-content">

        {/* Stat cards */}
        <div className="insights-stats">
          {[
            { icon: "📦", label: "Total Orders",     value: data.totalOrders,              sub: "All time" },
            { icon: "💰", label: "Total Spent",       value: `₹${data.totalSpent}`,         sub: "All orders" },
            { icon: "⚖️", label: "Total KG Washed",  value: `${data.totalKg} KG`,           sub: "Lifetime" },
            { icon: "📊", label: "Avg Order Value",   value: `₹${data.avgOrderValue}`,       sub: "Per order" },
            { icon: "⭐", label: "Loyalty Points",    value: data.loyaltyPoints,             sub: `= ₹${points?.worthInRupees || 0} off` },
            { icon: "❤️", label: "Favourite Service", value: data.favouriteService,          sub: "Most ordered" },
          ].map((s, i) => (
            <div key={i} className="insight-stat-card">
              <div className="insight-stat-icon">{s.icon}</div>
              <div className="insight-stat-value">{s.value}</div>
              <div className="insight-stat-label">{s.label}</div>
              <div className="insight-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly spending chart */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3>Monthly Spending</h3>
            <span className="insights-card-sub">Last 6 months</span>
          </div>
          <div className="spending-chart">
            {data.monthlyData.map((m, i) => (
              <div key={i} className="chart-bar-wrap">
                <div className="chart-bar-amount">₹{m.amount}</div>
                <div className="chart-bar-outer">
                  <div
                    className="chart-bar-fill"
                    style={{ height: `${(m.amount / maxAmount) * 100}%` }}
                    title={`₹${m.amount} — ${m.orders} orders`}
                  />
                </div>
                <div className="chart-bar-label">{m.label}</div>
                <div className="chart-bar-orders">{m.orders} orders</div>
              </div>
            ))}
          </div>
        </div>

        {/* KG usage per month */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3>KG Washed Per Month</h3>
            <span className="insights-card-sub">Laundry volume</span>
          </div>
          <div className="kg-bars">
            {data.monthlyData.map((m, i) => {
              const maxKg = Math.max(...data.monthlyData.map(x => x.kg), 1);
              return (
                <div key={i} className="kg-bar-row">
                  <div className="kg-bar-label-left">{m.label}</div>
                  <div className="kg-bar-track">
                    <div className="kg-bar-fill" style={{ width: `${(m.kg / maxKg) * 100}%` }} />
                  </div>
                  <div className="kg-bar-value">{m.kg} KG</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loyalty points history */}
        <div className="insights-card">
          <div className="insights-card-header">
            <h3>Loyalty Points History</h3>
            <button className="insights-redeem-btn" onClick={() => navigate("/checkout")}>
              Redeem Points
            </button>
          </div>
          <div className="points-balance-big">
            <div className="pts-num">{data.loyaltyPoints}</div>
            <div className="pts-label">Points = ₹{points?.worthInRupees || 0} discount</div>
          </div>
          {points?.history?.length === 0 && (
            <p className="insights-empty">No points history yet. Complete an order to earn points!</p>
          )}
          {points?.history?.map((h, i) => (
            <div key={i} className={`pts-row ${h.action}`}>
              <span className="pts-row-icon">{h.action === "earned" ? "⬆️" : "⬇️"}</span>
              <span className="pts-row-action">{h.action === "earned" ? "Earned" : "Redeemed"}</span>
              <span className="pts-row-pts">{h.action === "earned" ? "+" : "-"}{Math.abs(h.points)} pts</span>
              <span className="pts-row-date">{new Date(h.date).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
