import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

const NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard'  },
  { to: '/customers', icon: '👤', label: 'Customers'  },
  { to: '/partners',  icon: '👥', label: 'Partners'   },
  { to: '/orders',    icon: '📦', label: 'Orders'     },
  { to: '/payments',  icon: '💰', label: 'Payments'   },
  { to: '/settings',  icon: '⚙️',  label: 'Settings'  },
  { to: '/security',  icon: '🔐', label: 'Security'   },
];

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🧺</span>
          {!collapsed && <span className="brand-name">LaundTime</span>}
        </div>

        <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '▶' : '◀'}
        </button>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {!collapsed && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="admin-info">
              <div className="admin-avatar">
                {admin?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <p className="admin-name">{admin?.name || 'Admin'}</p>
                <p className="admin-role">Super Admin</p>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            🚪 {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">Admin Control Panel</h1>
          <div className="topbar-right">
            <span className="topbar-badge">🟢 Live</span>
            <div className="topbar-user">
              <span className="topbar-avatar">{admin?.name?.[0]?.toUpperCase() || 'A'}</span>
              <span className="topbar-admin">{admin?.name || 'Admin'}</span>
            </div>
            <button
              className="topbar-logout-btn"
              onClick={handleLogout}
              title="Sign out of Admin Panel"
            >
              🚪 Logout
            </button>
          </div>
        </header>
        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
