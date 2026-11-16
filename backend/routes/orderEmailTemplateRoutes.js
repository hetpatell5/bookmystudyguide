const router = require("express").Router();
const { EmailTemplate, sequelize } = require("../model/mysql");
const sendMail = require("../utils/sendMail");

/* ===============================
   GET TEMPLATES BY TYPE
================================ */
router.get("/email-templates/:type", async (req, res) => {
  try {
    const templates = await EmailTemplate.findAll({
      where: { type: req.params.type },
      order: [['createdAt', 'DESC']]
    });

    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   CREATE TEMPLATE
================================ */
router.post("/email-template", async (req, res) => {
  try {
    await sequelize.transaction(async (t) => {
      if (req.body.isActive) {
        // Deactivate all same type
        await EmailTemplate.update(
          { isActive: false },
          { where: { type: req.body.type }, transaction: t }
        );
      }
      const template = await EmailTemplate.create(req.body, { transaction: t });
      return template;
    }).then(template => {
      res.status(201).json(template);
    });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   UPDATE TEMPLATE
================================ */
router.put("/email-template/:id", async (req, res) => {
  try {
    const updated = await sequelize.transaction(async (t) => {
      const template = await EmailTemplate.findByPk(req.params.id, { transaction: t });
      if (!template) return null;

      if (req.body.isActive) {
        // Deactivate all same type
        await EmailTemplate.update(
          { isActive: false },
          { where: { type: template.type }, transaction: t }
        );
      }

      await template.update(req.body, { transaction: t });
      return template;
    });

    if (!updated) return res.status(404).json({ message: "Template not found" });
    res.json(updated);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   DELETE TEMPLATE
================================ */
router.delete("/email-template/:id", async (req, res) => {
  try {
    const deleted = await EmailTemplate.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Template not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ===============================
   ACTIVATE TEMPLATE (ONLY ONE)
================================ */
router.put("/email-template/activate/:id", async (req, res) => {
  try {
    await sequelize.transaction(async (t) => {
      const template = await EmailTemplate.findByPk(req.params.id, { transaction: t });

      if (!template) {
        throw new Error("Template not found");
      }

      // deactivate all same type
      await EmailTemplate.update(
        { isActive: false },
        { where: { type: template.type }, transaction: t }
      );

      template.isActive = true;
      await template.save({ transaction: t });
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ACTIVATE ERROR:", err);
    res.status(err.message === "Template not found" ? 404 : 500).json({ message: err.message });
  }
});

/* ===============================
   SEND TEST EMAIL
================================ */
router.post("/test-email", async (req, res) => {
  try {
    const { toEmail, subject, htmlContent } = req.body;

    if (!toEmail || !subject || !htmlContent) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await sendMail({
      to: toEmail,
      subject,
      html: htmlContent,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("MAIL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
