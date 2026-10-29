import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, rm } from "fs/promises";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import Replicate from "replicate";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 3600;

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const PYTHON_BIN =
  process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

type WordItem = { word: string; start: number; end: number };
type WhisperCaption = { start: number; end: number; text: string };

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

/**
 * Turns whatever shape the Replicate Whisper model returns into a flat word list.
 * Handles: output.words, output.segments (with or without words), output.chunks.
 * If only segment-level times exist, words are spread evenly across each segment.
 */
function toWords(output: any): WordItem[] {
  if (Array.isArray(output?.words) && output.words.length > 0) {
    return output.words
      .map((w: any) => ({
        word: String(w.word ?? w.text ?? "").trim(),
        start: Number(w.start ?? 0),
        end: Number(w.end ?? 0),
      }))
      .filter((w: WordItem) => w.word.length > 0);
  }

  const segments: any[] = Array.isArray(output?.segments)
    ? output.segments
    : Array.isArray(output?.chunks)
      ? output.chunks.map((c: any) => ({
          text: c.text,
          start: Array.isArray(c.timestamp) ? c.timestamp[0] : 0,
          end: Array.isArray(c.timestamp) ? c.timestamp[1] : 0,
        }))
      : [];

  const words: WordItem[] = [];
  for (const seg of segments) {
    const tokens = String(seg.text ?? "").trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const start = Number(seg.start ?? 0);
    const end = Number(seg.end ?? start);
    const step = (end - start) / tokens.length;
    tokens.forEach((t, i) => {
      words.push({
        word: t,
        start: +(start + step * i).toFixed(3),
        end: +(start + step * (i + 1)).toFixed(3),
      });
    });
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

    const tightenedPath: string = cutResult.output_path;

    // --- STEP 2: EXTRACT 16kHz MONO AUDIO ---
    audioPath = join(tempDir, `${tempId}.wav`);
    await execFileAsync(FFMPEG, [
      "-y", "-i", tightenedPath, "-vn", "-ac", "1", "-ar", "16000", audioPath,
    ], { maxBuffer: 10 * 1024 * 1024 }).catch((err) => {
      console.error("[Audio] FFmpeg error:", err?.stderr || err?.message || err);
      throw new Error("Could not extract audio from the video.");
    });

    // --- STEP 3: TRANSCRIPTION (Replicate) ---
    const modelId = process.env.REPLICATE_WHISPER_MODEL;
    if (!modelId) throw new Error("REPLICATE_WHISPER_MODEL is not set.");

    const input: Record<string, unknown> = {
      audio: createReadStream(audioPath),
      task: mode,
    };
    if (language && language !== "auto") input.language = language;

    const output: any = await replicate.run(modelId as `${string}/${string}`, { input });

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

    return NextResponse.json({
      success: true,
      captions,
      language: output?.detected_language || output?.language || language,
      captionCount: captions.length,
      mode,
      tightenedVideoUrl: tightenedPath, // still a server path; replace with a Supabase signed URL next
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
    // Clean up temp files so the VPS disk doesn't fill up
    for (const p of [tempPath, audioPath]) {
      if (p) await unlink(p).catch(() => {});
    }
    if (cutOutputDir) await rm(cutOutputDir, { recursive: true, force: true }).catch(() => {});
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
