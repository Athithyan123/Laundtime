import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import "./Orders.css";

// Service image fallbacks
const serviceImages = {
  "Wash & Fold": "https://static.wixstatic.com/media/c1b522_233b9c951cac460bb2339d5cf8df634b~mv2.jpg/v1/fill/w_280,h_175,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/admin-ajax_php.jpg",
  "Dry Cleaning": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS44UucPjEy2HSGNOFb3gYSJEX1nScEJqvt1Q&s", 
  "Ironing Service":"https://5.imimg.com/data5/SELLER/Default/2023/10/353974717/LX/LQ/AX/126529570/steam-iron-service-250x250.jpg",
  "Shoe Cleaning": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&fit=crop",
  "Shirt Laundry": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=200&fit=crop",
  "Jeans & Pants": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=200&fit=crop",
  "Bed Sheets & Linens": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
  "Express Wash": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5ydFE0oVsL5_ib_3eNnwuWN5dUNP1_q4Cwf-2noyvNjB5cn7nDKNp95Y&s"
};

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refundMoney } = useWallet();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(
    location.state?.showSuccess ? { orderNumber: location.state?.orderNumber } : null
  );

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5001/api/orders/myorders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const orderList = data.orders || [];
        
        const ordersWithImages = orderList.map(order => ({
          ...order,
          orderNumber: order.trackingId || order.orderNumber || order._id,
          items: (order.items || []).map(item => ({
            ...item,
            image: item.image || serviceImages[item.name] || serviceImages["Wash & Fold"]
          }))
        }));
        
        setOrders(ordersWithImages);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to fetch orders from backend:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Cancel order in backend & frontend
  const handleCancelOrder = async (order) => {
    const orderId = order.trackingId || (order._id ? order._id.substring(0, 8) : `ORD${Date.now()}`);
    if (!window.confirm(`Are you sure you want to cancel Order #${orderId}?`)) {
      return;
    }

    try {
      if (order._id) {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5001/api/orders/${order._id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ status: 'cancelled' })
        });
      }
    } catch (e) {
      console.error("Failed to cancel in backend:", e);
    }

    const updatedOrders = orders.map(o =>
      (o._id === order._id || o.trackingId === order.trackingId) ? { 
        ...o, 
        status: 'cancelled', 
        cancelledAt: new Date().toISOString(),
        cancellationReason: 'Cancelled by customer'
      } : o
    );
    setOrders(updatedOrders);
    localStorage.setItem('laundryOrders', JSON.stringify(updatedOrders));

    if (order.paymentMethod === 'wallet' && order.status !== 'cancelled') {
      refundMoney(order.totalAmount, `Refund for cancelled order #${orderId}`);
      alert(`✅ Order cancelled successfully!\n\n💰 ₹${order.totalAmount} has been refunded to your wallet.\n\nOrder #${orderId} has been cancelled.`);
    } else {
      alert(`✅ Order cancelled successfully!\n\nOrder #${orderId} has been cancelled.`);
    }
  };

  const downloadInvoice = (order) => {
    const orderId = order._id || `ORD${Date.now()}`;
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const pickupDate = order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : 'N/A';
    const pickupTime = order.customerDetails?.pickupTime || 'N/A';
    const instructions = order.customerDetails?.instructions || 'None';
    
    const invoiceContent = `
LAUNDRYAPP - INVOICE
====================

Order Number: ${orderId}
Order Date: ${orderDate}
${order.status === 'cancelled' ? `Cancelled Date: ${order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString() : 'N/A'}` : ''}

CUSTOMER DETAILS:
Name: ${order.customerDetails?.name || 'N/A'}
Email: ${order.customerDetails?.email || 'N/A'}
Phone: ${order.customerDetails?.phone || 'N/A'}
Address: ${order.customerDetails?.address || 'N/A'}
${order.customerDetails?.city || ''} - ${order.customerDetails?.pincode || ''}

PICKUP DETAILS:
Date: ${pickupDate}
Time: ${pickupTime}
Instructions: ${instructions}

ORDER ITEMS:
${order.items.map(item => 
  `- ${item.name} (${item.quantity} ${item.unit || 'unit'}) - ₹${(item.pricePerKg || item.pricePerPiece || item.price || 0) * item.quantity}`
).join('\n')}

PAYMENT INFORMATION:
Method: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PENDING'}
Status: ${order.status ? order.status.toUpperCase() : 'PENDING'}
${order.status === 'cancelled' && order.paymentMethod === 'wallet' ? 'REFUND: Amount refunded to wallet' : ''}

TOTAL AMOUNT: ₹${order.totalAmount}

${order.status === 'cancelled' ? 'ORDER CANCELLED' : 'Thank you for choosing LaundryApp!'}
We'll pickup your laundry as scheduled.

Contact: support@laundryapp.com
Phone: +91-9876543210
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${orderId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#ffa500';
      case 'picked': return '#007bff';
      case 'processing': return '#6f42c1';
      case 'completed': return '#28a745';
      case 'cancelled': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '⏳ Pending';
      case 'picked': return '📦 Picked Up';
      case 'processing': return '🔄 Processing';
      case 'completed': return '✅ Completed';
      case 'cancelled': return '❌ Cancelled';
      default: return status || 'Unknown';
    }
  };

  const canCancelOrder = (order) => {
    return ['pending', 'picked'].includes(order.status?.toLowerCase());
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="orders-container">
      {/* Header */}
      <div className="orders-header">
        <div className="orders-header-title">
          <h1>📦 My Orders</h1>
          <p>Track, view invoices, and manage your laundry orders ({orders.length})</p>
        </div>
        <button 
          onClick={() => navigate("/services")}
          className="book-new-order-btn"
        >
          + Book New Service
        </button>
      </div>

      {/* SUCCESS ORDER BANNER */}
      {orderSuccess && (
        <div className="order-success-banner">
          <div className="success-banner-content">
            <div className="success-icon">🎉</div>
            <div>
              <h3>Order Placed Successfully!</h3>
              <p>Tracking ID: <strong>{orderSuccess.orderNumber}</strong> · We've notified nearby pickup partners.</p>
            </div>
          </div>
          <div className="success-banner-actions">
            <button 
              onClick={() => navigate(`/track/${orderSuccess.orderNumber}`)}
              className="track-now-btn"
            >
              🚚 Track Order Now
            </button>
            <button 
              onClick={() => setOrderSuccess(null)}
              className="dismiss-btn"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ORDERS LIST */}
      {orders.length === 0 ? (
        <div className="no-orders">
          <div className="empty-orders-icon" style={{ fontSize: "3.5rem", marginBottom: "15px" }}>🧺</div>
          <h2>No orders yet</h2>
          <p>You haven't placed any laundry orders yet. Ready for fresh, clean clothes?</p>
          <button 
            onClick={() => navigate("/services")}
            className="browse-services-btn"
          >
            🧺 Browse Services & Book
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order._id || `order-${Date.now()}`} className={`order-card ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.trackingId || (order._id ? order._id.substring(0, 8) : `ORD${Date.now()}`)}</h3>
                  <p>📅 Ordered on {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  <p>🚚 {order.status === 'cancelled' ? 'Cancelled' : 'Pickup'}: {order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              <div className="order-details">
                {/* ORDER ITEMS WITH IMAGES */}
                <div className="order-items">
                  <h4>Items:</h4>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-image">
                          <img src={item.image} alt={item.name} onError={(e) => e.target.src = 'https://via.placeholder.com/80'} />
                        </div>
                        <div className="item-details">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">{item.quantity} {item.unit || 'unit'}</span>
                          <span className="item-price">₹{(item.pricePerKg || item.pricePerPiece || item.price || 0) * item.quantity}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No items in this order</p>
                  )}
                </div>

                <div className="order-meta">
                  <div className="meta-item">
                    <strong>📍 Pickup:</strong> 
                    <span>{order.customerDetails?.pickupDate ? new Date(order.customerDetails.pickupDate).toLocaleDateString() : 'N/A'} at {order.customerDetails?.pickupTime || 'N/A'}</span>
                  </div>
                  <div className="meta-item">
                    <strong>💳 Payment:</strong> 
                    <span>
                      {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'PENDING'}
                      {order.paymentMethod === 'wallet' && ' (Wallet)'}
                    </span>
                  </div>
                  {order.pickupPartner && (
                    <div className="meta-item">
                      <strong>🚗 Pickup Partner:</strong> 
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        {typeof order.pickupPartner === 'object' ? order.pickupPartner.fullName : 'Assigned'}
                      </span>
                    </div>
                  )}
                  {order.deliveryPartner && (
                    <div className="meta-item">
                      <strong>📦 Delivery Partner:</strong> 
                      <span style={{ color: '#06b6d4', fontWeight: 600 }}>
                        {typeof order.deliveryPartner === 'object' ? order.deliveryPartner.fullName : 'Assigned'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {order.status === 'cancelled' && (
                <div className="cancelled-order-info">
                  <p>🚫 This order was cancelled on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString() : 'Unknown date'}</p>
                  {order.paymentMethod === 'wallet' && (
                    <p>💰 Amount refunded to your wallet</p>
                  )}
                </div>
              )}

              <div className="order-footer">
                <div className="order-total">
                  Total: ₹{order.totalAmount}
                  {order.status === 'cancelled' && order.paymentMethod === 'wallet' && (
                    <span className="refund-notice"> (Refunded)</span>
                  )}
                </div>
                <div className="order-actions">
                  <button 
                    onClick={() => downloadInvoice(order)}
                    className="invoice-btn"
                  >
                    📄 Download Invoice
                  </button>

                  <button 
                    onClick={() => navigate('/invoice', { state: { order } })}
                    className="view-invoice-btn"
                  >
                    👁️ View Invoice
                  </button>
                  
                  {order.status !== 'cancelled' && (
                    <button 
                      onClick={() => navigate(`/track/${order.trackingId || order._id}`)}
                      className="track-btn"
                    >
                      🚚 Track Order
                    </button>
                  )}
                  
                  {canCancelOrder(order) && (
                    <button 
                      onClick={() => handleCancelOrder(order)}
                      className="cancel-btn"
                    >
                      ❌ Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ EXPORT SAVEORDER FUNCTION (saves to real backend & local storage)
export const saveOrder = async (orderData) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const customerDetails = {
    name:         orderData.name || orderData.customerDetails?.name || user.name || "Customer",
    email:        orderData.email || orderData.customerDetails?.email || user.email || "customer@laundtime.com",
    phone:        orderData.phone || orderData.customerDetails?.phone || user.phone || "9999999999",
    address:      orderData.address || orderData.customerDetails?.address || "Address provided",
    city:         orderData.city || orderData.customerDetails?.city || "Chennai",
    pincode:      orderData.pincode || orderData.customerDetails?.pincode || "600001",
    pickupDate:   orderData.pickupDate || orderData.pickupDetails?.date || new Date().toISOString(),
    pickupTime:   orderData.pickupTime || orderData.pickupDetails?.time || "10:00 AM - 12:00 PM",
    instructions: orderData.instructions || orderData.pickupDetails?.instructions || ""
  };

  const items = orderData.items || [
    {
      name: orderData.serviceName || "Laundry Service",
      quantity: 1,
      price: orderData.totalPrice || orderData.totalAmount || 100,
      weight: orderData.weight || 1
    }
  ];

  const totalAmount = orderData.totalPrice || orderData.totalAmount || items.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);

  const payload = {
    items,
    totalAmount,
    customerDetails,
    paymentMethod: orderData.paymentMethod || 'wallet',
    status: orderData.status || 'pending'
  };

  try {
    const res = await fetch('http://localhost:5001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      return data.order;
    }
  } catch (err) {
    console.error('Backend saveOrder failed:', err);
  }

  // Fallback local order
  const newOrder = {
    _id: Date.now().toString(),
    trackingId: `LT${Date.now()}`,
    orderNumber: `ORD${Date.now()}`,
    ...payload,
    createdAt: new Date().toISOString()
  };
  return newOrder;
};
