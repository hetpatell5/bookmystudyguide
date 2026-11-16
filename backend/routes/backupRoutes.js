const express = require("express");
const router = express.Router();
const { triggerBackup, getAllBackups, downloadBackup, removeBackup, restoreBackup } = require("../controller/backupController");
const adminAuth = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");

// Configure Multer for SQL file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "backups/temp/"); // Use a temp dir for uploads
  },
  filename: (req, file, cb) => {
    cb(null, "upload_" + Date.now() + ".sql");
  },
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".sql") {
      cb(null, true);
    } else {
      cb(new Error("Only .sql files are allowed"));
    }
  }
});

// All routes here are protected and admin-only
router.use(adminAuth);

router.post("/trigger", triggerBackup);
router.get("/", getAllBackups);
router.get("/download/:filename", downloadBackup);
router.delete("/:filename", removeBackup);
router.post("/restore", upload.single("sqlFile"), restoreBackup);

module.exports = router;
