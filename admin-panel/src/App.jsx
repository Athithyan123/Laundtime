import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Partners from './pages/Partners';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Security from './pages/Security';

function ProtectedRoute({ children }) {
  const { admin } = useAuth();
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="partners"  element={<Partners />} />
            <Route path="orders"    element={<Orders />} />
            <Route path="payments"  element={<Payments />} />
            <Route path="settings"  element={<Settings />} />
            <Route path="security"  element={<Security />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
