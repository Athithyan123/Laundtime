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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-nav-active' : ''}`}>
      {/* ── Mobile Backdrop Overlay ── */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={closeMobile} 
          aria-label="Close navigation overlay"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-left">
            <span className="brand-icon">🧺</span>
            {(!collapsed || mobileOpen) && <span className="brand-name">LaundTime</span>}
          </div>
          <button 
            className="mobile-close-btn" 
            onClick={closeMobile} 
            title="Close menu" 
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '▶' : '◀'}
        </button>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink 
              key={to} 
              to={to} 
              onClick={closeMobile}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {(!collapsed || mobileOpen) && <span className="nav-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {(!collapsed || mobileOpen) && (
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
          <button className="logout-btn" onClick={() => { closeMobile(); handleLogout(); }} title="Logout">
            🚪 {(!collapsed || mobileOpen) && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="hamburger-btn" 
              onClick={() => setMobileOpen(o => !o)} 
              title="Toggle Menu"
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div className="topbar-title-wrap">
              <h1 className="page-title">Admin Control Panel</h1>
              <span className="mobile-brand-pill">🧺 LaundTime</span>
            </div>
          </div>

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
              🚪 <span className="logout-text">Logout</span>
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
