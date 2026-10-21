// B-Roll Pacing Configuration
export const BROLL_CONFIG = {
  MAX_DURATION: 4, // Maximum seconds a B-roll clip stays on screen
  DEFAULT_WINDOW_SIZE: 6, // Default transcript window size
  TARGET_BROLL_INTERVAL: 10, // Average seconds between B-roll clips (e.g., 1 clip every 10s)
  MIN_PAUSE_FOR_BREAK: 0.5, // Seconds of silence to consider a "natural break"
  KEYWORD_MIN_LENGTH: 5, // Length for "high-importance" words
};
