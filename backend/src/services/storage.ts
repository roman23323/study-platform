import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';

dotenv.config();

console.log(process.env.AWS_DEFAULT_REGION);
console.log(process.env.AWS_ENDPOINT_URL);
console.log(process.env.AWS_ACCESS_KEY_ID);
console.log(process.env.AWS_SECRET_ACCESS_KEY);
console.log(process.env.AWS_S3_BUCKET_NAME);

const s3 = new S3Client({
    region: process.env.AWS_DEFAULT_REGION || 'auto',
    endpoint: process.env.AWS_ENDPOINT_URL!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export const uploadFileToBucket = async (
  buffer: Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<string> => {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );
  return key;
};

export const getDownloadUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn });
};

export const deleteFileFromBucket = async (key: string): Promise<void> => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
};