import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import "./TrackOrder.scss";

export default function TrackOrder() {
  const location = useLocation();
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const awb = params.get("awb");
    const order = params.get("orderId");
    if (awb || order) setOrderId(awb || order);
  }, [location.search]);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!orderId) return;

    setLoading(true);
    setError("");
    
    // Simulating API call for tracking
    setTimeout(() => {
      // Mock tracking data
      if (orderId.length > 5) {
        setTrackingData({
          status: "In Transit",
          lastUpdate: "Arrived at sorting facility - New Delhi",
          date: "Oct 24, 2023 10:45 AM",
          steps: [
            { title: "Order Placed", date: "Oct 22, 2023", completed: true },
            { title: "Packed & Ready", date: "Oct 23, 2023", completed: true },
            { title: "In Transit", date: "Oct 24, 2023", current: true },
            { title: "Out for Delivery", date: "Pending", pending: true },
            { title: "Delivered", date: "Pending", pending: true },
          ]
        });
      } else {
        setError("Order ID not found. Please check and try again.");
        setTrackingData(null);
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="track-order-page">
      <div className="track-hero">
        <div className="container">
          <h1>Track Your Order</h1>
          <p>Enter your 10-digit Order ID to get real-time delivery updates.</p>
          
          <form className="track-form glass-card" onSubmit={handleTrack}>
            <div className="input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Example: #BM-782910"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-track">
              {loading ? "Searching..." : "Track Package"}
            </button>
          </form>
        </div>
      </div>

      <div className="container tracking-content">
        {error && (
          <div className="error-alert wow animate__fadeIn">
            <AlertCircle size={24} />
            <div>
              <h3>Oops! {error}</h3>
              <p>Make sure you entered the correct Order ID from your confirmation email.</p>
            </div>
          </div>
        )}

        {trackingData && (
          <div className="tracking-result wow animate__fadeInUp">
            <div className="status-header">
              <div className="status-badge">
                <Truck size={18} />
                {trackingData.status}
              </div>
              <div className="last-update">
                <span>Last Update:</span> {trackingData.lastUpdate}
              </div>
            </div>

            <div className="timeline">
              {trackingData.steps.map((step, idx) => (
                <div key={idx} className={`timeline-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''} ${step.pending ? 'pending' : ''}`}>
                  <div className="step-icon">
                    {step.completed ? <CheckCircle size={20} /> : step.current ? <Clock size={20} /> : <div className="dot"></div>}
                  </div>
                  <div className="step-details">
                    <h4>{step.title}</h4>
                    <p>{step.date}</p>
                  </div>
                  {idx < trackingData.steps.length - 1 && <div className="line"></div>}
                </div>
              ))}
            </div>

            <div className="support-section">
              <h3>Need Help?</h3>
              <p>Our support team is available 24/7 to assist with your delivery questions.</p>
              <div className="action-links">
                <a href="/contact" className="link">Contact Support <ArrowRight size={16} /></a>
                <a href="/faq" className="link">Visit FAQ <ArrowRight size={16} /></a>
              </div>
            </div>
          </div>
        )}

        {!trackingData && !error && !loading && (
          <div className="empty-state wow animate__fadeInUp">
            <Package size={64} className="icon" />
            <h2>Order ID Location</h2>
            <p>You can find your tracking ID in the order confirmation email or SMS sent to you after purchase.</p>
          </div>
        )}
      </div>
    </div>
  );
}
