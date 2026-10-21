export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  bgColor: string;
  bgOpacity: number;
  position: "top" | "center" | "bottom";
  template: "plain" | "active-word" | "boxed" | "outline";
  animation: "none" | "pop" | "cascade" | "slide" | "bounce" | "zoom" | "flip" | "blur";
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  strokeColor?: string;
  strokeWidth?: number;
  hyperStyleId: string | null;
};

export const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "inter",
  fontSize: 48,
  textColor: "#FFFFFF",
  highlightColor: "#FFD700",
  bgColor: "#000000",
  bgOpacity: 0,
  position: "bottom",
  template: "active-word",
  animation: "pop",
  bold: true,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  hyperStyleId: null,
};
