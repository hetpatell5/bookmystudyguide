const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3Client, bucketName } = require("../config/r2Config");

const storage = multerS3({
  s3: s3Client,
  bucket: bucketName,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const name = file.originalname
      .split(".")
      .slice(0, -1)
      .join("-")
      .toLowerCase();
    const folder = "book-my-study-guide";
    const filename = `${Date.now()}-${name}${require("path").extname(file.originalname)}`;
    cb(null, `${folder}/${filename}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
