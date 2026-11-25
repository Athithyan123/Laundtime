import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState("All");

  const { addToCart, getCartItemsCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const categories = ["All", "Clothing", "Premium", "Home", "Express", "Special", "Basic"];

  useEffect(() => {
    const sampleServices = [
      {
        _id: "1",
        name: "Shirt Laundry",
        description: "Professional washing and ironing for shirts",
        pricePerKg: 60,
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=200&fit=crop",
        turnaroundHours: 24,
        category: "Clothing",
        rating: 4.5,
        reviews: 128
      },
      {
        _id: "2",
        name: "Jeans & Pants",
        description: "Special care for denim and trousers",
        pricePerKg: 70,
        image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=200&fit=crop",
        turnaroundHours: 36,
        category: "Clothing",
        rating: 4.3,
        reviews: 96
      },
      {
        _id: "3",
        name: "Dry Cleaning",
        description: "Premium dry cleaning for delicate fabrics",
        pricePerKg: 120,
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS44UucPjEy2HSGNOFb3gYSJEX1nScEJqvt1Q&s",
        turnaroundHours: 48,
        category: "Premium",
        rating: 4.8,
        reviews: 214
      },
      {
        _id: "4",
        name: "Bed Sheets & Linens",
        description: "Fresh and clean bedding laundry",
        pricePerKg: 80,
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
        turnaroundHours: 72,
        category: "Home",
        rating: 4.4,
        reviews: 75
      },
      {
        _id: "5",
        name: "Express Wash",
        description: "Quick 6-hour delivery service",
        pricePerKg: 100,
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5ydFE0oVsL5_ib_3eNnwuWN5dUNP1_q4Cwf-2noyvNjB5cn7nDKNp95Y&s",
        turnaroundHours: 6,
        category: "Express",
        rating: 4.7,
        reviews: 183
      },
      {
        _id: "6",
        name: "Shoe Cleaning",
        description: "Professional shoe cleaning and polishing",
        pricePerPiece: 50,
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=200&fit=crop",
        turnaroundHours: 24,
        category: "Special",
        rating: 4.6,
        reviews: 62
      },
      {
        _id: "7",
        name: "Ironing Service",
        description: "Professional ironing for all types of clothes",
        pricePerKg: 40,
        image: "https://5.imimg.com/data5/SELLER/Default/2023/10/353974717/LX/LQ/AX/126529570/steam-iron-service-250x250.jpg",
        turnaroundHours: 12,
        category: "Clothing",
        rating: 4.2,
        reviews: 89
      },
      {
        _id: "8",
        name: "Wash & Fold",
        description: "Basic washing and neat folding service",
        pricePerKg: 50,
        image: "https://static.wixstatic.com/media/c1b522_233b9c951cac460bb2339d5cf8df634b~mv2.jpg/v1/fill/w_280,h_175,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/admin-ajax_php.jpg",
        turnaroundHours: 24,
        category: "Basic",
        rating: 4.1,
        reviews: 54
      }
    ];

    setLoading(true);
    API.get('/services')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setServices(res.data);
        } else {
          setServices(sampleServices);
        }
      })
      .catch(err => {
        console.warn('Backend /services fetch failed, using fallback:', err);
        setServices(sampleServices);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = (service) => {
    if (!user) {
      navigate("/login");
      return;
    }
    addToCart(service);
    setAddedItems((prev) => ({ ...prev, [service._id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [service._id]: false }));
    }, 1500);
  };

  const filteredServices =
    activeCategory === "All"
      ? services
      : services.filter((s) => s.category === activeCategory);

  const renderStars = (rating) => {
    return "★".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "½" : "");
  };

  if (loading) {
    return (
      <div className="services-page">
        <div className="services-loading">
          <div className="loading-spinner-lg"></div>
          <p>Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      {/* Header */}
      <div className="services-header">
        <div className="services-header-inner">
          <div>
            <div className="services-header-label">Premium Garment Care</div>
            <h1>Our Laundry Services</h1>
            <p>Professional cleaning · Free pickup & delivery · 24h turnaround</p>
          </div>
          {getCartItemsCount() > 0 && (
            <button className="view-cart-btn" onClick={() => navigate("/cart")}>
              🛒 View Cart ({getCartItemsCount()})
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="services-grid">
        {filteredServices.map((service) => (
          <div key={service._id} className="service-card">
            <div className="service-image-wrap">
              <img
                src={service.image}
                alt={service.name}
                className="service-img"
                onError={(e) => { e.target.src = "https://via.placeholder.com/300x200?text=Laundry"; }}
              />
              <div className="service-badge">{service.category}</div>
              {service.turnaroundHours <= 6 && (
                <div className="service-badge express-badge">⚡ Express</div>
              )}
            </div>

            <div className="service-body">
              <h3 className="service-name">{service.name}</h3>
              <p className="service-desc">{service.description}</p>

              <div className="service-rating">
                <span className="stars">{renderStars(service.rating)}</span>
                <span className="rating-val">{service.rating}</span>
                <span className="rating-count">({service.reviews} reviews)</span>
              </div>

              <div className="service-meta">
                <div className="service-price">
                  ₹{service.pricePerKg ? `${service.pricePerKg}/kg` : `${service.pricePerPiece}/piece`}
                </div>
                <div className="service-time">
                  ⏱ {service.turnaroundHours}h delivery
                </div>
              </div>

              <div className="service-actions">
                <Link to={`/book/${service._id}`} className="book-now-btn">
                  Book Now
                </Link>
                <button
                  className={`add-cart-btn ${addedItems[service._id] ? "added" : ""}`}
                  onClick={() => handleAddToCart(service)}
                >
                  {addedItems[service._id] ? "✓ Added!" : "+ Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="no-services">
          <p>No services in this category yet.</p>
        </div>
      )}
    </div>
  );
}