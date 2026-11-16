const { User, EmailTemplate } = require("../model/mysql");
const { Op } = require("sequelize");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client();
const sendMail = require("../utils/sendMail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;

const configService = require("../utils/configService");
const getConfig = configService.getConfig || configService.default?.getConfig;

/**
 * Returns OTP expiry in milliseconds — reads from DB config OTP_EXPIRES_MIN (default: 15).
 */
const getOtpExpiryMs = () => {
  const mins = Number(getConfig("OTP_EXPIRES_MIN") || 15);
  return mins * 60 * 1000;
};

/* ======================================================
   JWT SECRET (synchronous — consistent with auth middleware)
====================================================== */
const getJwtSecret = () => {
  const secret = getConfig("JWT_SECRET") || require("../config/envConfig").jwtSecret;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
};

/* ======================================================
   SEND OTP EMAIL
====================================================== */
const sendOtpEmail = async (toEmail, otp, userName = "Customer") => {
  try {
    const template = await EmailTemplate.findOne({
      where: {
        type: "OTP_VERIFICATION",
        isActive: true,
      }
    });

    const subject = template?.subject || "Your Verification OTP";
    const html = template?.htmlContent
      ? template.htmlContent
        .replace(/{{otp}}/g, otp)
        .replace(/{{name}}/g, userName)
        .replace(/{{minutes}}/g, getConfig("OTP_EXPIRES_MIN") || "15")
      : `<p>Hello ${userName}, Your OTP is <b>${otp}</b></p>`;

    await sendMail({
      to: toEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error("❌ Send OTP Email Error:", err.message);
  }
};

/* ======================================================
   1️⃣ REGISTER
====================================================== */
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ where: { email } });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpPlain, SALT_ROUNDS);

    await User.create({
      ...req.body,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiresAt: new Date(Date.now() + getOtpExpiryMs()),
      isVerified: false,
    });

    await sendOtpEmail(email, otpPlain);

    res.status(201).json({
      success: true,
      message: "Registered successfully. OTP sent to email.",
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
   2️⃣ VERIFY OTP
====================================================== */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.scope('withOtp').findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otp || user.otpExpiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    // Lock out after 5 wrong attempts
    const attempts = Number(user.otpAttempts || 0);
    if (attempts >= 5) {
      user.otp = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(429).json({ message: "Too many incorrect OTP attempts. Please request a new OTP." });
    }

    const valid = await bcrypt.compare(otp, user.otp);
    if (!valid) {
      user.otpAttempts = attempts + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    const token = jwt.sign({ id: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    res.json({ success: true, token });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   3️⃣ RESEND OTP
====================================================== */
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpPlain, SALT_ROUNDS);

    user.otp = hashedOtp;
    user.otpExpiresAt = new Date(Date.now() + getOtpExpiryMs());
    await user.save();

    await sendOtpEmail(email, otpPlain);

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= ======================================
   4️⃣ LOGIN (Dual Login: Email or Phone)
====================================================== */
exports.login = async (req, res) => {
  try {
    const { loginId, email, password } = req.body; // Handle both keys for compatibility
    const identifier = loginId || email;

    if (!identifier) {
      return res.status(400).json({ success: false, message: "Email or Phone is required" });
    }

    // Find user by email OR phone
    const user = await User.scope('withPassword').findOne({
      where: {
        [Op.or]: [
          { email: identifier.toLowerCase() },
          { phoneno: identifier }
        ]
      }
    });

    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ success: false, message: "Please verify OTP first" });

    // For Google users who try to login with password but don't have one
    if (!user.password && user.googleId) {
      return res.status(401).json({ success: false, message: "Please use Google Login for this account." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    const userResponse = user.get({ plain: true });
    delete userResponse.password;
    delete userResponse.otp;

    res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= ======================================
   5️⃣ PROFILE
====================================================== */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   6️⃣ FORGOT PASSWORD (OTP)
====================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: "No user found with this email" });

    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpPlain, SALT_ROUNDS);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordExpiresAt = new Date(Date.now() + getOtpExpiryMs()); // from config: OTP_EXPIRES_MIN
    await user.save();

    // Re-use logic for sending reset OTP
    const template = await EmailTemplate.findOne({ where: { type: "FORGOT_PASSWORD", isActive: true } });
    const subject = template?.subject || "Password Reset OTP - BMSG";
    const userName = user.name || "Customer";

    const html = template?.htmlContent
      ? template.htmlContent
        .replace(/{{otp}}/g, otpPlain)
        .replace(/{{name}}/g, userName)
      : `<h3>Hello ${userName},</h3>
         <p>You requested a password reset. Your OTP is: <b>${otpPlain}</b></p>
         <p>This OTP is valid for 15 minutes.</p>`;

    await sendMail({ to: email, subject, html });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   7️⃣ RESET PASSWORD
====================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.scope(['withOtp', 'withPassword']).findOne({ where: { email } });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    if (!user.resetPasswordOtp || user.resetPasswordExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired or invalid" });
    }

    const resetAttempts = Number(user.resetPasswordAttempts || 0);
    if (resetAttempts >= 5) {
      user.resetPasswordOtp = null;
      user.resetPasswordExpiresAt = null;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please request a new OTP." });
    }

    const valid = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!valid) {
      user.resetPasswordAttempts = resetAttempts + 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpiresAt = null;
    user.resetPasswordAttempts = 0;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   7.5 GOOGLE LOGIN
====================================================== */
exports.googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Verify Google Token (We'll assume the client ID is passed or available in env)
    // For now, we verify and extract payload
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    let user = await User.findOne({
      where: {
        [Op.or]: [{ googleId: sub }, { email }]
      }
    });

    if (!user) {
      // Create new user (social login users are auto-verified)
      user = await User.create({
        name,
        email,
        googleId: sub,
        isVerified: true,
      });
    } else if (!user.googleId) {
      // Link googleId to existing email account
      user.googleId = sub;
      if (!user.isVerified) user.isVerified = true;
      await user.save();
    }

    const token = jwt.sign({ id: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ success: false, message: "Google Authentication failed" });
  }
};

/* ======================================================
   8️⃣ UPDATE PROFILE
====================================================== */
exports.updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    // Don't allow email update through this endpoint for safety
    delete updates.email;
    delete updates.password;
    delete updates.role;
    delete updates.googleId;

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update(updates);

    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   9️⃣ CHANGE PASSWORD
====================================================== */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.scope('withPassword').findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Social login users might not have a password
    if (!user.password && user.googleId) {
      return res.status(400).json({ success: false, message: "Social login accounts don't have a password to change." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid current password" });

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   🔟 LOGOUT
====================================================== */
exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};
