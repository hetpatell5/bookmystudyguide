const { exportMySQLToSQL, listBackups, deleteBackup, restoreMySQLFromSQL } = require("../services/backupService");
const path = require("path");
const fs = require("fs");

// @desc    Restore database from an uploaded SQL file
// @route   POST /api/admin/backups/restore
// @access  Admin
exports.restoreBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No SQL file uploaded" });
    }

    const filePath = req.file.path;

    // Restore the database
    await restoreMySQLFromSQL(filePath);

    // CLEANUP: Delete the uploaded file after restore
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: "Database restored successfully"
    });
  } catch (error) {
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to restore database",
      error: error.message
    });
  }
};

// @desc    Trigger a manual backup
// @route   POST /api/admin/backups/trigger
// @access  Admin
exports.triggerBackup = async (req, res) => {
  try {
    const result = await exportMySQLToSQL();
    res.status(200).json({
      success: true,
      message: "Backup created successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create backup",
      error: error.message
    });
  }
};

// @desc    Get list of all backups
// @route   GET /api/admin/backups
// @access  Admin
exports.getAllBackups = async (req, res) => {
  try {
    const backups = listBackups();
    res.status(200).json({
      success: true,
      data: backups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch backups",
      error: error.message
    });
  }
};

// @desc    Download a specific backup file
// @route   GET /api/admin/backups/download/:filename
// @access  Admin
exports.downloadBackup = async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "backups", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "Backup file not found"
    });
  }

  res.download(filePath);
};

// @desc    Delete a backup file
// @route   DELETE /api/admin/backups/:filename
// @access  Admin
exports.removeBackup = async (req, res) => {
  const { filename } = req.params;
  try {
    const deleted = deleteBackup(filename);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Backup file not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Backup deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete backup",
      error: error.message
    });
  }
};
