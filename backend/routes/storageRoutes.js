const express = require("express");
const router = express.Router();
const storageController = require("../controller/storageController");
const adminAuth = require("../middleware/adminAuth"); // Ensure only admins can view

// Route to get raw storage statistics
router.get("/", adminAuth, storageController.getStorageStats);

module.exports = router;
