export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  bgOpacity: number;
  position: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  hyperStyleId: string | null;
};

export const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "inter",
  fontSize: 48,
  textColor: "#FFFFFF",
  bgColor: "#000000",
  bgOpacity: 0,
  position: "bottom",
  bold: true,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  hyperStyleId: null,
};
