import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api";
import "./Auth.css";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      // Save to AuthContext
      login(data.user, data.token);
      navigate("/dashboard");

    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Header */}
        <div className="auth-logo">
          <span className="auth-logo-icon">🧺</span>
          <h1 className="auth-logo-text">LaundTime</h1>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Welcome back! Please sign in to continue.</p>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><span className="btn-spinner"></span> Signing in...</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="auth-divider"><span>Don't have an account?</span></div>

          <Link to="/register" className="auth-link-btn">
            Create New Account
          </Link>

          <div className="auth-hint">
            <p>Test credentials: <strong>demo@laundryapp.com</strong> / <strong>demo123</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}