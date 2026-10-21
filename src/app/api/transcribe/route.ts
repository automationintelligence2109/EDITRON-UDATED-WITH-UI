import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, access } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 3600; // Increased to 1 hour to support very large videos

const MAX_FILE_BYTES = 150 * 1024 * 1024;
const SCRIPT_PATH = join(process.cwd(), "scripts", "transcribe.py");
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "/home/z/.venv/bin/python3");

type WhisperCaption = {
  start: number;
  end: number;
  text: string;
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const language = (formData.get("language") as string | null) || "en";
    const mode = (formData.get("mode") as string) === "translate" ? "translate" : "transcribe";
    const wpcRaw = formData.get("words_per_caption");
    const wordsPerCaption = wpcRaw ? Math.max(1, Math.min(12, parseInt(wpcRaw as string, 10) || 6)) : 6;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided." },
        { status: 400 }
      );
    }

    // File size limit removed to support large professional videos


    // Save uploaded file to a temp path
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (file.name || "audio.wav").includes(".")
      ? (file.name as string).slice(file.name.lastIndexOf("."))
      : ".wav";
    const tempId = randomUUID();
    const tempDir = join(tmpdir(), "capgen-uploads");
    if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
    const tempPath = join(tempDir, `${tempId}${ext}`);
    await writeFile(tempPath, buffer);

    try {
      // --- STEP 1: CUT ENGINE (The AI Auto-Cut) ---
      // We run the bridge.py script as a subprocess to perform the "Tightening"
      const cutBridgePath = join(process.cwd(), "src", "backend", "cut_engine", "bridge.py");
      const cutOutputDir = join(tempDir, tempId);

      const { stdout: cutStdout } = await execFileAsync(
        PYTHON_BIN,
        [cutBridgePath, tempPath, cutOutputDir],
        { env: { ...process.env, PYTHONUNBUFFERED: "1" } }
      ).catch((err) => {
        console.error("[CutEngine] Error:", err);
        throw new Error("AI Cut Engine failed to process video. Please try again.");
      });

      // The bridge.py should print a JSON result as the last line of stdout
      let cutResult: any;
      try {
        cutResult = JSON.parse(cutStdout.trim().split("\n").pop() as string);
      } catch {
        throw new Error("Cut Engine returned invalid output.");
      }

      if (!cutResult.success) {
        throw new Error(cutResult.error || "AI Cut Engine failed.");
      }

      // Use the tightened video for transcription
      const tightenedPath = cutResult.output_path;

      // --- STEP 2: TRANSCRIPTION (On Tightened Video) ---
      const env = {
        ...process.env,
        OMP_NUM_THREADS: "1",
        PYTHONUNBUFFERED: "1",
      };

      const { stdout: transStdout, stderr: transStderr } = await execFileAsync(
        PYTHON_BIN,
        [SCRIPT_PATH, tightenedPath, String(wordsPerCaption), mode, language],
        {
          env,
          timeout: 590_000,
          maxBuffer: 10 * 1024 * 1024,
          killSignal: "SIGKILL",
        }
      ).catch((err) => {
        const e = err as any;
        const errText = (e.stderr || "") + (e.stdout || "");
        if (errText.includes("ModuleNotFoundError")) {
          throw new Error(`Python dependency missing. Run: pip install faster-whisper`);
        }
        throw new Error(e.message);
      });

      let result: { success?: boolean; captions?: WhisperCaption[]; language?: string; language_probability?: number; error?: string };
      try {
        result = JSON.parse(transStdout.trim().split("\n").pop() as string);
      } catch {
        return NextResponse.json({ success: false, error: "Transcription invalid output." }, { status: 500 });
      }

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Transcription failed." }, { status: 422 });
      }

      const captions = (result.captions || []).map((c, i) => ({
        id: `seg-${i}-${Math.random().toString(36).slice(2, 8)}`,
        start: c.start,
        end: c.end,
        text: c.text,
      }));

      // Return the result including the path to the tightened video
      return NextResponse.json({
        success: true,
        captions,
        language: result.language || language,
        languageProbability: result.language_probability,
        captionCount: captions.length,
        mode,
        tightenedVideoUrl: tightenedPath, // Send the cut video back to the client
        elapsedMs: Date.now() - startedAt,
      });

    } finally {
      try {
        await unlink(tempPath);
      } catch {}
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message, elapsedMs: Date.now() - startedAt }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/transcribe",
    method: "POST (multipart/form-data)",
    features: ["AI Auto-Cut", "word-level timestamps", "language auto-detection"],
  });
}
