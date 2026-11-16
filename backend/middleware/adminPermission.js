/**
 * Middleware factory to check admin permissions.
 * Accepts a permission path like 'dashboard' or 'siteSetup.env'.
 */
module.exports = (permissionPath) => {
  return (req, res, next) => {
    try {
      const admin = req.admin;
      if (!admin)
        return res.status(401).json({ message: "Admin not authenticated" });

      // Normalize role and allow super admin bypass
      const roleNorm = String(admin.role || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      if (roleNorm === "super_admin" || roleNorm === "superadmin")
        return next();

      if (!permissionPath) return next();

      const perms = admin.permissions || {};
      const has = get(perms, permissionPath);
      if (has === true) return next();

      // Fallback: if top-level section has any true child, allow
      const top = permissionPath.split(".")[0];
      const topVal = perms[top];
      if (typeof topVal === "boolean" && topVal === true) return next();
      if (typeof topVal === "object" && topVal !== null) {
        if (Object.values(topVal).some((v) => Boolean(v))) return next();
      }

      return res.status(403).json({ message: "Permission denied" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/**
 * Simple dot-path getter.
 */
function get(obj, path) {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
