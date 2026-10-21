#!/usr/bin/env python3
"""
CapGen transcription subprocess — called by Next.js /api/transcribe.

Usage:
    python3 transcribe.py <audio_or_video_file_path> [words_per_caption] [mode]

Outputs JSON to stdout:
    {"success": true, "captions": [...], "language": "en", "language_probability": 0.92, ...}

Uses faster-whisper with word_timestamps=True for real word-level timing.
- For video files (mp4, mov, mkv, webm): extracts audio to WAV via ffmpeg first
- For audio files (mp3, wav, m4a, ogg, aac): passes directly to whisper
Model: tiny (default) — fast on CPU, ~39MB. Override with WHISPER_MODEL_SIZE env var.
"""

import sys
import os
import json
import shutil
import subprocess
import tempfile
import traceback
import numpy as np

# --- NUMPY COMPATIBILITY PATCH ---
# This prevents the "AttributeError: module 'numpy' has no attribute 'long'"
# which occurs when using newer NumPy versions with older SciPy/NLTK.
try:
    legacy_types = ['long', 'ulong', 'longlong', 'uintc', 'ulong']
    for t in legacy_types:
        if not hasattr(np, t):
            setattr(np, t, np.int64 if 'long' in t else np.uint64)
except Exception:
    pass
# ---------------------------------

# New dependencies for Intelligence Layer
try:
    import librosa
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    # Download necessary NLTK data
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Limit threads to avoid sandbox CPU limits
os.environ.setdefault("OMP_NUM_THREADS", "1")

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg"}

# Map CapGen language codes to whisper language hints.
LANG_MAP = {
    "en": "en", "en-US": "en", "en-GB": "en", "en-IN": "en",
    "hi": "hi", "hinglish": "hi",
    "te": "te", "telugish": "te",
    "ta": "ta", "tanglish": "ta",
    "kn": "kn", "kannadish": "kn",
    "ml": "ml", "manglish": "ml",
    "bn": "bn", "bengalish": "bn",
    "pa": "pa", "punjabish": "pa",
    "gu": "gu", "gujaratish": "gu",
    "mr": "mr", "marathish": "mr",
    "or": "or", "odish": "or",
    "ur": "ur",
    "fr": "fr", "de": "de", "es": "es", "pt": "pt", "it": "it",
    "ru": "ru", "ja": "ja", "ko": "ko", "zh": "zh", "ar": "ar",
    "tr": "tr", "nl": "nl", "pl": "pl", "sv": "sv", "id": "id",
    "th": "th", "vi": "vi", "uk": "uk",
}

def extract_audio_to_wav(src_path: str, max_duration_sec: int = 180) -> str | None:
    """Extract audio from a video/audio file to a 16kHz mono WAV using ffmpeg."""
    if not shutil.which("ffmpeg"):
        return None
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out.close()
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", src_path,
                "-vn", "-ac", "1", "-ar", "16000",
                "-t", str(max_duration_sec),
                "-f", "wav",
                out.name,
            ],
            capture_output=True,
            timeout=90,
        )
        if result.returncode != 0 or not os.path.exists(out.name) or os.path.getsize(out.name) == 0:
            result2 = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", src_path,
                    "-vn", "-ac", "1", "-ar", "16000",
                    "-f", "wav",
                    out.name,
                ],
                capture_output=True,
                timeout=120,
            )
            if result2.returncode != 0 or not os.path.exists(out.name) or os.path.getsize(out.name) == 0:
                try: os.unlink(out.name)
                except OSError: pass
                return None
        return out.name
    except (subprocess.TimeoutExpired, Exception):
        try: os.unlink(out.name)
        except OSError: pass
        return None

