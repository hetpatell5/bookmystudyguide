const { publicUrl } = require("../config/r2Config");

/**
 * Handle Single File Upload
 * POST /api/upload
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // multer-s3 provides the key and location
        // We use our publicUrl from r2Config for consistency
        const fileKey = req.file.key;
        const fullUrl = `${publicUrl}/${fileKey}`;

        console.log(`✅ File uploaded successfully to R2: ${fileKey}`);
        console.log(`🔗 Public URL: ${fullUrl}`);

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            url: fullUrl,
            file: {
                originalname: req.file.originalname,
                filename: fileKey,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: fullUrl
            }
        });
    } catch (err) {
        console.error("❌ Upload Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to upload file",
            error: err.message
        });
    }
};
