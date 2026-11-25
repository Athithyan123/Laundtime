import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import "./Referral.css";

export default function Referral() {
  const { user } = useAuth();
  const { addMoney } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const userReferralCode = `LAUNDRY${user?.name?.slice(0,3).toUpperCase()}100`;

  const handleApplyReferral = () => {
    if (referralCode === userReferralCode) {
      alert("You cannot use your own referral code!");
      return;
    }

    if (referralCode.startsWith('LAUNDRY') && referralCode.endsWith('100')) {
      addMoney(100, `Referral bonus for using code: ${referralCode}`);
      setShowSuccess(true);
      setReferralCode("");
    } else {
      alert("Invalid referral code! Format: LAUNDRY***100");
    }
  };

  const shareReferral = () => {
    const message = `Join LaundryApp using my referral code ${userReferralCode} and get ₹100 bonus! Download: http://laundryapp.com`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Get ₹100 on LaundryApp',
        text: message,
        url: 'http://laundryapp.com'
      });
    } else {
      navigator.clipboard.writeText(message);
      alert("Referral message copied to clipboard! 🎉");
    }
  };

  return (
    <div className="referral-container">
      <div className="referral-card">
        <h2>🎁 Refer Friends, Earn Rewards</h2>
        <p>Share your code and both you and your friend get ₹100!</p>
        
        <div className="referral-code-section">
          <h4>Your Referral Code:</h4>
          <div className="referral-code">
            {userReferralCode}
            <button onClick={() => {
              navigator.clipboard.writeText(userReferralCode);
              alert("Code copied! 🎉");
            }} className="copy-btn">
              📋 Copy
            </button>
          </div>
        </div>

        <button onClick={shareReferral} className="share-btn">
          📤 Share Referral Link
        </button>

        <div className="referral-divider">
          <span>OR</span>
        </div>

        <div className="apply-referral">
          <h4>Have a referral code?</h4>
          <div className="referral-input-group">
            <input
              type="text"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="referral-input"
            />
            <button onClick={handleApplyReferral} className="apply-btn">
              Apply
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="success-message">
            ✅ ₹100 added to your wallet! Happy laundering! 🎉
          </div>
        )}

        <div className="referral-terms">
          <h5>How it works:</h5>
          <ul>
            <li>Share your code with friends</li>
            <li>Friend signs up and uses your code</li>
            <li>Both get ₹100 wallet bonus</li>
            <li>No limit on referrals!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}