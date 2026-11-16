const express = require("express");
const router = express.Router();
const { EmailTemplate, sequelize } = require("../model/mysql");
const { loadConfig } = require("../utils/configService");
const { TEMPLATE_TYPES, DEFAULT_EMAIL_TEMPLATES, ensureDefaultEmailTemplates } = require("../utils/defaultEmailTemplates");

// Create missing defaults only. Existing custom templates are never overwritten.
router.post("/email-templates/ensure-defaults", async (req, res) => {
  try {
    const result = await sequelize.transaction((transaction) =>
      ensureDefaultEmailTemplates(EmailTemplate, { transaction })
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Ensure Default Templates Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/email-template-types", (req, res) => {
  res.json({
    success: true,
    data: TEMPLATE_TYPES.map((type) => ({
      type,
      defaultSubject: DEFAULT_EMAIL_TEMPLATES[type]?.subject || "",
    })),
  });
});

// GET templates by type.
router.get("/email-templates/:type", async (req, res) => {
  try {
    if (!TEMPLATE_TYPES.includes(req.params.type)) {
      return res.status(400).json({ success: false, message: "Invalid template type" });
    }

    const templates = await EmailTemplate.findAll({
      where: { type: req.params.type },
      order: [["isActive", "DESC"], ["updatedAt", "DESC"]]
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET email sender config.
router.get("/email-config", async (req, res) => {
  try {
    const { Config } = require("../model/mysql");
    const getC = async (k) => { const c = await Config.findOne({ where: { key: k } }); return c ? c.value : ""; };
    res.json({
      success: true,
      data: {
        user: await getC("EMAIL_USER"),
        pass: await getC("EMAIL_PASS"),
        from: await getC("EMAIL_FROM"),
        fromName: await getC("EMAIL_FROM_NAME")
      }
    });
  } catch (err) { res.status(500).json(err); }
});

// POST email sender config.
router.post("/email-config", async (req, res) => {
  try {
    const { Config } = require("../model/mysql");
    const { user, pass, from, fromName } = req.body;
    const saveC = async (k, v) => {
      let c = await Config.findOne({ where: { key: k } });
      if (c) { c.value = v || ""; await c.save(); }
      else { await Config.create({ key: k, value: v || "", isActive: true, group: "email" }); }
    };
    await saveC("EMAIL_USER", user);
    await saveC("EMAIL_PASS", pass);
    await saveC("EMAIL_FROM", from);
    await saveC("EMAIL_FROM_NAME", fromName || "Book My Study Guide");
    await loadConfig();
    res.json({ success: true, message: "Saved" });
  } catch (err) { res.status(500).json(err); }
});

// CREATE new template.
router.post("/email-template", async (req, res) => {
  try {
    const { name, type, subject, htmlContent, isActive } = req.body;
    if (!TEMPLATE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid template type" });
    }

    const savedTemplate = await sequelize.transaction(async (transaction) => {
      if (isActive) {
        await EmailTemplate.update({ isActive: false }, { where: { type }, transaction });
      }

      return EmailTemplate.create({
        name,
        type,
        subject,
        htmlContent,
        isActive: isActive || false
      }, { transaction });
    });

    res.json({ success: true, message: "Template Created", data: savedTemplate });
  } catch (err) {
    res.status(500).json(err);
  }
});

// UPDATE existing template.
router.put("/email-template/:id", async (req, res) => {
  try {
    const { name, subject, htmlContent, isActive, type } = req.body;
    if (type && !TEMPLATE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid template type" });
    }

    const updatedTemplate = await sequelize.transaction(async (transaction) => {
      const template = await EmailTemplate.findByPk(req.params.id, { transaction });
      if (!template) return null;
      const effectiveType = type || template.type;

      if (isActive) {
        await EmailTemplate.update({ isActive: false }, { where: { type: effectiveType }, transaction });
      }

      await template.update({ name, subject, htmlContent, isActive, type: effectiveType }, { transaction });
      return template;
    });

    if (!updatedTemplate) return res.status(404).json({ message: "Template not found" });
    res.json({ success: true, message: "Template Updated", data: updatedTemplate });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Activate one template for its type. This decides which design is used.
router.put("/email-template/activate/:id", async (req, res) => {
  try {
    const activated = await sequelize.transaction(async (transaction) => {
      const template = await EmailTemplate.findByPk(req.params.id, { transaction });
      if (!template) return null;

      await EmailTemplate.update(
        { isActive: false },
        { where: { type: template.type }, transaction }
      );
      await template.update({ isActive: true }, { transaction });
      return template;
    });

    if (!activated) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, data: activated });
  } catch (err) {
    console.error("Activate Template Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE template.
router.delete("/email-template/:id", async (req, res) => {
  try {
    await EmailTemplate.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Template Deleted" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// SEND test email.
router.post("/test-email", async (req, res) => {
  try {
    const { toEmail, subject, htmlContent } = req.body;

    if (!toEmail || !htmlContent) {
      return res.status(400).json({ success: false, message: "Email and content required" });
    }

    const sendMail = require("../utils/sendMail");
    const testHtml = htmlContent
      .replace(/{{otp}}/g, "123456")
      .replace(/{{minutes}}/g, "10")
      .replace(/{{name}}/g, "Tester")
      .replace(/{{orderId}}/g, "BMSG-TEST-001")
      .replace(/{{totalAmount}}/g, "999")
      .replace(/{{orderDate}}/g, new Date().toDateString())
      .replace(/{{products}}/g, "<p>Sample Study Guide x 1 - 999</p>")
      .replace(/{{shippingAddress}}/g, "Surat, Gujarat - 394101")
      .replace(/{{courierName}}/g, "Sample Courier")
      .replace(/{{awbCode}}/g, "AWB123456")
      .replace(/{{trackingUrl}}/g, "https://bookmystudyguide.com/track-order?awb=AWB123456")
      .replace(/{{email}}/g, toEmail)
      .replace(/{{phone}}/g, "9999999999")
      .replace(/{{message}}/g, "This is a sample contact message.")
      .replace(/{{resetLink}}/g, "https://example.com/reset-password");

    const success = await sendMail({
      to: toEmail,
      subject: `[TEST] ${subject || "Email Template"}`,
      html: testHtml,
    });

    if (success) {
      res.json({ success: true, message: `Test email sent to ${toEmail}` });
    } else {
      res.status(500).json({ success: false, message: "Failed to send test email. Check sender email/app password." });
    }
  } catch (err) {
    console.error("Test Email Error:", err);
    res.status(500).json({ success: false, message: "Failed to send test email" });
  }
});

// Generic file upload.
const upload = require("../middleware/uploadMiddleware");
const path = require("path");

router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const relativePath = `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;

    res.json({
      success: true,
      message: "File uploaded successfully",
      url: relativePath
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
