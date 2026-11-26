import React, { useEffect, useState, useCallback } from 'react';
import API from '../api';
import '../styles/dashboard.css';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ background: color + '22' }}>{icon}</div>
      <div className="stat-info">
        <p className="stat-value">{value ?? '—'}</p>
        <p className="stat-label">{label}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

const statusColor = { pending:'#f59e0b', processing:'#3b82f6', completed:'#10b981', picked:'#8b5cf6', confirmed:'#06b6d4', cancelled:'#ef4444', delivered:'#10b981' };
const timeAgo = (d) => { const diff=(Date.now()-new Date(d))/60000; if(diff<60) return `${Math.floor(diff)}m ago`; if(diff<1440) return `${Math.floor(diff/60)}h ago`; return `${Math.floor(diff/1440)}d ago`; };

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadAll = React.useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.allSettled([
      API.get('/admin/stats'),
      API.get('/orders'),
      API.get('/partner/admin/partners'),
    ]).then(([sRes, oRes, pRes]) => {
      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      else if (!silent) setError('Could not load stats. Make sure backend is running on port 5001.');

      if (oRes.status === 'fulfilled') {
        const orders = oRes.value.data.orders || [];
        setRecent(orders.slice(0, 5));
      }
      if (pRes.status === 'fulfilled') {
        const partners = pRes.value.data.partners || [];
        setPending(partners.filter(p => p.status === 'pending').slice(0, 5));
      }
    }).finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => {
    loadAll();
    // Auto-refresh dashboard stats every 20 seconds
    const interval = setInterval(() => loadAll(true), 20000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="dashboard">
      <div className="dash-heading">
        <h2>Super Admin Dashboard</h2>
        <p>{new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {loading && <div className="dash-loading">⏳ Loading live data from database…</div>}

      {stats && (
        <div className="stats-grid">
          <StatCard icon="👤" label="Registered Customers" value={fmt(stats.totalCustomers)}    color="#8b5cf6" />
          <StatCard icon="👥" label="Total Partners"       value={fmt(stats.totalPartners)}    color="#667eea" />
          <StatCard icon="⏳" label="Pending Applications" value={fmt(stats.pendingApps)}       color="#f59e0b" sub="Needs review" />
          <StatCard icon="✅" label="Approved Partners"    value={fmt(stats.approvedPartners)}  color="#10b981" />
          <StatCard icon="📦" label="Total Orders"          value={fmt(stats.totalOrders)}       color="#3b82f6" />
          <StatCard icon="✔️"  label="Delivered Orders"    value={fmt(stats.completedOrders)}   color="#06b6d4" />
          <StatCard icon="⏳" label="Pending Orders"        value={fmt(stats.pendingOrders)}     color="#f97316" />
          <StatCard icon="💰" label="Total Revenue"         value={`₹${fmt(stats.totalRevenue)}`} color="#ec4899" />
        </div>
      )}

      {!loading && (
        <div className="dash-columns">
          {/* Recent Orders */}
          <div className="dash-panel">
            <div className="panel-header">
              <h3>🕐 Recent Orders</h3>
              <a href="/orders" className="panel-link">View All →</a>
            </div>
            {recent.length === 0 ? (
              <div className="empty-state">No orders yet. Customer books an order and it appears here.</div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Amount</th><th>When</th></tr></thead>
                  <tbody>
                    {recent.map(o => (
                      <tr key={o._id}>
                        <td><strong>{o.trackingId || o._id?.slice(-6)}</strong></td>
                        <td>{o.customerDetails?.name}</td>
                        <td><span className="status-pill" style={{background:statusColor[o.status]+'22',color:statusColor[o.status]}}>{o.status}</span></td>
                        <td>₹{o.totalAmount}</td>
                        <td className="muted">{timeAgo(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Applications */}
          <div className="dash-panel">
            <div className="panel-header">
              <h3>⏳ Pending Partner Applications</h3>
              <a href="/partners" className="panel-link">View All →</a>
            </div>
            {pending.length === 0 ? (
              <div className="empty-state">✅ No pending applications right now.</div>
            ) : (
              pending.map(p => (
                <div key={p._id} className="pending-card">
                  <div className="pending-avatar">{p.fullName?.[0] || '?'}</div>
                  <div className="pending-info">
                    <p className="pending-name">{p.fullName}</p>
                    <p className="pending-meta">{p.category} • {p.city} • {timeAgo(p.createdAt)}</p>
                  </div>
                  <a href="/partners" className="btn-review">Review</a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <a href="/customers" className="action-card purple"><span>👤</span><p>Registered Customers</p><small>{stats?.totalCustomers ?? 0} customers</small></a>
            <a href="/partners" className="action-card blue"  ><span>👥</span><p>Review Applications</p><small>{stats?.pendingApps ?? 0} pending</small></a>
            <a href="/orders"   className="action-card green" ><span>📦</span><p>Manage Orders</p><small>{stats?.pendingOrders ?? 0} pending</small></a>
            <a href="/payments" className="action-card orange"><span>💰</span><p>Process Payouts</p><small>Partner earnings</small></a>
          </div>
        </div>
      )}
    </div>
  );
}
