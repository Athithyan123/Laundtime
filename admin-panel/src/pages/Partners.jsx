import React, { useEffect, useState, useCallback } from 'react';
import API from '../api';
import '../styles/partners.css';

const catLabel  = c => ({pickup:'🚗 Pickup', washing:'🧺 Washing', delivery:'📦 Delivery','full-service':'⭐ Full Service'}[c] || c);
const statColor = s => ({pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444', suspended:'#8b5cf6'}[s] || '#6b7280');

export default function Partners() {
  const [partners,  setPartners]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [sFilter,   setSFilter]   = useState('all');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [toast,     setToast]     = useState(null);
  const [reason,    setReason]    = useState('');
  const [action,    setAction]    = useState(null);

  const notify = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await API.get('/partner/admin/partners');
      setPartners(r.data.partners || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load partners. Is the backend running?');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh partner list every 20 seconds
    const interval = setInterval(() => load(), 20000);
    return () => clearInterval(interval);
  }, [load]);

  const doAction = async (id, status, reasonText='', changeNote='') => {
    try {
      await API.patch(`/partner/admin/partners/${id}/status`, {
        status,
        ...(status === 'approved' && { documentsVerified: true }),
        ...(reasonText   && { reason: reasonText }),
        ...(changeNote   && { changeNote }),
      });
      setPartners(ps => ps.map(p => p._id===id
        ? {...p, status, documentsVerified: status==='approved' ? true : p.documentsVerified}
        : p));
      if (selected?._id === id) setSelected(prev => ({...prev, status, documentsVerified: status==='approved'}));
      notify(`Partner ${status === 'approved' ? 'approved ✅' : status === 'rejected' ? 'rejected ❌' : status === 'suspended' ? 'suspended 🚫' : 'updated'} successfully!`);
    } catch (e) {
      notify(e.response?.data?.message || 'Action failed', 'error');
    }
    setAction(null); setReason('');
  };

  const filtered = partners.filter(p => {
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchSt  = sFilter   === 'all' || p.status   === sFilter;
    const matchSrch = !search || p.fullName?.toLowerCase().includes(search.toLowerCase()) || p.mobile?.includes(search) || p.user?.email?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSt && matchSrch;
  });

  const counts = {
    all: partners.length,
    pending:   partners.filter(p=>p.status==='pending').length,
    approved:  partners.filter(p=>p.status==='approved').length,
    rejected:  partners.filter(p=>p.status==='rejected').length,
    suspended: partners.filter(p=>p.status==='suspended').length,
  };

  return (
    <div className="partners-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h2>👥 Partner Management</h2>
          <p>Real-time partner registrations from the database</p>
        </div>
        <button className="btn-refresh" onClick={load}>🔄 Refresh</button>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {loading && <div className="dash-loading">⏳ Loading partners…</div>}

      <div className="status-tabs">
        {Object.entries(counts).map(([k,v]) => (
          <button key={k} className={`stab ${sFilter===k?'active':''}`} onClick={()=>setSFilter(k)}>
            <span className="stab-label">{k.charAt(0).toUpperCase()+k.slice(1)}</span>
            <span className="stab-count">{v}</span>
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input className="search-input" placeholder="🔍 Search name, mobile or email…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="filter-sel" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="pickup">🚗 Pickup</option>
          <option value="washing">🧺 Washing</option>
          <option value="delivery">📦 Delivery</option>
          <option value="full-service">⭐ Full Service</option>
        </select>
      </div>

      {!loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Partner</th><th>Category</th><th>City</th><th>Service Area</th><th>Docs</th><th>Status</th><th>Applied</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="empty-row">
                  {partners.length === 0 ? '📋 No partners yet. Partners register on the partner app (port 3002).' : 'No partners match filter.'}
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p._id}>
                  <td>
                    <div className="partner-cell">
                      <div className="partner-avatar">{p.fullName?.[0] || '?'}</div>
                      <div>
                        <p className="partner-name">{p.fullName}</p>
                        <p className="partner-mobile">{p.mobile} • {p.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{catLabel(p.category)}</td>
                  <td>{p.city}</td>
                  <td className="area-cell">{p.serviceArea}</td>
                  <td><span style={{color: p.documentsVerified ? '#10b981' : '#f59e0b'}}>{p.documentsVerified ? '✅ Verified' : '⏳ Pending'}</span></td>
                  <td><span className="status-badge" style={{background:statColor(p.status)+'22',color:statColor(p.status)}}>{p.status}</span></td>
                  <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><button className="btn-view" onClick={()=>{setSelected(p);setAction(null);setReason('');}}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setSelected(null)}>✕</button>

            <div className="modal-top">
              <div className="modal-avatar">{selected.fullName?.[0] || '?'}</div>
              <div>
                <h3>{selected.fullName}</h3>
                <p>{selected.user?.email} • {selected.mobile}</p>
                <span className="status-badge" style={{background:statColor(selected.status)+'22',color:statColor(selected.status)}}>{selected.status}</span>
              </div>
            </div>

            <div className="modal-grid">
              <div><label>Category</label><p>{catLabel(selected.category)}</p></div>
              <div><label>City / PIN</label><p>{selected.city} – {selected.pincode}</p></div>
              <div><label>Address</label><p>{selected.address}</p></div>
              <div><label>Service Area</label><p>{selected.serviceArea}</p></div>
              <div><label>Documents</label><p>{selected.documentsVerified?'✅ Verified':'⏳ Not verified'}</p></div>
              <div><label>Applied On</label><p>{new Date(selected.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</p></div>
              <div><label>UPI</label><p>{selected.paymentDetails?.upi || '—'}</p></div>
              <div><label>Bank Account</label><p>{selected.paymentDetails?.accountNumber ? `****${selected.paymentDetails.accountNumber.slice(-4)}` : '—'}</p></div>
              <div><label>Pickup Commission</label><p>{selected.commission?.pickup??10}%</p></div>
              <div><label>Washing Commission</label><p>{selected.commission?.washing??20}%</p></div>
              <div><label>Delivery Commission</label><p>{selected.commission?.delivery??10}%</p></div>
              <div><label>Total Earnings</label><p>₹{(selected.earnings||[]).reduce((a,e)=>a+(e.amount||0),0)}</p></div>
              {selected.rejectionReason && <div style={{gridColumn:'span 2'}}><label>Rejection Reason</label><p style={{color:'#ef4444'}}>{selected.rejectionReason}</p></div>}
              {selected.changeRequest   && <div style={{gridColumn:'span 2'}}><label>Requested Changes</label><p style={{color:'#f59e0b'}}>{selected.changeRequest}</p></div>}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              {selected.status === 'pending' && <>
                <button className="btn-approve" onClick={()=>doAction(selected._id,'approved')}>✅ Approve</button>
                <button className="btn-reject2" onClick={()=>setAction(a=>a==='reject'?null:'reject')}>❌ Reject</button>
                <button className="btn-changes" onClick={()=>setAction(a=>a==='changes'?null:'changes')}>📝 Request Changes</button>
              </>}
              {selected.status === 'approved' && <>
                <button className="btn-suspend" onClick={()=>setAction(a=>a==='suspend'?null:'suspend')}>🚫 Suspend</button>
              </>}
              {selected.status === 'suspended' && <>
                <button className="btn-approve" onClick={()=>doAction(selected._id,'approved')}>♻️ Reactivate</button>
              </>}
              {selected.status === 'rejected' && <>
                <button className="btn-approve" onClick={()=>doAction(selected._id,'approved')}>✅ Approve Anyway</button>
              </>}
            </div>

            {action === 'reject' && (
              <div className="reason-box">
                <label>Rejection Reason *</label>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Why is this application rejected?" />
                <button className="btn-reject2" disabled={!reason.trim()} onClick={()=>doAction(selected._id,'rejected',reason)}>Confirm Rejection</button>
              </div>
            )}
            {action === 'changes' && (
              <div className="reason-box">
                <label>What changes are needed? *</label>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="e.g. Please upload a clear Aadhaar copy, add UPI details…" />
                <button className="btn-changes" disabled={!reason.trim()} onClick={()=>doAction(selected._id,'pending','',reason)}>Send Request</button>
              </div>
            )}
            {action === 'suspend' && (
              <div className="reason-box">
                <label>Suspension Reason *</label>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Reason for temporary suspension…" />
                <button className="btn-suspend" disabled={!reason.trim()} onClick={()=>doAction(selected._id,'suspended',reason)}>Confirm Suspension</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
