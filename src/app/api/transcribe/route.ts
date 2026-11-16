import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getR2Client, getUserR2Prefix } from "@/lib/r2";
import { checkRateLimit } from "@/lib/request-protection";
import { ensureGuestUser, getAuthenticatedUserId } from "@/lib/server-auth";
import {
  enqueueLocalTranscription,
  shouldUseLocalTranscriptionJobs,
} from "@/lib/transcription/local-jobs";
import { getTranscriptionQueue } from "@/lib/transcription/queue";
import type { TranscriptionJobData } from "@/lib/transcription/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
const INPUT_MIME_TYPES: Record<string, string[]> = {
  ".mp4": ["video/mp4"],
  ".mp3": ["audio/mpeg", "audio/mp3"],
  ".wav": ["audio/wav", "audio/x-wav"],
  ".m4a": ["audio/mp4", "audio/x-m4a"],
  ".webm": ["video/webm", "audio/webm"],
  ".mov": ["video/quicktime", "video/mov"],
  ".ogg": ["audio/ogg", "application/ogg"],
  ".aac": ["audio/aac", "audio/x-aac"],
  ".mkv": ["video/x-matroska"],
};

async function* readWebFile(file: File): AsyncGenerator<Buffer> {
  const reader = file.stream().getReader();
  let completed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        completed = true;
        return;
      }
      yield Buffer.from(value);
    }
  } finally {
    if (!completed) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function getWordsPerCaption(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 5;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(12, Math.max(1, parsed)) : 5;
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in before processing a video." },
      { status: 401 },
    );
  }

  const hourlyLimit = Number.parseInt(process.env.MAX_TRANSCRIPTIONS_PER_HOUR || "5", 10);
  let rateLimit: Awaited<ReturnType<typeof checkRateLimit>>;
  try {
    rateLimit = await checkRateLimit(
      `transcribe:${userId}`,
      Number.isInteger(hourlyLimit) && hourlyLimit > 0 ? Math.min(hourlyLimit, 100) : 5,
      60 * 60_000,
    );
  } catch (error) {
    console.error("[Transcribe] Rate limiter unavailable:", error);
    return NextResponse.json(
      { success: false, error: "Video processing is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Processing limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "Video and audio files cannot exceed 150 MB." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid multipart upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
  }
  const sourceName = file.name.trim().slice(0, 255);
  const extension = sourceName.slice(sourceName.lastIndexOf(".")).toLowerCase();
  if (!sourceName || !INPUT_MIME_TYPES[extension] ||
    (file.type && !INPUT_MIME_TYPES[extension].includes(file.type))) {
    return NextResponse.json({ success: false, error: "Unsupported file type." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { success: false, error: "Video and audio files must be between 1 byte and 150 MB." },
      { status: 413 },
    );
  }

  const modeValue = formData.get("mode");
  const mode = modeValue === "translate" ? "translate" : "transcribe";
  const wordsPerCaption = getWordsPerCaption(formData.get("words_per_caption"));
  const jobId = randomUUID();
  const sourceKey = `${getUserR2Prefix(userId)}transcription-input/${jobId}${extension}`;
  const r2 = getR2Client();
  let uploaded = false;
  let jobCreated = false;

  try {
    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: sourceKey,
      Body: Readable.from(readWebFile(file)),
      ContentLength: file.size,
      ContentType: file.type || "application/octet-stream",
    }));
    uploaded = true;

    const jobData: TranscriptionJobData = {
      jobId,
      userId,
      sourceKey,
      sourceName,
      mode,
      wordsPerCaption,
    };

    if (shouldUseLocalTranscriptionJobs()) {
      enqueueLocalTranscription(jobData);
      return NextResponse.json(
        { success: true, jobId, status: "QUEUED" },
        { status: 202 },
      );
    }

    if (userId.startsWith("guest_")) await ensureGuestUser(userId);
    await db.transcriptionJob.create({
      data: {
        id: jobId,
        userId,
        inputKey: sourceKey,
        sourceName,
        mode,
        wordsPerCaption,
      },
    });
    jobCreated = true;
    await getTranscriptionQueue().add("process", jobData, { jobId });

    return NextResponse.json(
      { success: true, jobId, status: "QUEUED" },
      { status: 202 },
    );
  } catch (error) {
    console.error("[Transcribe] Could not queue video:", error);
    if (jobCreated) {
      await db.transcriptionJob.delete({ where: { id: jobId } }).catch((cleanupError) => {
        console.error("[Transcribe] Could not remove incomplete job record:", cleanupError);
      });
    }
    if (uploaded) {
      await r2.client.send(new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: sourceKey,
      })).catch((cleanupError) => {
        console.error("[Transcribe] Could not remove unqueued upload:", cleanupError);
      });
    }
    return NextResponse.json(
      { success: false, error: "Could not queue this video. Please try again shortly." },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/transcribe",
    method: "POST (multipart/form-data)",
    features: ["Queued AI Auto-Cut", "word-level timestamps", "Replicate Whisper"],
  });
}
