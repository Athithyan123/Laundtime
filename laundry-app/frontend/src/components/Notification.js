import React, { useState, useEffect } from "react";
import "./Notification.css";

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Sample notifications
    const sampleNotifications = [
      {
        id: 1,
        type: 'success',
        title: 'Order Confirmed',
        message: 'Your laundry order #LAUNDRY-001 has been confirmed',
        time: '10 minutes ago',
        read: false
      },
      {
        id: 2,
        type: 'info',
        title: 'Pickup Scheduled',
        message: 'Driver will arrive between 2:00 PM - 4:00 PM',
        time: '1 hour ago',
        read: false
      },
      {
        id: 3,
        type: 'promo',
        title: 'Special Offer',
        message: 'Get 20% off on your next order with code SUPER20',
        time: '2 days ago',
        read: true
      }
    ];
    setNotifications(sampleNotifications);
  }, []);

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-container">
      <button 
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.type} ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {notification.type === 'success' && '✅'}
                    {notification.type === 'info' && 'ℹ️'}
                    {notification.type === 'promo' && '🎁'}
                    {notification.type === 'warning' && '⚠️'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {notification.time}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="notification-footer">
            <button className="view-all-btn">View All Notifications</button>
          </div>
        </div>
      )}
    </div>
  );
}