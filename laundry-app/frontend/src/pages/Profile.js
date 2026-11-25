import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    language: "en",
    notifications: true,
    newsletter: false
  });
  const [loading, setLoading] = useState(false);

  // ✅ Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        pincode: user.pincode || "",
        city: user.city || "",
        language: user.language || "en",
        notifications: user.notifications !== false, // default true
        newsletter: user.newsletter || false
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ✅ Fixed Save Function
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Name and Email are required!");
      return;
    }

    setLoading(true);
    try {
      // ✅ Call updateProfile function from context
      await updateProfile(formData);
      
      // ✅ Show success message
      alert("Profile updated successfully!");
      
      // ✅ Exit edit mode
      setIsEditing(false);
      
    } catch (error) {
      alert("Failed to update profile. Please try again.");
      console.error("Profile update error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reset form when cancel is clicked
  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        pincode: user.pincode || "",
        city: user.city || "",
        language: user.language || "en",
        notifications: user.notifications !== false,
        newsletter: user.newsletter || false
      });
    }
    setIsEditing(false);
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil" },
    { code: "hi", name: "Hindi" }
  ];

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>👤 My Profile</h1>
        <p>Manage your personal information and preferences</p>
      </div>

      <div className="profile-content">
        {/* Personal Information */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Personal Information</h2>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="edit-btn"
              >
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="save-btn"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!formData.name.trim() ? "error" : ""}
                />
                {!formData.name.trim() && <span className="error-text">Name is required</span>}
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!formData.email.trim() ? "error" : ""}
                />
                {!formData.email.trim() && <span className="error-text">Email is required</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label>Preferred Language</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={!isEditing}
                rows="3"
                placeholder="Enter your complete address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="600001"
                  maxLength="6"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Chennai"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="profile-section">
          <h2>Preferences</h2>
          <div className="preferences">
            <label className="preference-item">
              <input
                type="checkbox"
                name="notifications"
                checked={formData.notifications}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
              <span>Push Notifications</span>
              <small>Receive order updates and promotions</small>
            </label>

            <label className="preference-item">
              <input
                type="checkbox"
                name="newsletter"
                checked={formData.newsletter}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
              <span>Newsletter</span>
              <small>Get weekly updates and offers</small>
            </label>
          </div>
        </div>

        {/* Account Stats */}
        <div className="profile-section">
          <h2>Account Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{user?.totalOrders || 0}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">₹{user?.totalSpent || 0}</span>
              <span className="stat-label">Total Spent</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{user?.completedOrders || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{user?.rating || "4.8"}</span>
              <span className="stat-label">Avg Rating</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}