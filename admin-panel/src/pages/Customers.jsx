import React, { useEffect, useState, useCallback } from 'react';
import API from '../api';
import '../styles/customers.css';

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const statusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'completed': return { bg: '#d1fae5', text: '#065f46', label: 'Delivered' };
    case 'picked': return { bg: '#ede9fe', text: '#5b21b6', label: 'Picked Up' };
    case 'processing': return { bg: '#dbeafe', text: '#1e40af', label: 'Washing' };
    case 'confirmed': return { bg: '#e0f2fe', text: '#0369a1', label: 'Confirmed' };
    case 'pending': return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
    case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' };
    default: return { bg: '#f3f4f6', text: '#6b7280', label: 'No orders' };
  }
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'zero'
  const [selectedCust, setSelectedCust] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchCustomers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await API.get('/users/customers');
      const list = res.data?.customers || (Array.isArray(res.data) ? res.data : []);
      setCustomers(list);
      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      if (!silent) {
        setError(err.response?.data?.message || 'Failed to load customer registration records.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    const interval = setInterval(() => fetchCustomers(true), 20000);
    return () => clearInterval(interval);
  }, [fetchCustomers]);

  // Derived statistics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.totalOrders > 0).length;
  const totalOrdersPlaced = customers.reduce((acc, c) => acc + (c.totalOrders || 0), 0);
  const totalCustomerSpend = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  // Filtered list
  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filter === 'active') return c.totalOrders > 0;
    if (filter === 'zero') return c.totalOrders === 0;
    return true;
  });

  return (
    <div className="customers-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2>👤 Customer Registrations</h2>
          <p>Real-time list of registered customer accounts, profiles, addresses, and order records</p>
        </div>
        <div className="cust-header-meta">
          {lastSync && (
            <span className="sync-time">
              Last synced: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-refresh" onClick={() => fetchCustomers(false)} disabled={loading}>
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── Key Metrics Cards ── */}
      <div className="cust-stats-grid">
        <div className="cust-stat-card" style={{ borderLeftColor: '#667eea' }}>
          <div className="cust-stat-icon" style={{ background: '#ede9fe', color: '#667eea' }}>👥</div>
          <div>
            <div className="cust-stat-val">{totalCustomers}</div>
            <div className="cust-stat-lbl">Registered Customers</div>
          </div>
        </div>

        <div className="cust-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="cust-stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>🛍️</div>
          <div>
            <div className="cust-stat-val">{activeCustomers}</div>
            <div className="cust-stat-lbl">Active Buyers ({totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}%)</div>
          </div>
        </div>

        <div className="cust-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="cust-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📦</div>
          <div>
            <div className="cust-stat-val">{totalOrdersPlaced}</div>
            <div className="cust-stat-lbl">Total Customer Orders</div>
          </div>
        </div>

        <div className="cust-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="cust-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>💰</div>
          <div>
            <div className="cust-stat-val">₹{totalCustomerSpend.toLocaleString()}</div>
            <div className="cust-stat-lbl">Customer Revenue</div>
          </div>
        </div>
      </div>

      {/* ── Status / Filter Tabs ── */}
      <div className="status-tabs">
        <button
          className={`stab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>All Customers</span>
          <span className="stab-count">{totalCustomers}</span>
        </button>
        <button
          className={`stab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          <span>Active (With Orders)</span>
          <span className="stab-count">{activeCustomers}</span>
        </button>
        <button
          className={`stab ${filter === 'zero' ? 'active' : ''}`}
          onClick={() => setFilter('zero')}
        >
          <span>New (0 Orders)</span>
          <span className="stab-count">{totalCustomers - activeCustomers}</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="filters-row">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search customer by name, email, phone number, city, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Customers Data Table ── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact Details</th>
              <th>City / Address</th>
              <th>Registered Date</th>
              <th>Total Orders</th>
              <th>Total Spent</th>
              <th>Latest Order</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && customers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">Loading registered customers...</td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  {search ? `No customer found matching "${search}"` : 'No registered customers found in database.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map(cust => {
                const badge = statusBadgeColor(cust.recentStatus);
                const initials = (cust.name || 'U')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr key={cust._id}>
                    <td>
                      <div className="cust-avatar-cell">
                        <div className="cust-avatar">{initials}</div>
                        <div>
                          <div className="cust-name">{cust.name}</div>
                          <div className="cust-sub">ID: {cust._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div><strong>📧</strong> {cust.email}</div>
                      <div className="muted"><strong>📞</strong> {cust.phone || 'N/A'}</div>
                    </td>

                    <td>
                      <div><strong>📍</strong> {cust.city || 'Chennai'}</div>
                      <div className="muted" title={cust.address}>
                        {cust.address?.length > 30 ? `${cust.address.slice(0, 30)}...` : cust.address}
                      </div>
                    </td>

                    <td>
                      <div>{formatDateTime(cust.createdAt)}</div>
                      <div className="muted">{timeAgo(cust.createdAt)}</div>
                    </td>

                    <td>
                      <span className={`badge-order-count ${cust.totalOrders > 0 ? 'badge-order-active' : 'badge-order-zero'}`}>
                        {cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}
                      </span>
                    </td>

                    <td>
                      <span className="badge-spent">₹{(cust.totalSpent || 0).toLocaleString()}</span>
                    </td>

                    <td>
                      <span
                        className="status-badge"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                      {cust.recentTrackingId && (
                        <div className="muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                          #{cust.recentTrackingId}
                        </div>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn-view"
                        onClick={() => setSelectedCust(cust)}
                        title="View Full Customer Details"
                      >
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Customer Details Modal ── */}
      {selectedCust && (
        <div className="cust-modal-backdrop" onClick={() => setSelectedCust(null)}>
          <div className="cust-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cust-modal-header">
              <h3>
                <span>👤</span> Customer Profile: {selectedCust.name}
              </h3>
              <button className="cust-close-btn" onClick={() => setSelectedCust(null)}>✕</button>
            </div>

            <div className="cust-modal-body">
              <div className="cust-info-grid">
                <div className="cust-info-item">
                  <label>Full Name</label>
                  <span>{selectedCust.name}</span>
                </div>
                <div className="cust-info-item">
                  <label>Email Address</label>
                  <span>{selectedCust.email}</span>
                </div>
                <div className="cust-info-item">
                  <label>Mobile Number</label>
                  <span>{selectedCust.phone || 'N/A'}</span>
                </div>
                <div className="cust-info-item">
                  <label>City</label>
                  <span>{selectedCust.city || 'Chennai'}</span>
                </div>
                <div className="cust-info-item" style={{ gridColumn: 'span 2' }}>
                  <label>Full Delivery Address</label>
                  <span>{selectedCust.address || 'Not specified'}</span>
                </div>
                <div className="cust-info-item">
                  <label>Registered Date & Time</label>
                  <span>{formatDateTime(selectedCust.createdAt)} ({timeAgo(selectedCust.createdAt)})</span>
                </div>
                <div className="cust-info-item">
                  <label>Account ID</label>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedCust._id}</span>
                </div>
                <div className="cust-info-item">
                  <label>Total Orders Placed</label>
                  <span style={{ color: '#2563eb' }}>{selectedCust.totalOrders}</span>
                </div>
                <div className="cust-info-item">
                  <label>Total Amount Spent</label>
                  <span style={{ color: '#059669', fontWeight: 700 }}>₹{(selectedCust.totalSpent || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="cust-recent-orders-title">
                <span>📦 Recent Orders ({selectedCust.recentOrders?.length || 0})</span>
              </div>

              {(!selectedCust.recentOrders || selectedCust.recentOrders.length === 0) ? (
                <div className="empty-state">
                  No orders have been placed by this customer yet.
                </div>
              ) : (
                <div className="cust-orders-list">
                  {selectedCust.recentOrders.map(ord => {
                    const b = statusBadgeColor(ord.status);
                    return (
                      <div key={ord._id} className="cust-order-mini-card">
                        <div>
                          <div className="cust-order-id">#{ord.trackingId || ord._id}</div>
                          <div className="cust-order-meta">
                            {formatDateTime(ord.createdAt)} • {ord.itemCount} item(s)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#059669' }}>₹{ord.totalAmount}</div>
                          <span className="status-badge" style={{ background: b.bg, color: b.text, fontSize: '0.7rem' }}>
                            {b.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cust-modal-footer">
              <button className="btn-view" onClick={() => setSelectedCust(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
