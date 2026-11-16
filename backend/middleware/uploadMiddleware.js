const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { s3Client, bucketName } = require("../config/r2Config");

const storage = multerS3({
    s3: s3Client,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
        let folder = "uploads";
        if (file.mimetype.startsWith("image/")) {
            folder = "uploads/images";
        } else if (file.mimetype.startsWith("video/")) {
            folder = "uploads/videos";
        } else if (file.mimetype === "application/pdf") {
            folder = "uploads/pdf";
        }

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const originalName = path.parse(file.originalname).name.replace(/\s+/g, '-').toLowerCase();
        const extension = path.extname(file.originalname).toLowerCase();
        const finalFilename = `${folder}/${originalName}-${uniqueSuffix}${extension}`;

        console.log(`📤 Uploading to R2: ${finalFilename}`);
        cb(null, finalFilename);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "application/pdf",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(
            "Invalid file type. Only JPG, PNG, WEBP, GIF, MP4, and PDF are allowed."
        );
        error.code = "INVALID_FILE_TYPE";
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
    fileFilter: fileFilter,
});

module.exports = upload;
