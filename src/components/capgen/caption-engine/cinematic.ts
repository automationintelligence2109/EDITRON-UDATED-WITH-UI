import { CaptionStyle } from "./types";

export const HYPER_STYLES = [
  {
    id: "pop-cinematic",
    label: "Pop Cinematic",
    settings: {
      textColor: "#FFFFFF",
      highlightColor: "#FF6B1A",
      fontFamily: "archivo-black",
      template: "active-word",
      animation: "pop",
    },
  },
  {
    id: "mr-beast-style",
    label: "MrBeast",
    settings: {
      textColor: "#FFFF00",
      highlightColor: "#FFFFFF",
      fontFamily: "anton",
      template: "active-word",
      animation: "pop",
      uppercase: true,
    },
  },
  {
    id: "minimal-doc",
    label: "Minimal Doc",
    settings: {
      textColor: "#EEEEEE",
      highlightColor: "#FFFFFF",
      fontFamily: "inter",
      template: "plain",
      animation: "none",
      uppercase: false,
    },
  },
  {
    id: "hormozi-energy",
    label: "Hormozi",
    settings: {
      textColor: "#FFFFFF",
      highlightColor: "#CFFF00",
      fontFamily: "bebas-neue",
      template: "active-word",
      animation: "pop",
      uppercase: true,
    },
  },
  {
    id: "luxury-aesthetic",
    label: "Luxury",
    settings: {
      textColor: "#FFFFFF",
      highlightColor: "#F5F5F5",
      fontFamily: "playfair-display",
      template: "plain",
      animation: "slide",
      uppercase: false,
      italic: true,
    },
  },
  {
    id: "cyber-neon",
    label: "Cyber Neon",
    settings: {
      textColor: "#00FFFF",
      highlightColor: "#FF00FF",
      fontFamily: "russo-one",
      template: "active-word",
      animation: "pop",
      bgColor: "#000000",
      bgOpacity: 70,
    },
  },
  {
    id: "podcast-clean",
    label: "Podcast",
    settings: {
      textColor: "#FFFFFF",
      highlightColor: "#FFB800",
      fontFamily: "montserrat",
      template: "active-word",
      animation: "slide",
      uppercase: false,
    },
  },
  {
    id: "viral-breaking",
    label: "Breaking",
    settings: {
      textColor: "#FFFFFF",
      highlightColor: "#FFFFFF",
      fontFamily: "archivo-black",
      template: "boxed",
      animation: "pop",
      bgColor: "#FF0000",
      bgOpacity: 100,
      uppercase: true,
    },
  },
];

export function applyHyperStyle(style: CaptionStyle, hyperStyleId: string | null): CaptionStyle {
  if (!hyperStyleId) return style;
  const preset = HYPER_STYLES.find((s) => s.id === hyperStyleId);
  if (!preset) return style;
  return { ...style, ...preset.settings, hyperStyleId };
}
