const express = require("express");
const { Config, sequelize } = require("../model/mysql");
const { loadConfig } = require("../utils/configService");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { s3Client, bucketName, publicUrl } = require("../config/r2Config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { Op } = require("sequelize");

const router = express.Router();

// Configure Multer for image storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

/**
 * GET RAZORPAY KEY (Public)
 * GET /api/config/razorpay
 */
router.get("/razorpay", async (req, res) => {
  try {
    const config = await Config.findOne({
      where: {
        key: "RAZORPAY_KEY_ID",
        isActive: true,
      }
    });
    if (!config)
      return res.status(404).json({ success: false, message: "Key not configured" });
    res.json({ success: true, key: config.value });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * GET SITE SETTINGS (Public - Payment, Logo, Policies, Analytics)
 * GET /api/config/site-settings
 */
router.get("/site-settings", async (req, res) => {
  try {
    const keys = ["SITE_PAYMENT_MODE", "SITE_LOGO", "SITE_TITLE", "SITE_DESCRIPTION", "SITE_KEYWORDS", "POLICY_SHIPPING", "POLICY_RETURNS", "POLICY_TERMS", "GOOGLE_ANALYTICS_ID", "GA_PROPERTY_ID", "ABOUT_GST_CERT_URL", "ABOUT_STARTUP_CERT_URL"];
    const configs = await Config.findAll({ 
      where: { 
        key: { [Op.in]: keys }, 
        isActive: true 
      } 
    });
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * UPLOAD LOGO
 * POST /api/config/upload-logo
 */
router.post("/upload-logo", auth, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Upload local file to Cloudflare R2
    const extension = path.extname(req.file.originalname).substring(1) || 'png';
    const filename = `site_assets/logo-${Date.now()}.${extension}`;
    const fileContent = await fs.readFile(req.file.path);

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: fileContent,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    }));

    // CLEANUP: Unlink local file after upload
    await fs.unlink(req.file.path).catch(e => console.error("Error deleting temp logo:", e));

    const logoUrl = `${publicUrl}/${filename}`;

    let config = await Config.findOne({ where: { key: "SITE_LOGO" } });
    if (config) {
      await config.update({ value: logoUrl, isActive: true, group: "site_settings", description: "Company Logo" });
    } else {
      config = await Config.create({ key: "SITE_LOGO", value: logoUrl, isActive: true, group: "site_settings", description: "Company Logo" });
    }

    await loadConfig(); // <-- Refresh memory cache
    res.json({ success: true, data: config });
  } catch (err) {
    // Emergency Cleanup
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (e) { }
    }
    console.error("Error uploading logo:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * GET ALL CONFIG
 * GET /api/config
 */
router.get("/", auth, async (req, res) => {
  try {
    const configs = await Config.findAll({ order: [['key', 'ASC']] });
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * CREATE / UPDATE CONFIG
 * POST /api/config
 */
router.post("/", auth, async (req, res) => {
  try {
    const { key, value, isActive, group, description } = req.body;

    if (!key || value === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Key and value required" });
    }

    const upperKey = key.toUpperCase();
    let config = await Config.findOne({ where: { key: upperKey } });

    if (config) {
      await config.update({ value, isActive, group, description });
    } else {
      config = await Config.create({ key: upperKey, value, isActive, group, description });
    }

    await loadConfig(); // <-- Refresh memory cache
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * BATCH UPDATE CONFIG
 * PATCH /api/config
 */
router.patch("/", auth, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const upperKey = key.toUpperCase();
      let config = await Config.findOne({ where: { key: upperKey } });
      if (config) {
        await config.update({ value });
      } else {
        await Config.create({ key: upperKey, value, isActive: true, group: "site_settings" });
      }
    }
    await loadConfig();
    res.json({ success: true, message: "Configs updated" });
  } catch(err) { res.status(500).json(err); }
});

/**
 * TOGGLE ACTIVE / INACTIVE
 * PATCH /api/config/:key/toggle
 */
router.patch("/:key/toggle", auth, async (req, res) => {
  try {
    const config = await Config.findOne({ where: { key: req.params.key.toUpperCase() } });

    if (!config) {
      return res
        .status(404)
        .json({ success: false, message: "Config not found" });
    }

    config.isActive = !config.isActive;
    await config.save();

    await loadConfig(); // <-- Refresh memory cache
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * DELETE CONFIG
 * DELETE /api/config/:key
 */
router.delete("/:key", auth, async (req, res) => {
  try {
    await Config.destroy({
      where: { key: req.params.key.toUpperCase() }
    });

    await loadConfig(); // <-- Refresh memory cache
    res.json({ success: true, message: "Config deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
