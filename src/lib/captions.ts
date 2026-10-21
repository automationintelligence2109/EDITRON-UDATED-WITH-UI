// Caption data model + helpers for CapGen studio.

export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export type CaptionSegment = {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  words?: WordTimestamp[]; // Added for Per-Word Karaoke animations
};

export type CaptionAnimation = "none" | "pop" | "cascade" | "slide" | "bounce" | "zoom" | "flip" | "blur";
export type CaptionTemplate = "plain" | "active-word" | "boxed" | "outline" | "kinetic-pop" | "slide-reveal";
export type CaptionPosition = "top" | "center" | "bottom";

export type CaptionStyle = {
  fontFamily: string; // value key from CAPGEN_FONTS
  fontSize: number; // px
  textColor: string; // hex
  highlightColor: string; // hex (active word / box bg)
  bgColor: string; // hex caption box bg
  bgOpacity: number; // 0-100
  position: CaptionPosition;
  template: CaptionTemplate;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number; // px
  strokeWidth: number; // px (outline template)
  strokeColor: string;
  animationSpeed: number; // 0.1 to 2.0 (multiplier for GSAP transitions)
  animation: CaptionAnimation;
  hyperStyleId?: string; // Added for Hyperframes Engine integration
  posX: number; // X position in pixels or percentage
  posY: number; // Y position in pixels or percentage
};

export const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "archivo-black",
  fontSize: 42,
  textColor: "#FFFFFF",
  highlightColor: "#FF6B1A",
  bgColor: "#000000",
  bgOpacity: 0,
  position: "bottom",
  template: "active-word",
  bold: true,
  italic: false,
  uppercase: true,
  letterSpacing: 0,
  strokeWidth: 0,
  strokeColor: "#000000",
  animationSpeed: 1,
  animation: "none",
  posX: 0,
  posY: 0,
};

// Simulate word-timed segments by distributing text evenly across an estimated duration.
// If `durationSec` is provided (from <video>.duration), use it; otherwise estimate
// using an average speaking rate of ~2.6 words/sec.
export function simulateWordTimings(text: string, durationSec?: number): CaptionSegment[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const words = cleaned.split(" ");
  const wordsPerSec = 2.6;
  const total = durationSec && durationSec > 0 ? Math.max(durationSec, words.length / wordsPerSec) : words.length / wordsPerSec;
  const perWord = total / words.length;

  // Group words into segments of 2-5 words (CapCut style).
  const groupSize = words.length <= 6 ? 2 : words.length <= 20 ? 3 : 4;
  const segments: CaptionSegment[] = [];
  let i = 0;
  let t = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + groupSize);
    const start = t;
    const end = +(t + slice.length * perWord).toFixed(3);
    segments.push({
      id: `seg-${i}-${Math.random().toString(36).slice(2, 8)}`,
      start: +start.toFixed(3),
      end,
      text: slice.join(" "),
    });
    t = end;
    i += groupSize;
  }
  // Stretch last segment end so it covers full duration if available
  if (durationSec && durationSec > 0 && segments.length > 0) {
    segments[segments.length - 1].end = +durationSec.toFixed(3);
  }
  return segments;
}

// ---------- SRT ----------
function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

export function formatSRTTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function generateSRT(segments: CaptionSegment[]): string {
  return segments
    .map((seg, i) => `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`)
    .join("\n");
}

// ---------- VTT ----------
export function formatVTTTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

export function generateVTT(segments: CaptionSegment[]): string {
  const body = segments
    .map((seg) => `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n${seg.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

// ---------- TXT ----------
export function generateTXT(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

// Browser-side download helper
export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Find the active segment index for a given playback time
export function activeSegmentIndex(segments: CaptionSegment[], t: number): number {
  // binary-ish linear scan (segments are usually small)
  for (let i = 0; i < segments.length; i++) {
    if (t >= segments[i].start && t < segments[i].end) return i;
  }
  return -1;
}

// Format mm:ss for display
export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${pad(m)}:${pad(s)}`;
}
