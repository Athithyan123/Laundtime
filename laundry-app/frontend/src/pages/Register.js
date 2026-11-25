import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api";
import "./Auth.css";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validate = () => {
    if (!formData.name.trim()) return "Full name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Enter a valid email address";
    if (!formData.phone.trim()) return "Phone number is required";
    if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ""))) return "Enter a valid 10-digit phone number";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authAPI.register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password
      });

      // Auto-login and go to dashboard
      login(data.user, data.token);
      navigate("/dashboard");

    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Weak", color: "#e74c3c" };
    if (p.length < 10) return { label: "Good", color: "#f39c12" };
    return { label: "Strong", color: "#27ae60" };
  };

  const strength = passwordStrength();

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">🧺</span>
          <h1 className="auth-logo-text">LaundTime</h1>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join thousands of happy customers</p>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                disabled={loading}
                required
                maxLength="15"
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
                  placeholder="At least 6 characters"
                  disabled={loading}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {strength && (
                <div className="password-strength">
                  <span style={{ color: strength.color, fontWeight: 600, fontSize: "12px" }}>
                    ● {strength.label} password
                  </span>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                disabled={loading}
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <span className="field-error">Passwords do not match</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><span className="btn-spinner"></span> Creating account...</>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="auth-divider"><span>Already have an account?</span></div>

          <Link to="/login" className="auth-link-btn secondary">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}