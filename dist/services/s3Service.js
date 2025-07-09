"use strict";
// services/s3Service.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
// Configurer l'instance S3 avec les informations d'identification AWS
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
// Fonction pour uploader un fichier vers S3
const uploadFileToS3 = async (file, key) => {
    try {
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key, // chemin complet dans le bucket S3
            Body: file.data, // le fichier en lui-même
            ContentType: file.mimetype, // type MIME du fichier
        };
        const data = await s3.send(new PutObjectCommand(uploadParams));
        console.log("Success", data);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }
    catch (err) {
        console.error("Error uploading to S3:", err);
        throw err;
    }
};
module.exports = { uploadFileToS3 };
