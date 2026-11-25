import React, { createContext, useContext, useState } from 'react';
import API from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminUser')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      // Try real backend first
      const res = await API.post('/auth/admin/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser',  JSON.stringify(user));
      setAdmin(user);
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Is the backend running?';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
