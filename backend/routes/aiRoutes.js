const express = require("express");
const router = express.Router();
const aiConfigController = require("../controller/aiConfigController");
const aiGenerationController = require("../controller/aiGenerationController");

// AI Config
router.get("/config", aiConfigController.getConfig);
router.post("/config", aiConfigController.updateConfig);

// AI Generation
router.post("/generate", aiGenerationController.generateProductInfo);

module.exports = router;
