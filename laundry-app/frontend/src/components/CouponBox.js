import React, { useState } from "react";
import API from "../api";
import "./CouponBox.css";

export default function CouponBox({ orderAmount = 0, onApply, onRemove }) {
  const [code, setCode]       = useState("");
  const [applied, setApplied] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleApply = async () => {
    if (!code.trim()) { setError("Enter a coupon code"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await API.post("/coupons/validate", {
        code: code.trim().toUpperCase(),
        orderAmount
      });
      setApplied(data);
      onApply?.(data);
    } catch (err) {
      // Offline mock
      const mockCodes = {
        "FIRST20":  { discountAmount: Math.round(orderAmount * 0.2), message: "🎉 20% off for first order! You save ₹" + Math.round(orderAmount * 0.2) },
        "FLAT50":   { discountAmount: 50, message: "🎉 ₹50 flat off! Applied successfully" },
        "SAVE100":  { discountAmount: 100, message: "🎉 ₹100 off! Applied successfully" },
        "BDAY30":   { discountAmount: Math.round(orderAmount * 0.3), message: "🎂 Birthday special 30% off!" },
        "WELCOME":  { discountAmount: Math.round(orderAmount * 0.15), message: "🎉 15% welcome discount!" },
      };
      const mock = mockCodes[code.trim().toUpperCase()];
      if (mock) {
        const result = { valid: true, discountAmount: mock.discountAmount, message: mock.message, coupon: { code: code.trim().toUpperCase() } };
        setApplied(result);
        onApply?.(result);
      } else {
        setError(err.response?.data?.message || "Invalid coupon code");
      }
    } finally { setLoading(false); }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode("");
    setError("");
    onRemove?.();
  };

  if (applied) return (
    <div className="coupon-box applied">
      <div className="coupon-applied-row">
        <span className="coupon-tick">✓</span>
        <div>
          <div className="coupon-applied-code">{applied.coupon?.code}</div>
          <div className="coupon-applied-msg">{applied.message}</div>
        </div>
        <button className="coupon-remove-btn" onClick={handleRemove}>✕</button>
      </div>
      <div className="coupon-saving">You save ₹{applied.discountAmount}</div>
    </div>
  );

  return (
    <div className="coupon-box">
      <div className="coupon-label">🎟 Have a coupon code?</div>
      <div className="coupon-input-row">
        <input
          className={`coupon-input ${error ? "error" : ""}`}
          placeholder="Enter code (e.g. FIRST20)"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleApply()}
          disabled={loading}
        />
        <button className="coupon-apply-btn" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <span className="coupon-spin" /> : "Apply"}
        </button>
      </div>
      {error && <div className="coupon-error">⚠️ {error}</div>}
      <div className="coupon-hints">
        Available: <span onClick={() => setCode("FIRST20")}>FIRST20</span> ·{" "}
        <span onClick={() => setCode("FLAT50")}>FLAT50</span> ·{" "}
        <span onClick={() => setCode("WELCOME")}>WELCOME</span>
      </div>
    </div>
  );
}
