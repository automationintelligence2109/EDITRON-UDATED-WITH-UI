"""
Studio-Grade AI Noise Isolation for the Cut Engine.
Uses DeepFilterNet via direct script execution for maximum compatibility.
"""
from __future__ import annotations
import subprocess
import os
import sys
from pathlib import Path

def denoise_audio(input_wav: Path, output_wav: Path) -> Path:
    """
    Removes background noise using DeepFilterNet.
    Tries to use the pre-installed library, falling back to the manual script
    in the vendor folder, and finally to FFmpeg spectral denoising.
    """
    # 1. Define paths
    # In a production environment, this folder would be bundled in the project root
    df_folder = Path(r"C:\Users\Rishika\Downloads\DeepFilterNet-main\DeepFilterNet-main")
    enhance_script = df_folder / "DeepFilterNet" / "df" / "enhance.py"

    try:
        # STRATEGY A: Try using the installed 'deepfilter' library if available
        import df
        from df import enhance, init_df

        model, df_state, _ = init_df()
        # Note: enhance() returns the audio array, so we'd need to save it via soundfile
        # To keep it simple and consistent with the CLI, we use the subprocess method below.
        raise ImportError("Using CLI for consistency")

    except (ImportError, Exception):
        # STRATEGY B: Use the DeepFilterNet standalone script (The "FFmpeg-style" way)
        if enhance_script.exists():
            try:
                # We call the script using the current python binary
                # -m DeepFilterNet2 uses the latest, most accurate model
                result = subprocess.run(
                    [
                        sys.executable, str(enhance_script),
                        "-m", "DeepFilterNet2",
                        "-o", str(output_wav.parent),
                        str(input_wav)
                    ],
                    capture_output=True,
                    text=True,
                    check=True
                )

                # DeepFilterNet saves as <filename>_enhanced.wav
                enhanced_path = output_wav.parent / f"{input_wav.stem}_enhanced.wav"
                if enhanced_path.exists():
                    enhanced_path.replace(output_wav)
                    return output_wav

            except Exception as e:
                print(f"[Denoise] AI Script failed: {e}")

        # STRATEGY C: Final Fallback to FFmpeg (Ensures the app NEVER crashes)
        print("[Denoise] Using FFmpeg spectral fallback...")
        fallback_chain = "highpass=f=100,afftdn=nr=25:nf=-30,lowpass=f=8000"
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(input_wav),
                "-af", fallback_chain,
                "-ar", "16000",
                "-ac", "1",
                str(output_wav),
            ],
            capture_output=True,
            text=True,
            check=True
        )
        return output_wav
