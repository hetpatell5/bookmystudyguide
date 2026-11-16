const rateLimit = require("express-rate-limit");

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// Auth endpoints — tight
exports.authLimiter = make(15 * 60 * 1000, 20, "Too many attempts. Try again in 15 minutes.");

// OTP verify / resend — very tight to block brute-force
exports.otpLimiter = make(10 * 60 * 1000, 5, "Too many OTP attempts. Try again in 10 minutes.");

// Password reset
exports.resetLimiter = make(15 * 60 * 1000, 5, "Too many password reset requests. Try again in 15 minutes.");

// Payment order creation
exports.paymentLimiter = make(60 * 1000, 10, "Too many payment requests. Please wait a moment.");

// Coupon verification — prevent enumeration
exports.couponLimiter = make(60 * 1000, 15, "Too many coupon attempts. Please wait a moment.");

// Search / suggest
exports.searchLimiter = make(60 * 1000, 60, "Too many search requests.");

// General public API
exports.publicLimiter = make(60 * 1000, 120, "Too many requests. Please slow down.");
