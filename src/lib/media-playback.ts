export function isInterruptedPlayback(error: unknown, video: HTMLVideoElement): boolean {
  return error instanceof DOMException && error.name === "AbortError" &&
    (video.paused || !video.isConnected);
}
