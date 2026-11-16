const express = require("express");
const router = express.Router();
const { Service } = require("../model/mysql");

// Get All Services
router.get("/", async (req, res) => {
  try {
    const services = await Service.findAll({ order: [['createdAt', 'DESC']] });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Service
router.post("/", async (req, res) => {
  try {
    const { title, description, icon } = req.body;

    // Basic Validation
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and Description are required" });
    }

    const newService = await Service.create({
      title,
      description,
      icon: icon || "https://via.placeholder.com/150", // Default if empty
    });

    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Service
router.put("/:id", async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    await service.update(req.body);
    res.json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Service
router.delete("/:id", async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    await service.destroy();
    res.json({ message: "Service Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
