import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import "./Referral.css";

export default function Referral() {
  const { user } = useAuth();
  const { addMoney } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate unique referral code based on user name
  const userReferralCode = `LAUNDRY${user?.name?.slice(0,3)?.toUpperCase() || 'USER'}100`;

  const handleApplyReferral = () => {
    if (!referralCode.trim()) {
      alert("Please enter a referral code!");
      return;
    }

    if (referralCode === userReferralCode) {
      alert("You cannot use your own referral code!");
      return;
    }

    // Check if code format is correct
    if (referralCode.startsWith('LAUNDRY') && referralCode.endsWith('100')) {
      addMoney(100, `Referral bonus for using code: ${referralCode}`);
      setShowSuccess(true);
      setReferralCode("");
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    } else {
      alert("Invalid referral code! Format should be: LAUNDRY***100");
    }
  };

  const shareReferral = () => {
    const message = `🚀 Join LaundryApp - India's Best Laundry Service! \n\nUse my referral code: ${userReferralCode} \n\nGet ₹100 instant bonus in your wallet! \n\nDownload now: http://laundryapp.com`;
    
    // Check if Web Share API is supported
    if (navigator.share) {
      navigator.share({
        title: 'Get ₹100 on LaundryApp',
        text: message,
        url: 'http://laundryapp.com'
      }).catch(err => {
        console.log('Error sharing:', err);
        navigator.clipboard.writeText(message);
        alert("📋 Referral message copied to clipboard! 🎉");
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(message);
      alert("📋 Referral message copied to clipboard! 🎉");
    }
  };

  return (
    <div className="referral-container">
      <div className="referral-card">
        <div className="referral-header">
          <h2>🎁 Refer Friends, Earn ₹100</h2>
          <p>Share your code and both you & your friend get ₹100 wallet bonus!</p>
        </div>
        
        {/* Your Referral Code */}
        <div className="referral-code-section">
          <h4>Your Unique Referral Code:</h4>
          <div className="referral-code-display">
            <span className="code">{userReferralCode}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(userReferralCode);
                alert("✅ Code copied to clipboard! 🎉");
              }} 
              className="copy-btn"
            >
              📋 Copy Code
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="share-section">
          <button onClick={shareReferral} className="share-btn primary">
            📤 Share via WhatsApp
          </button>
          <button onClick={shareReferral} className="share-btn secondary">
            📧 Copy Referral Message
          </button>
        </div>

        <div className="referral-divider">
          <span>OR</span>
        </div>

        {/* Apply Referral Code */}
        <div className="apply-referral">
          <h4>Have a friend's referral code?</h4>
          <div className="referral-input-group">
            <input
              type="text"
              placeholder="Enter referral code (e.g., LAUNDRYABC100)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="referral-input"
            />
            <button onClick={handleApplyReferral} className="apply-btn">
              Apply & Get ₹100
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="success-message">
            ✅ ₹100 added to your wallet! Happy laundering! 🎉
          </div>
        )}

        {/* How it works */}
        <div className="referral-terms">
          <h5>💰 How Referral Works:</h5>
          <div className="steps">
            <div className="step">
              <span>1</span>
              <p>Share your unique code with friends & family</p>
            </div>
            <div className="step">
              <span>2</span>
              <p>Friend signs up and enters your code</p>
            </div>
            <div className="step">
              <span>3</span>
              <p>Both get ₹100 instantly in wallet</p>
            </div>
            <div className="step">
              <span>4</span>
              <p>No limit - refer unlimited friends!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}