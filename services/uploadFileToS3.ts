import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

if (
  !process.env.AWS_REGION ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY
) {
  throw new Error("AWS environment variables are not set");
}
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

interface File {
  data: Buffer;
  mimetype: string;
}

export const uploadFileToS3 = async (file: File, key: string) => {
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
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
};