def calculate_v_score(text: str, start: float, end: float, audio_path: str, full_audio_rms: float) -> float:
    """
    Calculate the Visual Importance Score (V_score) for a segment.
    Formula: (0.5 * TextWeight) + (0.3 * AudioEnergy) + (0.2 * InfoDensity)
    """
    if not NLTK_AVAILABLE:
        return 0.0

    # 1. Textual Weighting (0.0 to 1.0)
    try:
        tokens = word_tokenize(text.lower())
        if not tokens:
            text_weight = 0.0
        else:
            stop_words = set(stopwords.words('english'))
            score = 0
            # Simple weighting: Adjectives/Nouns > Others
            tagged = nltk.pos_tag(tokens)
            for word, tag in tagged:
                if word in stop_words:
                    continue
                if tag.startswith('JJ'): # Adjective
                    score += 3
                elif tag.startswith('NN'): # Noun
                    score += 2
                else:
                    score += 1
            # Normalize by length (capped at 1.0)
            text_weight = min(1.0, score / (len(tokens) * 2))
    except Exception:
        text_weight = 0.0

    # 2. Audio Energy Analysis (0.0 to 1.0)
    try:
        y, sr = librosa.load(audio_path, sr=16000)
        start_sample = int(start * sr)
        end_sample = int(end * sr)
        segment_audio = y[start_sample:end_sample]
        if len(segment_audio) == 0:
            audio_energy = 0.0
        else:
            rms = np.sqrt(np.mean(segment_audio**2))
            # Normalize relative to the mean of the full clip
            audio_energy = min(1.0, rms / (full_audio_rms + 1e-6))
    except Exception:
        audio_energy = 0.0

    # 3. Information Density (0.0 to 1.0)
    try:
        tokens = word_tokenize(text.lower())
        if not tokens:
            info_density = 0.0
        else:
            stop_words = set(stopwords.words('english'))
            content_words = [w for w in tokens if w not in stop_words]
            info_density = len(content_words) / len(tokens)
    except Exception:
        info_density = 0.0

    return round((0.5 * text_weight) + (0.3 * audio_energy) + (0.2 * info_density), 3)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: transcribe.py <file> [words_per_caption] [mode] [language]"}))
        sys.exit(1)

    media_path = sys.argv[1]
    if not os.path.exists(media_path):
        print(json.dumps({"success": False, "error": f"File not found: {media_path}"}))
        sys.exit(1)

    try:
        words_per_caption = int(sys.argv[2]) if len(sys.argv) > 2 else 6
        if words_per_caption < 1: words_per_caption = 1
    except (ValueError, TypeError):
        words_per_caption = 6

    mode = sys.argv[3] if len(sys.argv) > 3 else "transcribe"
    if mode not in ("transcribe", "translate"):
        mode = "transcribe"

    lang_arg = sys.argv[4] if len(sys.argv) > 4 else ""
    whisper_lang = LANG_MAP.get(lang_arg, None) if lang_arg else None

    model_size = os.environ.get("WHISPER_MODEL_SIZE", "small")
    beam_size = int(os.environ.get("WHISPER_BEAM_SIZE", "3"))

    ext = os.path.splitext(media_path)[1].lower()
    temp_wav = None
    whisper_input = media_path
    should_extract = ext in VIDEO_EXTS or ext not in {".wav"}
    if should_extract:
        temp_wav = extract_audio_to_wav(media_path)
        if temp_wav:
            whisper_input = temp_wav

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=1)

        transcribe_kwargs = {
            "beam_size": beam_size,
            "vad_filter": True,
            "word_timestamps": True,
            "task": mode,
        }
        if whisper_lang:
            transcribe_kwargs["language"] = whisper_lang

        segments, info = model.transcribe(whisper_input, **transcribe_kwargs)

        all_words = []
        for segment in segments:
            if segment.words:
                all_words.extend(segment.words)

        if not all_words:
            print(json.dumps({"success": False, "error": "No speech detected."}))
            sys.exit(0)

        # --- SMART SPLITTING LOGIC ---
        groups = []
        current_group = []
        CONJUNCTIONS = {"and", "but", "or", "because", "so", "yet", "for", "nor"}

        i = 0
        while i < len(all_words):
            current_group.append(all_words[i])
            if len(current_group) >= 2:
                best_split_idx = -1
                max_score = -1
                search_limit = min(i + 1, i + 12)
                for j in range(i, search_limit):
                    if j >= len(all_words): break
                    word_obj = all_words[j]
                    text = word_obj.word.strip().lower()
                    score = 0
                    if any(text.endswith(p) for p in (".", "!", "?")): score = 100
                    elif any(text.endswith(p) for p in (",", ";", ":")): score = 50
                    elif j + 1 < len(all_words):
                        gap = all_words[j+1].start - word_obj.end
                        if gap > 0.6: score = 40
                        elif gap > 0.3: score = 20
                    if j + 1 < len(all_words):
                        next_text = all_words[j+1].word.strip().lower()
                        if next_text in CONJUNCTIONS: score += 10
                    if score > max_score:
                        max_score = score
                        best_split_idx = j
                if len(current_group) >= words_per_caption or (max_score >= 100 and i >= 3):
                    groups.append(current_group)
                    current_group = []
                elif len(current_group) >= 12:
                    groups.append(current_group)
                    current_group = []
            i += 1
        if current_group:
            groups.append(current_group)

        # --- INTELLIGENCE LAYER: V-SCORE CALCULATION ---
        full_audio_rms = 0.0
        if temp_wav and NLTK_AVAILABLE:
            try:
                y_full, _ = librosa.load(temp_wav, sr=16000)
                full_audio_rms = np.sqrt(np.mean(y_full**2))
            except Exception:
                pass

        captions = []
        for i, group in enumerate(groups):
            start = round(group[0].start, 3)
            end = round(group[-1].end, 3)
            text = " ".join(w.word.strip() for w in group).strip()

            v_score = 0.0
            if temp_wav and NLTK_AVAILABLE:
                v_score = calculate_v_score(text, start, end, temp_wav, full_audio_rms)

            if v_score == 0:
                if i < 3: v_score += 0.4
                power_words = {"secret", "amazing", "shocking", "proven", "hack", "best", "worst", "incredible", "warning", "stop"}
                words = text.lower().split()
                if any(w in power_words for w in words): v_score += 0.3
                if 2 <= len(words) <= 5: v_score += 0.2
                v_score = round(min(1.0, v_score), 3)

            captions.append({
                "start": start,
                "end": end,
                "text": text,
                "v_score": v_score
            })

        result = {
            "success": True,
            "captions": captions,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "caption_count": len(captions),
            "word_count": len(all_words),
            "mode": mode,
            "model": model_size,
            "input_format": ext.lstrip(".") or "unknown",
            "audio_extracted": temp_wav is not None,
        }
        print(json.dumps(result))

    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
    finally:
        if temp_wav and os.path.exists(temp_wav):
            try: os.unlink(temp_wav)
            except OSError: pass

if __name__ == "__main__":
    main()
