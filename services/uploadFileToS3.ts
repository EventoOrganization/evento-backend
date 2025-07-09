import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME } =
  process.env;

if (
  !AWS_REGION ||
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !S3_BUCKET_NAME
) {
  throw new Error("AWS environment variables are not set properly");
}

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

interface File {
  data: Buffer;
  mimetype: string;
}

export const uploadFileToS3 = async (
  file: File,
  key: string,
): Promise<string> => {
  if (!file || !file.data || !file.mimetype || !key) {
    throw new Error("Invalid file or key provided to uploadFileToS3");
  }

  const sanitizedKey = key.replace(/^\/*/, "").replace(/\s+/g, "_");

  const uploadParams = {
    Bucket: S3_BUCKET_NAME,
    Key: sanitizedKey,
    Body: file.data,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    console.log("✅ Uploaded to S3:", sanitizedKey, data.$metadata);
    return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${sanitizedKey}`;
  } catch (err) {
    console.error("❌ Error uploading to S3:", err);
    throw err;
  }
};
