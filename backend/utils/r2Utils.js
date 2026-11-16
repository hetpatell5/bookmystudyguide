const { s3Client, bucketName, publicUrl } = require("../config/r2Config");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Delete a file from Cloudflare R2
 * @param {string} urlOrKey - The public URL or the R2 key of the file
 */
const deleteFromR2 = async (urlOrKey) => {
    if (!urlOrKey) return;

    try {
        let key = urlOrKey;

        // If it's a full URL, extract the key
        if (urlOrKey.startsWith("http")) {
            // Remove the publicUrl part to get the key
            // publicUrl might or might not have a trailing slash
            const base = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
            key = urlOrKey.replace(base, "");
        } else if (urlOrKey.startsWith("/")) {
            // Strip leading slash if it's there
            key = urlOrKey.substring(1);
        }

        console.log(`🗑️ Deleting from R2: ${key}`);

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`✅ Deleted successfully: ${key}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to delete from R2: ${urlOrKey}`, err);
        return false;
    }
};

/**
 * Get the full public URL for an R2 key
 * @param {string} key - The R2 object key
 * @returns {string} - The full public URL
 */
const getFullR2Url = (key) => {
    if (!key) return "";
    if (key.startsWith("http")) return key; // Already a URL
    
    const base = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
    // Remove leading slash if present
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    return `${base}${cleanKey}`;
};

module.exports = {
    deleteFromR2,
    getFullR2Url
};
