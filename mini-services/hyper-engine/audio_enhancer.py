import os
import subprocess
import logging
from pathlib import Path
import librosa
import soundfile as sf
import noisereduce as nr
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AudioEnhancer")

class AudioEnhancer:
    def __init__(self):
        logger.info("AudioEnhancer initialized with Hybrid-Pro settings")

    def extract_audio(self, video_path, output_wav):
        logger.info(f"Extracting audio from {video_path}...")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "44100", "-ac", "1",
            output_wav
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to extract audio: {e}")
            return False

    def enhance_audio(self, input_wav, output_wav):
        try:
            logger.info(f"Enhancing audio in {input_wav}...")
            audio, sr = librosa.load(input_wav, sr=None)

            # 1. GENTLE Noise Reduction (prevents robotic sound)
            # prop_decrease=0.6 means we leave some natural floor to keep the voice human
            reduced_noise = nr.reduce_noise(y=audio, sr=sr, stationary=True, prop_decrease=0.6)

            # 2. PROFESSIONAL GAIN (Volume Boost)
            # Normalize to -1dB to make it loud and commercial
            max_val = np.max(np.abs(reduced_noise))
            if max_val > 0:
                reduced_noise = reduced_noise * (0.89 / max_val)

            sf.write(output_wav, reduced_noise, sr)
            logger.info(f"✅ Enhancement complete: {output_wav}")
            return True
        except Exception as e:
            logger.error(f"Enhancement failed: {e}")
            return False

    def process_video_audio(self, video_path, output_folder):
        video_name = Path(video_path).stem
        temp_wav = os.path.join(output_folder, f"{video_name}_raw.wav")
        cleaned_wav = os.path.join(output_folder, f"{video_name}_cleaned.wav")
        os.makedirs(output_folder, exist_ok=True)

        if self.extract_audio(video_path, temp_wav):
            if self.enhance_audio(temp_wav, cleaned_wav):
                if os.path.exists(temp_wav):
                    os.remove(temp_wav)
                return cleaned_wav
        return None
