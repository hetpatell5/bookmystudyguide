const express = require("express");
const router = express.Router();
const ctrl = require("../controller/projectInquiryController");
const adminAuth = require("../middleware/adminAuth");

// Public — student submits form
router.post("/", ctrl.createInquiry);

// Admin — view and manage inquiries
router.get("/", adminAuth, ctrl.getAllInquiries);
router.get("/:id", adminAuth, ctrl.getInquiryById);
router.patch("/:id", adminAuth, ctrl.updateInquiry);
router.delete("/:id", adminAuth, ctrl.deleteInquiry);

module.exports = router;
