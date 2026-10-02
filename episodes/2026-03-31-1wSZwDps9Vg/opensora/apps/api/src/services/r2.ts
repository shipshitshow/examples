import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config.js';

function buildR2Client(): S3Client | null {
  if (!config.R2_ACCOUNT_ID || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

const r2 = buildR2Client();

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  if (!r2 || !config.R2_BUCKET_NAME) {
    throw new Error('R2 storage is not configured');
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (!r2 || !config.R2_BUCKET_NAME) {
    throw new Error('R2 storage is not configured');
  }

  return getSignedUrl(r2, new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
