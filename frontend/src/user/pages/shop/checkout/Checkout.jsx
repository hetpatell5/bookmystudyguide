"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../../../context/CartContext";
import { useAuth } from "../../../../context/logintrue";
import api from "../../../../api";
import { trackEvent, trackDownload } from "../../../../utils/analytics";
import { useSiteConfig } from "../../../../context/SiteConfigContext";
import defaultLogo from "../../../../assets/logos/logo1.png";

import "./checkout.scss";
import { toast } from "react-toastify";
import {
  Loader2, CreditCard, CheckCircle, Package, User, Truck,
  Wallet, Download, Ticket, X, ShieldCheck, ChevronRight,
  Banknote, Zap, MapPin, Phone, Mail, Tag
} from "lucide-react";
import { getOptimizedImageUrl } from "../../../../utils/imageUtils";
import OrderConfirm from "../../../components/orderconfirm/OrderConfirm";

const generateOrderId = () => `BMSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getCouponDiscount = (coupon, amount) => {
  if (!coupon) return 0;
  if (coupon.discountAmount != null) return Math.min(Number(coupon.discountAmount) || 0, amount);

  const type = String(coupon.discountType || coupon.type || "").toLowerCase();
  const value = Number(coupon.discountValue ?? coupon.discount ?? 0);
  const maxDiscount = coupon.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount);
  let discount = type === "percentage"
    ? Math.round((amount * value) / 100)
    : value;

  if (maxDiscount != null && discount > maxDiscount) discount = maxDiscount;
  return Math.min(discount, amount);
};

export default function Checkout() {
  const { cartItems, cartTotal, clearCart, hasHardCopy } = useCart();
  const { user, userId, isLoggedIn, setLoginModalOpen } = useAuth();
  const { config } = useSiteConfig();

  const [formData, setFormData] = useState({
    firstName: "", lastName: "",
    email: user?.email || "", phone: "",
    address: "", city: "", state: "", zip: "",
  });

  const [paymentOption, setPaymentOption] = useState("full_online");
  const [pinStatus, setPinStatus] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingEstimated, setShippingEstimated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const navigate = useNavigate();

  // Restore the success/failure screen if the URL already carries a status
  // (e.g. the user refreshed the page right after payment).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") setOrderSuccess(true);
    else if (status === "failed") setPaymentFailed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [purchasedSoftCopies, setPurchasedSoftCopies] = useState([]);
  const [sitePaymentMode, setSitePaymentMode] = useState("BOTH");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [couponsLoading, setCouponsLoading] = useState(false);

  const pinDebounce = useRef(null);

  const hasSoftCopy = useMemo(() =>
    cartItems.some(i => i.type?.toLowerCase().includes("soft") || i.isSoftCopy === true),
    [cartItems]
  );

  React.useEffect(() => {
    if (hasSoftCopy && paymentOption !== "full_online") setPaymentOption("full_online");
  }, [hasSoftCopy, paymentOption]);

  React.useEffect(() => {
    api.get("/api/config/razorpay")
      .then(({ data }) => { if (data.success) setRazorpayKey(data.key); })
      .catch(() => toast.error("Payment system unavailable"));
  }, []);

  React.useEffect(() => {
    setCouponsLoading(true);
    api.get("/api/coupons/active")
      .then(({ data }) => {
        if (data.success) {
          setAvailableCoupons(data.data.filter(c => c.isActive));
        }
      })
      .catch(() => {})
      .finally(() => setCouponsLoading(false));
  }, []);

  React.useEffect(() => {
    api.get(`/api/config/site-settings?ts=${Date.now()}`).then(({ data }) => {
      if (data.success && Array.isArray(data.data)) {
        const pc = data.data.find(c => c.key === "SITE_PAYMENT_MODE");
        if (pc?.value) {
          const mode = pc.value.trim().toUpperCase();
          setSitePaymentMode(mode);
          if (mode === "PREPAID" || hasSoftCopy) setPaymentOption("full_online");
        }
      }
    }).catch(() => {});
  }, [hasSoftCopy]);

  const totals = useMemo(() => {
    const discount = getCouponDiscount(appliedCoupon, cartTotal);
    const discounted = cartTotal - discount;
    const grandTotal = discounted + shippingFee;
    let payNow = grandTotal, payLater = 0;
    if (paymentOption === "half_online") {
      payLater = Math.round(grandTotal / 2);
      payNow = grandTotal - payLater;
    }
    return { discount, grandTotal, payNow, payLater, finalShippingFee: shippingFee, finalServiceFee: 0 };
  }, [cartTotal, paymentOption, shippingFee, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const res = await api.post("/api/coupons/verify", {
        code: couponCode,
        orderValue: cartTotal,
        cartItems: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          type: item.type,
          itemKind: item.itemKind,
          mainDegreeId: item.mainDegreeId,
          isSynopsis: item.isSynopsis,
        })),
      });
      if (res.data.success) {
        setAppliedCoupon(res.data.data);
        toast.success("Coupon applied!");
        trackEvent("Checkout", "Coupon Applied", couponCode);
      }
    } catch (err) {
      setAppliedCoupon(null);
      const msg = err.response?.data?.message || "Invalid coupon";
      setCouponError(msg);
      toast.error(msg);
    }
  };

  const lookupPin = async (pin) => {
    try {
      setPinStatus("checking");
      setShippingFee(0);
      setShippingEstimated(false);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data[0].Status === "Success") {
        const d = data[0].PostOffice[0];
        setFormData(p => ({ ...p, city: d.District, state: d.State }));
        setPinStatus("success");
        toast.success(`${d.District}, ${d.State}`);

        if (hasHardCopy) {
          setShippingLoading(true);
          try {
            const sr = await api.get(`/api/shipping/estimate?pincode=${pin}`);
            if (sr.data.success && sr.data.avgRate !== null) {
              setShippingFee(sr.data.avgRate || 0);
              setShippingEstimated(true);
            }
          } catch (e) {
            console.error("Shipping estimate failed:", e);
          }
          finally { setShippingLoading(false); }
        }
      } else { setPinStatus("error"); toast.error("Invalid pincode"); }
    } catch { setPinStatus("error"); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "zip") {
      const v = value.replace(/\D/g, "").slice(0, 6);
      setFormData(p => ({ ...p, zip: v }));
      clearTimeout(pinDebounce.current);
      if (v.length === 6) pinDebounce.current = setTimeout(() => lookupPin(v), 500);
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const triggerFileDownload = (url, filename) => {
    if (!url) { toast.error("Download link unavailable"); return; }
    trackDownload(filename);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename || "StudyMaterial");
    a.setAttribute("target", "_blank");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loadScript = (src) => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // 🔐 Check login FIRST — before any other validation
    if (!isLoggedIn || !userId) {
      toast.error("Please login to continue checkout.");
      setLoginModalOpen(true);
      return;
    }

    if (pinStatus !== "success" && formData.zip.length !== 6) {
      toast.error("Enter a valid pincode"); return;
    }

    setIsProcessing(true);
    const customOrderId = generateOrderId();
    const currentAddress = {
      street: formData.address, city: formData.city, state: formData.state,
      pincode: Number(formData.zip),
      fullAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zip}`
    };

    if (!currentAddress.city || !currentAddress.state) {
      toast.error("City and State required. Check your pincode.");
      setIsProcessing(false); return;
    }

    const productsPayload = cartItems.map(item => ({
      productId: item.productId,
      title: item.name,
      image: item.image,
      price: Number(item.price),
      quantity: Number(item.quantity),
      type: item.type || "Hard Copy",
      isHardCopy: item.type?.toLowerCase().includes("hard") || (item.isHardCopy !== false && !item.type?.toLowerCase().includes("soft")),
      sku: item.sku || "NO-SKU",
      fileUrl: item.fileUrl || "",
      language: item.language || "",
      isSynopsis: item.isSynopsis || false,
      productLinks: item.productLinks || []
    }));

    const skuString = productsPayload.map(p => `${p.title.substring(0, 15)}... (x${p.quantity})`).join(", ").substring(0, 250);

    try {
      const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!loaded) { toast.error("Razorpay SDK failed"); setIsProcessing(false); return; }

      const result = await api.post("/api/payment/orders", {
        amount: totals.payNow, receipt: customOrderId, notes: { products: skuString }
      });
      if (!result.data) { toast.error("Server error"); setIsProcessing(false); return; }

      const { amount, id: order_id, currency } = result.data;
      if (!razorpayKey) { toast.error("Payment config missing"); setIsProcessing(false); return; }

      const options = {
        key: razorpayKey,
        amount: amount.toString(),
        currency,
        name: config.SITE_TITLE || "Book My Study Guide",
        description: "Order Payment",
        image: config.SITE_LOGO || defaultLogo,
        order_id,
        notes: { shipping_address: currentAddress.fullAddress, order_items: skuString },
        modal: { ondismiss: () => { setIsProcessing(false); toast.info("Payment cancelled"); } },
        handler: async (response) => {
          setIsProcessing(false);
          setShowAnimation(true);

          const softCopies = cartItems.filter(item => {
            const isSoft = item.isSynopsis || item.isSoftCopy || item.type?.toLowerCase().includes("soft") || item.type?.toLowerCase().includes("digital");
            return isSoft && (item.fileUrl || item.productId?.productLinks?.length > 0);
          });
          setPurchasedSoftCopies(softCopies);

          let verified = false;
          try {
            await api.post("/api/payment/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              userId,
              products: productsPayload,
              orderId: customOrderId,
              totalAmount: totals.grandTotal,
              paidAmount: totals.payNow,
              dueAmount: totals.payLater,
              paymentMode: paymentOption,
              shippingCost: totals.finalShippingFee,
              serviceFee: totals.finalServiceFee,
              couponCode: appliedCoupon?.code || "",
              discountAmount: totals.discount,
              address: currentAddress,
              customerName: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              phone: formData.phone,
            });
            trackEvent("Checkout", "Payment Success", customOrderId, totals.payNow);
            if (typeof window !== "undefined" && typeof window.gtag === "function") {
              window.gtag("event", "conversion", {
                send_to: "AW-18416354957/gt51CPPs8OkcEI2Nzc1E",
                value: totals.payNow,
                currency: "INR",
                transaction_id: customOrderId,
              });
            }
            clearCart();
            verified = true;
          } catch (err) {
            console.error("Verify error", err);
            toast.error("Order verification failed. Contact support.");
            trackEvent("Checkout", "Payment Verify Failed", customOrderId, totals.payNow);
          }

          setTimeout(() => {
            setShowAnimation(false);
            if (verified) {
              setOrderSuccess(true);
              navigate(`/checkout?status=success`, { replace: true });
              if (softCopies.length > 0) {
                toast.success("Downloading your projects...");
                softCopies.forEach((item, i) => {
                  if (item.fileUrl) setTimeout(() => triggerFileDownload(item.fileUrl, item.title), i * 1500 + 500);
                });
              }
            } else {
              setPaymentFailed(true);
              navigate(`/checkout?status=failed`, { replace: true });
            }
          }, 3000);
        },
        prefill: { name: `${formData.firstName} ${formData.lastName}`, email: formData.email, contact: formData.phone },
        theme: { color: "#1a3c6e" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setIsProcessing(false);
        setPaymentFailed(true);
        navigate(`/checkout?status=failed`, { replace: true });
        trackEvent("Checkout", "Payment Failed", customOrderId, totals.payNow);
        toast.error(response?.error?.description || "Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please login and try again.");
        setLoginModalOpen(true);
      } else {
        const msg = err.response?.data?.message || "Payment initiation failed. Please try again.";
        toast.error(msg);
      }
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !orderSuccess && !showAnimation && !paymentFailed)
    return (
      <div className="co-empty">
        <Package size={48} />
        <h2>Your cart is empty</h2>
        <button onClick={() => window.location.href = "/"}>Browse Products</button>
      </div>
    );

  return (
    <>
      {showAnimation && <div className="co-overlay"><OrderConfirm /></div>}

      {orderSuccess && (
        <div className="co-overlay co-success-screen">
          <div className="co-success-box">
            <div className="co-success-icon"><CheckCircle size={52} /></div>
            <h2>Order Placed!</h2>
            <p>Thank you for your purchase. You'll receive a confirmation email shortly.</p>

            {paymentOption === "half_online" && (
              <div className="co-cod-reminder">
                <Banknote size={18} />
                <span>Remember to keep <strong>₹{totals.payLater}</strong> ready to pay on delivery.</span>
              </div>
            )}

            {purchasedSoftCopies.length > 0 && (
              <div className="co-downloads">
                <h4>Your Downloads</h4>
                {purchasedSoftCopies.map((item, i) => (
                  <div key={i} className="co-download-item">
                    <img src={getOptimizedImageUrl(item.image)} alt="" />
                    <span>{item.title}</span>
                    {item.fileUrl
                      ? <button onClick={() => triggerFileDownload(item.fileUrl, item.title)}><Download size={14} /> Download</button>
                      : item.productId?.productLinks?.map((l, j) => (
                        <button key={j} onClick={() => triggerFileDownload(l.link, `${item.title}-${l.language}`)}>
                          <Download size={14} /> {l.language}
                        </button>
                      ))
                    }
                  </div>
                ))}
              </div>
            )}

            <button className="co-home-btn" onClick={() => window.location.href = "/"}>Back to Home</button>
          </div>
        </div>
      )}

      {paymentFailed && (
        <div className="co-overlay co-success-screen co-failed-screen">
          <div className="co-success-box">
            <div className="co-success-icon co-failed-icon"><X size={52} /></div>
            <h2>Payment Failed</h2>
            <p>Your payment could not be completed. No amount was charged, or it will be refunded automatically if debited.</p>
            <div className="co-failed-actions">
              <button
                className="co-home-btn"
                onClick={() => {
                  setPaymentFailed(false);
                  navigate("/checkout", { replace: true });
                }}
              >
                Try Again
              </button>
              <button className="co-home-btn co-home-btn-outline" onClick={() => window.location.href = "/"}>Back to Home</button>
            </div>
          </div>
        </div>
      )}

      {!orderSuccess && !showAnimation && !paymentFailed && (
        <div className="co-wrapper">
          <div className="co-container">

            {/* LEFT */}
            <div className="co-left">
              <form id="co-form" onSubmit={handlePlaceOrder}>

                {/* Step 1 — Contact */}
                <div className="co-card">
                  <div className="co-card-header">
                    <div className="co-step">1</div>
                    <h3>Contact Details</h3>
                    <User size={18} />
                  </div>
                  <div className="co-grid-2">
                    <div className="co-field">
                      <label>First Name</label>
                      <input name="firstName" placeholder="John" onChange={handleChange} required />
                    </div>
                    <div className="co-field">
                      <label>Last Name</label>
                      <input name="lastName" placeholder="Doe" onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="co-grid-2">
                    <div className="co-field">
                      <label><Mail size={12} /> Email</label>
                      <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="co-field">
                      <label><Phone size={12} /> Phone</label>
                      <input name="phone" maxLength="10" placeholder="98XXXXXXXX" onChange={handleChange} required />
                    </div>
                  </div>
                </div>

                {/* Step 2 — Delivery / Billing Address */}
                {
                  <div className="co-card">
                    <div className="co-card-header">
                      <div className="co-step">2</div>
                      <h3>{hasHardCopy ? "Delivery Address" : "Billing Address"}</h3>
                      <MapPin size={18} />
                    </div>

                    {/* Use Saved Address */}
                    {user?.address && (
                      <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                          <span style={{ display: 'block', fontWeight: 700, color: '#1e40af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Saved Address</span>
                          {user.address}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const addr = user.address || "";
                            // Try to extract pincode from saved address
                            const pincodeMatch = addr.match(/\b(\d{6})\b/);
                            setFormData(prev => ({
                              ...prev,
                              address: addr.replace(/\b\d{6}\b/, '').replace(/,\s*$/, '').trim(),
                            }));
                            if (pincodeMatch) {
                              // Trigger pincode lookup via a synthetic event
                              const mockEvent = { target: { name: 'zip', value: pincodeMatch[1] } };
                              handleChange(mockEvent);
                            }
                            toast.success("Saved address applied!");
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          <MapPin size={13} /> Use This Address
                        </button>
                      </div>
                    )}

                    <div className="co-field">
                      <label>Street Address</label>
                      <input name="address" value={formData.address} placeholder="House No, Building, Area" onChange={handleChange} required />
                    </div>
                    <div className="co-grid-3">
                      <div className="co-field">
                        <label>
                          Pincode
                          {pinStatus === "checking" && <Loader2 size={12} className="co-spin" />}
                          {pinStatus === "success" && <CheckCircle size={12} color="#16a34a" />}
                        </label>
                        <input name="zip" maxLength="6" placeholder="395010" onChange={handleChange} required
                          className={pinStatus === "success" ? "co-input-ok" : pinStatus === "error" ? "co-input-err" : ""} />
                      </div>
                      <div className="co-field">
                        <label>City</label>
                        <input name="city" value={formData.city} readOnly className="co-readonly" />
                      </div>
                      <div className="co-field">
                        <label>State</label>
                        <input name="state" value={formData.state} readOnly className="co-readonly" />
                      </div>
                    </div>
                  </div>
                }

                {/* Step 3 — Payment */}
                <div className="co-card">
                  <div className="co-card-header">
                    <div className="co-step">3</div>
                    <h3>Payment Method</h3>
                    <Wallet size={18} />
                  </div>

                  <div className="co-pay-options">
                    <label className={`co-pay-card ${paymentOption === "full_online" ? "active" : ""}`}>
                      <input type="radio" name="payOpt" checked={paymentOption === "full_online"} onChange={() => setPaymentOption("full_online")} />
                      <div className="co-pay-icon co-pay-icon--blue"><Zap size={22} /></div>
                      <div className="co-pay-info">
                        <span className="co-pay-title">Full Payment</span>
                        <span className="co-pay-sub">Pay ₹{totals.grandTotal} now · Instant confirmation</span>
                      </div>
                      <div className="co-pay-check"><CheckCircle size={18} /></div>
                    </label>

                    {sitePaymentMode === "BOTH" && !hasSoftCopy && (
                      <label className={`co-pay-card ${paymentOption === "half_online" ? "active" : ""}`}>
                        <input type="radio" name="payOpt" checked={paymentOption === "half_online"} onChange={() => setPaymentOption("half_online")} />
                        <div className="co-pay-icon co-pay-icon--green"><Banknote size={22} /></div>
                        <div className="co-pay-info">
                          <span className="co-pay-title">Half Online + Half COD</span>
                          <span className="co-pay-sub">Pay ₹{Math.ceil(totals.grandTotal / 2)} now · ₹{Math.floor(totals.grandTotal / 2)} on delivery</span>
                        </div>
                        <div className="co-pay-check"><CheckCircle size={18} /></div>
                      </label>
                    )}
                  </div>

                  {hasSoftCopy && (
                    <div className="co-soft-note">
                      <ShieldCheck size={15} />
                      <span>Orders with digital/project items require full online payment for instant access.</span>
                    </div>
                  )}

                  {paymentOption === "half_online" && (
                    <div className="co-cod-breakdown">
                      <div className="co-cod-row">
                        <span>Pay now via Razorpay</span>
                        <strong>₹{totals.payNow}</strong>
                      </div>
                      <div className="co-cod-row co-cod-row--cash">
                        <span><Banknote size={14} /> Cash on Delivery</span>
                        <strong>₹{totals.payLater}</strong>
                      </div>
                      <p className="co-cod-note">Keep the cash ready when our courier arrives.</p>
                    </div>
                  )}
                </div>

              </form>
            </div>

            {/* RIGHT — Summary */}
            <div className="co-right">
              <div className="co-summary">
                <div className="co-summary-header">
                  <CreditCard size={18} />
                  <span>Order Summary</span>
                </div>

                {/* Cart Items */}
                <div className="co-items">
                  {cartItems.map((item, i) => (
                    <div key={i} className="co-item">
                      <img src={getOptimizedImageUrl(item.image)} alt={item.name} />
                      <div className="co-item-info">
                        <span className="co-item-name">{item.name}</span>
                        <span className="co-item-meta">{item.type} · qty {item.quantity}</span>
                      </div>
                      <span className="co-item-price">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="co-coupon">
                  {appliedCoupon ? (
                    <div className="co-coupon-applied">
                      <Tag size={14} />
                      <span>{appliedCoupon.code} — saved ₹{totals.discount}</span>
                      <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); setCouponError(""); }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="co-coupon-input">
                      <input placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                      <button type="button" onClick={handleApplyCoupon}>Apply</button>
                    </div>
                  )}
                  {couponError && <p className="co-coupon-err">{couponError}</p>}
                  <ul className="co-coupon-rules">
                    {(appliedCoupon?.conditions || ["Only one coupon can be used per order"]).map((condition, index) => (
                      <li key={index}>{condition}</li>
                    ))}
                  </ul>

                  {/* Available Coupons List */}
                  {availableCoupons.length > 0 && !appliedCoupon && (
                    <div className="co-available-coupons">
                      <button
                        type="button"
                        className="co-coupons-toggle"
                        onClick={() => setShowCoupons(v => !v)}
                      >
                        <Ticket size={14} />
                        <span>{showCoupons ? "Hide" : "View"} {availableCoupons.length} available coupon{availableCoupons.length !== 1 ? "s" : ""}</span>
                        <span className={`co-coupons-chevron ${showCoupons ? "open" : ""}`}>▾</span>
                      </button>

                      {showCoupons && (
                        <div className="co-coupons-list">
                          {couponsLoading ? (
                            <p className="co-coupons-loading">Loading coupons…</p>
                          ) : (
                            availableCoupons.map((c) => {
                              const isPercent = (c.discountType || c.type || "").toLowerCase() === "percentage";
                              const discVal = c.discountValue || c.discount || 0;
                              const savingLabel = isPercent
                                ? `${discVal}% OFF${c.maxDiscountAmount ? ` (up to ₹${c.maxDiscountAmount})` : ""}`
                                : `₹${discVal} OFF`;
                              const minLabel = c.minOrderAmount > 0 ? `Min. order ₹${c.minOrderAmount}` : null;
                              const expiry = c.expiryDate ? new Date(c.expiryDate) : null;
                              const expiryLabel = expiry ? `Expires ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : null;

                              return (
                                <div key={c.id || c.code} className="co-coupon-card">
                                  <div className="co-coupon-card-left">
                                    <div className="co-coupon-badge">
                                      <Tag size={12} />
                                      <span>{c.code}</span>
                                    </div>
                                    <p className="co-coupon-saving">{savingLabel}</p>
                                    <div className="co-coupon-meta">
                                      {minLabel && <span>{minLabel}</span>}
                                      {expiryLabel && <span>{expiryLabel}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="co-coupon-apply-btn"
                                    onClick={() => {
                                      setCouponCode(c.code);
                                      setShowCoupons(false);
                                      setTimeout(() => {
                                        api.post("/api/coupons/verify", {
                                          code: c.code,
                                          orderValue: cartTotal,
                                          cartItems: cartItems.map(item => ({
                                            productId: item.productId,
                                            quantity: item.quantity,
                                            price: item.price,
                                            type: item.type,
                                            itemKind: item.itemKind,
                                            mainDegreeId: item.mainDegreeId,
                                            isSynopsis: item.isSynopsis,
                                          })),
                                        }).then(res => {
                                          if (res.data.success) {
                                            setAppliedCoupon(res.data.data);
                                            setCouponError("");
                                            toast.success("Coupon applied!");
                                          }
                                        }).catch(err => {
                                          const msg = err.response?.data?.message || "Coupon not applicable";
                                          setCouponError(msg);
                                          toast.error(msg);
                                        });
                                      }, 0);
                                    }}
                                  >
                                    Apply
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="co-totals">
                  <div className="co-total-row">
                    <span>Subtotal</span><span>₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="co-total-row co-total-row--discount">
                      <span>Discount</span><span>− ₹{totals.discount}</span>
                    </div>
                  )}
                  {hasHardCopy && (
                    <div className="co-total-row">
                      <span>Shipping</span>
                      {shippingLoading
                        ? <span className="co-ship-loading"><Loader2 size={12} className="co-spin" /> Calculating…</span>
                        : !shippingEstimated
                          ? <span className="co-ship-pending">{pinStatus === "success" ? "Unavailable" : "Enter pincode"}</span>
                          : totals.finalShippingFee > 0
                            ? <span>₹{totals.finalShippingFee.toLocaleString("en-IN")}</span>
                            : <span className="co-total-row--free">Free</span>
                      }
                    </div>
                  )}
                  <div className="co-total-row co-total-row--grand">
                    <span>Total</span><span>₹{totals.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Pay split for half_online */}
                {paymentOption === "half_online" && (
                  <div className="co-split">
                    <div className="co-split-row">
                      <span>Pay now</span><strong>₹{totals.payNow}</strong>
                    </div>
                    <div className="co-split-row co-split-cod">
                      <span><Banknote size={13} /> On delivery</span><strong>₹{totals.payLater}</strong>
                    </div>
                  </div>
                )}

                <button type="submit" form="co-form" className="co-pay-btn" disabled={isProcessing || cartTotal === 0 || shippingLoading}>
                  {shippingLoading
                    ? <><Loader2 size={18} className="co-spin" /> Calculating shipping…</>
                    : isProcessing
                      ? <><Loader2 size={18} className="co-spin" /> Processing…</>
                      : <><ShieldCheck size={18} /> Pay ₹{totals.payNow} <ChevronRight size={18} /></>
                  }
                </button>

                <p className="co-secure-note">🔒 Secured by Razorpay · 256-bit SSL</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
