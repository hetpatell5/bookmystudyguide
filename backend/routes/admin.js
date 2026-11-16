const express = require("express");
const router = express.Router();

const adminController = require("../controller/adminController");
const adminAuth = require("../middleware/adminAuth");

/* PUBLIC */
router.get("/check-exists", adminController.checkAdminExists);
router.post("/setup", adminController.setupAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/forgot-password", adminController.forgotPassword);
router.put("/reset-password/:resetToken", adminController.resetPassword);

/* PROTECTED */
router.post("/register", adminAuth, adminController.registerAdmin);
router.get("/", adminAuth, adminController.getAdmins);
router.get("/me", adminAuth, adminController.getCurrentProfile);
router.get("/:id", adminAuth, adminController.getAdmin);
router.put("/:id", adminAuth, adminController.updateAdmin);
router.put("/:id/permissions", adminAuth, adminController.updatePermissions);
router.delete("/:id", adminAuth, adminController.deleteAdmin);

module.exports = router;
