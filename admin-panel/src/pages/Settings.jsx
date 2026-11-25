import React, { useState } from 'react';
import '../styles/settings.css';

const DEFAULTS = {
  platformName: 'LaundTime',
  supportEmail: 'support@laundtime.com',
  supportPhone: '+91 98765 43210',
  currency: 'INR',
  commissionPickup: 10,
  commissionWashing: 20,
  commissionDelivery: 10,
  minOrderAmount: 100,
  maxServiceRadius: 15,
  autoApprove: false,
  maintenanceMode: false,
  gstPercent: 18,
  customerWebsite: 'www.laundtime.com',
  partnerWebsite: 'partners.laundtime.com',
  adminWebsite: 'admin.laundtime.com',
  apiEndpoint: 'api.laundtime.com',
};

export default function Settings() {
  const [form,    setForm]    = useState(DEFAULTS);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    setLoading(true);
    await new Promise(r=>setTimeout(r,800)); // simulate API call
    setSaved(true);
    setLoading(false);
    setTimeout(()=>setSaved(false),3000);
  };

  return (
    <div className="settings-page">
      {saved && <div className="toast toast-success">✅ Settings saved successfully!</div>}

      <div className="page-header">
        <div><h2>⚙️ Platform Settings</h2><p>Configure global platform rules and preferences</p></div>
        <button className="btn-save" onClick={save} disabled={loading}>
          {loading ? '💾 Saving…' : '💾 Save Changes'}
        </button>
      </div>

      <div className="settings-grid">
        {/* General */}
        <div className="settings-card">
          <h3>🏢 General</h3>
          <div className="form-group"><label>Platform Name</label><input value={form.platformName} onChange={e=>set('platformName',e.target.value)} /></div>
          <div className="form-group"><label>Support Email</label><input type="email" value={form.supportEmail} onChange={e=>set('supportEmail',e.target.value)} /></div>
          <div className="form-group"><label>Support Phone</label><input value={form.supportPhone} onChange={e=>set('supportPhone',e.target.value)} /></div>
          <div className="form-group"><label>Currency</label>
            <select value={form.currency} onChange={e=>set('currency',e.target.value)}>
              <option value="INR">INR – Indian Rupee</option>
              <option value="USD">USD – US Dollar</option>
            </select>
          </div>
          <div className="form-group"><label>GST %</label><input type="number" value={form.gstPercent} onChange={e=>set('gstPercent',+e.target.value)} /></div>
        </div>

        {/* Commission */}
        <div className="settings-card">
          <h3>💰 Commission Rates</h3>
          <div className="form-group"><label>🚗 Pickup Commission (%)</label><input type="number" min="0" max="50" value={form.commissionPickup} onChange={e=>set('commissionPickup',+e.target.value)} /></div>
          <div className="form-group"><label>🧺 Washing Commission (%)</label><input type="number" min="0" max="50" value={form.commissionWashing} onChange={e=>set('commissionWashing',+e.target.value)} /></div>
          <div className="form-group"><label>📦 Delivery Commission (%)</label><input type="number" min="0" max="50" value={form.commissionDelivery} onChange={e=>set('commissionDelivery',+e.target.value)} /></div>
        </div>

        {/* Order Rules */}
        <div className="settings-card">
          <h3>📦 Order Rules</h3>
          <div className="form-group"><label>Minimum Order Amount (₹)</label><input type="number" value={form.minOrderAmount} onChange={e=>set('minOrderAmount',+e.target.value)} /></div>
          <div className="form-group"><label>Max Service Radius (km)</label><input type="number" value={form.maxServiceRadius} onChange={e=>set('maxServiceRadius',+e.target.value)} /></div>
        </div>

        {/* Partner Settings */}
        <div className="settings-card">
          <h3>👥 Partner Settings</h3>
          <div className="form-group toggle-group">
            <label>Auto-Approve Partners</label>
            <label className="toggle">
              <input type="checkbox" checked={form.autoApprove} onChange={e=>set('autoApprove',e.target.checked)} />
              <span className="slider" />
            </label>
            <small>When ON — new partner applications are auto-approved without manual review</small>
          </div>
        </div>

        {/* Website Structure */}
        <div className="settings-card">
          <h3>🌐 Website Structure</h3>
          <div className="form-group"><label>Customer Website</label><input value={form.customerWebsite} onChange={e=>set('customerWebsite',e.target.value)} /></div>
          <div className="form-group"><label>Partner Website</label><input value={form.partnerWebsite} onChange={e=>set('partnerWebsite',e.target.value)} /></div>
          <div className="form-group"><label>Admin Panel</label><input value={form.adminWebsite} onChange={e=>set('adminWebsite',e.target.value)} /></div>
          <div className="form-group"><label>API Endpoint</label><input value={form.apiEndpoint} onChange={e=>set('apiEndpoint',e.target.value)} /></div>
        </div>

        {/* Maintenance */}
        <div className="settings-card danger-card">
          <h3>⚠️ Maintenance</h3>
          <div className="form-group toggle-group">
            <label>Maintenance Mode</label>
            <label className="toggle">
              <input type="checkbox" checked={form.maintenanceMode} onChange={e=>set('maintenanceMode',e.target.checked)} />
              <span className="slider" />
            </label>
            <small>⚠️ When ON — the customer website shows a maintenance page</small>
          </div>
        </div>
      </div>
    </div>
  );
}
