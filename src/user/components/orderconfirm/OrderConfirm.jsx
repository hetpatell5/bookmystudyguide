import React from "react";
import "./OrderConfirm.scss";

// Shown only while the order is being placed/verified — the actual "Order
// Placed!" confirmation is the single success screen in Checkout.jsx
// (orderSuccess), so this stays a pure loading indicator and never shows
// its own duplicate success message.
export default function OrderConfirm() {
  return (
    <div className="fullscreen-loader">
      <div className="loader-container">
        <div className="spinner-box">
          <div className="spinner"></div>
          <p>Placing your order...</p>
        </div>
      </div>
    </div>
  );
}
