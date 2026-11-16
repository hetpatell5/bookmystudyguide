const { S3Client } = require("@aws-sdk/client-s3");
const config = require("./envConfig");

const s3Client = new S3Client({
    region: "auto",
    endpoint: config.r2.endpoint,
    credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
    },
    forcePathStyle: true,
});

module.exports = {
    s3Client,
    bucketName: config.r2.bucketName,
    publicUrl: config.r2.publicUrl
};
