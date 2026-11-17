export type ExportQuality = "480p" | "720p" | "1080p" | "4k";

const QUALITY_BOXES: Record<ExportQuality, readonly [number, number]> = {
  "480p": [854, 480],
  "720p": [1280, 720],
  "1080p": [1920, 1080],
  "4k": [3840, 2160],
};

export function getExportDimensions(width: number, height: number, quality: ExportQuality) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Cannot export a video without valid dimensions.");
  }
  const [longSide, shortSide] = QUALITY_BOXES[quality];
  const maxWidth = width >= height ? longSide : shortSide;
  const maxHeight = width >= height ? shortSide : longSide;
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(2, Math.min(maxWidth, Math.round(width * scale / 2) * 2)),
    height: Math.max(2, Math.min(maxHeight, Math.round(height * scale / 2) * 2)),
  };
}
