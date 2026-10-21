export const CAPTION_POSITIONS = [
  { value: "top", label: "Top", icon: "AlignStartVertical" },
  { value: "center", label: "Center", icon: "AlignCenter" },
  { value: "bottom", label: "Bottom", icon: "AlignEndVertical" },
] as const;

export type CaptionPosition = typeof CAPTION_POSITIONS[number]["value"];
