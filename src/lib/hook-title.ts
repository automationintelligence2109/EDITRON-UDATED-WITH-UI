// CapGen AI Hook Title — heuristic fallback generator.
// Used when no ANTHROPIC_API_KEY is configured, or if the API call fails,
// so the feature always produces something usable rather than erroring out.

import type { CaptionSegment } from "./captions";

// Emoji picked by keyword match against the hook text — same idea editors
// use when hand-picking a callout emoji for a thumbnail/hook line.
const EMOJI_RULES: Array<[RegExp, string]> = [
  [/\b(warning|danger|panic|emergency|caution|risk)\b/i, "🚨"],
  [/\b(shock|shocking|stun|unbelievable|crazy)\b/i, "😱"],
  [/\b(money|cash|rich|profit|earn|salary|price|cost)\b/i, "💰"],
  [/\b(secret|hidden|nobody tells you|truth)\b/i, "🤫"],
  [/\b(mistake|wrong|fail|error|never do)\b/i, "⚠️"],
  [/\b(love|heart|relationship)\b/i, "❤️"],
  [/\b(health|doctor|medicine|patient|hospital|sugar|blood|diabetes|urine)\b/i, "🩺"],
  [/\b(fast|quick|instant|now|today)\b/i, "⚡"],
  [/\b(tip|hack|trick|guide|how to)\b/i, "💡"],
  [/\b(stop|don't|dont|avoid)\b/i, "🛑"],
];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of",
  "in", "on", "at", "for", "with", "by", "as", "it", "this", "that", "i",
  "you", "we", "they", "so", "just", "so", "if", "then", "very", "really",
]);

function pickEmoji(text: string): string {
  for (const [re, emoji] of EMOJI_RULES) {
    if (re.test(text)) return emoji;
  }
  return "🔥";
}

function titleCaseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build a short, punchy hook-title overlay from the opening few seconds of
 * a transcript. Purely local/offline — no network call, always succeeds.
 */
export function generateHeuristicHookTitle(segments: CaptionSegment[]): string {
  if (!segments.length) return "";
  // Use roughly the first 8 seconds of speech as "the hook".
  const hookText = segments
    .filter((s) => s.start < 8)
    .map((s) => s.text)
    .join(" ")
    .trim();
  const source = hookText || segments[0].text;

  const words = source.split(/\s+/).filter(Boolean);
  // Keep it short — a hook overlay reads best at 5-9 words.
  const trimmed = words.slice(0, 9).join(" ").replace(/[.,;:]+$/, "");

  const emoji = pickEmoji(source);
  const clean = titleCaseFirst(trimmed);
  const withPunctuation = /[!?]$/.test(clean) ? clean : `${clean}!`;
  return `${withPunctuation} ${emoji}`;
}