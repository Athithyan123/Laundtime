import axios from 'axios';

export const getAdminBaseURL = () => {
  // 1. Explicit Vite environment variable (if set in Render or .env)
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    // 2. Local development
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }

    // 3. Render cloud hosting - automatically route to laundtime-backend on Render
    if (host.includes('onrender.com')) {
      return 'https://laundtime-backend.onrender.com/api';
    }

    // 4. Custom domain with HTTPS
    return `${window.location.protocol}//${host}/api`;
  }

  return 'http://localhost:5001/api';
};

const API = axios.create({
  baseURL: getAdminBaseURL(),
  timeout: 15000,
});

// Attach admin JWT on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
