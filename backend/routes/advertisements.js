const express = require("express");
const router = express.Router();
const advertisementController = require("../controller/advertisementController");

// Route to add a new advertisement (POST)
router.post("/add", advertisementController.addAdvertisement);

// Route to get all advertisements (GET)
router.get("/", advertisementController.getAdvertisements);

// Route to update advertisement status
router.put("/:id/status", advertisementController.updateAdvertisementStatus);

router.delete("/:id", advertisementController.deleteAdvertisement);

module.exports = router;
