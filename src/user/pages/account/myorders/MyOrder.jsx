import React, { useEffect, useState } from "react";
import api from "../../../../api";
import { useAuth } from "../../../../context/logintrue";
import { useCart } from "../../../../context/CartContext";
import {
  Package,
  Truck,
  Calendar,
  MapPin,
  FileText,
  Clock,
  AlertCircle,
  X,
  Download,
  RotateCcw,
  XCircle,
  AlertTriangle,
  CreditCard,
  Star,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import { trackEvent, trackDownload } from "../../../../utils/analytics";
import "./myorder.scss";

export default function MyOrder() {
  const { userId } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tracking Modal States
  const [trackingModal, setTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Cancel Modal States
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelOrderRef, setCancelOrderRef] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Pay-due loading state (per order)
  const [payDueLoading, setPayDueLoading] = useState({});

  // Re-order loading state (per order)
  const [reorderLoading, setReorderLoading] = useState({});

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/payment/myorders/${userId}`);
      const ordersData = res.data?.success ? res.data.data : (res.data || []);
      const sortedOrders = (Array.isArray(ordersData) ? ordersData : []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Fetch orders failed:", err);
      toast.error("Failed to load your orders");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchOrders();
    }
  }, [userId, fetchOrders]);

  const trackOrder = async (orderId) => {
    try {
      setLoadingTracking(true);
      setTrackingData(null);
      setTrackingModal(true);
      const res = await api.get(`/api/shipping/shiprocket/track/${orderId}`);
      if (res.data.success) {
        const data = res.data.tracking.tracking_data;
        setTrackingData({
          awb: data.awb_code,
          status: data.track_status,
          courier: data.courier_name,
          scans: (data.shipment_track_activities || []).map((s) => ({
            status: s.activity,
            location: s.location,
            date: s.date,
            time: "",
          })),
        });
        trackEvent("Orders", "Track Order", orderId);
      } else {
        toast.info("Tracking details are not yet updated by the courier partner.");
      }
    } catch {
      toast.error("Tracking info unavailable at the moment");
      setTrackingModal(false);
    } finally {
      setLoadingTracking(false);
    }
  };

  const downloadInvoice = async (order) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const baseURL = api.defaults.baseURL || "http://localhost:5002";
      window.open(`${baseURL}/api/payment/myorders/${order._id || order.id}/invoice?token=${encodeURIComponent(token)}`, "_blank");
      trackDownload(`Invoice-${order.orderId}`);
    } catch (err) {
      toast.error("Unable to download invoice");
    }
  };

  // ── CANCEL ORDER ──
  const promptCancel = (order) => {
    setCancelOrderId(order.id || order._id);
    setCancelOrderRef(order.orderId || (order.id || order._id || "").slice(-8).toUpperCase());
    setCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelOrderId) return;
    setCancelLoading(true);
    try {
      await api.post(`/api/payment/myorders/${cancelOrderId}/cancel`);
      toast.success("Order cancelled successfully");
      setCancelModal(false);
      setCancelOrderId(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelLoading(false);
    }
  };

  // ── RE-ORDER ──
  const handleReorder = async (order) => {
    setReorderLoading((prev) => ({ ...prev, [order._id]: true }));
    try {
      const products = order.products || order.OrderItems || [];
      let addedCount = 0;
      for (const item of products) {
        const success = await addToCart({
          id: item.productId || item._id,
          _id: item.productId || item._id,
          name: item.title || item.name,
          price: item.price,
          image: item.image,
          type: item.type || (item.isHardCopy !== false ? "hard" : "soft"),
          fileUrl: item.fileUrl || "",
        }, item.quantity || 1);
        if (success !== false) addedCount++;
      }
      if (addedCount > 0) {
        toast.success(`${addedCount} item${addedCount > 1 ? "s" : ""} added to cart!`);
        trackEvent("Orders", "Re-order", order.orderId);
        setTimeout(() => { window.location.href = "/cart"; }, 800);
      } else {
        toast.error("Could not add items to cart");
      }
    } catch {
      toast.error("Re-order failed, please try again");
    } finally {
      setReorderLoading((prev) => ({ ...prev, [order._id]: false }));
    }
  };

  // ── PAY REMAINING DUE ──
  const handlePayDue = async (order) => {
    setPayDueLoading((prev) => ({ ...prev, [order._id]: true }));
    try {
      const res = await api.post(`/api/payment/pay-due/${order._id}`, { userId });
      if (res.data.success) {
        window.open(res.data.paymentLinkUrl, "_blank");
        trackEvent("Orders", "Pay Due Online", order.orderId);
      } else {
        toast.error("Could not generate payment link");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment link generation failed");
    } finally {
      setPayDueLoading((prev) => ({ ...prev, [order._id]: false }));
    }
  };

  if (loading) return null;

  return (
    <div className="myorder-page">
      <div className="myorder-container">
        <header className="page-header">
          <div className="header-info">
            <h1>My Orders</h1>
            <p>Track your purchases and view order history</p>
          </div>
          <div className="order-count-badge">
            <span className="count">{orders.length}</span>
            <span className="label">Total Orders</span>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="empty-orders">
            <Package size={64} strokeWidth={1} />
            <h3>No orders yet</h3>
            <p>You haven't placed any orders yet. Start exploring our collection!</p>
            <button className="shop-now-btn" onClick={() => window.location.href = '/'}>
              Shop Now
            </button>
          </div>
        ) : (
          <div className="order-grid wow animate__animated animate__fadeInUp">
            {orders.map((order) => {
              const products = order.products || order.OrderItems || [];
              const containsHardCopy = products.some(p => p.isHardCopy !== false);
              const isShipped = order.awbCode && order.awbCode.trim() !== "";
              const isPending = order.status === "Pending";
              const isCancelled = order.status === "Cancelled";
              const hasDue = Number(order.dueAmount || 0) > 0 && isPending;

              return (
                <div key={order._id} className="order-card-wrapper">
                  <div className="order-card">
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="id-section">
                        <span className="id-label">ORDER ID</span>
                        <span className="id-value">#{order.orderId || order._id.slice(-8).toUpperCase()}</span>
                      </div>
                      {order.status !== 'Pending' && (
                        <div className={`status-pill ${order.status.toLowerCase()}`}>
                          {order.status}
                        </div>
                      )}
                    </div>

                    {/* Due Payment Banner */}
                    {hasDue && (
                      <div className="due-payment-banner">
                        <div className="due-banner-left">
                          <AlertTriangle size={16} />
                          <div>
                            <span className="due-label">Cash on Delivery Balance</span>
                            <span className="due-amount">₹{Number(order.dueAmount).toLocaleString("en-IN")} due on delivery</span>
                          </div>
                        </div>
                        <button
                          className="btn-pay-due"
                          onClick={() => handlePayDue(order)}
                          disabled={payDueLoading[order._id]}
                        >
                          {payDueLoading[order._id] ? (
                            <span className="btn-spinner" />
                          ) : (
                            <>
                              <CreditCard size={14} />
                              Pay Now
                              <ExternalLink size={12} />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="meta-info">
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="product-list">
                        {products.map((item, idx) => {
                          let safeLinks = item.productLinks;
                          if (typeof safeLinks === 'string') {
                            try { safeLinks = JSON.parse(safeLinks); } catch(e) { safeLinks = []; }
                          }
                          if (!Array.isArray(safeLinks)) safeLinks = [];

                          return (
                            <div key={idx} className="product-item">
                            <div className="product-img-wrapper">
                              <img src={getOptimizedImageUrl(item.image || "/noimg.png")} alt={item.title || item.name} />
                            </div>
                            <div className="product-details">
                              <h4>{item.title || item.name}</h4>
                              <p>Qty: {item.quantity} • {item.isHardCopy === false ? 'Digital Copy' : 'Hard Copy'}{item.language ? ` • 🌐 ${item.language}` : ''}</p>

                              {/* DOWNLOAD SECTION */}
                              {(item.fileUrl || safeLinks.length > 0) && (
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {item.fileUrl && (
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = item.fileUrl;
                                        link.setAttribute('download', item.title || 'Download');
                                        link.setAttribute('target', '_blank');
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        trackDownload(item.title || 'Download');
                                      }}
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                      <Download size={14} /> Download
                                    </button>
                                  )}
                                  {safeLinks.map((link, lIdx) => (
                                    <button
                                      key={lIdx}
                                      onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = link.link;
                                        a.setAttribute('download', `${item.title}-${link.language}`);
                                        a.setAttribute('target', '_blank');
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        trackDownload(`${item.title}-${link.language}`);
                                      }}
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                      <Download size={14} /> {link.language}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* WRITE REVIEW BUTTON */}
                              {!isCancelled && item.productId && (
                                <button
                                  className="btn-write-review"
                                  onClick={() => window.location.href = `/productpage/${item.productId}?tab=reviews`}
                                >
                                  <Star size={12} /> Write Review
                                </button>
                              )}
                            </div>
                            <div className="product-price">
                              ₹{(item.price || 0) * (item.quantity || 1)}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="card-footer">
                      <div className="total-section">
                        <span className="label">Grand Total</span>
                        <span className="amount">₹{order.amount}</span>
                      </div>

                      <div className="action-group">
                        {/* Track */}
                        {containsHardCopy && isShipped && (
                          <button className="btn-track" onClick={() => trackOrder(order._id)}>
                            <Truck size={16} />
                            <span>Track</span>
                          </button>
                        )}

                        {/* Re-order */}
                        {!isCancelled && (
                          <button
                            className="btn-reorder"
                            onClick={() => handleReorder(order)}
                            disabled={reorderLoading[order._id]}
                            title="Re-order all items"
                          >
                            {reorderLoading[order._id]
                              ? <span className="btn-spinner" />
                              : <RotateCcw size={15} />
                            }
                          </button>
                        )}

                        {/* Invoice */}
                        <button className="btn-invoice" onClick={() => downloadInvoice(order)} title="Download Invoice">
                          <FileText size={16} />
                        </button>

                        {/* Cancel order removed */}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========== TRACKING MODAL =========== */}
      {trackingModal && (
        <div className="tracking-modal-overlay" onClick={() => setTrackingModal(false)}>
          <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-text">
                <h2>Shipment Journey</h2>
                <div className="awb-info">
                  {trackingData && (
                    <>
                      <span className="courier">{trackingData.courier}</span>
                      <span className="divider">|</span>
                      <span className="awb">{trackingData.awb}</span>
                    </>
                  )}
                </div>
              </div>
              <button className="close-btn" onClick={() => setTrackingModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingTracking ? (
                <div className="tracking-loader">
                  <div className="pulse-loader"></div>
                  <p>Initializing live tracking...</p>
                </div>
              ) : trackingData && trackingData.scans?.length > 0 ? (
                <div className="timeline">
                  {trackingData.scans.map((scan, idx) => (
                    <div key={idx} className={`timeline-item ${idx === 0 ? 'current' : ''}`}>
                      <div className="timeline-marker">
                        <div className="dot"></div>
                        {idx !== trackingData.scans.length - 1 && <div className="line"></div>}
                      </div>
                      <div className="timeline-content">
                        <h4 className="scan-status">{scan.status}</h4>
                        <div className="scan-meta">
                          {scan.location && (
                            <span className="location">
                              <MapPin size={12} /> {scan.location}
                            </span>
                          )}
                          <span className="date">
                            <Clock size={12} /> {scan.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-tracking-data">
                  <AlertCircle size={40} />
                  <p>Tracking information is being updated by the courier. Please check back later.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========== CANCEL CONFIRM MODAL =========== */}
      {cancelModal && (
        <div className="tracking-modal-overlay" onClick={() => !cancelLoading && setCancelModal(false)}>
          <div className="cancel-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-modal-icon">
              <AlertTriangle size={36} />
            </div>
            <h3>Cancel Order?</h3>
            <p>
              Are you sure you want to cancel order <strong>#{cancelOrderRef}</strong>?<br />
              This action cannot be undone.
            </p>
            <div className="cancel-modal-actions">
              <button
                className="btn-confirm-cancel"
                onClick={confirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <><span className="btn-spinner" /> Cancelling...</>
                ) : (
                  <><XCircle size={16} /> Yes, Cancel Order</>
                )}
              </button>
              <button
                className="btn-keep-order"
                onClick={() => setCancelModal(false)}
                disabled={cancelLoading}
              >
                <CheckCircle size={16} /> Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
