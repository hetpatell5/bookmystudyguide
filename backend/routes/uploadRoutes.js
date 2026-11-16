const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const uploadController = require("../controller/uploadController");
const adminAuth = require("../middleware/adminAuth"); // Assuming only admins can upload files like books/images

// POST /api/upload
// Endpoint for general file uploads (images, pdfs, etc.)
router.post("/upload", adminAuth, upload.single("file"), uploadController.uploadFile);

// POST /api/upload/image
// Specifically for blog images to match frontend expectations
router.post("/image", adminAuth, upload.single("image"), uploadController.uploadFile);

module.exports = router;
