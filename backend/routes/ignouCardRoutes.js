const express = require("express");
const router = express.Router();
const { IgnouCard } = require("../model/mysql");

// Get All IGNOU Cards
router.get("/", async (req, res) => {
    try {
        const cards = await IgnouCard.findAll({ order: [['order', 'ASC'], ['createdAt', 'ASC']] });
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add New Card
router.post("/", async (req, res) => {
    try {
        const { title, subtitle, icon, slug, targetUrl, order } = req.body;
        const newCard = await IgnouCard.create({ title, subtitle, icon, slug, targetUrl, order });
        res.status(201).json(newCard);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Card
router.put("/:id", async (req, res) => {
    try {
        const [updatedRows] = await IgnouCard.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updatedRows) return res.status(404).json({ error: "Card not found" });
        const updated = await IgnouCard.findByPk(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Card
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await IgnouCard.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: "Card not found" });
        res.json({ message: "Card Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
