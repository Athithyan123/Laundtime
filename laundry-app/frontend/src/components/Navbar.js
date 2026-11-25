import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartItemsCount } = useCart();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const cartCount = getCartItemsCount();

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo">
          <span className="logo-dot">●</span>
          <span className="logo-text">LaundTime</span>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Home
          </NavLink>
          <NavLink to="/pricing" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Pricing
          </NavLink>
          {user && (
            <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Book Services
            </NavLink>
          )}
          {user && (
            <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              My Orders
            </NavLink>
          )}
          {user && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              Dashboard
            </NavLink>
          )}
        </nav>

        {/* Right actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              {/* Cart */}
              <button className="icon-btn" onClick={() => navigate("/cart")} title="Cart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>

              {/* User dropdown */}
              <div className="user-dropdown-wrap">
                <button
                  className="user-avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  title="Profile"
                >
                  <div className="avatar-circle">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="dropdown-name">{user?.name}</div>
                        <div className="dropdown-email">{user?.email}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"/>
                    <NavLink to="/profile" className="dropdown-item">👤 Profile</NavLink>
                    <NavLink to="/wallet" className="dropdown-item">💳 Wallet</NavLink>
                    <NavLink to="/reviews" className="dropdown-item">⭐ My Reviews</NavLink>
                    {user?.role === "admin" && (
                      <NavLink to="/admin" className="dropdown-item">🛡️ Admin Panel</NavLink>
                    )}
                    <div className="dropdown-divider"/>
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Book CTA */}
              <button className="nav-cta-btn" onClick={() => navigate("/services")}>
                Book a Pickup
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">Sign In</NavLink>
              <NavLink to="/register" className="nav-cta-btn">Get Started</NavLink>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className={`hamburger-btn ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span/><span/><span/>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <NavLink to="/" className="mobile-link" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/pricing" className="mobile-link" onClick={() => setMenuOpen(false)}>Pricing</NavLink>
          {user ? (
            <>
              <NavLink to="/services" className="mobile-link" onClick={() => setMenuOpen(false)}>Book Services</NavLink>
              <NavLink to="/orders" className="mobile-link" onClick={() => setMenuOpen(false)}>My Orders</NavLink>
              <NavLink to="/dashboard" className="mobile-link" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/cart" className="mobile-link" onClick={() => setMenuOpen(false)}>
                Cart {cartCount > 0 && `(${cartCount})`}
              </NavLink>
              <NavLink to="/profile" className="mobile-link" onClick={() => setMenuOpen(false)}>Profile</NavLink>
              <NavLink to="/wallet" className="mobile-link" onClick={() => setMenuOpen(false)}>Wallet</NavLink>
              <button className="mobile-link danger" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="mobile-link" onClick={() => setMenuOpen(false)}>Sign In</NavLink>
              <NavLink to="/register" className="mobile-cta" onClick={() => setMenuOpen(false)}>Create Account</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}