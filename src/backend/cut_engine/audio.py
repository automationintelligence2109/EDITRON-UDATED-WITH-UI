"""Audio extraction helpers."""
from __future__ import annotations
import subprocess
from pathlib import Path


def extract_wav_16k_mono(ffmpeg: str, src: Path, dst: Path) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le",
        str(dst),
    ])
    return dst


def probe_duration(ffprobe: str, src: Path) -> float:
    out = subprocess.check_output([
        ffprobe, "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1",
        str(src),
    ], text=True).strip()
    return float(out)


def profile_noise_floor(ffmpeg: str, wav: Path) -> float:
    """Analyze audio to find the baseline noise floor using astats filter."""
    out = subprocess.run([
        ffmpeg, "-hide_banner", "-loglevel", "error",
        "-i", str(wav),
        "-af", "astats=metadata=1",
        "-f", "null", "-",
    ], stderr=subprocess.PIPE, text=True)

    # Look for 'Noise floor dB' in the output
    for line in out.stderr.splitlines():
        if "Noise floor dB" in line:
            # Line format: "RMS level dB: -45.23" or "Noise floor dB: -50.12"
            parts = line.split(":")
            if len(parts) > 1:
                try:
                    return float(parts[1].strip().split(" ")[0])
                except ValueError:
                    continue

    return -35.0  # Fallback default
