import os
import subprocess
import json
import sys
from pathlib import Path

# Add the project root to sys.path
project_root = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Allow imports from this local Cut Engine folder
current_dir = os.path.dirname(os.path.abspath(__file__))

if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from audio import extract_wav_16k_mono, probe_duration
from silence import detect_silences
from plan import build_plan
from render import render
from deps import check_ffmpeg


def process_video(
    input_path: str,
    output_dir: str,
    preset: str = "talk",
    speed: float = 1.0,
    brolls: list = None,
):
    """
    Main entry point for the Cut Engine.

    Extracts audio with FFmpeg, detects silence with FFmpeg,
    builds a cut plan, and renders the tightened video.
    """

    try:
        # 0. Verify FFmpeg and FFprobe
        ffmpeg_bin, ffprobe_bin = check_ffmpeg()

        # 1. Setup workspace
        stem, _ = os.path.splitext(os.path.basename(input_path))

        work_dir = os.path.join(output_dir, stem, ".work")
        os.makedirs(work_dir, exist_ok=True)

        audio_path = os.path.join(work_dir, "audio_16k.wav")

        # 2. Extract audio with FFmpeg
        extract_wav_16k_mono(
            ffmpeg_bin,
            Path(input_path),
            Path(audio_path),
        )

        duration = probe_duration(
            ffprobe_bin,
            Path(input_path),
        )

        print(f"[Audit] Raw audio extracted to: {audio_path}")

        # 3. Use the extracted WAV directly.
        # AudioEnhancer, DeepFilterNet, librosa,
        # noisereduce, and soundfile are not used.
        audio_for_detection = Path(audio_path)

        print(
            f"[Audit] Using raw audio for silence detection: "
            f"{audio_for_detection}"
        )

        # 4. Detect silence with FFmpeg
        print(
            f"[Audit] Detecting silences in "
            f"{audio_for_detection}..."
        )

        silences_fine = detect_silences(
            audio_for_detection,
            ffmpeg_bin,
            noise_db=-40.0,
            min_dur=0.15,
        )

        silences_coarse = detect_silences(
            audio_for_detection,
            ffmpeg_bin,
            noise_db=-35.0,
            min_dur=0.25,
        )

        print(
            f"[Audit] Found {len(silences_fine)} fine silences "
            f"and {len(silences_coarse)} coarse silences."
        )

        # 5. Build the cut plan
        cut_plan = build_plan(
            source=input_path,
            duration=duration,
            words=[],
            silences_coarse=silences_coarse,
            silences_fine=silences_fine,
            language="en",
            cut_fillers=False,
        )

        # 6. Render the tightened video
        output_video_path = os.path.join(
            output_dir,
            stem,
            f"{stem}_cut.mp4",
        )

        os.makedirs(
            os.path.dirname(output_video_path),
            exist_ok=True,
        )

        render(
            ffmpeg=ffmpeg_bin,
            src=Path(input_path),
            dst=Path(output_video_path),
            keep=cut_plan.keep,
            speed=speed,
            audio_src=None,
            brolls=brolls,
        )

        return {
            "success": True,
            "output_path": output_video_path,
            "cut_plan": {
                "source": cut_plan.source,
                "duration": cut_plan.duration,
                "keep": cut_plan.keep,
                "removed": [
                    {
                        "kind": removed.kind,
                        "start": removed.start,
                        "end": removed.end,
                        "note": removed.note,
                    }
                    for removed in cut_plan.removed
                ],
            },
            "original_duration": duration,
        }

    except Exception as error:
        return {
            "success": False,
            "error": str(error),
        }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python bridge.py "
            "<input_path> <output_dir>"
        )
        sys.exit(1)

    brolls_data = None

    if len(sys.argv) > 3:
        try:
            brolls_data = json.loads(sys.argv[3])
        except Exception:
            brolls_data = None

    result = process_video(
        sys.argv[1],
        sys.argv[2],
        brolls=brolls_data,
    )

    print(json.dumps(result))
