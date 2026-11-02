"""Fast audio pass-through for the Cut Engine.

DeepFilterNet and librosa are intentionally not used.
Silence detection and transcription use the processed WAV directly.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def denoise_audio(input_wav: Path, output_wav: Path) -> Path:
    """
    Keep the extracted audio unchanged.

    The Cut Engine does not perform AI noise reduction here.
    This avoids loading DeepFilterNet or running expensive Python audio
    processing on the VPS.
    """
    input_wav = Path(input_wav)
    output_wav = Path(output_wav)

    output_wav.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(input_wav, output_wav)

    return output_wav
