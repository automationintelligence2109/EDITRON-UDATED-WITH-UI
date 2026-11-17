import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2ReadUrl, getR2Client, getUserR2Prefix } from "@/lib/r2";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/request-protection";

const execFileAsync = promisify(execFile);
const MAX_BROLL_UPLOAD_BYTES = 50 * 1024 * 1024;
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export const runtime = "nodejs";

const MEDIA_TYPES: Record<string, string[]> = {
  ".mp4": ["video/mp4"],
  ".mov": ["video/quicktime", "video/mov"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
};

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to upload B-roll." }, { status: 401 });
  }

  let rateLimit: Awaited<ReturnType<typeof checkRateLimit>>;
  try {
    rateLimit = await checkRateLimit(`broll-upload:${userId}`, 10, 60 * 60_000);
  } catch (error) {
    console.error("[B-roll upload] Rate limiter unavailable:", error);
    return NextResponse.json(
      { success: false, error: "B-roll upload is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Upload limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BROLL_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json({ success: false, error: "B-roll files cannot exceed 50 MB." }, { status: 413 });
  }

  let temporaryDirectory: string | null = null;
  const uploadedKeys: string[] = [];
  let r2: ReturnType<typeof getR2Client> | null = null;

  try {
    const formData = await req.formData();
    const formFile = formData.get("file");
    if (!(formFile instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    const extension = path.extname(formFile.name).toLowerCase();
    if (!MEDIA_TYPES[extension] || (formFile.type && !MEDIA_TYPES[extension].includes(formFile.type))) {
      return NextResponse.json({ success: false, error: "Unsupported file type." }, { status: 415 });
    }
    if (formFile.size === 0 || formFile.size > MAX_BROLL_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, error: "B-roll files must be between 1 byte and 50 MB." }, { status: 413 });
    }

    r2 = getR2Client();
    const fileBuffer = Buffer.from(await formFile.arrayBuffer());
    const isVideo = extension === ".mp4" || extension === ".mov";
    let thumbnailBuffer: Buffer | null = null;

    if (isVideo) {
      temporaryDirectory = await mkdtemp(path.join(tmpdir(), "editron-broll-"));
      const inputPath = path.join(temporaryDirectory, `input${extension}`);
      const thumbnailPath = path.join(temporaryDirectory, "thumbnail.jpg");
      await writeFile(inputPath, fileBuffer, { flag: "wx" });
      await execFileAsync(FFMPEG, [
        "-y",
        "-ss", "0.1",
        "-i", inputPath,
        "-vframes", "1",
        "-s", "320x180",
        thumbnailPath,
      ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
      thumbnailBuffer = await readFile(thumbnailPath);
    }

    const prefix = `${getUserR2Prefix(userId)}broll/${randomUUID()}`;
    const sourceKey = `${prefix}${extension}`;
    const thumbnailKey = thumbnailBuffer ? `${prefix}-thumbnail.jpg` : undefined;

    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: sourceKey,
      Body: fileBuffer,
      ContentLength: fileBuffer.length,
      ContentType: formFile.type || "application/octet-stream",
    }));
    uploadedKeys.push(sourceKey);

    if (thumbnailBuffer && thumbnailKey) {
      await r2.client.send(new PutObjectCommand({
        Bucket: r2.bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentLength: thumbnailBuffer.length,
        ContentType: "image/jpeg",
      }));
      uploadedKeys.push(thumbnailKey);
    }

    return NextResponse.json({
      success: true,
      clip: {
        id: `user-${randomUUID()}`,
        source: "user",
        mediaType: isVideo ? "video" : "image",
        previewUrl: await createR2ReadUrl(sourceKey),
        thumbnail: thumbnailKey ? await createR2ReadUrl(thumbnailKey) : await createR2ReadUrl(sourceKey),
        sourceKey,
        thumbnailKey,
        query: formFile.name.slice(0, 255),
      },
    });
  } catch (error) {
    if (r2) {
      const { client, bucket } = r2;
      await Promise.all(uploadedKeys.map((key) => client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })).catch((cleanupError) => {
        console.error("[B-roll upload] Could not remove incomplete R2 upload:", cleanupError);
      })));
    }
    console.error("[B-roll upload] Upload failed:", error);
    return NextResponse.json({ success: false, error: "Could not upload this B-roll file." }, { status: 500 });
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true }).catch((error) => {
        console.error("[B-roll upload] Could not clean temporary files:", error);
      });
    }
  }
}
