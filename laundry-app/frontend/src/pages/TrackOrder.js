import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "./TrackOrder.css";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",       desc: "Searching for available partners within 7 KM",  icon: "📝" },
  { key: "confirmed",  label: "Partner Assigned",   desc: "Partner en route for laundry pickup",            icon: "🚗" },
  { key: "picked",     label: "Laundry Picked Up",  desc: "Clothes collected & heading to care hub",        icon: "📦" },
  { key: "processing", label: "Washing & Care",     desc: "Garments washed, dried & sanitized",             icon: "🔄" },
  { key: "ready",      label: "Washing Completed",  desc: "Cleaned & packed · Out for doorstep delivery",   icon: "✨" },
  { key: "delivered",  label: "Delivered",          desc: "Delivered safely · Tracking ended",              icon: "🏠" },
];

const STATUS_ORDER = ["pending", "confirmed", "picked", "processing", "ready", "delivered"];

export default function TrackOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);

  // Map references
  const mapRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const hubMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const simStepRef = useRef(0);

  // ── Fetch real order from backend ──────────────────────────────────────────
  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/track/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
          setLastRefreshed(new Date());
          setError("");
          return data.order;
        }
      }
      // Fallback: check localStorage
      const saved = JSON.parse(localStorage.getItem("laundryOrders") || "[]");
      const local = saved.find(o => o._id === orderId || o.trackingId === orderId || o.orderNumber === orderId);
      if (local) {
        setOrder(local);
        setError("");
        return local;
      } else {
        setError("Order not found. Please verify your tracking ID.");
      }
    } catch {
      const saved = JSON.parse(localStorage.getItem("laundryOrders") || "[]");
      const local = saved.find(o => o._id === orderId || o.trackingId === orderId || o.orderNumber === orderId);
      if (local) {
        setOrder(local);
        setError("");
        return local;
      } else {
        setError("Could not connect to tracking server.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Auto-poll interval (stops automatically when delivered - Requirement 6)
  useEffect(() => {
    if (!order || order.status === "delivered") return; // Stop polling on delivery

    const interval = setInterval(() => {
      fetchOrder(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  const currentStatus = order?.status || "pending";
  const currentStepIndex = STATUS_ORDER.indexOf(currentStatus);
  const trackingData = useMemo(() => order?.liveTracking || {}, [order?.liveTracking]);

  // Active partner details
  const activePartner = trackingData.activePartner || order?.pickupPartner || order?.deliveryPartner;

  // ── Initialize & Update Interactive Leaflet Map ──────────────────────────
  useEffect(() => {
    if (!order) return;
    if (!window.L) return;

    const L = window.L;

    const customerLat = trackingData.customerLocation?.lat || order.customerLocation?.lat || order.customerDetails?.lat || 13.0827;
    const customerLng = trackingData.customerLocation?.lng || order.customerLocation?.lng || order.customerDetails?.lng || 80.2707;

    const hubLat = trackingData.hubLocation?.lat || customerLat + 0.018;
    const hubLng = trackingData.hubLocation?.lng || customerLng + 0.015;

    let partnerLat = trackingData.partnerLocation?.lat;
    let partnerLng = trackingData.partnerLocation?.lng;

    if (!partnerLat || !partnerLng || (partnerLat === customerLat && partnerLng === customerLng)) {
      partnerLat = currentStatus === "ready" ? hubLat : customerLat + 0.016;
      partnerLng = currentStatus === "ready" ? hubLng : customerLng + 0.019;
    }

    const mapElement = document.getElementById("live-leaflet-canvas");
    if (!mapElement) return;

    // Create map instance if not exists
    if (!mapRef.current) {
      const map = L.map("live-leaflet-canvas", {
        zoomControl: true,
        attributionControl: false
      }).setView([customerLat, customerLng], 14);

      // CartoDB Voyager tiles (clean, modern, Zomato/Rapido style)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    // 1. Customer Marker
    if (!customerMarkerRef.current) {
      const customerIcon = L.divIcon({
        className: "custom-leaflet-icon customer-pin",
        html: `<div class="pulse-ring"></div><div class="pin-badge pin-customer">🏠</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });
      customerMarkerRef.current = L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>Your Address</b><br/>${order.customerDetails?.address || order.customerDetails?.city || "Delivery Point"}`);
    } else {
      customerMarkerRef.current.setLatLng([customerLat, customerLng]);
    }

    // 2. Hub Marker
    if (!hubMarkerRef.current) {
      const hubIcon = L.divIcon({
        className: "custom-leaflet-icon hub-pin",
        html: `<div class="pin-badge pin-hub">🧺</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
      hubMarkerRef.current = L.marker([hubLat, hubLng], { icon: hubIcon })
        .addTo(map)
        .bindPopup(`<b>LaundTime Care Hub</b><br/>High-standard washing & sanitization center`);
    } else {
      hubMarkerRef.current.setLatLng([hubLat, hubLng]);
    }

    // 3. Live Vehicle Marker (Pickup Car 🚗 or Delivery Bike 🛵)
    const isDeliveryPhase = currentStatus === "ready";
    const vehicleEmoji = isDeliveryPhase ? "🛵" : "🚗";

    if (!vehicleMarkerRef.current) {
      const vehicleIcon = L.divIcon({
        className: "custom-leaflet-icon vehicle-pin",
        html: `
          <div class="vehicle-pulse"></div>
          <div class="pin-badge pin-vehicle">
            <span class="vehicle-emoji">${vehicleEmoji}</span>
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23]
      });

      vehicleMarkerRef.current = L.marker([partnerLat, partnerLng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup(`<b>${activePartner?.fullName || "LaundTime Partner"}</b><br/>${isDeliveryPhase ? "Delivering laundry" : "Travelling for pickup"}`);
    } else {
      vehicleMarkerRef.current.setLatLng([partnerLat, partnerLng]);
      // Update vehicle emoji if phase changed
      const iconElement = document.querySelector(".vehicle-emoji");
      if (iconElement) iconElement.innerText = vehicleEmoji;
    }

    // 4. Dynamic Route Polyline
    const targetDestLat = isDeliveryPhase || currentStatus === "confirmed" ? customerLat : hubLat;
    const targetDestLng = isDeliveryPhase || currentStatus === "confirmed" ? customerLng : hubLng;

    const routeWaypoints = [
      [partnerLat, partnerLng],
      [(partnerLat + targetDestLat) / 2 + 0.002, (partnerLng + targetDestLng) / 2 - 0.002],
      [targetDestLat, targetDestLng]
    ];

    if (!routePolylineRef.current) {
      routePolylineRef.current = L.polyline(routeWaypoints, {
        color: "#667eea",
        weight: 5,
        opacity: 0.85,
        dashArray: "8, 8",
        lineCap: "round"
      }).addTo(map);
    } else {
      routePolylineRef.current.setLatLngs(routeWaypoints);
    }

    // Adjust viewport to frame vehicle & customer
    if (!isSimulatingDrive) {
      const bounds = L.latLngBounds([
        [customerLat, customerLng],
        [partnerLat, partnerLng],
        [hubLat, hubLng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [order, trackingData, currentStatus, activePartner, isSimulatingDrive]);

  // ── Real-Time Motion Simulator (Allows testing live GPS on any browser) ──
  const toggleSimulation = () => {
    if (isSimulatingDrive) {
      setIsSimulatingDrive(false);
      return;
    }

    if (!mapRef.current || !vehicleMarkerRef.current) return;
    setIsSimulatingDrive(true);

    const customerLat = trackingData.customerLocation?.lat || 13.0827;
    const customerLng = trackingData.customerLocation?.lng || 80.2707;
    const startLat = customerLat + 0.018;
    const startLng = customerLng + 0.021;

    let step = 0;
    const totalSteps = 40;

    const simTimer = setInterval(() => {
      step++;
      simStepRef.current = step;
      const progress = step / totalSteps;

      const currentLat = startLat + (customerLat - startLat) * progress;
      const currentLng = startLng + (customerLng - startLng) * progress;

      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([currentLat, currentLng]);
      }

      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs([
          [currentLat, currentLng],
          [customerLat, customerLng]
        ]);
      }

      if (step >= totalSteps) {
        clearInterval(simTimer);
        setIsSimulatingDrive(false);
      }
    }, 800);
  };

  const getStepTime = (stepKey) => {
    if (!order?.statusHistory) return null;
    const historyEntry = order.statusHistory.find(h => h.status === stepKey);
    if (historyEntry?.timestamp) {
      return new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return null;
  };

  if (loading) {
    return (
      <div className="track-order-container">
        <div className="track-loading-box">
          <div className="radar-spinner"></div>
          <h2>Connecting to LaundTime Live GPS Network...</h2>
          <p>Scanning 7 KM partner radius & live coordinates</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="track-order-container">
        <div className="error-state">
          <h2>Order Not Found</h2>
          <p>{error || "We couldn't locate this order."}</p>
          <button onClick={() => navigate("/orders")} className="back-btn">
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const trackingNumber = order.trackingId || order.orderNumber || order._id?.slice(-8);
  const distanceDisplay = trackingData.distanceKm ? `${trackingData.distanceKm} km` : "1.8 km";
  const etaDisplay = trackingData.etaMinutes ? `${trackingData.etaMinutes} mins` : "6 mins";

  return (
    <div className="track-order-container">
      {/* Header */}
      <div className="track-header">
        <div className="track-header-left">
          <button onClick={() => navigate("/orders")} className="back-btn">
            ← Back to Orders
          </button>
          <div>
            <h1>Live Order Tracking</h1>
            <p className="track-subtitle">
              Zomato & Rapido style real-time GPS dispatch · {lastRefreshed ? `Synced ${lastRefreshed.toLocaleTimeString()}` : "Live"}
            </p>
          </div>
        </div>

        <div className="order-info">
          <span className="live-status-chip">
            {currentStatus === "delivered" ? "Delivered ✅" : "🟢 Live Tracking Active"}
          </span>
          <strong className="tracking-number">#{trackingNumber}</strong>
          <span>Placed on {new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      <div className="track-content">
        {/* Left Side: Status Milestones & Partner Card */}
        <div className="status-section">
          <div className="section-title-row">
            <h2>Order Progress</h2>
            <span className="radius-tag">7 KM GPS Detection</span>
          </div>

          <div className="status-timeline">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = currentStepIndex >= index;
              const isCurrent = currentStepIndex === index;
              const stepTime = getStepTime(step.key);

              return (
                <div
                  key={step.key}
                  className={`timeline-item ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-marker">
                    <div
                      className="marker"
                      style={{
                        backgroundColor: isCompleted ? "#10b981" : "#e5e7eb",
                        color: isCompleted ? "#ffffff" : "#6b7280"
                      }}
                    >
                      {isCompleted ? "✓" : step.icon}
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className="timeline-line"
                        style={{ backgroundColor: currentStepIndex > index ? "#10b981" : "#e5e7eb" }}
                      />
                    )}
                  </div>
                  <div className="timeline-content">
                    <h4 style={{ margin: "0 0 2px", color: isCompleted ? "#111827" : "#6b7280" }}>
                      {step.label}
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280" }}>
                      {step.desc}
                    </p>
                    {stepTime && (
                      <span className="step-timestamp">
                        {stepTime}
                      </span>
                    )}
                    {isCurrent && (
                      <div className="current-status-badge">
                        ● Current Phase
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── REAL PARTNER INFORMATION CARD ── */}
          <div className="driver-info">
            <h3>{currentStatus === "ready" || currentStatus === "delivered" ? "🛵 Delivery Partner" : "🚗 Pickup Partner"}</h3>

            {activePartner ? (
              <>
                <div className="driver-details">
                  <div className="driver-avatar">
                    {activePartner.fullName
                      ? activePartner.fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                      : "P"}
                  </div>
                  <div className="driver-text">
                    <strong style={{ fontSize: "1.05rem" }}>{activePartner.fullName}</strong>
                    <p className="verified-partner-text">
                      ✔ Verified LaundTime Partner ({activePartner.category?.toUpperCase() || "DELIVERY"})
                    </p>
                    <p>📞 {activePartner.mobile || "Mobile available upon pickup"}</p>
                    {activePartner.serviceArea && (
                      <p style={{ color: "#6b7280", fontSize: "0.8rem" }}>📍 Base: {activePartner.serviceArea}</p>
                    )}
                  </div>
                </div>

                {activePartner.mobile && (
                  <a
                    href={`tel:${activePartner.mobile}`}
                    className="call-driver-btn"
                  >
                    📞 Call Partner ({activePartner.mobile})
                  </a>
                )}
              </>
            ) : (
              <div className="partner-searching-state">
                <div className="searching-radar"></div>
                <p>⏳ Auto-detecting nearest partner within 7 KM...</p>
                <small>First-come, first-served assignment is running automatically.</small>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Live Map & Trip Details */}
        <div className="map-section">
          <div className="live-map-card">
            <div className="live-map-header">
              <div>
                <h3>📍 Real-Time Partner Map</h3>
                <p className="map-subhead">Live GPS stream · Updates every few seconds</p>
              </div>
              <div className="map-header-badges">
                <button
                  className="demo-drive-btn"
                  onClick={toggleSimulation}
                  title="Simulate partner vehicle motion on the map"
                >
                  {isSimulatingDrive ? "⏸ Pause Demo Drive" : "▶ Demo Live Motion"}
                </button>
                <span className="eta-badge">
                  {currentStatus === "delivered"
                    ? "Delivered ✅"
                    : currentStatus === "ready"
                    ? `🛵 Arriving in ~${etaDisplay} (${distanceDisplay})`
                    : currentStatus === "confirmed"
                    ? `🚗 Arriving in ~${etaDisplay} (${distanceDisplay})`
                    : currentStatus === "picked"
                    ? "📦 Heading to Hub"
                    : "⏳ Detecting Nearby Partner"}
                </span>
              </div>
            </div>

            {/* Interactive Leaflet OpenStreetMap Canvas */}
            <div className="leaflet-map-wrapper">
              <div id="live-leaflet-canvas" className="live-leaflet-canvas"></div>

              {/* Live Overlay Banner */}
              <div className="map-floating-overlay">
                <div className="floating-stat">
                  <span className="stat-label">STATUS</span>
                  <strong>
                    {currentStatus === "confirmed" ? "🚗 Travelling for Pickup"
                      : currentStatus === "picked" ? "📦 Laundry Picked Up"
                      : currentStatus === "processing" ? "🧺 Washing at Hub"
                      : currentStatus === "ready" ? "🛵 Out for Delivery"
                      : currentStatus === "delivered" ? "✅ Delivered Safely"
                      : "🔍 Searching 7 KM"}
                  </strong>
                </div>
                <div className="floating-stat">
                  <span className="stat-label">DISTANCE</span>
                  <strong>{currentStatus === "delivered" ? "0 km" : distanceDisplay}</strong>
                </div>
                <div className="floating-stat">
                  <span className="stat-label">ESTIMATED TIME</span>
                  <strong>{currentStatus === "delivered" ? "Completed" : etaDisplay}</strong>
                </div>
              </div>
            </div>

            {/* Map Legend */}
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-icon">🏠</span>
                <span>Your Location</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon">{currentStatus === "ready" ? "🛵" : "🚗"}</span>
                <span>Live Partner ({activePartner?.fullName || "Nearby Partner"})</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon">🧺</span>
                <span>LaundTime Care Facility</span>
              </div>
            </div>
          </div>

          {/* Real Order Details */}
          <div className="order-details-card">
            <h3>Order & Destination Details</h3>

            <div className="detail-row">
              <span>Items / Service:</span>
              <strong>
                {(order.items || []).map(i => `${i.name} ×${i.quantity || 1}`).join(", ") || "Laundry Service"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Pickup Schedule:</span>
              <span>
                {order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : "Scheduled"}
                {order.customerDetails?.pickupTime ? ` · ${order.customerDetails.pickupTime}` : ""}
              </span>
            </div>

            <div className="detail-row">
              <span>Pickup & Delivery Address:</span>
              <span>{order.customerDetails?.address || "Address provided"}, {order.customerDetails?.city || "Chennai"}</span>
            </div>

            <div className="detail-row">
              <span>Total Amount:</span>
              <strong style={{ color: "#10b981", fontSize: "1.05rem" }}>₹{order.totalAmount || 0} ({order.paymentMethod?.toUpperCase()})</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
