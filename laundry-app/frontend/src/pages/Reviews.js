import React, { useState, useEffect } from "react";
import "./Reviews.css";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    serviceRating: 5,
    driverRating: 5,
    comments: "",
    orderId: ""
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const savedReviews = JSON.parse(localStorage.getItem('laundryReviews') || '[]');
    setReviews(savedReviews);

    // Get recent orders for review
    const orders = JSON.parse(localStorage.getItem('laundryOrders') || '[]');
    const completedOrders = orders.filter(order => order.status === 'completed');
    if (completedOrders.length > 0) {
      setNewReview(prev => ({
        ...prev,
        orderId: completedOrders[0]._id
      }));
    }
  }, []);

  const handleSubmitReview = (e) => {
    e.preventDefault();
    
    const order = JSON.parse(localStorage.getItem('laundryOrders') || '[]')
      .find(o => o._id === newReview.orderId);

    const review = {
      id: Date.now(),
      orderId: newReview.orderId,
      orderNumber: order?.orderNumber || 'N/A',
      serviceRating: newReview.serviceRating,
      driverRating: newReview.driverRating,
      comments: newReview.comments,
      date: new Date().toISOString(),
      serviceName: order?.items[0]?.name || 'Laundry Service'
    };

    const updatedReviews = [review, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem('laundryReviews', JSON.stringify(updatedReviews));
    
    setNewReview({
      serviceRating: 5,
      driverRating: 5,
      comments: "",
      orderId: ""
    });
    setShowReviewForm(false);
    
    alert("Thank you for your review! 🎉");
  };

  const getOrdersForReview = () => {
    const orders = JSON.parse(localStorage.getItem('laundryOrders') || '[]');
    return orders.filter(order => 
      order.status === 'completed' && 
      !reviews.some(review => review.orderId === order._id)
    );
  };

  const renderStars = (rating, onRatingChange = null) => {
    return [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`star ${index < rating ? 'filled' : ''} ${onRatingChange ? 'clickable' : ''}`}
        onClick={() => onRatingChange && onRatingChange(index + 1)}
      >
        ⭐
      </span>
    ));
  };

  return (
    <div className="reviews-container">
      <div className="reviews-header">
        <h1>⭐ Reviews & Ratings</h1>
        <p>Share your experience and see what others think</p>
      </div>

      <div className="reviews-content">
        {/* Review Summary */}
        <div className="summary-section">
          <div className="overall-rating">
            <div className="rating-score">4.8</div>
            <div className="rating-stars">{renderStars(4.8)}</div>
            <div className="rating-count">Based on {reviews.length} reviews</div>
          </div>
          
          <div className="rating-breakdown">
            <div className="breakdown-item">
              <span>Service Quality</span>
              <div className="breakdown-bar">
                <div className="bar-fill" style={{width: '96%'}}></div>
              </div>
              <span>4.8</span>
            </div>
            <div className="breakdown-item">
              <span>Driver Service</span>
              <div className="breakdown-bar">
                <div className="bar-fill" style={{width: '94%'}}></div>
              </div>
              <span>4.7</span>
            </div>
            <div className="breakdown-item">
              <span>On-time Delivery</span>
              <div className="breakdown-bar">
                <div className="bar-fill" style={{width: '92%'}}></div>
              </div>
              <span>4.6</span>
            </div>
          </div>
        </div>

        {/* Add Review Button */}
        {getOrdersForReview().length > 0 && !showReviewForm && (
          <div className="add-review-section">
            <button 
              onClick={() => setShowReviewForm(true)}
              className="add-review-btn"
            >
              ✍️ Write a Review
            </button>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="review-form-section">
            <h3>Write Your Review</h3>
            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="form-group">
                <label>Select Order</label>
                <select
                  value={newReview.orderId}
                  onChange={(e) => setNewReview({...newReview, orderId: e.target.value})}
                  required
                >
                  <option value="">Choose an order</option>
                  {getOrdersForReview().map(order => (
                    <option key={order._id} value={order._id}>
                      Order #{order.orderNumber} - {order.items[0]?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rating-group">
                <label>Service Quality</label>
                <div className="stars-input">
                  {renderStars(newReview.serviceRating, (rating) => 
                    setNewReview({...newReview, serviceRating: rating})
                  )}
                </div>
              </div>

              <div className="rating-group">
                <label>Driver Service</label>
                <div className="stars-input">
                  {renderStars(newReview.driverRating, (rating) => 
                    setNewReview({...newReview, driverRating: rating})
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Your Comments</label>
                <textarea
                  value={newReview.comments}
                  onChange={(e) => setNewReview({...newReview, comments: e.target.value})}
                  rows="4"
                  placeholder="Share your experience with this service..."
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        <div className="reviews-list-section">
          <h3>Recent Reviews</h3>
          {reviews.length === 0 ? (
            <div className="no-reviews">
              <p>No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <div className="reviewer-avatar">👤</div>
                      <div>
                        <strong>You</strong>
                        <div className="review-date">
                          {new Date(review.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="order-info">
                      Order #{review.orderNumber}
                    </div>
                  </div>

                  <div className="review-ratings">
                    <div className="rating-item">
                      <span>Service:</span>
                      <div className="rating-stars">
                        {renderStars(review.serviceRating)}
                      </div>
                    </div>
                    <div className="rating-item">
                      <span>Driver:</span>
                      <div className="rating-stars">
                        {renderStars(review.driverRating)}
                      </div>
                    </div>
                  </div>

                  <div className="review-comments">
                    <p>{review.comments}</p>
                  </div>

                  <div className="review-service">
                    <span className="service-badge">{review.serviceName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}