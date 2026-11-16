import {
  CINEMATIC_PRESETS,
  type CinematicPresetId,
} from "@/lib/captions";
import type { CaptionStyle } from "./types";

const HYPER_STYLE_LABELS: Record<CinematicPresetId, string> = {
  clean: "Clean",
  "pop-cinematic": "Pop Cinematic",
  "mr-beast-style": "MrBeast",
  "minimal-doc": "Minimal Doc",
  "hormozi-energy": "Hormozi",
  "luxury-aesthetic": "Luxury",
  "cyber-neon": "Cyber Neon",
  "podcast-clean": "Podcast",
  "viral-breaking": "Breaking",
  "editorial-luxe": "Editorial Luxe",
  "apple-glass-pill": "Apple Glass Pill",
  "cinema-blur": "Cinema Blur",
  "podcast-karaoke": "Podcast Karaoke",
  "minimalist-underline": "Minimalist Underline",
};

export const HYPER_STYLES = (Object.keys(HYPER_STYLE_LABELS) as CinematicPresetId[]).map((id) => ({
  id,
  label: HYPER_STYLE_LABELS[id],
  settings: CINEMATIC_PRESETS[id],
}));

export function applyHyperStyle(
  style: CaptionStyle,
  hyperStyleId: CinematicPresetId | null,
): CaptionStyle {
  if (!hyperStyleId) return style;
  return {
    ...style,
    ...CINEMATIC_PRESETS[hyperStyleId],
    hyperStyleId,
  };
}
