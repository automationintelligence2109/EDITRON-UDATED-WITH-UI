import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingWindow = { id: string; start: number; end: number; query: string };

type NormalizedClip = {
  id: string;
  source: "pexels" | "pixabay";
  previewUrl: string;
  thumbnail: string;
  durationHint?: number;
};

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || "";
const CACHE_DIR = path.join(process.cwd(), "storage", "broll_cache");
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

async function getCachedClips(query: string): Promise<NormalizedClip[] | null> {
  try {
    const safeQuery = query.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const cachePath = path.join(CACHE_DIR, `${safeQuery}.json`);
    const stats = await fs.stat(cachePath);
    if (Date.now() - stats.mtimeMs > CACHE_TTL) return null;
    const data = await fs.readFile(cachePath, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveClipsToCache(query: string, clips: NormalizedClip[]) {
  try {
    // Ensure cache directory exists before writing
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const safeQuery = query.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const cachePath = path.join(CACHE_DIR, `${safeQuery}.json`);
    await fs.writeFile(cachePath, JSON.stringify(clips), "utf8");
  } catch (e) {
    console.error(`Cache write failed for ${query}:`, e);
  }
}

async function searchPexels(query: string, perPage = 20): Promise<NormalizedClip[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const videos = Array.isArray(data.videos) ? data.videos : [];
    return videos.map((v: any) => {
      const files = Array.isArray(v.video_files) ? v.video_files : [];
      const best =
        files.find((f: any) => f.quality === "sd" && f.width && f.width <= 960) ||
        files.find((f: any) => f.quality === "sd") ||
        files[0];
      return {
        id: `pexels-${v.id}`,
        source: "pexels" as const,
        previewUrl: best?.link || "",
        thumbnail: v.image || "",
        durationHint: v.duration,
      };
    }).filter((c: NormalizedClip) => c.previewUrl);
  } catch {
    return [];
  }
}

async function searchPixabay(query: string, perPage = 20): Promise<NormalizedClip[]> {
  if (!PIXABAY_API_KEY) return [];
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=${Math.max(3, perPage)}&safesearch=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits = Array.isArray(data.hits) ? data.hits : [];
    return hits.slice(0, perPage).map((v: any) => {
      const videos = v.videos || {};
      const best = videos.medium || videos.small || videos.tiny || videos.large;
      return {
        id: `pixabay-${v.id}`,
        source: "pixabay" as const,
        previewUrl: best?.url || "",
        thumbnail: v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg` : "",
        durationHint: v.duration,
      };
    }).filter((c: NormalizedClip) => c.previewUrl);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  if (!PEXELS_API_KEY && !PIXABAY_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No b-roll API keys configured. Add PEXELS_API_KEY and/or PIXABAY_API_KEY to .env (both are free — see comments in .env.example).",
      },
      { status: 500 }
    );
  }

  let body: { windows?: IncomingWindow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const windows = Array.isArray(body.windows) ? body.windows.slice(0, 20) : [];
  if (!windows.length) {
    return NextResponse.json({ success: false, error: "No windows provided." }, { status: 400 });
  }

  const results = await Promise.all(
    windows.map(async (w) => {
      let pexels = await searchPexels(w.query, 20);
      let pixabay = await searchPixabay(w.query, 20);
      let allClips = [...pexels, ...pixabay];

      if (allClips.length < 3) {
        const keywords = w.query.split(/\s+/).filter(k => k.length >= 3);
        const keywordResults = await Promise.all(
          keywords.map(async (kw) => {
            const [p, pb] = await Promise.all([searchPexels(kw, 10), searchPixabay(kw, 10)]);
            return [...p, ...pb];
          })
        );

        const flattened = keywordResults.flat();
        const unique = new Map();
        [...allClips, ...flattened].forEach(c => unique.set(c.id, c));
        allClips = Array.from(unique.values());
      }

      return {
        windowId: w.id,
        start: w.start,
        end: w.end,
        query: w.query,
        clips: allClips,
      };
    })
  );

  return NextResponse.json({ success: true, results });
}
