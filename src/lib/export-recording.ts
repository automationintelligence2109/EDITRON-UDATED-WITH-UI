export function supportedRecordingTypes(
  isTypeSupported: (mime: string) => boolean,
  hasAudio: boolean,
): string[] {
  const candidates = hasAudio
    ? ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"]
    : ["video/mp4", "video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
  return candidates.filter(isTypeSupported);
}

export class RecordingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordingError";
  }
}
