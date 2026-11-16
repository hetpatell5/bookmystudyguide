const express = require("express");
const {
    getAllFaqs,
    createFaq,
    updateFaq,
    deleteFaq,
} = require("../controller/faqController");

// Use the correct existing adminAuth middleware path
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// Public route (Users see these FAQs)
router.get("/", getAllFaqs);

// Protected routes (Only Admins can modify FAQs)
router.post("/", adminAuth, createFaq);
router.put("/:id", adminAuth, updateFaq);
router.delete("/:id", adminAuth, deleteFaq);

module.exports = router;
