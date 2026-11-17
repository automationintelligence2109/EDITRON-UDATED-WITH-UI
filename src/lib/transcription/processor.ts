import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { mkdtemp, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { extname, join } from "path";
import { promisify } from "util";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Replicate from "replicate";
import { getR2Client, getUserR2Prefix } from "@/lib/r2";
import { applyAutoEmojis } from "@/lib/emojis";
import { createReplicateFetch, isReplicateRateLimitError } from "@/lib/transcription/replicate-fetch";
import type {
  TranscriptionJobData,
  TranscriptionProgress,
  TranscriptionResult,
} from "@/lib/transcription/types";

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
const PYTHON_BIN =
  process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const MAX_DURATION_SECONDS = 30 * 60;
const MAX_PROCESSING_TIME_MS = 55 * 60 * 1000;
const INPUT_EXTENSIONS = new Set([
  ".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mov", ".ogg", ".aac", ".mkv",
]);

type WordItem = { word: string; start: number; end: number };
type WhisperCaption = { start: number; end: number; text: string; words: WordItem[] };

export class TranscriptionInputError extends Error {}
export class TranscriptionServiceError extends Error {}

function isReplicateModelVersion(
  value: string,
): value is `${string}/${string}` | `${string}/${string}:${string}` {
  const slash = value.indexOf("/");
  const colon = value.indexOf(":", slash + 1);
  return slash > 0 && colon > slash + 1 && colon < value.length - 1 && !/\s/.test(value);
}

function logTiming(label: string, startedAt: number) {
  console.log(`[Transcribe worker] ${label}: ${Date.now() - startedAt} ms`);
}

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
    const step = duration / tokens.length;

    tokens.forEach((token, index) => {
      words.push({
        word: token,
        start: +(start + step * index).toFixed(3),
        end: +(start + step * (index + 1)).toFixed(3),
      });
    });
  };

  if (Array.isArray(output?.chunks) && output.chunks.length > 0) {
    for (const chunk of output.chunks) {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [];
      addTimedText(chunk.text, timestamp[0], timestamp[1]);
    }
    return words;
  }

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

  const segments: any[] = Array.isArray(output?.segments) ? output.segments : [];
  for (const segment of segments) {
    const timestamp = Array.isArray(segment.timestamp) ? segment.timestamp : [];
    addTimedText(segment.text, segment.start ?? timestamp[0], segment.end ?? timestamp[1]);
  }

  if (words.length === 0) {
    addTimedText(String(output?.text ?? output ?? ""), 0, 0);
  }
  return words;
}

export function groupIntoCaptions(words: WordItem[], wordsPerCaption: number): WhisperCaption[] {
  const captions: WhisperCaption[] = [];
  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption);
    captions.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: applyAutoEmojis(chunk.map((word) => word.word).join(" ")),
      words: chunk,
    });
  }
  return captions;
}

async function updateProgress(
  onProgress: (progress: TranscriptionProgress) => Promise<void>,
  stage: string,
  progress: number,
): Promise<void> {
  await onProgress({ stage, progress });
}

