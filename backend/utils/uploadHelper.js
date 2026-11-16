const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName, publicUrl } = require("../config/r2Config");

/**
 * Uploads an array of images (base64 data URIs or existing URLs) to Cloudflare R2.
 * - If the image is already a URL (not base64), it is returned unchanged.
 * - If the image is a base64 data URI, it is decoded and uploaded to R2.
 *
 * @param {string[]} images - Array of image strings (URLs or base64 data URIs)
 * @param {string} subPath  - Sub-folder path within the R2 bucket (e.g. "images", "commonpages")
 * @returns {Promise<string[]>} - Resolved array of public R2 URLs
 */
const handleUpload = async (images, subPath) => {
  if (!images || !Array.isArray(images)) return images;

  return Promise.all(
    images.map(async (image) => {
      if (typeof image === "string" && image.startsWith("data:image")) {
        const matches = image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) return image; // Malformed data URI — return as-is

        const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
        const filename = `uploads/${subPath}/prod-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
        const buffer = Buffer.from(matches[2], "base64");

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: `image/${extension}`,
            ACL: "public-read",
          })
        );

        return `${publicUrl}/${filename}`;
      }

      // Already a URL — return unchanged
      return image;
    })
  );
};

module.exports = { handleUpload };
