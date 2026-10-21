# CapGen Developer Guide - Cut Engine Module
# ==============================================================================

## Overview
The Cut Engine is a standalone module responsible for the "Tightening" phase of the AI editing pipeline. 
It focuses on removing dead air (silences) and filler words to create a punchy, high-energy edit before 
captions are ever generated.

## Architecture
The engine is isolated in `src/backend/cut_engine/` to ensure that changes to the cutting logic 
do not break the captioning or B-roll systems.

### Logic Flow:
1. `bridge.py` (The Controller) -> Orchestrates the entire sequence.
2. `audio.py` -> Extracts a broadcast-standard 16kHz mono WAV for analysis.
3. `silence.py` -> Uses FFmpeg's `silencedetect` to map out dead air.
4. `plan.py` -> Calculates exactly which frames to keep and which to discard based on presets.
5. `render.py` -> Executes a complex FFmpeg filter chain to trim and concatenate the video.

### 🚀 Market-Level Quality Improvements (Current)
- **Word-Boundary Snapping**: Instead of cutting exactly where the audio volume drops, the engine now "snaps" the cut to the nearest word boundary from the Whisper transcript. This prevents "audio pops" and ensures the speaker's words aren't clipped.
- **Punctuation-Aware Pauses**: The engine now detects the end of thoughts (`.`, `?`, `!`). It preserves slightly longer pauses after a sentence to maintain a natural, human flow.
- **Intelligent Padding**: Implemented differentiated padding for pre-word and post-word gaps to ensure the "attack" of the voice is preserved.
## Troubleshooting
- **FFmpeg errors**: Ensure `ffmpeg` and `ffprobe` are in the system PATH.
- **Audio issues**: If silences aren't being detected, check the `silence-db` threshold in `plan.py`.
- **Render crashes**: Large files may require more disk space in the `.work` temporary directory.
