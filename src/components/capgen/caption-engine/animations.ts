export const CAPTION_ANIMATIONS = ["none", "pop", "cascade", "slide", "bounce", "zoom", "flip", "blur"] as const;

export type AnimationType = typeof CAPTION_ANIMATIONS[number];

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  none: "Static",
  pop: "Pop",
  cascade: "Cascade",
  slide: "Slide",
  bounce: "Bounce",
  zoom: "Zoom",
  flip: "Flip",
  blur: "Blur",
};
