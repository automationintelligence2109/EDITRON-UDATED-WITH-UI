import os
import subprocess
import json
import sys
import random
from pathlib import Path

# Add the project root to sys.path so we can import from mini-services
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the new High-Quality Audio Enhancer
try:
    from mini_services.hyper_engine.audio_enhancer import AudioEnhancer
except ImportError:
    try:
        from hyper_engine.audio_enhancer import AudioEnhancer
    except ImportError:
        AudioEnhancer = None

from audio import extract_wav_16k_mono, probe_duration
from silence import detect_silences
from plan import build_plan
from render import render
from deps import check_ffmpeg

def process_video(input_path: str, output_dir: str, preset: str = "talk", speed: float = 1.0, brolls: list = None):
    """
    The main entry point for the Cut Engine.
    Takes a raw video, removes silences and fillers, and returns the tightened video.
    """
    try:
        # 0. Verify Dependencies (FFmpeg)
        ffmpeg_bin, ffprobe_bin = check_ffmpeg()

        # 1. Setup workspace
        stem = os.path.splitext(os.path.basename(input_path))[0]
        work_dir = os.path.join(output_dir, stem, ".work")
        os.makedirs(work_dir, exist_ok=True)

        audio_path = os.path.join(work_dir, "audio_16k.wav")

        # 2. Extract Audio
        extract_wav_16k_mono(ffmpeg_bin, Path(input_path), Path(audio_path))
        duration = probe_duration(ffprobe_bin, Path(input_path))
        print(f"[Audit] Raw audio extracted to: {audio_path}")

        # --- HIGH QUALITY NOISE REDUCTION STEP ---
        audio_for_detection = Path(audio_path)
        cleaned_audio_path = None
        if AudioEnhancer:
            try:
                print(f"[Audit] Starting Commercial-Grade Denoising... Input: {audio_path}")
                enhancer = AudioEnhancer()
                cleaned_wav = enhancer.process_video_audio(input_path, work_dir)
                if cleaned_wav:
                    print(f"[Audit] Denoising SUCCESS. Output: {cleaned_wav}")
                    audio_for_detection = Path(cleaned_wav)
                    cleaned_audio_path = Path(cleaned_wav)
                else:
                    print(f"[Audit] Denoising produced no file. Falling back.")
            except Exception as e:
                print(f"[Audit] Denoising CRASHED: {e}. Falling back to raw.")
        else:
            print(f"[Audit] AudioEnhancer not found. Falling back to raw.")

        print(f"[Audit] Using audio for silence detection: {audio_for_detection}")
        # -----------------------------------

        # 3. Detect Silences
        print(f"[Audit] Detecting silences in {audio_for_detection}...")
        silences_fine = detect_silences(audio_for_detection, ffmpeg_bin, noise_db=-40.0, min_dur=0.15)
        silences_coarse = detect_silences(audio_for_detection, ffmpeg_bin, noise_db=-35.0, min_dur=0.25)
        print(f"[Audit] Found {len(silences_fine)} fine silences, {len(silences_coarse)} coarse silences.")

        # 4. Build Cut Plan
        cut_plan = build_plan(
            source=input_path,
            duration=duration,
            words=[],
            silences_coarse=silences_coarse,
            silences_fine=silences_fine,
            language="en",
            cut_fillers=False
        )

        # 5. Render tightened video
        output_video_path = os.path.join(output_dir, stem, f"{stem}_cut.mp4")
        os.makedirs(os.path.dirname(output_video_path), exist_ok=True)

        # PASSING BROLLS TO RENDERER
        # B-rolls is a list of {start, end, src, ...}
        render(
            ffmpeg=ffmpeg_bin,
            src=Path(input_path),
            dst=Path(output_video_path),
            keep=cut_plan.keep,
            speed=speed,
            audio_src=cleaned_audio_path,
            brolls=brolls
        )

        return {
            "success": True,
            "output_path": output_video_path,
            "cut_plan": {
                "source": cut_plan.source,
                "duration": cut_plan.duration,
                "keep": cut_plan.keep,
                "removed": [
                    {"kind": r.kind, "start": r.start, "end": r.end, "note": r.note}
                    for r in cut_plan.removed
                ]
            },
            "original_duration": duration
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python bridge.py <input_path> <output_dir>")
        sys.exit(1)

    brolls_data = None
    if len(sys.argv) > 3:
        try:
            brolls_data = json.loads(sys.argv[3])
        except:
            brolls_data = None

    res = process_video(sys.argv[1], sys.argv[2], brolls=brolls_data)
    print(json.dumps(res))
