import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/request-protection";
import { BROLL_CONFIG } from "@/lib/broll-config";

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

const requestSchema = z.object({
  windows: z.array(z.object({
    id: z.string().min(1).max(200),
    start: z.number().finite().min(0),
    end: z.number().finite().min(0),
    query: z.string().trim().min(1).max(120),
  }).refine((window) => window.end > window.start, {
    message: "Window end must be after its start.",
  })).min(1).max(BROLL_CONFIG.MAX_SEARCH_WINDOWS_PER_REQUEST),
});

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || "";
const CACHE_DIR = path.join(process.cwd(), "storage", "broll_cache");
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

async function getCachedClips(query: string): Promise<NormalizedClip[] | null> {
  try {
    const cacheKey = createHash("sha256").update(query.toLowerCase()).digest("hex");
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
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
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheKey = createHash("sha256").update(query.toLowerCase()).digest("hex");
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
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
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to search for B-roll." }, { status: 401 });
  }

  let rateLimit: Awaited<ReturnType<typeof checkRateLimit>>;
  try {
    rateLimit = await checkRateLimit(`broll:${userId}`, 10, 60_000);
  } catch (error) {
    console.error("[B-roll] Rate limiter unavailable:", error);
    return NextResponse.json(
      { success: false, error: "B-roll search is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many B-roll searches. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

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

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return NextResponse.json({ success: false, error: "B-roll search request is too large." }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: "B-roll search data is invalid." }, { status: 400 });
  }
  const windows: IncomingWindow[] = parsedBody.data.windows;

  const results = await Promise.all(
    windows.map(async (w) => {
      let allClips = await getCachedClips(w.query);
      if (!allClips) {
        const [pexels, pixabay] = await Promise.all([
          searchPexels(w.query, 20),
          searchPixabay(w.query, 20),
        ]);
        allClips = [...pexels, ...pixabay];

        if (allClips.length < 3) {
          const keywords = w.query.split(/\s+/).filter((keyword) => keyword.length >= 3);
          const fallbackKeyword = keywords[0];
          if (fallbackKeyword) {
            const [p, pb] = await Promise.all([
              searchPexels(fallbackKeyword, 10),
              searchPixabay(fallbackKeyword, 10),
            ]);
            allClips = [...allClips, ...p, ...pb];
          }
        }

        const unique = new Map(allClips.map((clip) => [clip.id, clip]));
        allClips = Array.from(unique.values());
        await saveClipsToCache(w.query, allClips);
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
