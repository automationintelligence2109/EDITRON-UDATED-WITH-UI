import { createHash } from "crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedR2Client: { client: S3Client; bucket: string } | null = null;

export function getR2Client() {
  if (cachedR2Client) return cachedR2Client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 environment variables are not configured.");
  }

  cachedR2Client = {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
  return cachedR2Client;
}

export function getUserR2Prefix(userId: string): string {
  const userHash = createHash("sha256").update(userId).digest("hex");
  return `users/${userHash}/`;
}

export async function createR2ReadUrl(key: string): Promise<string> {
  const { client, bucket } = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 },
  );
}
