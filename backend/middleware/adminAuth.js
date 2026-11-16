const jwt = require("jsonwebtoken");
const { Admin } = require("../model/mysql");
const configEnv = require("../config/envConfig");

module.exports = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    let token = null;

    if (auth && auth.startsWith("Bearer ")) {
      token = auth.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token)
      return res.status(401).json({ message: "Token missing" });
    const decoded = jwt.verify(token, configEnv.jwtSecret);

    const admin = await Admin.scope('withPermissions').findByPk(decoded.id);
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    // Ensure permissions is an object (DataTypes.JSON handles this)
    const adminObj = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || {}
    };

    // Normalize role to canonical form 'super_admin' when possible
    adminObj.role = String(adminObj.role || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");

    req.admin = adminObj;
    next();
  } catch (err) {
    console.error("Admin Auth Error:", err);
    res.status(401).json({ message: "Not authorized" });
  }
};
