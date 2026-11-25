import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./Admin.css";

// ─── Real Database Storage Only (Zero Mock Data) ───────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
const categoryLabel = (c) => ({
  pickup: "🚗 Pickup",
  washing: "🧺 Washing",
  delivery: "📦 Delivery",
  "full-service": "⭐ Full Service"
}[c] || c);

const statusBadge = (s) => ({
  pending:   { label: "⏳ Pending Review", cls: "badge-pending"   },
  approved:  { label: "✅ Approved",        cls: "badge-approved"  },
  rejected:  { label: "❌ Rejected",         cls: "badge-rejected"  },
  suspended: { label: "🚫 Suspended",        cls: "badge-suspended" },
}[s] || { label: s, cls: "" });

const orderStatusBadge = (s) => ({
  pending:    { label: "⏳ Pending",    cls: "badge-pending"   },
  confirmed:  { label: "✅ Confirmed",  cls: "badge-approved"  },
  picked:     { label: "📦 Picked",    cls: "badge-info"      },
  processing: { label: "🔄 Processing",cls: "badge-info"      },
  ready:      { label: "🎯 Ready",      cls: "badge-warning"   },
  delivered:  { label: "🏠 Delivered", cls: "badge-approved"  },
  cancelled:  { label: "❌ Cancelled",  cls: "badge-rejected"  },
  completed:  { label: "✅ Completed",  cls: "badge-approved"  },
}[s] || { label: s, cls: "" });

const initials = (name="") => name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtTime  = (d) => d ? new Date(d).toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit" }) : "";

// ─── TABS config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",  icon: "📊", label: "Dashboard"        },
  { id: "partners",   icon: "🤝", label: "Partner Mgmt"     },
  { id: "orders",     icon: "📦", label: "Order Mgmt"       },
  { id: "payments",   icon: "💰", label: "Payments"         },
  { id: "settings",   icon: "⚙️", label: "Settings"         },
  { id: "security",   icon: "🔒", label: "Security"         },
];

