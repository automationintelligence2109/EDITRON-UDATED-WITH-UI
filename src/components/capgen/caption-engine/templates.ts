export const CAPTION_TEMPLATES = [
  { value: "plain", label: "Plain" },
  { value: "active-word", label: "Karaoke" },
  { value: "boxed", label: "Boxed" },
  { value: "outline", label: "Outline" },
] as const;

export type TemplateType = typeof CAPTION_TEMPLATES[number]["value"];
