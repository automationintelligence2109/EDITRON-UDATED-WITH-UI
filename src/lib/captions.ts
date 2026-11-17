// Caption data model + helpers for Editron studio.

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
  words?: WordTimestamp[];
  hidden?: boolean;
};

export type CaptionAnimationType =
  | "blur-reveal"
  | "slide-up"
  | "glass-pill"
  | "karaoke-dim"
  | "underline";
export type CaptionPosition = "top" | "center" | "bottom";
export type CinematicPresetId =
  | "clean"
  | "pop-cinematic"
  | "mr-beast-style"
  | "minimal-doc"
  | "hormozi-energy"
  | "luxury-aesthetic"
  | "cyber-neon"
  | "podcast-clean"
  | "viral-breaking"
  | "editorial-luxe"
  | "apple-glass-pill"
  | "cinema-blur"
  | "podcast-karaoke"
  | "minimalist-underline";

export type CaptionStyle = {
  fontFamily: string; // value key from EDITRON_FONTS
  fontSize: number; // px
  textColor: string; // hex
  bgColor: string; // hex caption box bg
  bgOpacity: number; // 0-100
  position: CaptionPosition;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number; // px
  animationType?: CaptionAnimationType;
  fontWeight?: number;
  letterSpacingUnit?: "px" | "em";
  inactiveOpacity?: number;
  pillColor?: string;
  pillBorder?: string;
  pillBorderRadius?: number;
  pillPaddingX?: number;
  pillPaddingY?: number;
  accentColor?: string;
  textShadow?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  activeWordFontFamily?: string;
  activeWordFontStyle?: "normal" | "italic";
  activeWordFontWeight?: number;
  hyperStyleId?: CinematicPresetId | null;
  posX: number; // X position in pixels or percentage
  posY: number; // Y position in pixels or percentage
};

export const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "inter",
  fontSize: 24,
  textColor: "#FFFFFF",
  bgColor: "#000000",
  bgOpacity: 0,
  position: "bottom",
  bold: false,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  hyperStyleId: "clean",
  posX: 0,
  posY: 0,
};

export const CINEMATIC_PRESETS: Record<CinematicPresetId, Partial<CaptionStyle>> = {
  clean: {
    fontFamily: "inter",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
  },
  "pop-cinematic": {
    fontFamily: "archivo-black",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: true,
    italic: false,
    uppercase: true,
    letterSpacing: 0,
  },
  "mr-beast-style": {
    fontFamily: "anton",
    textColor: "#FFFF00",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: true,
    italic: false,
    uppercase: true,
    letterSpacing: 1,
  },
  "minimal-doc": {
    fontFamily: "inter",
    textColor: "#EEEEEE",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
  },
  "hormozi-energy": {
    fontFamily: "bebas-neue",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: true,
    italic: false,
    uppercase: true,
    letterSpacing: 1,
  },
  "luxury-aesthetic": {
    fontFamily: "playfair-display",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: true,
    uppercase: false,
    letterSpacing: 2,
  },
  "cyber-neon": {
    fontFamily: "russo-one",
    textColor: "#00FFFF",
    bgColor: "#000000",
    bgOpacity: 70,
    bold: true,
    italic: false,
    uppercase: true,
    letterSpacing: 0,
  },
  "podcast-clean": {
    fontFamily: "montserrat",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: true,
    italic: false,
    uppercase: false,
    letterSpacing: 1,
  },
  "viral-breaking": {
    fontFamily: "archivo-black",
    textColor: "#FFFFFF",
    bgColor: "#FF0000",
    bgOpacity: 100,
    bold: true,
    italic: false,
    uppercase: true,
    letterSpacing: 0,
  },
  "editorial-luxe": {
    fontFamily: "plus-jakarta-sans",
    fontWeight: 500,
    textColor: "#F8F9FA",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    animationType: "slide-up",
    activeWordFontFamily: "instrument-serif",
    activeWordFontStyle: "italic",
    activeWordFontWeight: 400,
    textShadow: "0 4px 20px rgba(0,0,0,0.45)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 20,
    shadowOffsetY: 4,
  },
  "apple-glass-pill": {
    fontFamily: "inter",
    fontWeight: 600,
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: -0.02,
    letterSpacingUnit: "em",
    animationType: "glass-pill",
    pillColor: "rgba(20,20,22,0.72)",
    pillBorder: "rgba(255,255,255,0.18)",
    pillBorderRadius: 8,
    pillPaddingX: 8,
    pillPaddingY: 4,
    textShadow: "0 4px 20px rgba(0,0,0,0.45)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 20,
    shadowOffsetY: 4,
  },
  "cinema-blur": {
    fontFamily: "space-grotesk",
    fontWeight: 500,
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: true,
    letterSpacing: 0.08,
    letterSpacingUnit: "em",
    animationType: "blur-reveal",
    textShadow: "0 4px 20px rgba(0,0,0,0.45)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 20,
    shadowOffsetY: 4,
  },
  "podcast-karaoke": {
    fontFamily: "outfit",
    fontWeight: 700,
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: true,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    animationType: "karaoke-dim",
    inactiveOpacity: 0.38,
    textShadow: "0 4px 20px rgba(0,0,0,0.45)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 20,
    shadowOffsetY: 4,
  },
  "minimalist-underline": {
    fontFamily: "plus-jakarta-sans",
    fontWeight: 600,
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    animationType: "underline",
    accentColor: "#818CF8",
    textShadow: "0 4px 20px rgba(0,0,0,0.45)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 20,
    shadowOffsetY: 4,
  },
};

