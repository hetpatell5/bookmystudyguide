// routes/contactRoutes.js
const express = require("express");
const { Contact, EmailTemplate } = require("../model/mysql");
const configEnv = require("../config/envConfig");
const sendMail = require("../utils/sendMail");

const router = express.Router();

/* =====================================================
   USER SIDE → GET CONTACT INFO
===================================================== */
router.get("/", async (req, res) => {
  try {
    const contact = await Contact.findOne();
    res.json(contact); 
  } catch (error) {
    console.error("❌ Get contact error:", error);
    res.status(500).json({ message: "Failed to fetch contact info" });
  }
});

/* =====================================================
   ADMIN SIDE → SAVE / UPDATE CONTACT INFO
===================================================== */
router.post("/", async (req, res) => {
  try {
    let contact = await Contact.findOne();

    if (contact) {
      await contact.update(req.body);
    } else {
      contact = await Contact.create(req.body);
    }

    res.json({
      success: true,
      message: "Contact info saved successfully",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Save contact error:", error);
    res.status(500).json({ message: "Failed to save contact info" });
  }
});

/* =====================================================
   USER SIDE → CONTACT FORM (SEND EMAIL)
===================================================== */
router.post("/message", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email & message are required",
      });
    }

    const template = await EmailTemplate.findOne({ where: { type: "CONTACT_MESSAGE", isActive: true } });

    let emailHtml = `
        <h3>New Contact Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || "N/A"}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `;

    let subject = "New Contact Message - Book My Study Guide";

    if (template) {
      subject = template.subject.replace(/{{name}}/g, name);
      emailHtml = template.htmlContent
        .replace(/{{name}}/g, name)
        .replace(/{{email}}/g, email)
        .replace(/{{phone}}/g, phone || "N/A")
        .replace(/{{message}}/g, message);
    }

    await sendMail({
      to: configEnv.email.contactReceiver,
      subject,
      html: emailHtml,
    });

    res.json({
      success: true,
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("❌ Contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

module.exports = router;
