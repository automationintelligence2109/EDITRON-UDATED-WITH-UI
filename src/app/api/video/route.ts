import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 });
  }

  // Stream the file to the browser
  const stream = createReadStream(path);

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline",
    },
  });
}
