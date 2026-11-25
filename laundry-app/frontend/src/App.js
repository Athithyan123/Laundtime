import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider }   from "./context/CartContext";
import { AuthProvider }   from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";
import Navbar           from "./components/Navbar";
import AIAssistant      from "./components/AIAssistant";
import Home             from "./pages/Home";
import Login            from "./pages/Login";
import Register         from "./pages/Register";
import Services         from "./pages/Services";
import Cart             from "./pages/Cart";
import Checkout         from "./pages/Checkout";
import Orders           from "./pages/Orders";
import Book             from "./pages/Book";
import TrackOrder       from "./pages/TrackOrder";
import Dashboard        from "./pages/Dashboard";
import Wallet           from "./pages/Wallet";
import Admin            from "./pages/Admin";
import Profile          from "./pages/Profile";
import Reviews          from "./pages/Reviews";
import Pricing          from "./pages/Pricing";
import Referral         from "./components/Referral";
import Payment          from "./pages/Payment";

// ── New Feature Pages ──
import KGSubscription   from "./pages/KGSubscription";
import CustomerInsights from "./pages/CustomerInsights";
import Invoice          from "./pages/Invoice";
import RiderPanel       from "./pages/RiderPanel";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="App">
              <Navbar />
              <Routes>
                {/* ── Core ── */}
                <Route path="/"             element={<Home />} />
                <Route path="/login"        element={<Login />} />
                <Route path="/register"     element={<Register />} />
                <Route path="/services"     element={<Services />} />
                <Route path="/cart"         element={<Cart />} />
                <Route path="/checkout"     element={<Checkout />} />
                <Route path="/payment"      element={<Payment />} />
                <Route path="/orders"       element={<Orders />} />
                <Route path="/book/:id"     element={<Book />} />
                <Route path="/track/:orderId" element={<TrackOrder />} />
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/wallet"       element={<Wallet />} />
                <Route path="/admin"        element={<Admin />} />
                <Route path="/profile"      element={<Profile />} />
                <Route path="/reviews"      element={<Reviews />} />
                <Route path="/pricing"      element={<Pricing />} />
                <Route path="/subscription" element={<Pricing />} />
                <Route path="/referral"     element={<Referral />} />

                {/* ── New Features ── */}
                <Route path="/kg-plans"     element={<KGSubscription />} />
                <Route path="/insights"     element={<CustomerInsights />} />
                <Route path="/invoice/:id"  element={<Invoice />} />
                <Route path="/invoice"      element={<Invoice />} />
                <Route path="/rider"        element={<RiderPanel />} />
              </Routes>

              {/* AI Assistant floats on all pages */}
              <AIAssistant />
            </div>
          </BrowserRouter>
        </CartProvider>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;