"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
if (!process.env.AWS_REGION ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS environment variables are not set");
}
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const uploadFileToS3 = async (file, key) => {
    try {
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key, // chemin complet dans le bucket S3
            Body: file.data, // le fichier en lui-même
            ContentType: file.mimetype, // type MIME du fichier
        };
        const data = await s3.send(new client_s3_1.PutObjectCommand(uploadParams));
        console.log("Success", data);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }
    catch (err) {
        console.error("Error uploading to S3:", err);
        throw err;
    }
};
exports.uploadFileToS3 = uploadFileToS3;