// ─── MODAL for Partner Detail ─────────────────────────────────────────────────
function PartnerModal({ partner, onClose, onAction }) {
  const [rejectReason, setRejectReason]     = useState("");
  const [changeRequest, setChangeRequest]   = useState("");
  const [showReject, setShowReject]         = useState(false);
  const [showChanges, setShowChanges]       = useState(false);
  const [suspendReason, setSuspendReason]   = useState("");
  const [showSuspend, setShowSuspend]       = useState(false);

  if (!partner) return null;
  const { label, cls } = statusBadge(partner.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-avatar">{initials(partner.fullName)}</div>
          <div>
            <h2>{partner.fullName}</h2>
            <p>{partner.user?.email} · {partner.mobile}</p>
            <span className={`badge ${cls}`}>{label}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Details grid */}
        <div className="modal-grid">
          <div className="modal-field"><span>Category</span><strong>{categoryLabel(partner.category)}</strong></div>
          <div className="modal-field"><span>City</span><strong>{partner.city}</strong></div>
          <div className="modal-field"><span>Pincode</span><strong>{partner.pincode}</strong></div>
          <div className="modal-field"><span>Service Area</span><strong>{partner.serviceArea}</strong></div>
          <div className="modal-field"><span>Address</span><strong>{partner.address}</strong></div>
          <div className="modal-field"><span>Applied</span><strong>{fmtDate(partner.createdAt)}</strong></div>
          <div className="modal-field"><span>Documents</span>
            <strong className={partner.documentsVerified ? "text-green" : "text-red"}>
              {partner.documentsVerified ? "✅ Verified" : "⚠️ Unverified"}
            </strong>
          </div>
          <div className="modal-field"><span>Commission</span>
            <strong>Pickup {partner.commission?.pickup||0}% · Wash {partner.commission?.washing||0}% · Delivery {partner.commission?.delivery||0}%</strong>
          </div>
        </div>

        {/* Payment Details */}
        {partner.paymentDetails?.accountNumber && (
          <div className="modal-section">
            <h4>🏦 Bank Details</h4>
            <div className="modal-grid">
              <div className="modal-field"><span>Account Name</span><strong>{partner.paymentDetails.accountName||"—"}</strong></div>
              <div className="modal-field"><span>Account No</span><strong>{partner.paymentDetails.accountNumber}</strong></div>
              <div className="modal-field"><span>IFSC</span><strong>{partner.paymentDetails.ifsc||"—"}</strong></div>
              <div className="modal-field"><span>UPI</span><strong>{partner.paymentDetails.upi||"—"}</strong></div>
            </div>
          </div>
        )}

        {/* Identity Documents */}
        {partner.identityDocuments?.length > 0 && (
          <div className="modal-section">
            <h4>📄 Documents Submitted</h4>
            <div className="doc-list">
              {partner.identityDocuments.map((doc, i) => (
                <a key={i} href={doc} target="_blank" rel="noreferrer" className="doc-link">
                  📎 Document {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          {partner.status === "pending" && (
            <>
              <button className="btn-approve" onClick={() => onAction(partner._id, "approved")}>✅ Approve</button>
              <button className="btn-changes" onClick={() => { setShowChanges(!showChanges); setShowReject(false); }}>📝 Request Changes</button>
              <button className="btn-reject"  onClick={() => { setShowReject(!showReject);   setShowChanges(false); }}>❌ Reject</button>
            </>
          )}
          {partner.status === "approved" && (
            <button className="btn-suspend" onClick={() => setShowSuspend(!showSuspend)}>🚫 Suspend</button>
          )}
          {(partner.status === "suspended" || partner.status === "rejected") && (
            <button className="btn-approve" onClick={() => onAction(partner._id, "approved")}>🔄 Reactivate</button>
          )}
        </div>

        {/* Reject form */}
        {showReject && (
          <div className="modal-reason-box">
            <label>Rejection Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why the application is rejected..." rows={3} />
            <button className="btn-reject" disabled={!rejectReason.trim()}
              onClick={() => onAction(partner._id, "rejected", rejectReason)}>
              Confirm Rejection
            </button>
          </div>
        )}

        {/* Request Changes form */}
        {showChanges && (
          <div className="modal-reason-box">
            <label>What changes are needed? *</label>
            <textarea value={changeRequest} onChange={e => setChangeRequest(e.target.value)}
              placeholder="e.g. Please upload a clear Aadhaar copy, add UPI details..." rows={3} />
            <button className="btn-changes" disabled={!changeRequest.trim()}
              onClick={() => onAction(partner._id, "pending", null, changeRequest)}>
              Send Request
            </button>
          </div>
        )}

        {/* Suspend form */}
        {showSuspend && (
          <div className="modal-reason-box">
            <label>Suspension Reason *</label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="Reason for temporary suspension..." rows={3} />
            <button className="btn-suspend" disabled={!suspendReason.trim()}
              onClick={() => onAction(partner._id, "suspended", suspendReason)}>
              Confirm Suspension
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars

  const [tab,           setTab]           = useState("dashboard");
  const [partners,      setPartners]      = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [payouts,       setPayouts]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState("all");     // all | pickup | washing | delivery | full-service
  const [statusFilter,  setStatusFilter]  = useState("all");     // all | pending | approved | rejected | suspended
  const [orderSearch,   setOrderSearch]   = useState("");
  const [notification,  setNotification]  = useState(null);

  // ── Load data (Real Database Only) ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [partnerRes, orderRes, payoutRes] = await Promise.allSettled([
        API.get("/partner/admin/partners"),
        API.get("/orders"),
        API.get("/partner/admin/payouts"),
      ]);
      setPartners(partnerRes.status === "fulfilled" ? partnerRes.value.data.partners || [] : []);
      setOrders(orderRes.status   === "fulfilled" ? orderRes.value.data.orders    || [] : []);
      setPayouts(payoutRes.status === "fulfilled" ? payoutRes.value.data.payouts  || [] : []);
    } catch {
      setPartners([]);
      setOrders([]);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Notify helper ──────────────────────────────────────────────────────────
  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Partner action ─────────────────────────────────────────────────────────
  const handlePartnerAction = async (id, status, reason = null, changeNote = null) => {
    try {
      await API.patch(`/partner/admin/partners/${id}/status`, {
        status,
        ...(reason     && { reason }),
        ...(changeNote && { changeNote }),
      });
    } catch {
      // offline: apply locally
    }
    setPartners(prev => prev.map(p => p._id === id ? { ...p, status } : p));
    setSelectedPartner(null);
    const msgs = { approved:"Partner approved ✅", rejected:"Partner rejected", suspended:"Partner suspended 🚫", pending:"Change request sent 📝" };
    notify(msgs[status] || "Done");
  };

  // ── Order status update ────────────────────────────────────────────────────
  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status: newStatus });
    } catch {
      const local = JSON.parse(localStorage.getItem("laundryOrders") || "[]");
      localStorage.setItem("laundryOrders", JSON.stringify(local.map(o => o._id === orderId ? { ...o, status: newStatus } : o)));
    }
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    notify("Order status updated");
  };

  // ── Payout mark paid ──────────────────────────────────────────────────────
  const markPaid = async (partnerId, earningId) => {
    try {
      await API.patch(`/partner/admin/payouts/${partnerId}/${earningId}`, {});
      setPayouts(prev => prev.map(p => p._id === earningId ? { ...p, status: "paid" } : p));
      notify("Payout marked as paid 💸");
    } catch {
      notify("Failed to update payout", "error");
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = {
    totalPartners:    partners.length,
    pendingPartners:  partners.filter(p => p.status === "pending").length,
    approvedPartners: partners.filter(p => p.status === "approved").length,
    totalOrders:      orders.length,
    pendingOrders:    orders.filter(o => ["pending","confirmed","picked","processing"].includes(o.status)).length,
    completedOrders:  orders.filter(o => o.status === "completed" || o.status === "delivered").length,
    totalRevenue:     orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    pendingPayouts:   payouts.filter(p => p.status === "pending").length,
  };

  // ── Filtered partner list ──────────────────────────────────────────────────
  const filteredPartners = partners.filter(p => {
    const matchCat    = partnerFilter === "all" || p.category === partnerFilter;
    const matchStatus = statusFilter  === "all" || p.status   === statusFilter;
    return matchCat && matchStatus;
  });

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase();
    return !q || (o.orderNumber||"").toLowerCase().includes(q)
              || (o.customerDetails?.name||"").toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="sa-wrap">

      {/* ── NOTIFICATION ── */}
      {notification && (
        <div className={`sa-notif ${notification.type === "error" ? "sa-notif-err" : ""}`}>
          {notification.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="sa-header">
        <div className="sa-header-left">
          <div className="sa-logo">🧺</div>
          <div>
            <h1>LaundTime</h1>
            <p>Super Admin Control Panel</p>
          </div>
        </div>
        <div className="sa-header-right">
          <div className="sa-owner-badge">👑 Owner Control</div>
          <div className="sa-time">{new Date().toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"long" })}</div>
        </div>
      </div>

      {/* ── NAV TABS ── */}
      <nav className="sa-nav">
        {TABS.map(t => (
          <button key={t.id} className={`sa-nav-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === "partners" && stats.pendingPartners > 0 && (
              <span className="tab-badge">{stats.pendingPartners}</span>
            )}
            {t.id === "payments" && stats.pendingPayouts > 0 && (
              <span className="tab-badge">{stats.pendingPayouts}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── BODY ── */}
      <div className="sa-body">

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {tab === "dashboard" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>📊 Business Overview</h2>
              <p>Live snapshot of your LaundTime operations</p>
            </div>

            {/* Stats grid */}
            <div className="sa-stats-grid">
              {[
                { icon:"🤝", value: stats.totalPartners,    label:"Total Partners",    color:"#667eea" },
                { icon:"⏳", value: stats.pendingPartners,   label:"Pending Applications", color:"#f59e0b", alert: stats.pendingPartners > 0 },
                { icon:"✅", value: stats.approvedPartners,  label:"Approved Partners", color:"#10b981" },
                { icon:"📦", value: stats.totalOrders,       label:"Total Orders",      color:"#3b82f6" },
                { icon:"🔄", value: stats.pendingOrders,     label:"Active Orders",     color:"#8b5cf6" },
                { icon:"💰", value:`₹${stats.totalRevenue.toLocaleString()}`, label:"Total Revenue", color:"#ec4899" },
              ].map((s, i) => (
                <div key={i} className={`sa-stat-card ${s.alert ? "pulsing" : ""}`}
                  style={{ "--accent": s.color }}>
                  <div className="sa-stat-icon">{s.icon}</div>
                  <div className="sa-stat-value">{s.value}</div>
                  <div className="sa-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Website structure */}
            <div className="sa-info-cards">
              <div className="sa-info-card">
                <h3>🌐 Website Structure</h3>
                <table className="sa-info-table">
                  <thead><tr><th>Website</th><th>Purpose</th></tr></thead>
                  <tbody>
                    <tr><td><a href="http://www.laundtime.com" target="_blank" rel="noreferrer">www.laundtime.com</a></td><td>Customer website</td></tr>
                    <tr><td><a href="http://partners.laundtime.com" target="_blank" rel="noreferrer">partners.laundtime.com</a></td><td>Partner website</td></tr>
                    <tr><td><span className="highlight">admin.laundtime.com</span></td><td>Your private admin panel</td></tr>
                    <tr><td>api.laundtime.com</td><td>Shared backend API</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="sa-info-card">
                <h3>📋 Approval Workflow</h3>
                <ol className="sa-workflow">
                  <li>Partner registers on <strong>partner website</strong></li>
                  <li>Application status → <span className="badge badge-pending">⏳ Pending Review</span></li>
                  <li>You log in to this Admin Panel</li>
                  <li>Verify information &amp; documents</li>
                  <li>Approve or reject application</li>
                  <li>After approval, partner can access eligible orders</li>
                </ol>
              </div>
            </div>

            {/* Recent activity */}
            <div className="sa-recent">
              <h3>🕐 Recent Orders</h3>
              <div className="sa-recent-list">
                {orders.slice(0, 5).map(o => {
                  const { label, cls } = orderStatusBadge(o.status);
                  return (
                    <div key={o._id} className="sa-recent-item">
                      <div className="sa-recent-left">
                        <strong>#{o.orderNumber || o._id?.slice(0,8)}</strong>
                        <span>{o.customerDetails?.name}</span>
                      </div>
                      <div className="sa-recent-right">
                        <span className={`badge ${cls}`}>{label}</span>
                        <span className="sa-amount">₹{o.totalAmount}</span>
                        <span className="sa-date">{fmtDate(o.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ PARTNERS TAB ═══════════════ */}
        {tab === "partners" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>🤝 Partner Application Management</h2>
              <p>Review, approve and manage all partner accounts</p>
            </div>

            {/* Filter bar */}
            <div className="sa-filter-bar">
              <div className="sa-filter-group">
                <label>Category</label>
                <div className="sa-filter-pills">
                  {["all","pickup","washing","delivery","full-service"].map(c => (
                    <button key={c} className={`pill ${partnerFilter === c ? "active" : ""}`}
                      onClick={() => setPartnerFilter(c)}>
                      {c === "all" ? "All" : categoryLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sa-filter-group">
                <label>Status</label>
                <div className="sa-filter-pills">
                  {["all","pending","approved","suspended","rejected"].map(s => (
                    <button key={s} className={`pill ${statusFilter === s ? "active" : ""}`}
                      onClick={() => setStatusFilter(s)}>
                      {s === "all" ? "All" : statusBadge(s).label}
                      {s === "pending" && stats.pendingPartners > 0 &&
                        <span className="pill-count">{stats.pendingPartners}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Partner type sections */}
            {["pickup","washing"].map(cat => {
              const catPartners = filteredPartners.filter(p =>
                cat === "pickup"
                  ? ["pickup","delivery","full-service"].includes(p.category)
                  : p.category === "washing"
              );
              if (partnerFilter !== "all" && partnerFilter !== cat &&
                  !(cat === "pickup" && ["delivery","full-service"].includes(partnerFilter))) return null;
              if (catPartners.length === 0) return null;
              return (
                <div key={cat} className="sa-partner-section">
                  <h3 className="sa-partner-section-title">
                    {cat === "pickup" ? "🚗 Pickup & Delivery Partners" : "🧺 Washing Partners"}
                    <span className="count-chip">{catPartners.length}</span>
                  </h3>
                  <div className="sa-partner-grid">
                    {catPartners.map(p => {
                      const { label, cls } = statusBadge(p.status);
                      return (
                        <div key={p._id} className="sa-partner-card">
                          <div className="sa-partner-card-top">
                            <div className="sa-partner-avatar">{initials(p.fullName)}</div>
                            <div className="sa-partner-info">
                              <h4>{p.fullName}</h4>
                              <p>{p.user?.email}</p>
                              <p>📱 {p.mobile}</p>
                              <p>📍 {p.city} · {p.pincode}</p>
                            </div>
                            <span className={`badge ${cls}`}>{label}</span>
                          </div>
                          <div className="sa-partner-meta">
                            <span>{categoryLabel(p.category)}</span>
                            <span>📅 {fmtDate(p.createdAt)}</span>
                            <span className={p.documentsVerified ? "text-green" : "text-red"}>
                              {p.documentsVerified ? "✅ Docs OK" : "⚠️ Unverified"}
                            </span>
                          </div>
                          <div className="sa-partner-quick-actions">
                            <button className="btn-view" onClick={() => setSelectedPartner(p)}>
                              👁 View Details
                            </button>
                            {p.status === "pending" && (
                              <>
                                <button className="btn-approve-sm" onClick={() => handlePartnerAction(p._id, "approved")}>✅ Approve</button>
                                <button className="btn-reject-sm"  onClick={() => { setSelectedPartner(p); }}>❌ Reject</button>
                              </>
                            )}
                            {p.status === "approved" && (
                              <button className="btn-suspend-sm" onClick={() => handlePartnerAction(p._id, "suspended")}>🚫 Suspend</button>
                            )}
                            {(p.status === "suspended" || p.status === "rejected") && (
                              <button className="btn-approve-sm" onClick={() => handlePartnerAction(p._id, "approved")}>🔄 Reactivate</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredPartners.length === 0 && (
              <div className="sa-empty">
                <div className="sa-empty-icon">🤝</div>
                <h3>No partners match your filter</h3>
                <p>Try changing the category or status filter above.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ ORDERS TAB ═══════════════ */}
        {tab === "orders" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>📦 Order Management</h2>
              <p>View, update and assign all customer orders</p>
            </div>

            <div className="sa-search-bar">
              <input type="text" placeholder="🔍 Search by order number or customer name..."
                value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              <span className="sa-search-count">{filteredOrders.length} orders</span>
            </div>

            <div className="sa-orders-table">
              <div className="sa-table-head">
                <span>Order</span>
                <span>Customer</span>
                <span>Amount</span>
                <span>Payment</span>
                <span>Date</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {filteredOrders.length === 0 && (
                <div className="sa-empty">
                  <div className="sa-empty-icon">📦</div>
                  <h3>No orders found</h3>
                </div>
              )}
              {filteredOrders.map(o => {
                const { label, cls } = orderStatusBadge(o.status);
                return (
                  <div key={o._id} className="sa-table-row">
                    <span className="sa-order-id">#{o.orderNumber || o._id?.slice(0,8)}</span>
                    <span>
                      <strong>{o.customerDetails?.name || "—"}</strong>
                      <small>{o.customerDetails?.phone}</small>
                    </span>
                    <span className="sa-amount">₹{o.totalAmount}</span>
                    <span><span className="payment-tag">{(o.paymentMethod||"cod").toUpperCase()}</span></span>
                    <span>
                      {fmtDate(o.createdAt)}
                      <small>{fmtTime(o.createdAt)}</small>
                    </span>
                    <span>
                      <select className="sa-status-select"
                        value={o.status}
                        onChange={e => handleOrderStatus(o._id, e.target.value)}>
                        {["pending","confirmed","picked","processing","ready","delivered","completed","cancelled"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </span>
                    <span className="sa-row-actions">
                      <span className={`badge ${cls}`}>{label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ PAYMENTS TAB ═══════════════ */}
        {tab === "payments" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>💰 Payments & Earnings</h2>
              <p>Partner commissions, earnings and payouts</p>
            </div>

            {/* Earnings summary per partner */}
            <div className="sa-payout-grid">
              {partners.filter(p => p.earnings && p.earnings.length > 0).map(p => {
                const totalEarned  = p.earnings.reduce((s,e) => s+(e.amount||0), 0);
                const pendingAmt   = p.earnings.filter(e=>e.status==="pending").reduce((s,e) => s+(e.amount||0), 0);
                const paidAmt      = p.earnings.filter(e=>e.status==="paid").reduce((s,e) => s+(e.amount||0), 0);
                return (
                  <div key={p._id} className="sa-payout-card">
                    <div className="sa-payout-header">
                      <div className="sa-partner-avatar sm">{initials(p.fullName)}</div>
                      <div>
                        <h4>{p.fullName}</h4>
                        <span>{categoryLabel(p.category)}</span>
                      </div>
                    </div>
                    <div className="sa-payout-amounts">
                      <div><label>Total Earned</label><strong>₹{totalEarned}</strong></div>
                      <div><label>Paid Out</label><strong className="text-green">₹{paidAmt}</strong></div>
                      <div><label>Pending</label><strong className="text-orange">₹{pendingAmt}</strong></div>
                    </div>
                    {pendingAmt > 0 && (
                      <button className="btn-payout" onClick={() => {
                        const pendingEntry = p.earnings.find(e => e.status === "pending");
                        if (pendingEntry) markPaid(p._id, pendingEntry._id || pendingEntry.id);
                      }}>
                        💸 Mark ₹{pendingAmt} as Paid
                      </button>
                    )}
                  </div>
                );
              })}
              {partners.every(p => !p.earnings || p.earnings.length === 0) && (
                <div className="sa-empty">
                  <div className="sa-empty-icon">💰</div>
                  <h3>No earnings data yet</h3>
                  <p>Partner earnings will appear here once orders are completed.</p>
                </div>
              )}
            </div>

            {/* Commission config */}
            <div className="sa-commission-info">
              <h3>📊 Commission Structure</h3>
              <div className="sa-commission-grid">
                <div className="sa-commission-card"><span>🚗 Pickup</span><strong>10%</strong></div>
                <div className="sa-commission-card"><span>🧺 Washing</span><strong>20%</strong></div>
                <div className="sa-commission-card"><span>📦 Delivery</span><strong>10%</strong></div>
                <div className="sa-commission-card"><span>⭐ Full Service</span><strong>40%</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ SETTINGS TAB ═══════════════ */}
        {tab === "settings" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>⚙️ Platform Settings</h2>
              <p>Control platform rules and configurations</p>
            </div>
            <div className="sa-settings-grid">
              {[
                { icon:"🌐", title:"Service Area Management",    desc:"Control partner pickup and delivery zones, add or remove pincodes." },
                { icon:"💳", title:"Payment Gateway",            desc:"Configure Razorpay, Stripe or UPI gateway settings." },
                { icon:"🏷️", title:"Pricing & Discounts",        desc:"Set base prices, promotional discounts and coupon rules." },
                { icon:"📱", title:"Notifications",              desc:"SMS, Email and Push notification templates and schedules." },
                { icon:"🕒", title:"Operational Hours",           desc:"Set pickup windows, cutoff times and holiday schedules." },
                { icon:"📋", title:"Terms & Policy",             desc:"Update terms of service, privacy policy and partner agreements." },
              ].map((s,i) => (
                <div key={i} className="sa-setting-card">
                  <div className="sa-setting-icon">{s.icon}</div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                  <button className="btn-configure">Configure →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ SECURITY TAB ═══════════════ */}
        {tab === "security" && (
          <div className="sa-tab-content">
            <div className="sa-section-title">
              <h2>🔒 Admin Security</h2>
              <p>Manage admin accounts, roles and activity logs</p>
            </div>
            <div className="sa-security-grid">
              {[
                { icon:"👤", title:"Admin Accounts",    desc:"Add or remove admin users, set permissions and 2FA." },
                { icon:"📝", title:"Activity Logs",     desc:"Full audit trail of all admin actions with timestamps." },
                { icon:"🔑", title:"Access Control",    desc:"Role-based permissions for sub-admins and managers." },
                { icon:"🛡️", title:"Security Alerts",   desc:"Unusual login attempts, failed auth and IP blocking." },
              ].map((s,i) => (
                <div key={i} className="sa-setting-card">
                  <div className="sa-setting-icon">{s.icon}</div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                  <button className="btn-configure">Manage →</button>
                </div>
              ))}
            </div>

            {/* Current admin info */}
            <div className="sa-admin-info">
              <h3>🔐 Logged in as</h3>
              <div className="sa-admin-card">
                <div className="sa-partner-avatar lg">{initials(user?.name || "Admin")}</div>
                <div>
                  <h4>{user?.name || "Admin"}</h4>
                  <p>{user?.email}</p>
                  <span className="badge badge-approved">👑 Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── PARTNER DETAIL MODAL ── */}
      {selectedPartner && (
        <PartnerModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onAction={handlePartnerAction}
        />
      )}

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <div className="sa-loading">
          <div className="sa-spinner" />
          <p>Loading admin data...</p>
        </div>
      )}
    </div>
  );
}
