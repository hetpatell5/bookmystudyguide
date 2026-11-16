const nodemailer = require("nodemailer");
const { getConfig } = require("./configService");

/**
 * Unified Send Mail Utility
 * Sends customer/admin emails using the configured Gmail address + app password.
 */
module.exports = async ({ to, subject, html, text }) => {
  try {
    const user = getConfig("EMAIL_USER") || getConfig("MAIL_USER");
    const pass = getConfig("EMAIL_PASS") || getConfig("MAIL_PASS");
    const fromName = getConfig("EMAIL_FROM_NAME") || "Book My Study Guide";
    const fromEmail = getConfig("EMAIL_FROM") || user;

    if (!user || !pass) {
      console.error("Email transmission failed: sender email/app password are missing.");
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: html || text,
      text: text || "This email is best viewed in HTML mode.",
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("Send Mail Error:", err.message);
    return false;
  }
};
