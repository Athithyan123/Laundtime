import axios from 'axios';

// ─────────────────────────────────────────────────────────
// ✅ Smart base URL — works on PC (localhost), mobile & cloud
// ─────────────────────────────────────────────────────────
export const getBaseURL = () => {
  // If .env overrides (e.g. on Render), use that
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  // Development / Localhost
  const host = window.location.hostname;
  return `http://${host}:5001/api`;
};

export const API_BASE_URL = getBaseURL();

// ✅ Create API instance
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─────────────────────────────────────────────────────────
// ✅ Mock user storage (fallback when backend is offline)
// ─────────────────────────────────────────────────────────
const getMockUsers = () => JSON.parse(localStorage.getItem('mockUsers') || '[]');
const saveMockUsers = (users) => localStorage.setItem('mockUsers', JSON.stringify(users));

// Built-in demo accounts
const DEMO_ACCOUNTS = [
  { id: 'demo-1', name: 'Demo User',  email: 'demo@laundryapp.com', password: 'demo123',  phone: '9999999999', role: 'user'  },
  { id: 'demo-2', name: 'Admin User', email: 'admin@laundry.com',   password: 'admin123', phone: '8888888888', role: 'admin' },
  { id: 'demo-3', name: 'Test User',  email: 'test@test.com',       password: 'test123',  phone: '7777777777', role: 'user'  },
];

// ─────────────────────────────────────────────────────────
// ✅ Request interceptor — attach token automatically
// ─────────────────────────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────
// ✅ Response interceptor — handle 401 globally
// ─────────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────
// ✅ Check if backend is reachable
// ─────────────────────────────────────────────────────────
const checkBackend = async () => {
  try {
    const res = await API.get('/health', { timeout: 4000 });
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────
// ✅ Mock token generator
// ─────────────────────────────────────────────────────────
const makeMockToken = (id) => `mock-token-${id}-${Date.now()}`;

// ─────────────────────────────────────────────────────────
// ✅ authAPI — with real backend + automatic mock fallback
// ─────────────────────────────────────────────────────────
export const authAPI = {

  // ── REGISTER ──
  register: async (userData) => {
    const isUp = await checkBackend();

    if (isUp) {
      try {
        const { data } = await API.post('/auth/register', userData);
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user || data));
          localStorage.setItem('isLoggedIn', 'true');
        }
        return data;
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Registration failed');
      }
    }

    // ── Mock fallback ──
    console.warn('⚠️ Backend offline — using mock register');
    const mockUsers = getMockUsers();
    const allUsers  = [...DEMO_ACCOUNTS, ...mockUsers];
    if (allUsers.find(u => u.email === userData.email.toLowerCase())) {
      throw new Error('An account with this email already exists');
    }
    const newUser = {
      id: `mock-${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      phone: userData.phone || '',
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    saveMockUsers([...mockUsers, newUser]);
    const token = makeMockToken(newUser.id);
    const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(safeUser));
    localStorage.setItem('isLoggedIn', 'true');
    return { message: 'Account created successfully!', token, user: safeUser };
  },

  // ── LOGIN ──
  login: async (credentials) => {
    const isUp = await checkBackend();

    if (isUp) {
      try {
        const { data } = await API.post('/auth/login', {
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password,
        });
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user || data));
          localStorage.setItem('isLoggedIn', 'true');
        }
        return data;
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Invalid email or password');
      }
    }

    // ── Mock fallback ──
    console.warn('⚠️ Backend offline — using mock login');
    const email    = credentials.email.toLowerCase().trim();
    const password = credentials.password;
    const mockUsers = getMockUsers();
    const allUsers  = [...DEMO_ACCOUNTS, ...mockUsers];
    const found = allUsers.find(u => u.email === email && u.password === password);
    if (!found) throw new Error('Invalid email or password');

    const token    = makeMockToken(found.id);
    const safeUser = { id: found.id, name: found.name, email: found.email, phone: found.phone || '', role: found.role || 'user' };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(safeUser));
    localStorage.setItem('isLoggedIn', 'true');
    return { message: 'Login successful!', token, user: safeUser };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  },

  getCurrentUser: () => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  },

  isAuthenticated: () => localStorage.getItem('isLoggedIn') === 'true',
  checkBackendStatus: checkBackend,
  getMockUsers,
};

export default API;