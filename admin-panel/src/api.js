import axios from 'axios';

export const getAdminBaseURL = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // 1. If running on Render (*.onrender.com)
    if (host.includes('onrender.com')) {
      return 'https://laundtime-backend.onrender.com/api';
    }

    // 2. If running locally on PC
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }

    // 3. Cloud / Custom domain over HTTPS
    if (protocol === 'https:') {
      return `https://${host}/api`;
    }
  }

  // 4. Explicit Vite environment variable (if set and not localhost)
  if (import.meta.env?.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
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
