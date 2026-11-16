const express = require("express");
const router = express.Router();
const analyticsController = require("../controller/analyticsController");
const googleAnalyticsController = require("../controller/googleAnalyticsController");
const adminAuth = require("../middleware/adminAuth");

// Route for deep analytics
router.get("/deep-insights", adminAuth, analyticsController.getDeepAnalytics);

// Route for real-time analytics
router.get("/realtime", adminAuth, googleAnalyticsController.getRealtimeData);

// Route for overview analytics (Real-time + Historical + Geo)
router.get("/overview", adminAuth, googleAnalyticsController.getAnalyticsOverview);

module.exports = router;
