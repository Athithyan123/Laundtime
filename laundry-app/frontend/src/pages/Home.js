import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handle = (e) =>
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  const services = [
    { id: 1, icon: "🧺", title: "Wash & Fold", description: "Premium laundry cleaning with soft touch care for everyday clothes.", color: "#1a6ea8" },
    { id: 2, icon: "👔", title: "Dry Cleaning", description: "Professional dry cleaning for delicate, formal and luxury fabrics.", color: "#0d2137" },
    { id: 3, icon: "🔥", title: "Iron & Press", description: "Expert steam ironing to give every garment a crisp, sharp look.", color: "#059669" },
    { id: 4, icon: "⭐", title: "Premium Care", description: "Specialized spa-level care for designer and luxury clothing.", color: "#d97706" },
  ];

  const features = [
    { icon: "🚗", title: "Free Pickup", description: "Same-day doorstep pickup available in your area." },
    { icon: "⚡", title: "24h Delivery", description: "Most orders returned within 24 hours of pickup." },
    { icon: "💰", title: "Best Price", description: "Transparent, affordable pricing with no hidden fees." },
    { icon: "✨", title: "Quality Care", description: "Expert professionals handling your clothes with care." },
  ];

  return (
    <div className="home-container">

      {/* ── HERO ── */}
      <section className="hero-section">
        <div
          className="hero-background"
          style={{
            background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(91,184,245,0.18) 0%, transparent 55%)`,
          }}
        />

        <div className="hero-content">
          {/* Left: Text */}
          <div className="hero-text">
            <div className="hero-tag">Premium Garment Care</div>

            <h1 className="hero-title">
              Laundry Day,{" "}
              <span className="hero-title-accent">Reimagined.</span>
            </h1>

            <p className="hero-subtitle">
              Fresh. Clean. Delivered to your door.
            </p>

            <p className="hero-description">
              Experience spa-level laundry care with free pickup, expert
              cleaning, and guaranteed 24-hour turnaround — all from the
              comfort of your home.
            </p>

            {/* Stats */}
            <div className="hero-stats">
              <div>
                <div className="hero-stat-num">15K+</div>
                <div className="hero-stat-label">Happy Customers</div>
              </div>
              <div className="hero-stat-divider" />
              <div>
                <div className="hero-stat-num">4.9★</div>
                <div className="hero-stat-label">Avg. Rating</div>
              </div>
              <div className="hero-stat-divider" />
              <div>
                <div className="hero-stat-num">24h</div>
                <div className="hero-stat-label">Turnaround</div>
              </div>
            </div>

            {/* Buttons */}
            {user ? (
              <div className="hero-buttons">
                <button className="btn btn-primary" onClick={() => navigate("/services")}>
                  🧺 Browse Services
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/pricing")}>
                  🏷️ Pricing & Plans
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/orders")}>
                  📦 My Orders
                </button>
              </div>
            ) : (
              <div className="hero-buttons">
                <button className="btn btn-primary" onClick={() => navigate("/register")}>
                  Get Started Free
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/pricing")}>
                  🏷️ View Pricing
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/login")}>
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Right: decorative visual only **/}
          <div className="hero-visual">
            <div className="hero-visual-inner">
              <div className="hero-visual-badge">🧺 Premium Care</div>
              <div className="hero-visual-badge">⚡ 24h Delivery</div>
              <div className="hero-visual-badge">✅ 15K+ Happy Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="trust-section">
        <div className="trust-inner">
          {[
            { icon: "🛡️", text: "100% Safe & Hygienic" },
            { icon: "📱", text: "Easy Online Booking" },
            { icon: "🚚", text: "Free Pickup & Delivery" },
            { icon: "⏰", text: "24-Hour Turnaround" },
            { icon: "💳", text: "Secure Payments" },
          ].map((t, i) => (
            <div key={i} className="trust-item">
              <span className="trust-item-icon">{t.icon}</span>
              <span className="trust-item-text">{t.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section className="services-section">
        <div className="section-header">
          <div className="section-tag">What We Offer</div>
          <h2>Professional Laundry Services</h2>
          <p>Choose the perfect service for your garment care needs</p>
        </div>

        <div className="services-grid">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="service-card"
              onClick={() => navigate("/services")}
              style={{ "--color": service.color, "--index": index }}
            >
              <div className="service-card-inner">
                <div className="service-icon-wrap">
                  <span className="service-icon">{service.icon}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <button className="service-btn">Explore →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES / HOW IT WORKS ── */}
      <section className="features-section">
        <div className="section-header">
          <div className="section-tag">Why LaundTime</div>
          <h2>Premium Care, Made Simple</h2>
          <p>From pickup to delivery — completely hassle-free</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready for Spa-Level Clean?</h2>
          <p>
            Join 15,000+ customers who trust LaundTime with their finest
            garments. First order? Get 20% off!
          </p>
          {!user ? (
            <button className="btn-large" onClick={() => navigate("/register")}>
              🎉 Start for Free
            </button>
          ) : (
            <button className="btn-large" onClick={() => navigate("/services")}>
              🧺 Book a Pickup
            </button>
          )}
        </div>
      </section>

    </div>
  );
}