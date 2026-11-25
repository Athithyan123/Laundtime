import React, { useEffect, useState, useCallback, useRef } from 'react';
import API, { getAdminBaseURL } from '../api';
import '../styles/orders.css';

const statusColor = {
  pending:'#f59e0b', confirmed:'#06b6d4', picked:'#8b5cf6',
  processing:'#3b82f6', ready:'#f97316', delivered:'#10b981',
  cancelled:'#ef4444'
};
const statusLabel = {
  pending:'⏳ Pending', confirmed:'✔️ Confirmed', picked:'📦 Picked Up',
  processing:'🔄 Washing', ready:'🎯 Ready for Delivery',
  delivered:'🏠 Delivered', cancelled:'❌ Cancelled'
};
const timeAgo = d => {
  const diff = (Date.now()-new Date(d))/60000;
  if (diff<1)   return 'just now';
  if (diff<60)  return `${Math.floor(diff)}m ago`;
  if (diff<1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

export default function Orders() {
  const [orders,    setOrders]    = useState([]);
  const [partners,  setPartners]  = useState([]);   // approved partners only
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [sFilter,   setSFilter]   = useState('all');
  const [selOrder,  setSelOrder]  = useState(null);
  const [toast,     setToast]     = useState(null);
  const [lastSync,  setLastSync]  = useState(null);
  const [newBadge,  setNewBadge]  = useState(0);    // unread new-order count
  const [assigning, setAssigning] = useState({ stage:'', partnerId:'' });
  const ordersRef = useRef([]);
  const sseRef    = useRef(null);

  const notify = (msg,type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  };

  // ── Load all orders + approved partners ──────────────────────────────────
  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [oRes, pRes] = await Promise.all([
        API.get('/orders'),
        API.get('/partner/admin/partners'),
      ]);
      const fetchedOrders = oRes.data.orders || [];
      setOrders(fetchedOrders);
      ordersRef.current = fetchedOrders;
      setPartners((pRes.data.partners||[]).filter(p=>p.status==='approved'));
      setLastSync(new Date());
    } catch(e) {
      if (!silent) setError('Backend not reachable. Make sure backend is running on port 5001.');
    } finally { if (!silent) setLoading(false); }
  }, []);

  // ── SSE connection for instant push updates ──────────────────────────────
  useEffect(() => {
    load();

    // Connect to SSE stream
    const connect = () => {
      const sseUrl = `${getAdminBaseURL()}/admin/live`;
      const es = new EventSource(sseUrl);
      sseRef.current = es;

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'new_order') {
            // Reload orders silently & show badge
            load(true);
            setNewBadge(n => n+1);
            notify(`🆕 New order from ${msg.payload?.customerDetails?.name || 'customer'}! ₹${msg.payload?.totalAmount}`, 'info');
          }
          if (msg.type === 'order_updated') {
            // Update just that one order in state
            setOrders(prev => prev.map(o =>
              o._id === msg.payload._id ? { ...o, status: msg.payload.status } : o
            ));
            if (selOrder?._id === msg.payload._id) {
              setSelOrder(prev => prev ? { ...prev, status: msg.payload.status } : prev);
            }
            setLastSync(new Date());
          }
          if (msg.type === 'partner_updated') {
            // Reload partners silently
            API.get('/partner/admin/partners').then(r =>
              setPartners((r.data.partners||[]).filter(p=>p.status==='approved'))
            ).catch(()=>{});
          }
        } catch {}
      };
      es.onerror = () => {
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    };
    connect();

    // Fallback polling every 15s
    const poll = setInterval(() => load(true), 15000);

    return () => {
      sseRef.current?.close();
      clearInterval(poll);
    };
  }, [load]);

  // ── Status update ────────────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id===id ? {...o,status} : o));
      if (selOrder?._id===id) setSelOrder(prev=>({...prev,status}));
      notify(`✅ Order updated → "${statusLabel[status]}"`);
    } catch(e) { notify(e.response?.data?.message||'Update failed','error'); }
  };

  // ── Assign partner ───────────────────────────────────────────────────────
  const assignPartner = async (orderId, stage, partnerId) => {
    if (!partnerId) return notify('Select a partner first','error');
    try {
      const res = await API.patch(`/partner/admin/orders/${orderId}/assign`, { stage, partnerId });
      const updated = res.data.order;
      setOrders(prev => prev.map(o => o._id===orderId ? {...o,...updated} : o));
      setSelOrder(prev => prev ? {...prev,...updated} : prev);
      notify(`✅ ${stage.charAt(0).toUpperCase()+stage.slice(1)} partner assigned`);
      setAssigning({ stage:'', partnerId:'' });
    } catch(e) { notify(e.response?.data?.message||'Assignment failed','error'); }
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchS = sFilter==='all' || o.status===sFilter;
    const q = search.toLowerCase();
    const matchQ = !q ||
      o.trackingId?.toLowerCase().includes(q) ||
      o.customerDetails?.name?.toLowerCase().includes(q) ||
      o.customerDetails?.phone?.includes(q);
    return matchS && matchQ;
  });

  const counts = ['all','pending','confirmed','picked','processing','ready','delivered','cancelled']
    .reduce((acc,s)=>({...acc,[s]:s==='all'?orders.length:orders.filter(o=>o.status===s).length}),{});

  const getPartnerName = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val.fullName;
    const p = partners.find(p=>p._id===val);
    return p?.fullName || '—';
  };

  // ── Filter partners by what stage needs ─────────────────────────────────
  const pickupCats  = ['pickup','full-service'];
  const washCats    = ['washing','full-service'];
  const deliverCats = ['delivery','full-service'];

  return (
    <div className="orders-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>📦 Order Management
            {newBadge>0 && (
              <span className="new-badge" onClick={()=>{setNewBadge(0);setSFilter('pending');}}>
                +{newBadge} new
              </span>
            )}
          </h2>
          <p>
            Live orders from database — SSE connected
            {lastSync && <span className="sync-time"> · Last synced: {timeAgo(lastSync)}</span>}
          </p>
        </div>
        <button className="btn-refresh" onClick={()=>load()}>🔄 Refresh</button>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* Status Tabs */}
      <div className="status-tabs">
        {Object.entries(counts).map(([k,v])=>(
          <button key={k} className={`stab ${sFilter===k?'active':''}`} onClick={()=>{setSFilter(k);setNewBadge(0);}}>
            <span>{k==='all'?'All':statusLabel[k]?.split(' ').slice(-1)[0]||k}</span>
            <span className="stab-count">{v}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filters-row">
        <input className="search-input" placeholder="🔍 Search tracking ID, name or phone…"
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? <div className="dash-loading">⏳ Loading orders…</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking ID</th><th>Customer</th><th>Items</th>
                <th>Amount</th><th>Payment</th><th>Status</th>
                <th>Pickup Partner</th><th>Delivery Partner</th>
                <th>Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && (
                <tr><td colSpan="10" className="empty-row">
                  {orders.length===0
                    ? '📋 No orders yet. Customer books from the customer app → http://localhost:3000'
                    : 'No orders match this filter.'}
                </td></tr>
              )}
              {filtered.map(o=>(
                <tr key={o._id} className={o.status==='pending'?'row-pending':''}>
                  <td><strong>{o.trackingId||o._id?.slice(-8)}</strong></td>
                  <td>
                    <p>{o.customerDetails?.name}</p>
                    <small className="muted">{o.customerDetails?.phone}</small>
                  </td>
                  <td><small>{(o.items||[]).map(i=>i.name).slice(0,2).join(', ')||'Laundry'}</small></td>
                  <td><strong>₹{o.totalAmount}</strong></td>
                  <td className="muted">{o.paymentMethod?.toUpperCase()}</td>
                  <td>
                    <span className="status-badge"
                      style={{background:statusColor[o.status]+'22',color:statusColor[o.status]}}>
                      {statusLabel[o.status]||o.status}
                    </span>
                  </td>
                  <td>
                    {getPartnerName(o.pickupPartner)
                      ? <span className="partner-chip">✅ {getPartnerName(o.pickupPartner)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    {getPartnerName(o.deliveryPartner)
                      ? <span className="partner-chip">✅ {getPartnerName(o.deliveryPartner)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="muted">{timeAgo(o.createdAt)}</td>
                  <td>
                    {/* Quick confirm for pending orders */}
                    {o.status==='pending' && (
                      <button className="btn-approve"
                        style={{marginRight:'.25rem'}}
                        onClick={()=>updateStatus(o._id,'confirmed')}>
                        ✔️ Confirm
                      </button>
                    )}
                    <button className="btn-view"
                      onClick={()=>{setSelOrder(o);setAssigning({stage:'',partnerId:''});}}>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Order Detail Modal ────────────────────────────────────────────── */}
      {selOrder && (
        <div className="modal-overlay" onClick={()=>setSelOrder(null)}>
          <div className="modal modal-wide" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setSelOrder(null)}>✕</button>

            <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.25rem'}}>
              <div>
                <h3>📦 {selOrder.trackingId||selOrder._id?.slice(-8)}</h3>
                <span className="status-badge"
                  style={{background:statusColor[selOrder.status]+'22',color:statusColor[selOrder.status]}}>
                  {statusLabel[selOrder.status]}
                </span>
              </div>
            </div>

            {/* Order Info Grid */}
            <div className="modal-grid">
              <div><label>Customer</label><p>{selOrder.customerDetails?.name}</p></div>
              <div><label>Phone</label><p>{selOrder.customerDetails?.phone}</p></div>
              <div><label>Address</label><p>{selOrder.customerDetails?.address}</p></div>
              <div><label>City / PIN</label><p>{selOrder.customerDetails?.city} – {selOrder.customerDetails?.pincode}</p></div>
              <div><label>Pickup Date</label><p>{selOrder.customerDetails?.pickupDate ? new Date(selOrder.customerDetails.pickupDate).toLocaleDateString('en-IN') : '—'}</p></div>
              <div><label>Pickup Time</label><p>{selOrder.customerDetails?.pickupTime||'Flexible'}</p></div>
              <div><label>Payment</label><p>{selOrder.paymentMethod?.toUpperCase()}</p></div>
              <div><label>Total Amount</label><p><strong>₹{selOrder.totalAmount}</strong></p></div>
              <div style={{gridColumn:'span 2'}}>
                <label>Items</label>
                <p>{(selOrder.items||[]).map(i=>`${i.name} ×${i.quantity}`).join(' · ')||'—'}</p>
              </div>
              {selOrder.customerDetails?.instructions && (
                <div style={{gridColumn:'span 2'}}>
                  <label>Customer Instructions</label>
                  <p>{selOrder.customerDetails.instructions}</p>
                </div>
              )}
            </div>

            {/* Partner Assignment Status */}
            <div className="assign-status-row">
              <div className="assign-status-item">
                <span>🚗 Pickup</span>
                <strong>{getPartnerName(selOrder.pickupPartner)||'Not assigned'}</strong>
              </div>
              <div className="assign-status-item">
                <span>🧺 Washing</span>
                <strong>{getPartnerName(selOrder.washingPartner)||'Not assigned'}</strong>
              </div>
              <div className="assign-status-item">
                <span>📦 Delivery</span>
                <strong>{getPartnerName(selOrder.deliveryPartner)||'Not assigned'}</strong>
              </div>
            </div>

            {/* Status Update Buttons */}
            <div style={{margin:'1rem 0 .5rem'}}>
              <p style={{fontWeight:700,fontSize:'.85rem',color:'var(--muted)',marginBottom:'.5rem'}}>
                UPDATE STATUS
              </p>
              <div className="modal-actions" style={{flexWrap:'wrap',gap:'.4rem'}}>
                {['pending','confirmed','picked','processing','ready','delivered','cancelled'].map(s=>(
                  <button key={s} className="btn-status"
                    style={{
                      background: selOrder.status===s ? statusColor[s] : statusColor[s]+'22',
                      color: selOrder.status===s ? '#fff' : statusColor[s],
                      border:`1px solid ${statusColor[s]}`,
                      fontWeight: selOrder.status===s ? 700 : 400
                    }}
                    onClick={()=>updateStatus(selOrder._id,s)}>
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Partners */}
            <div style={{marginTop:'1.25rem'}}>
              <p style={{fontWeight:700,fontSize:'.85rem',color:'var(--muted)',marginBottom:'.75rem'}}>
                ASSIGN PARTNERS
              </p>
              {partners.length===0 ? (
                <div className="warn-box">⚠️ No approved partners yet. Go to Partners → Approve a partner first.</div>
              ) : (
                [
                  { stage:'pickup',   label:'🚗 Pickup Partner',   cats: pickupCats,  field:'pickupPartner'   },
                  { stage:'washing',  label:'🧺 Washing Partner',  cats: washCats,    field:'washingPartner'  },
                  { stage:'delivery', label:'📦 Delivery Partner', cats: deliverCats, field:'deliveryPartner' },
                ].map(({ stage, label, cats, field }) => {
                  const assigned = getPartnerName(selOrder[field]);
                  const eligible = partners.filter(p=>cats.includes(p.category));
                  return (
                    <div key={stage} className="assign-row">
                      <span className="assign-label">{label}</span>
                      {assigned ? (
                        <span className="assign-done">✅ {assigned}</span>
                      ) : eligible.length===0 ? (
                        <span className="muted">No {stage} partners approved</span>
                      ) : (
                        <div className="assign-controls">
                          <select className="filter-sel"
                            value={assigning.stage===stage ? assigning.partnerId : ''}
                            onChange={e=>setAssigning({stage,partnerId:e.target.value})}>
                            <option value="">— Select partner —</option>
                            {eligible.map(p=>(
                              <option key={p._id} value={p._id}>
                                {p.fullName} ({p.category} · {p.city})
                              </option>
                            ))}
                          </select>
                          <button className="btn-approve"
                            onClick={()=>assignPartner(selOrder._id, stage,
                              assigning.stage===stage ? assigning.partnerId : '')}>
                            Assign
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Status History */}
            {selOrder.statusHistory?.length > 0 && (
              <div style={{marginTop:'1.5rem'}}>
                <p style={{fontWeight:700,fontSize:'.85rem',color:'var(--muted)',marginBottom:'.5rem'}}>STATUS HISTORY</p>
                <div className="history-list">
                  {[...selOrder.statusHistory].reverse().slice(0,6).map((h,i)=>(
                    <div key={i} className="history-item">
                      <span className="history-dot" style={{background:statusColor[h.status]||'#6b7280'}}/>
                      <div>
                        <span style={{fontWeight:600,textTransform:'capitalize'}}>{h.status}</span>
                        {h.note && <span className="muted"> — {h.note}</span>}
                      </div>
                      <span className="muted">{h.timestamp ? timeAgo(h.timestamp) : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
