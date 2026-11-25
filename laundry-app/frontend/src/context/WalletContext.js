import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState({
    balance: 0,
    loyaltyPoints: 0,
    transactions: [],
    coupons: [
      { id: 1, code: "WELCOME100", discount: 100, minAmount: 299, validUntil: "2024-12-31", used: false },
      { id: 2, code: "FIRSTORDER", discount: 50, minAmount: 199, validUntil: "2024-12-31", used: false },
      { id: 3, code: "SUPER20", discount: 20, minAmount: 99, validUntil: "2024-12-31", used: false }
    ]
  });

  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);

  const addMoney = (amount) => {
    setWallet(prev => {
      const updated = {
        ...prev,
        balance: prev.balance + amount,
        transactions: [
          {
            id: Date.now(),
            type: 'credit',
            amount,
            description: 'Wallet Recharge',
            date: new Date().toISOString(),
            balance: prev.balance + amount
          },
          ...prev.transactions
        ]
      };
      localStorage.setItem('wallet', JSON.stringify(updated));
      return updated;
    });
  };

  const deductMoney = (amount, description) => {
    setWallet(prev => {
      const updated = {
        ...prev,
        balance: prev.balance - amount,
        loyaltyPoints: prev.loyaltyPoints + Math.floor(amount / 10), // 1 point per ₹10
        transactions: [
          {
            id: Date.now(),
            type: 'debit',
            amount,
            description,
            date: new Date().toISOString(),
            balance: prev.balance - amount
          },
          ...prev.transactions
        ]
      };
      localStorage.setItem('wallet', JSON.stringify(updated));
      return updated;
    });
  };

  // 🔥 ADD THIS REFUND MONEY FUNCTION
  const refundMoney = (amount, description) => {
    setWallet(prev => {
      const updated = {
        ...prev,
        balance: prev.balance + amount,
        transactions: [
          {
            id: Date.now(),
            type: 'refund',
            amount,
            description,
            date: new Date().toISOString(),
            balance: prev.balance + amount
          },
          ...prev.transactions
        ]
      };
      localStorage.setItem('wallet', JSON.stringify(updated));
      return updated;
    });
  };

  const applyCoupon = (couponCode) => {
    const coupon = wallet.coupons.find(c => c.code === couponCode && !c.used);
    if (coupon) {
      setWallet(prev => ({
        ...prev,
        coupons: prev.coupons.map(c => 
          c.code === couponCode ? { ...c, used: true } : c
        )
      }));
      return coupon;
    }
    return null;
  };

  const addCoupon = (coupon) => {
    setWallet(prev => ({
      ...prev,
      coupons: [...prev.coupons, { ...coupon, id: Date.now(), used: false }]
    }));
  };

  // 🔥 UPDATE THE RETURN STATEMENT TO INCLUDE refundMoney
  return (
    <WalletContext.Provider value={{
      wallet,
      walletBalance: wallet.balance,  // convenience shorthand used by Payment.js
      addMoney,
      deductMoney,
      refundMoney,
      applyCoupon,
      addCoupon
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
// Add to WalletContext.js
