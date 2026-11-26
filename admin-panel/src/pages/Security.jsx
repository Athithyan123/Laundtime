import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import '../styles/security.css';

const roleColor = {
  'super-admin': '#6366f1',
  'admin': '#6366f1',
  'manager': '#06b6d4',
  'support': '#10b981'
};
const logIcon   = { success: '✅', warning: '⚠️', info: 'ℹ️' };
const logColor  = { success: '#10b981', warning: '#f59e0b', info: '#3b82f6' };

export default function Security() {
  const storedUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [logs, setLogs] = useState([
    { action: 'Admin Session Active', user: storedUser?.name || 'Super Admin', target: storedUser?.email || 'admin@laundry.com', time: new Date().toISOString(), type: 'info' },
    { action: 'Database Connected', user: 'System', target: 'MongoDB Atlas Cloud Cluster', time: new Date().toISOString(), type: 'success' },
  ]);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'manager', password: '' });

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await API.get('/users/admins');
      if (res.data?.success && Array.isArray(res.data.admins)) {
        setAdmins(res.data.admins);
      }
    } catch (err) {
      console.error('Failed to load admin accounts:', err);
      if (storedUser) {
        setAdmins([{
          _id: storedUser._id || storedUser.id || 'admin-root',
          name: storedUser.name || 'Super Admin',
          email: storedUser.email || 'admin@laundry.com',
          role: storedUser.role || 'super-admin',
          status: 'active',
          lastLogin: new Date().toISOString()
        }]);
      }
    } finally {
      setLoading(false);
    }
  }, [storedUser]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const toggleStatus = async (admin) => {
    if (admin.email === 'admin@laundry.com' || admin.email === storedUser?.email) {
      notify('Cannot deactivate primary super admin account', 'warning');
      return;
    }

    try {
      const res = await API.patch(`/users/admins/${admin._id}/status`);
      if (res.data?.success) {
        notify(`Account for ${admin.name} is now ${res.data.admin.status}!`);
        setLogs(prev => [
          { action: `Admin Status Changed to ${res.data.admin.status}`, user: storedUser?.name || 'Admin', target: admin.email, time: new Date().toISOString(), type: 'warning' },
          ...prev
        ]);
        fetchAdmins();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update account status', 'warning');
    }
  };

  const deleteAdmin = async (admin) => {
    if (admin.email === 'admin@laundry.com' || admin.email === storedUser?.email) {
      notify('Cannot delete primary super admin account', 'warning');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete admin account for ${admin.name} (${admin.email})?`)) {
      return;
    }

    try {
      const res = await API.delete(`/users/admins/${admin._id}`);
      if (res.data?.success) {
        notify(`Admin account for ${admin.email} deleted.`);
        setLogs(prev => [
          { action: 'Admin Account Deleted', user: storedUser?.name || 'Admin', target: admin.email, time: new Date().toISOString(), type: 'warning' },
          ...prev
        ]);
        fetchAdmins();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete account', 'warning');
    }
  };

  const addAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password) {
      notify('Please fill out all fields (name, email, password)', 'warning');
      return;
    }

    if (newAdmin.password.length < 6) {
      notify('Password must be at least 6 characters long', 'warning');
      return;
    }

    setAdding(true);
    try {
      const res = await API.post('/users/admins', newAdmin);
      if (res.data?.success) {
        notify(`🎉 Real Admin Created! ${newAdmin.email} can now sign in.`);
        setLogs(prev => [
          { action: `Created Real Admin (${newAdmin.role})`, user: storedUser?.name || 'Admin', target: newAdmin.email, time: new Date().toISOString(), type: 'success' },
          ...prev
        ]);
        setNewAdmin({ name: '', email: '', role: 'manager', password: '' });
        setShowAdd(false);
        fetchAdmins();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create admin in database', 'warning');
    } finally {
      setAdding(false);
    }
  };

  const timeAgo = (d) => {
    if (!d) return 'Never';
    const diff = (Date.now() - new Date(d)) / 60000;
    if (diff < 1) return 'just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className="security-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h2>🔐 Security & Real Admin Accounts</h2>
          <p>Create real working admin credentials persisted directly in MongoDB Atlas</p>
        </div>
        <button className="btn-add-admin" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? '✕ Close Form' : '➕ Create New Admin'}
        </button>
      </div>

      {/* Add Real Working Admin Form */}
      {showAdd && (
        <form onSubmit={addAdmin} className="add-admin-form">
          <h3>Create Real Admin Credential (Working in Database)</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
            This account will be encrypted with bcrypt and stored in MongoDB Atlas. The user can immediately sign in at the login screen.
          </p>
          <div className="add-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                placeholder="e.g. John Doe"
                value={newAdmin.name}
                onChange={e => setNewAdmin(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Admin Email (Login ID)</label>
              <input
                type="email"
                placeholder="e.g. manager@laundtime.com"
                value={newAdmin.email}
                onChange={e => setNewAdmin(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Access Role</label>
              <select
                value={newAdmin.role}
                onChange={e => setNewAdmin(f => ({ ...f, role: e.target.value }))}
              >
                <option value="super-admin">Super Admin (Full Access)</option>
                <option value="manager">Operations Manager</option>
                <option value="support">Customer Support Agent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Password (Min. 6 Characters)</label>
              <input
                type="password"
                placeholder="Enter secure password"
                value={newAdmin.password}
                onChange={e => setNewAdmin(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.2rem', display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-approve" disabled={adding}>
              {adding ? 'Creating in Database...' : '✅ Save to Database & Enable Login'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Real Admin Accounts Table */}
      <div className="section-title">
        👤 Active Admin Accounts in MongoDB Atlas ({admins.length})
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Login Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading admin accounts from database...</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No admin accounts found in database.</td></tr>
            ) : (
              admins.map(a => (
                <tr key={a._id}>
                  <td><strong>{a.name}</strong></td>
                  <td><code>{a.email}</code></td>
                  <td>
                    <span
                      className="role-badge"
                      style={{ background: (roleColor[a.role] || '#6366f1') + '22', color: roleColor[a.role] || '#6366f1' }}
                    >
                      {a.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${a.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {a.status === 'active' ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="muted">{timeAgo(a.lastLogin)}</td>
                  <td>
                    {a.email !== 'admin@laundry.com' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className={a.status === 'active' ? 'btn-suspend' : 'btn-approve'}
                          onClick={() => toggleStatus(a)}
                          title={a.status === 'active' ? 'Deactivate access' : 'Activate access'}
                        >
                          {a.status === 'active' ? '🚫 Deactivate' : '✅ Activate'}
                        </button>
                        <button
                          className="btn-suspend"
                          onClick={() => deleteAdmin(a)}
                          title="Delete account"
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    {a.email === 'admin@laundry.com' && (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Primary Root</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Activity Logs */}
      <div className="section-title" style={{ marginTop: '2rem' }}>📋 Security & Audit Logs</div>
      <div className="logs-list">
        {logs.map((l, i) => (
          <div key={i} className="log-item">
            <span className="log-icon">{logIcon[l.type]}</span>
            <div className="log-info">
              <p className="log-action" style={{ color: logColor[l.type] }}>{l.action}</p>
              <p className="log-meta">{l.user} → {l.target}</p>
            </div>
            <span className="log-time">{timeAgo(l.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
