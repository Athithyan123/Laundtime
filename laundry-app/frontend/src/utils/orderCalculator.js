// src/utils/orderCalculator.js
export const calculateOrderTotal = (services, subscription) => {
  let subtotal = 0;
  let discount = 0;
  let discountPercentage = 0;

  // Calculate subtotal
  services.forEach(service => {
    subtotal += service.price * service.quantity;
  });

  // Apply subscription discount
  if (subscription) {
    switch (subscription.plan) {
      case "🧺 Basic Plan":
        discountPercentage = 5; // 5% discount
        break;
      case "⭐ Premium Plan":
        discountPercentage = 10; // 10% discount
        break;
      case "👨‍👩‍👧‍👦 Family Plan":
        discountPercentage = 15; // 15% discount
        break;
      default:
        discountPercentage = 0;
    }
    
    discount = (subtotal * discountPercentage) / 100;
  }

  const total = subtotal - discount;
  
  return {
    subtotal,
    discount,
    discountPercentage,
    total,
    hasSubscription: !!subscription
  };
};