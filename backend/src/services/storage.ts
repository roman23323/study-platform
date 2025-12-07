import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';

dotenv.config();

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

async function streamToBuffer(stream: AsyncIterable<Uint8Array> | null): Promise<Buffer> {
  if (!stream) {
    throw new Error('Stream is null or undefined');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const getBufferFromS3 = async (key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3.send(command);
  if (!response.Body) {
    throw new Error(`S3 object ${key} has empty Body`);
  }

  return await streamToBuffer(response.Body as AsyncIterable<Uint8Array>);
};