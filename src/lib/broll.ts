// CapGen B-Roll — transcript-to-keyword windowing + shared types.
// Groups caption segments into ~N-second windows and extracts a short,
// stock-footage-friendly search query for each window.

import { BROLL_CONFIG } from "./broll-config";

export type BRollClip = {
  id: string; // unique per assignment (windowId + clipId)
  windowId: string;
  start: number; // seconds — when this b-roll should appear
  end: number; // seconds — when it should end
  source: "pexels" | "pixabay" | "user";
  previewUrl: string; // direct playable mp4 URL
  thumbnail: string;
  query: string;
  durationHint?: number; // source clip's own duration, for info only
  trimStart?: number; // offset in seconds
  trimEnd?: number; // offset in seconds
  transitionIn?: string;
  transitionOut?: string;
};

export type BRollWindow = {
  id: string;
  start: number;
  end: number;
  text: string;
  query: string;
};

// Small stopword list - expanded to include common "sentence noise" and grammar words
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "to", "of", "in", "on", "at", "for", "with", "by", "about", "as",
  "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we",
  "they", "them", "his", "her", "our", "your", "their", "what", "which", "who",
  "so", "if", "then", "than", "just", "not", "no", "yes", "do", "does", "did",
  "have", "has", "had", "will", "would", "can", "could", "should", "may",
  "might", "must", "here", "there", "now", "very", "really", "like", "okay",
  "ok", "um", "uh", "hmm", "also", "into", "out", "up", "down", "over", "again",
  "one", "all", "some", "when", "how", "why", "because", "get", "got", "let",
  "us", "my", "me", "am", "im", "youre", "its",
  // Sentence noise / Grammar fallbacks
  "are", "is", "better", "best", "than", "this", "that", "these", "those",
  "they", "them", "some", "more", "most", "too", "very", "really"
]);

// Basic common action verbs to create "Action-Word Pairings"
const ACTION_VERBS = new Set([
  "run", "running", "walk", "walking", "cook", "cooking", "code", "coding",
  "write", "writing", "speak", "speaking", "show", "showing", "create", "creating",
  "build", "building", "jump", "jumping", "dance", "dancing", "work", "working",
  "fly", "flying", "drive", "driving", "think", "thinking", "learn", "learning"
]);

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "").replace(/'s$/, "");
}

/** Extract high-intent entity keywords by identifying key phrases and entities. */
export function extractKeywords(text: string, max = 3): string[] {
  const rawWords = text.split(/\s+/).map(cleanWord).filter(Boolean);
  if (rawWords.length === 0) return [];

  // 1. Filter out noise words to find "core" content
  const contentWords = rawWords.filter(w => !STOPWORDS.has(w));

  const bestKeywords: string[] = [];
  const seen = new Set<string>();

  // 2. SMART PHRASE EXTRACTION (Bigrams)
  // Look for pairs of content words (e.g., "thyroid problem", "soya products")
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];

    // If both words are content words, this is a high-value phrase
    if (!STOPWORDS.has(w1) && !STOPWORDS.has(w2)) {
      const phrase = `${w1} ${w2}`;
      if (!seen.has(phrase)) {
        bestKeywords.push(phrase);
        seen.add(phrase);
        // Mark individual words as seen so we don't duplicate them as single keywords
        seen.add(w1);
        seen.add(w2);
      }
    }
    if (bestKeywords.length >= max) break;
  }

  // 3. ACTION-WORD PAIRING (Fallback for verbs)
  if (bestKeywords.length < max) {
    const firstVerb = rawWords.find(w => ACTION_VERBS.has(w));
    const contentWordsOnly = rawWords.filter(w => !STOPWORDS.has(w));
    if (firstVerb && contentWordsOnly.length > 0) {
      const mainNoun = contentWordsOnly[0];
      if (mainNoun !== firstVerb) {
        const phrase = `${firstVerb} ${mainNoun}`;
        if (!seen.has(phrase)) {
          bestKeywords.push(phrase);
          seen.add(phrase);
        }
      }
    }
  }

  // 4. FILLER: Highest scoring single words
  if (bestKeywords.length < max) {
    const candidates = contentWords.map(w => ({
      word: w,
      score: (w.length >= BROLL_CONFIG.KEYWORD_MIN_LENGTH ? 2 : 1) + (w.length > 7 ? 1 : 0)
    })).sort((a, b) => b.score - a.score);

    for (const c of candidates) {
      if (bestKeywords.length >= max) break;
      if (seen.has(c.word)) continue;
      bestKeywords.push(c.word);
      seen.add(c.word);
    }
  }

  return bestKeywords.slice(0, max);
}

/**
 * Group caption segments into windows.
 * Uses "Natural Breaks" (pauses) for smarter placement.
 */
export function buildBrollWindows(
  segments: CaptionSegment[],
  opts: { windowSeconds?: number; maxWindows?: number; videoDuration?: number } = {}
): BRollWindow[] {
  const windowSeconds = opts.windowSeconds ?? BROLL_CONFIG.DEFAULT_WINDOW_SIZE;
  const maxWindows = opts.videoDuration
    ? Math.ceil(opts.videoDuration / BROLL_CONFIG.TARGET_BROLL_INTERVAL)
    : (opts.maxWindows ?? 20);

  if (!segments.length) return [];

  const totalEnd = segments[segments.length - 1].end;
  const windows: BRollWindow[] = [];
  const keywordHistory: string[] = []; // Anti-Repeat History

  let winStart = segments[0].start;

  while (winStart < totalEnd && windows.length < maxWindows) {
    // SMARTER PLACEMENT: Check for natural breaks (pauses) nearby
    const currentSeg = segments.find(s => s.start <= winStart && s.end > winStart);
    if (currentSeg) {
      const nextSeg = segments.find(s => s.start > currentSeg.end);
      if (nextSeg && (nextSeg.start - currentSeg.end) >= BROLL_CONFIG.MIN_PAUSE_FOR_BREAK) {
        winStart = nextSeg.start;
      }
    }

    const winEnd = Math.min(winStart + windowSeconds, totalEnd);
    const covered = segments.filter((s) => s.start < winEnd && s.end > winStart);

    if (covered.length) {
      const text = covered.map((s) => s.text).join(" ");
      let keywords = extractKeywords(text, 3);

      if (keywords.length > 0) {
        const topK = keywords[0];
        const isRepeat = keywordHistory.slice(-2).includes(topK);
        if (isRepeat && keywords.length > 1) {
          const [first, ...rest] = keywords;
          keywords = [...rest, first];
        }
      }

      if (keywords.length) {
        const finalQuery = keywords[0];
        windows.push({
          id: `w-${winStart.toFixed(1)}`,
          start: winStart,
          end: winEnd,
          text,
          query: finalQuery,
        });
        keywordHistory.push(finalQuery);
      }
    }
    winStart += BROLL_CONFIG.TARGET_BROLL_INTERVAL;
  }
  return windows;
}

export function activeBrollAt(brolls: BRollClip[], t: number): BRollClip | null {
  for (const b of brolls) {
    if (t >= b.start && t < b.end) return b;
  }
  return null;
}
