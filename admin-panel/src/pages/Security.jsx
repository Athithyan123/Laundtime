import React, { useState } from 'react';
import '../styles/security.css';

const roleColor = { 'super-admin':'#667eea','manager':'#06b6d4','support':'#10b981' };
const logIcon   = { success:'✅', warning:'⚠️', info:'ℹ️' };
const logColor  = { success:'#10b981', warning:'#f59e0b', info:'#3b82f6' };

export default function Security() {
  const storedUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
  const [admins, setAdmins] = useState(
    storedUser ? [{
      _id: storedUser._id || 'admin-1',
      name: storedUser.name || 'Super Admin',
      email: storedUser.email || 'admin@laundry.com',
      role: storedUser.role || 'super-admin',
      status: 'active',
      lastLogin: new Date().toISOString()
    }] : [
      { _id: 'admin-1', name: 'Super Admin', email: 'admin@laundry.com', role: 'super-admin', status: 'active', lastLogin: new Date().toISOString() }
    ]
  );
  const [logs] = useState([
    { action: 'Admin Login', user: storedUser?.name || 'Super Admin', target: storedUser?.email || 'admin@laundry.com', time: new Date().toISOString(), type: 'info' },
    { action: 'System Connected', user: 'System', target: 'MongoDB Live (Port 5001)', time: new Date().toISOString(), type: 'success' },
  ]);
  const [toast,  setToast]  = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name:'', email:'', role:'support', password:'' });

  const notify = (msg,type='success')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  const toggleStatus = (id) => {
    setAdmins(as => as.map(a => a._id===id ? {...a, status: a.status==='active'?'inactive':'active'} : a));
    notify('Admin status updated');
  };

  const addAdmin = () => {
    if (!newAdmin.name || !newAdmin.email) return;
    setAdmins(as => [...as, { _id:'a'+Date.now(), ...newAdmin, status:'active', lastLogin:null }]);
    setNewAdmin({ name:'', email:'', role:'support', password:'' });
    setShowAdd(false);
    notify('Admin account created!');
  };

  const timeAgo = d => { if(!d) return 'Never'; const diff=(Date.now()-new Date(d))/60000; if(diff<60) return `${Math.floor(diff)}m ago`; if(diff<1440) return `${Math.floor(diff/60)}h ago`; return `${Math.floor(diff/1440)}d ago`; };

  return (
    <div className="security-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div><h2>🔐 Security & Admin Accounts</h2><p>Manage admin access and monitor activity logs</p></div>
        <button className="btn-add-admin" onClick={()=>setShowAdd(s=>!s)}>➕ Add Admin</button>
      </div>

      {/* Add Admin Form */}
      {showAdd && (
        <div className="add-admin-form">
          <h3>Add New Admin</h3>
          <div className="add-grid">
            <div className="form-group"><label>Full Name</label><input placeholder="Admin name" value={newAdmin.name} onChange={e=>setNewAdmin(f=>({...f,name:e.target.value}))} /></div>
            <div className="form-group"><label>Email</label><input type="email" placeholder="admin@laundtime.com" value={newAdmin.email} onChange={e=>setNewAdmin(f=>({...f,email:e.target.value}))} /></div>
            <div className="form-group"><label>Role</label>
              <select value={newAdmin.role} onChange={e=>setNewAdmin(f=>({...f,role:e.target.value}))}>
                <option value="super-admin">Super Admin</option>
                <option value="manager">Manager</option>
                <option value="support">Support Agent</option>
              </select>
            </div>
            <div className="form-group"><label>Temp Password</label><input type="password" placeholder="••••••••" value={newAdmin.password} onChange={e=>setNewAdmin(f=>({...f,password:e.target.value}))} /></div>
          </div>
          <div className="form-actions">
            <button className="btn-approve" onClick={addAdmin}>✅ Create Account</button>
            <button className="btn-cancel" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Admin Accounts Table */}
      <div className="section-title">👤 Admin Accounts</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {admins.map(a=>(
              <tr key={a._id}>
                <td><strong>{a.name}</strong></td>
                <td>{a.email}</td>
                <td><span className="role-badge" style={{background:roleColor[a.role]+'22',color:roleColor[a.role]}}>{a.role}</span></td>
                <td><span className={`status-badge ${a.status==='active'?'badge-active':'badge-inactive'}`}>{a.status}</span></td>
                <td className="muted">{timeAgo(a.lastLogin)}</td>
                <td>
                  {a.role !== 'super-admin' && (
                    <button className={a.status==='active'?'btn-suspend':'btn-approve'} onClick={()=>toggleStatus(a._id)}>
                      {a.status==='active'?'🚫 Deactivate':'✅ Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity Logs */}
      <div className="section-title" style={{marginTop:'2rem'}}>📋 Activity Logs</div>
      <div className="logs-list">
        {logs.map((l,i)=>(
          <div key={i} className="log-item">
            <span className="log-icon">{logIcon[l.type]}</span>
            <div className="log-info">
              <p className="log-action" style={{color:logColor[l.type]}}>{l.action}</p>
              <p className="log-meta">{l.user} → {l.target}</p>
            </div>
            <span className="log-time">{timeAgo(l.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
