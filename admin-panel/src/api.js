import axios from 'axios';

const getAdminBaseURL = () => {
  if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = window.location.hostname;
  return `http://${host}:5001/api`;
};

const API = axios.create({
  baseURL: getAdminBaseURL(),
  timeout: 10000,
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
