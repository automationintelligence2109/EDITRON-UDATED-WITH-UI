import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, rm, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import Replicate from "replicate";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 3600;

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const PYTHON_BIN =
  process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

type WordItem = { word: string; start: number; end: number };
type WhisperCaption = { start: number; end: number; text: string };

// Replicate configuration is supplied by Dokploy environment variables.
// Never hardcode the token or model version in this file.
// Replicate is initialized inside POST so Next.js can build this route
// even when runtime environment variables are not available during the build.

function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 environment variables are not configured.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket };
}

function logTiming(label: string, startedAt: number) {
  console.log(`[Transcribe] ${label}: ${Date.now() - startedAt} ms`);
}

/**
 * Turns Replicate's chunk, word, or segment output into individual words.
 * The video Whisper model returns chunks whose `text` can contain many words.
 */
function toWords(output: any): WordItem[] {
  const words: WordItem[] = [];

  const addTimedText = (textValue: unknown, startValue: unknown, endValue: unknown) => {
    const text = String(textValue ?? "").trim();
    if (!text) return;

    const tokens = text.split(/\s+/).filter(Boolean);
    const start = Number.isFinite(Number(startValue)) ? Number(startValue) : 0;
    const rawEnd = Number(endValue);
    const end = Number.isFinite(rawEnd) && rawEnd >= start ? rawEnd : start;
    const duration = Math.max(0, end - start);
    const step = tokens.length > 0 ? duration / tokens.length : 0;

    tokens.forEach((token, index) => {
      words.push({
        word: token,
        start: +(start + step * index).toFixed(3),
        end: +(start + step * (index + 1)).toFixed(3),
      });
    });
  };

  // Turian's model returns chunks like:
  // { text: "many words here", timestamp: [start, end] }
  if (Array.isArray(output?.chunks) && output.chunks.length > 0) {
    for (const chunk of output.chunks) {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [];
      addTimedText(chunk.text, timestamp[0], timestamp[1]);
    }
    return words;
  }

  // Some Whisper responses return individual word objects.
  if (Array.isArray(output?.words) && output.words.length > 0) {
    for (const item of output.words) {
      const text = String(item.word ?? item.text ?? "").trim();
      if (!text) continue;
      words.push({
        word: text,
        start: Number(item.start ?? item.timestamp?.[0] ?? 0),
        end: Number(item.end ?? item.timestamp?.[1] ?? item.start ?? 0),
      });
    }
    return words;
  }

  // Fallback for regular segment responses.
  const segments: any[] = Array.isArray(output?.segments) ? output.segments : [];
  for (const segment of segments) {
    const timestamp = Array.isArray(segment.timestamp) ? segment.timestamp : [];
    addTimedText(
      segment.text,
      segment.start ?? timestamp[0],
      segment.end ?? timestamp[1]
    );
  }

  // Final fallback when the model returns only plain text.
  if (words.length === 0) {
    const text = String(output?.text ?? output ?? "").trim();
    addTimedText(text, 0, 0);
  }

  return words;
}

