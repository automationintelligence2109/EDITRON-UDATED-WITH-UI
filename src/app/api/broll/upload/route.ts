import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "user_uploads");

async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create upload directory:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDir();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    const allowedExtensions = [".mp4", ".mov", ".jpg", ".jpeg", ".png"];
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json({ success: false, error: "Unsupported file type" }, { status: 400 });
    }

    const fileName = `${nanoid()}${extension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const thumbName = `${nanoid()}.jpg`;
    const thumbPath = path.join(UPLOAD_DIR, thumbName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Generate thumbnail if it's a video
    if (extension === ".mp4" || extension === ".mov") {
      try {
        // Extract frame at 0.1s, size 320x180
        await execPromise(`ffmpeg -ss 0.1 -i "${filePath}" -vframes 1 -s 320x180 "${thumbPath}"`);
      } catch (e) {
        console.error("Thumbnail generation failed:", e);
      }
    }

    // Use the /api/video helper to stream files from the storage directory
    const publicUrl = `/api/video?path=${encodeURIComponent(filePath)}`;
    const publicThumbUrl = extension === ".mp4" || extension === ".mov"
      ? `/api/video?path=${encodeURIComponent(thumbPath)}`
      : publicUrl;

    return NextResponse.json({
      success: true,
      clip: {
        id: `user-${nanoid()}`,
        source: "user",
        previewUrl: publicUrl,
        thumbnail: publicThumbUrl,
        query: file.name,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
