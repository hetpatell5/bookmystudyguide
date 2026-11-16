const { Admin, sequelize } = require("../model/mysql");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendMail = require("../utils/sendMail");
const configEnv = require("../config/envConfig");

const getDefaultPermissions = (role) => {
  const base = {
    dashboard: true,
    analytics: false,
    products: false,
    comboProducts: false,
    classifications: false,
    orders: false,
    payments: false,
    coupons: false,
    blogs: false,
    advertisements: false,
    reviews: false,
    faq: false,
    inbox: false,
    users: false,
    settings: false
  };

  const r = String(role || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (r === "super_admin" || r === "superadmin") {
    const allTrue = {};
    for (const key of Object.keys(base)) allTrue[key] = true;
    return allTrue;
  }
  return base;
};

/* TOKEN */
const signToken = (id) =>
  jwt.sign({ id, type: "admin" }, configEnv.jwtSecret, {
    expiresIn: "7d",
  });

/* 1️⃣ CHECK ADMIN EXISTS */
exports.checkAdminExists = async (req, res) => {
  try {
    const count = await Admin.count();
    res.json({ exists: count > 0 });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* 2️⃣ SETUP FIRST ADMIN */
exports.setupAdmin = async (req, res) => {
  try {
    const exists = await Admin.count();
    if (exists > 0)
      return res.status(403).json({ message: "Admin already exists" });

    const adminPayload = { ...req.body };
    adminPayload.role = "super_admin";
    
    // Auto-fill all permissions for the first super admin
    adminPayload.permissions = getDefaultPermissions("super_admin");

    const admin = await Admin.create(adminPayload);

    res.status(201).json({
      success: true,
      token: signToken(admin.id),
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 3️⃣ LOGIN */
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.scope(['withPassword', 'withPermissions']).findOne({ where: { email } });
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      success: true,
      token: signToken(admin.id),
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    console.error("Login Admin Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 4️⃣ FORGOT PASSWORD */
exports.forgotPassword = async (req, res) => {
  const admin = await Admin.findOne({ where: { email: req.body.email } });
  if (!admin) return res.status(404).json({ message: "Email not found" });

  const resetToken = admin.getResetPasswordToken();
  await admin.save();

  const resetUrl = `${configEnv.frontendUrl}/admin/reset-password/${resetToken}`;

  await sendMail({
    to: admin.email,
    subject: "Admin Password Reset",
    html: `<p>Please click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
  });

  res.json({ success: true, message: "Reset link sent" });
};

/* 5️⃣ RESET PASSWORD */
exports.resetPassword = async (req, res) => {
  const token = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  const admin = await Admin.scope('withReset').findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpire: { [Op.gt]: new Date() },
    }
  });

  if (!admin)
    return res.status(400).json({ message: "Invalid or expired token" });

  admin.password = req.body.password;
  admin.resetPasswordToken = null;
  admin.resetPasswordExpire = null;
  await admin.save();

  res.json({ success: true, message: "Password updated" });
};

/* 6️⃣ REGISTER NEW ADMIN (SUPERADMIN ONLY) */
exports.registerAdmin = async (req, res) => {
  try {
    // Only superadmins can create new admins
    if (req.admin.role !== "super_admin" && req.admin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can create admins" });
    }

    // Create admin with provided data
    const adminData = { ...req.body };
    // Normalize incoming role
    const incomingRole = String(adminData.role || "admin")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    if (incomingRole === "super_admin" || incomingRole === "superadmin") {
      adminData.role = "super_admin";
    } else {
      adminData.role = "admin";
    }
    // Ensure permissions baseline exists to avoid undefined nested objects
    if (!adminData.permissions || typeof adminData.permissions !== "object") {
      adminData.permissions = getDefaultPermissions(adminData.role);
    }
    const admin = await Admin.create(adminData);

    res.status(201).json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 7️⃣ GET ADMINS */
exports.getAdmins = async (req, res) => {
  const admins = await Admin.scope('withPermissions').findAll();
  res.json({ success: true, admins });
};

/* 8️⃣ GET SINGLE ADMIN */
exports.getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id, {
      scope: ['withPermissions']
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 9️⃣ UPDATE ADMIN (role / name / email / password) */
exports.updateAdmin = async (req, res) => {
  try {
    const isAdminSelf = String(req.params.id) === String(req.admin.id);
    const isSuperAdmin = req.admin.role === "super_admin" || req.admin.role === "superadmin";

    // Only superadmin can update others; admins can update themselves
    if (!isSuperAdmin && !isAdminSelf) {
      return res.status(403).json({ message: "Not authorized to update this admin" });
    }

    const admin = await Admin.scope(['withPassword']).findByPk(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Fields that any authorized user (self or superadmin) can update
    const updatable = ["name", "email", "password"];
    updatable.forEach((k) => {
      if (req.body[k] !== undefined && req.body[k] !== "") {
        admin[k] = req.body[k];
      }
    });

    // Fields that ONLY superadmin can update
    if (isSuperAdmin) {
      if (req.body.role !== undefined) {
        const incomingRole = String(req.body.role || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_");
        
        const newRole = (incomingRole === "super_admin" || incomingRole === "superadmin") ? "super_admin" : "admin";
        
        // Prevent self-demotion
        if (isAdminSelf && admin.role === "super_admin" && newRole === "admin") {
          return res.status(400).json({ success: false, message: "You cannot demote yourself from Super Admin role" });
        }
        
        admin.role = newRole;
      }
    }

    await admin.save();
    
    // Return sanitized admin data
    const updatedAdmin = await Admin.findByPk(admin.id);
    res.json({ success: true, admin: updatedAdmin });
  } catch (err) {
    console.error("Update Admin Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* 10️⃣ UPDATE ADMIN PERMISSIONS (SUPERADMIN ONLY) */
exports.updatePermissions = async (req, res) => {
  try {
    if (req.admin.role !== "super_admin" && req.admin.role !== "superadmin")
      return res.status(403).json({ message: "Only superadmin can update permissions" });

    const admin = await Admin.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const incoming = req.body.permissions || {};
    
    // Map strictly to base keys
    const base = getDefaultPermissions("admin");
    const newPerms = {};
    for (const key of Object.keys(base)) {
      newPerms[key] = Boolean(incoming[key]);
    }

    // Always enforce true for super admins
    if (admin.role === "super_admin" || admin.role === "superadmin") {
       for (const key of Object.keys(base)) {
         newPerms[key] = true;
       }
    }

    admin.permissions = newPerms;

    if (admin.changed) admin.changed("permissions", true);
    
    await admin.save();
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 11️⃣ DELETE ADMIN (SUPERADMIN ONLY) */
exports.deleteAdmin = async (req, res) => {
  try {
    if (req.admin.role !== "super_admin" && req.admin.role !== "superadmin")
      return res
        .status(403)
        .json({ message: "Only superadmin can delete admins" });

    // Prevent self-deletion
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account" });
    }

    const deleted = await Admin.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Admin not found" });
    res.json({ success: true, message: "Admin deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 12️⃣ GET CURRENT USER PROFILE (with permissions) */
exports.getCurrentProfile = async (req, res) => {
  try {
    const admin = await Admin.scope('withPermissions').findByPk(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
