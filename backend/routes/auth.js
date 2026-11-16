const express = require("express");
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validationMiddleware');

const authController = require("../controller/authController");
const auth = require("../middleware/auth");
const { authLimiter, otpLimiter, resetLimiter } = require("../middleware/rateLimiter");

const registerValidation = [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phoneno').notEmpty().withMessage('Phone number is required'),
    body('name').notEmpty().withMessage('Name is required').trim(),
    validate
];

const loginValidation = [
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

/* ================= PUBLIC ROUTES ================= */

// User Register
router.post("/register", authLimiter, registerValidation, authController.register);

// OTP Verify
router.post("/verify-otp", otpLimiter, authController.verifyOtp);

// Resend OTP
router.post("/resend-otp", otpLimiter, authController.resendOtp);

// User Login
router.post("/login", authLimiter, loginValidation, authController.login);

// Forgot Password
router.post("/forgot-password", resetLimiter, authController.forgotPassword);

// Reset Password
router.post("/reset-password", resetLimiter, authController.resetPassword);

// Google Login
router.post("/google-login", authLimiter, authController.googleLogin);

/* ================= PROTECTED USER ROUTES ================= */

// Get Logged-in User Profile
router.get("/me", auth, authController.getProfile);

// Update Profile
router.put("/profile", auth, authController.updateProfile);

// Change Password
router.put("/change-password", auth, authController.changePassword);

// Logout User
router.post("/logout", auth, authController.logout);

module.exports = router;
