import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import "./Wallet.css";

export default function Wallet() {
  const { wallet, addMoney, applyCoupon } = useWallet();
  const { user } = useAuth(); // eslint-disable-line no-unused-vars
  const [rechargeAmount, setRechargeAmount] = useState(500);
  const [couponCode, setCouponCode] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);

  const rechargeOptions = [100, 200, 500, 1000, 2000];

  const handleRecharge = (amount) => {
    addMoney(amount);
    alert(`₹${amount} added to your wallet successfully!`);
  };

  const handleCouponApply = () => {
    const coupon = applyCoupon(couponCode.toUpperCase());
    if (coupon) {
      alert(`Coupon ${couponCode} applied successfully! You got ₹${coupon.discount} off.`);
      setCouponCode("");
    } else {
      alert("Invalid or expired coupon code!");
    }
  };

  const availableCoupons = wallet.coupons.filter(c => !c.used);

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h1>💰 My Wallet</h1>
        <p>Manage your money and rewards</p>
      </div>

      <div className="wallet-grid">
        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-header">
            <h3>Current Balance</h3>
            <div className="balance-amount">₹{wallet.balance}</div>
          </div>
          <div className="balance-details">
            <div className="detail-item">
              <span>Loyalty Points</span>
              <span className="points">{wallet.loyaltyPoints} pts</span>
            </div>
            <div className="detail-item">
              <span>Available Coupons</span>
              <span className="coupons-count">{availableCoupons.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Recharge */}
        <div className="recharge-card">
          <h3>Quick Recharge</h3>
          <p>Add money to your wallet instantly</p>
          
          <div className="recharge-options">
            {rechargeOptions.map(amount => (
              <button
                key={amount}
                className={`recharge-option ${rechargeAmount === amount ? 'active' : ''}`}
                onClick={() => setRechargeAmount(amount)}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          <button 
            className="recharge-btn"
            onClick={() => handleRecharge(rechargeAmount)}
          >
            Add ₹{rechargeAmount} to Wallet
          </button>
        </div>

        {/* Coupons */}
        <div className="coupons-card">
          <div className="coupons-header">
            <h3>My Coupons</h3>
            <button 
              className="add-coupon-btn"
              onClick={() => setShowCouponModal(true)}
            >
              + Add Coupon
            </button>
          </div>

          {availableCoupons.length === 0 ? (
            <div className="no-coupons">
              <p>No available coupons</p>
            </div>
          ) : (
            <div className="coupons-list">
              {availableCoupons.map(coupon => (
                <div key={coupon.id} className="coupon-item">
                  <div className="coupon-info">
                    <h4>{coupon.code}</h4>
                    <p>Get ₹{coupon.discount} off on orders above ₹{coupon.minAmount}</p>
                    <small>Valid until: {coupon.validUntil}</small>
                  </div>
                  <div className="coupon-discount">
                    ₹{coupon.discount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="transactions-card">
          <h3>Transaction History</h3>
          {wallet.transactions.length === 0 ? (
            <div className="no-transactions">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="transactions-list">
              {wallet.transactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <span className="transaction-desc">{transaction.description}</span>
                    <span className="transaction-date">
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="modal-overlay">
          <div className="coupon-modal">
            <div className="modal-header">
              <h3>Add Coupon Code</h3>
              <button onClick={() => setShowCouponModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="coupon-input"
              />
              <button 
                onClick={handleCouponApply}
                className="apply-coupon-btn"
              >
                Apply Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}