const express = require("express");
const router = express.Router();
const { Subscriber } = require("../model/mysql");

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Check if duplicate
        const existing = await Subscriber.findOne({ where: { email } });
        if (existing) {
            return res.status(200).json({ success: true, message: "You are already subscribed!" });
        }

        await Subscriber.create({ email });
        res.status(201).json({ success: true, message: "Subscribed successfully!" });
    } catch (error) {
        console.error("Newsletter error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all subscribers (Admin only)
router.get("/subscribers", async (req, res) => {
    try {
        const subscribers = await Subscriber.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, subscribers });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
