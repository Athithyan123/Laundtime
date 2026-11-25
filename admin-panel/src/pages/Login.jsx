import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('admin@laundry.com');
  const [password, setPassword] = useState('admin123');
  const [show,     setShow]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🧺</span>
          <h1>LaundTime</h1>
          <p>Admin Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@laundry.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="pass-wrap">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShow(s => !s)}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : '🔐 Sign In as Admin'}
          </button>
        </form>

        <div className="login-hint">
          <p>Demo credentials pre-filled above</p>
          <p><strong>admin@laundry.com</strong> / <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
}