/** Groups words into caption lines of N words each. */
function groupIntoCaptions(words: WordItem[], wordsPerCaption: number): WhisperCaption[] {
  const captions: WhisperCaption[] = [];
  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption);
    captions.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.word).join(" "),
    });
  }
  return captions;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let tempPath: string | null = null;
  let cutOutputDir: string | null = null;
  let audioPath: string | null = null;
  let processedVideoPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const language = (formData.get("language") as string | null) || "en";
    const mode = (formData.get("mode") as string) === "translate" ? "translate" : "transcribe";
    const wpcRaw = formData.get("words_per_caption");
    const wordsPerCaption = wpcRaw
      ? Math.max(1, Math.min(12, parseInt(wpcRaw as string, 10) || 6))
      : 6;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    // Save uploaded file to a temp path
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name || "audio.wav").includes(".")
      ? (file.name as string).slice(file.name.lastIndexOf("."))
      : ".wav";
    const tempId = randomUUID();
    const tempDir = join(tmpdir(), "capgen-uploads");
    if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
    tempPath = join(tempDir, `${tempId}${ext}`);
    await writeFile(tempPath, buffer);

    // --- STEP 1: CUT ENGINE ---
    const cutBridgePath = join(process.cwd(), "src", "backend", "cut_engine", "bridge.py");
    cutOutputDir = join(tempDir, tempId);

    const { stdout: cutStdout } = await execFileAsync(
      PYTHON_BIN,
      [cutBridgePath, tempPath, cutOutputDir],
      { env: { ...process.env, PYTHONUNBUFFERED: "1" }, maxBuffer: 10 * 1024 * 1024 }
    ).catch((err) => {
      console.error("[CutEngine] Error:", err?.stderr || err?.message || err);
      throw new Error("AI Cut Engine failed to process video. Please try again.");
    });

    let cutResult: any;
    try {
      cutResult = JSON.parse(cutStdout.trim().split("\n").pop() as string);
    } catch {
      throw new Error("Cut Engine returned invalid output.");
    }
    if (!cutResult.success) {
      throw new Error(cutResult.error || "AI Cut Engine failed.");
    }

    processedVideoPath = cutResult.output_path;
    logTiming("cut engine finished", startedAt);

    // --- STEP 2: EXTRACT 16kHz MONO AUDIO ---
    audioPath = join(tempDir, `${tempId}.wav`);
    await execFileAsync(FFMPEG, [
      "-y", "-i", processedVideoPath, "-vn", "-ac", "1", "-ar", "16000", audioPath,
    ], { maxBuffer: 10 * 1024 * 1024 }).catch((err) => {
      console.error("[Audio] FFmpeg error:", err?.stderr || err?.message || err);
      throw new Error("Could not extract audio from the video.");
    });
    logTiming("audio extracted", startedAt);

    // --- STEP 3: TRANSCRIPTION (Replicate) ---
    // Upload the extracted WAV to R2 and give Replicate a signed URL.
    // This avoids putting the entire audio file into a large Base64 request.
    const audioBuffer = await readFile(audioPath);
    const audioR2 = getR2Client();
    audioR2Client = audioR2.client;
    audioR2Bucket = audioR2.bucket;
    audioObjectKey = `transcription-input/${randomUUID()}.wav`;

    await audioR2Client.send(
      new PutObjectCommand({
        Bucket: audioR2Bucket,
        Key: audioObjectKey,
        Body: audioBuffer,
        ContentType: "audio/wav",
      })
    );

    const audioUrl = await getSignedUrl(
      audioR2Client,
      new GetObjectCommand({
        Bucket: audioR2Bucket,
        Key: audioObjectKey,
      }),
      { expiresIn: 900 }
    );
    logTiming(`audio uploaded to R2 (${Math.round(audioBuffer.length / 1024)} KB)`, startedAt);

    const inputInput: Record<string, unknown> = {
      // This model expects the media URL in the `url` input.
      url: audioUrl,
      task: mode,
      // The model's chunk timestamps are returned as [start, end] arrays.
      // Word mode causes this model to fail internally with a tuple error.
      timestamp: "chunk",
    };
    // Leave language unset so the Replicate model detects it automatically.
    // Regional browser values such as "en-in" are not accepted by this model.
    inputInput.batch_size = 24;
    inputInput.diarise_audio = false;

    // The complete Replicate model version is supplied through Dokploy.
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const replicateModelVersion = process.env.REPLICATE_MODEL_VERSION;

    if (!replicateToken) {
      throw new Error("REPLICATE_API_TOKEN is not configured at runtime.");
    }

    if (!replicateModelVersion) {
      throw new Error("REPLICATE_MODEL_VERSION is not configured at runtime.");
    }

    const replicate = new Replicate({ auth: replicateToken });

    // Example format: owner/model:version-id
    let output: any;
    try {
      output = await replicate.run(replicateModelVersion, {
        input: inputInput,
      });
      logTiming("Replicate finished", startedAt);
    } catch (replicateError: any) {
      const detail = replicateError?.message || String(replicateError);
      console.error("[Replicate] Error:", detail);
      throw new Error(`Replicate transcription failed: ${detail}`);
    }

    const words = toWords(output);
    if (words.length === 0) {
      return NextResponse.json(
        { success: false, error: "No speech detected in this video." },
        { status: 422 }
      );
    }

    const captions = groupIntoCaptions(words, wordsPerCaption).map((c, i) => ({
      id: `seg-${i}-${Math.random().toString(36).slice(2, 8)}`,
      start: c.start,
      end: c.end,
      text: c.text,
    }));

    const { client: r2Client, bucket: r2Bucket } = getR2Client();
    const processedVideoBuffer = await readFile(processedVideoPath);
    const videoKey = `processed/${randomUUID()}.mp4`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: videoKey,
        Body: processedVideoBuffer,
        ContentType: "video/mp4",
      })
    );
    logTiming("R2 upload finished", startedAt);

    const tightenedVideoUrl = await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: videoKey,
      }),
      { expiresIn: 3600 }
    );

    return NextResponse.json({
      success: true,
      captions,
      segments: captions,
      language: output?.detected_language || output?.language || language,
      captionCount: captions.length,
      mode,
      tightenedVideoUrl,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Transcribe] Error:", message);
    return NextResponse.json(
      { success: false, error: message, elapsedMs: Date.now() - startedAt },
      { status: 500 }
    );
  } finally {
    // Clean up temp files so the VPS disk doesn't fill up.
    for (const p of [tempPath, audioPath, processedVideoPath]) {
      if (p) await unlink(p).catch(() => {});
    }
    if (cutOutputDir) await rm(cutOutputDir, { recursive: true, force: true }).catch(() => {});

    if (audioObjectKey && audioR2Client && audioR2Bucket) {
      await audioR2Client.send(
        new DeleteObjectCommand({
          Bucket: audioR2Bucket,
          Key: audioObjectKey,
        })
      ).catch((error) => {
        console.error("[R2] Could not delete temporary audio:", error);
      });
    }
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/transcribe",
    method: "POST (multipart/form-data)",
    features: ["AI Auto-Cut", "word-level timestamps", "Replicate Whisper"],
  });
}