export function getCaptionPositionBase(position: CaptionPosition): number {
  switch (position) {
    case "top":
      return 12;
    case "center":
      return 50;
    case "bottom":
      return 85;
  }
}

export type CaptionWordLayout = {
  index: number;
  centerX: number;
  centerY: number;
  width: number;
};

export function getCaptionWords(segment: CaptionSegment): WordTimestamp[] {
  const displayWords = segment.text.split(/\s+/).filter(Boolean);
  if (!displayWords.length) return [];

  const timedWords = segment.words;
  if (
    timedWords?.length === displayWords.length &&
    timedWords.every(
      (word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start,
    )
  ) {
    return displayWords.map((word, index) => ({
      word,
      start: timedWords[index].start,
      end: timedWords[index].end,
    }));
  }

  const duration = Math.max(0, segment.end - segment.start);
  return displayWords.map((word, index) => ({
    word,
    start: segment.start + (duration * index) / displayWords.length,
    end: segment.start + (duration * (index + 1)) / displayWords.length,
  }));
}

export function getActiveWordIndex(words: WordTimestamp[], time: number): number {
  const active = words.findIndex((word) => time >= word.start && time < word.end);
  if (active >= 0) return active;
  if (!words.length) return -1;

  let previous = -1;
  for (let index = 0; index < words.length; index += 1) {
    if (words[index].start > time) break;
    previous = index;
  }
  return previous >= 0 ? previous : 0;
}

export function getEaseOutProgress(elapsed: number, duration: number): number {
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  return 1 - Math.pow(1 - progress, 3);
}

export type CaptionWordRenderState = {
  opacity: number;
  scale: number;
  translateY: number;
  blur: number;
  underlineProgress: number;
};

export function getCaptionWordRenderState(
  animationType: CaptionAnimationType | undefined,
  word: WordTimestamp,
  index: number,
  activeIndex: number,
  time: number,
  inactiveOpacity = 0.38,
): CaptionWordRenderState {
  const state: CaptionWordRenderState = {
    opacity: 1,
    scale: 1,
    translateY: 0,
    blur: 0,
    underlineProgress: 0,
  };

  switch (animationType) {
    case "slide-up":
      if (index === activeIndex) {
        const progress = getEaseOutProgress(time - word.start, 0.15);
        state.opacity = progress;
        state.translateY = 6 * (1 - progress);
      }
      break;
    case "blur-reveal": {
      const progress = getEaseOutProgress(time - word.start, 0.18);
      state.opacity = progress;
      state.blur = 8 * (1 - progress);
      break;
    }
    case "karaoke-dim":
      if (index > activeIndex) {
        state.opacity = inactiveOpacity;
      } else if (index === activeIndex) {
        const progress = getEaseOutProgress(time - word.start, 0.16);
        state.opacity = inactiveOpacity + (1 - inactiveOpacity) * progress;
        state.scale = 1 + 0.04 * progress;
      }
      break;
    case "underline":
      if (index === activeIndex) {
        const duration = word.end - word.start;
        state.underlineProgress =
          duration > 0 ? Math.max(0, Math.min(1, (time - word.start) / duration)) : 1;
      }
      break;
  }

  return state;
}

export function layoutCaptionWords(
  words: WordTimestamp[],
  maxWidth: number,
  fontSize: number,
  measureWord: (word: string, index: number) => number,
  spaceWidth: number,
): { words: CaptionWordLayout[]; width: number; height: number; lineHeight: number } {
  const lineHeight = fontSize * 1.1;
  const lines: Array<{ words: Array<{ index: number; width: number }>; width: number }> = [];
  let line: { words: Array<{ index: number; width: number }>; width: number } = {
    words: [],
    width: 0,
  };

  words.forEach((word, index) => {
    const width = Math.max(0, measureWord(word.word, index));
    const nextWidth = line.width + (line.words.length ? spaceWidth : 0) + width;
    if (line.words.length && nextWidth > maxWidth) {
      lines.push(line);
      line = { words: [], width: 0 };
    }
    line.width += (line.words.length ? spaceWidth : 0) + width;
    line.words.push({ index, width });
  });
  if (line.words.length) lines.push(line);

  const width = lines.reduce((largest, current) => Math.max(largest, current.width), 0);
  const height = lines.length * lineHeight;
  const placements: CaptionWordLayout[] = [];

  lines.forEach((currentLine, lineIndex) => {
    let cursor = -currentLine.width / 2;
    const centerY = (lineIndex - (lines.length - 1) / 2) * lineHeight;
    currentLine.words.forEach((word) => {
      placements.push({
        index: word.index,
        centerX: cursor + word.width / 2,
        centerY,
        width: word.width,
      });
      cursor += word.width + spaceWidth;
    });
  });

  return { words: placements, width, height, lineHeight };
}

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
    .filter((seg) => !seg.hidden)
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
    .filter((seg) => !seg.hidden)
    .map((seg) => `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n${seg.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

// ---------- TXT ----------
export function generateTXT(segments: CaptionSegment[]): string {
  return segments.filter((s) => !s.hidden).map((s) => s.text).join(" ");
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
    const segment = segments[i];
    if (t >= segment.start && t < segment.end) return segment.hidden ? -1 : i;

    const nextSegment = segments[i + 1];
    if (
      !segment.hidden &&
      nextSegment &&
      t >= segment.end &&
      t < nextSegment.start &&
      nextSegment.start - segment.end <= 0.25
    ) {
      return i;
    }
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
