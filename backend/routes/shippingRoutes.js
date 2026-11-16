// routes/shippingRoutes.js
const express = require("express");
const router = express.Router();
const shippingController = require("../controller/Shippingcontroller");

// ============================================================
// SHIPROCKET ROUTES
// ============================================================

// Estimate average shipping cost for a pincode (public, used at checkout)
router.get("/estimate", shippingController.estimateShipping);

// Create order in Shiprocket
router.post("/shiprocket/create", shippingController.createShiprocketOrder);

// Get available couriers
router.post("/shiprocket/couriers", shippingController.getShiprocketCouriers);

// Schedule pickup & generate AWB
router.post(
  "/shiprocket/schedule",
  shippingController.scheduleShiprocketPickup,
);

// Download documents
router.get(
  "/shiprocket/label/:orderId",
  shippingController.downloadShiprocketLabel,
);
router.get(
  "/shiprocket/invoice/:orderId",
  shippingController.downloadShiprocketInvoice,
);
router.get(
  "/shiprocket/manifest/:orderId",
  shippingController.downloadShiprocketManifest,
);

// Track shipment
router.get(
  "/shiprocket/track/:orderId",
  shippingController.trackShiprocketShipment,
);

// Cancel shipment
router.post("/shiprocket/cancel", shippingController.cancelShiprocketShipment);

module.exports = router;
