const express = require("express");
const router = express.Router();
const { Feedback } = require("../model/mysql");

// @route   POST /api/feedback
// @desc    Submit feedback
// @access  Public
router.post("/", async (req, res) => {
    try {
        const { name, email, message, rating } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const feedback = await Feedback.create({
            name,
            email,
            message,
            rating: rating || 5
        });

        res.status(201).json({ success: true, message: "Feedback submitted successfully!", feedback });
    } catch (error) {
        console.error("Feedback error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// @route   GET /api/feedback
// @desc    Get all feedback (Admin only)
router.get("/", async (req, res) => {
    try {
        const feedbacks = await Feedback.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, feedbacks });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (Admin only)
router.delete("/:id", async (req, res) => {
    try {
        const feedback = await Feedback.destroy({ where: { id: req.params.id } });
        if (!feedback) {
            return res.status(404).json({ success: false, message: "Feedback not found" });
        }
        res.json({ success: true, message: "Feedback deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