export async function processTranscriptionJob(
  job: TranscriptionJobData,
  onProgress: (progress: TranscriptionProgress) => Promise<void>,
): Promise<TranscriptionResult> {
  const startedAt = Date.now();
  const extension = extname(job.sourceName).toLowerCase();
  if (!INPUT_EXTENSIONS.has(extension)) {
    throw new TranscriptionInputError("Unsupported file type.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "editron-transcribe-"));
  const inputPath = join(tempDir, `input${extension}`);
  const cutOutputDir = join(tempDir, "cut");
  const audioPath = join(tempDir, "audio.wav");
  let r2: ReturnType<typeof getR2Client> | null = null;
  let audioObjectKey: string | null = null;

  try {
    r2 = getR2Client();
    await updateProgress(onProgress, "downloading", 5);
    const inputObject = await r2.client.send(new GetObjectCommand({
      Bucket: r2.bucket,
      Key: job.sourceKey,
    }));
    if (!(inputObject.Body instanceof Readable)) {
      throw new Error("Could not read the uploaded video from storage.");
    }
    await pipeline(inputObject.Body, createWriteStream(inputPath, { flags: "wx" }));

    const { stdout: durationOutput } = await execFileAsync(FFPROBE, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ], { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 });
    const inputDuration = Number(durationOutput.trim());
    if (!Number.isFinite(inputDuration) || inputDuration <= 0) {
      throw new TranscriptionInputError("Could not read the media duration.");
    }
    if (inputDuration > MAX_DURATION_SECONDS) {
      throw new TranscriptionInputError("Videos and audio must be 30 minutes or shorter.");
    }

    await updateProgress(onProgress, "cutting", 20);
    const cutBridgePath = join(process.cwd(), "src", "backend", "cut_engine", "bridge.py");
    const { stdout: cutStdout } = await execFileAsync(
      PYTHON_BIN,
      [cutBridgePath, inputPath, cutOutputDir],
      {
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: MAX_PROCESSING_TIME_MS,
      },
    );

    let parsedCutResult: unknown;
    try {
      parsedCutResult = JSON.parse(cutStdout.trim().split("\n").pop() || "");
    } catch {
      throw new Error("The video processor returned invalid output.");
    }
    if (!parsedCutResult || typeof parsedCutResult !== "object") {
      throw new Error("The video processor returned invalid output.");
    }
    const cutResult = parsedCutResult as {
      success?: unknown;
      output_path?: unknown;
      error?: unknown;
    };
    if (cutResult.success !== true || typeof cutResult.output_path !== "string") {
      const errorMessage = typeof cutResult.error === "string" ? cutResult.error : "";
      throw new Error(errorMessage || "The video processor failed.");
    }
    const outputPath = cutResult.output_path;

    await updateProgress(onProgress, "extracting_audio", 45);
    await execFileAsync(FFMPEG, [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-i", outputPath,
      "-map", "0:a:0",
      "-vn",
      "-sn",
      "-c:a", "pcm_s16le",
      "-ac", "1",
      "-ar", "16000",
      audioPath,
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: MAX_PROCESSING_TIME_MS });

    const audioInfo = await stat(audioPath);
    audioObjectKey = `${getUserR2Prefix(job.userId)}transcription-input/${job.jobId}.wav`;
    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: audioObjectKey,
      Body: createReadStream(audioPath),
      ContentLength: audioInfo.size,
      ContentType: "audio/wav",
    }));
    const audioUrl = await getSignedUrl(
      r2.client,
      new GetObjectCommand({ Bucket: r2.bucket, Key: audioObjectKey }),
      { expiresIn: 900 },
    );

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const replicateModelVersion = process.env.REPLICATE_MODEL_VERSION;
    if (!replicateToken) throw new Error("REPLICATE_API_TOKEN is not configured.");
    if (!replicateModelVersion || !isReplicateModelVersion(replicateModelVersion)) {
      throw new Error("REPLICATE_MODEL_VERSION is not configured.");
    }

    await updateProgress(onProgress, "transcribing", 65);
    const replicate = new Replicate({ auth: replicateToken, fetch: createReplicateFetch() });
    let output: object;
    try {
      output = await replicate.run(replicateModelVersion, {
        input: {
          audio: audioUrl,
          translate: job.mode === "translate",
          transcription: "plain text",
          temperature: 0,
          condition_on_previous_text: true,
        },
      });
    } catch (error) {
      if (isReplicateRateLimitError(error)) {
        throw new TranscriptionServiceError("The transcription service is busy. Please wait a moment and try again.");
      }
      throw error;
    }
    const words = toWords(output);
    if (words.length === 0) {
      throw new TranscriptionInputError("No speech detected in this video.");
    }

    await updateProgress(onProgress, "saving_video", 85);
    const captions = groupIntoCaptions(words, job.wordsPerCaption).map((caption, index) => ({
      id: `${job.jobId}-${index}`,
      start: caption.start,
      end: caption.end,
      text: caption.text,
      words: caption.words,
    }));
    const processedVideoInfo = await stat(outputPath);
    const resultSourceKey = `${getUserR2Prefix(job.userId)}source/${job.jobId}.mp4`;
    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: resultSourceKey,
      Body: createReadStream(outputPath),
      ContentLength: processedVideoInfo.size,
      ContentType: "video/mp4",
    }));

    await updateProgress(onProgress, "complete", 100);
    return {
      captions,
      captionCount: captions.length,
      mode: job.mode,
      sourceKey: resultSourceKey,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    if (audioObjectKey && r2) {
      await r2.client.send(new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: audioObjectKey,
      })).catch((error) => {
        console.error("[Transcribe worker] Could not delete temporary audio:", error);
      });
    }
    await rm(tempDir, { recursive: true, force: true }).catch((error) => {
      console.error("[Transcribe worker] Could not remove temporary files:", error);
    });
  }
}
