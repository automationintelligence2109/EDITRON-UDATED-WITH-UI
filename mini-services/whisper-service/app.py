"""
Editron Whisper Service — real word-timed transcription via faster-whisper.

Endpoints:
  POST /transcribe   — transcribe media (file or media_id), returns word-timed captions
  POST /upload_media — save media on select, return media_id + media_url
  GET  /media/<file> — serve media for playback
  GET  /download/<srt_id> — download generated SRT

Runs on port 5001 (hardcoded — gateway routes via ?XTransformPort=5001).
"""

import os
import re
import uuid
import mimetypes
from flask import Flask, request, send_file, send_from_directory, jsonify
from faster_whisper import WhisperModel

# -----------------------------
# SETTINGS
# -----------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(HERE, "media")
OUTPUT_DIR = os.path.join(HERE, "outputs")
os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# "small" = multilingual, ~244MB, good balance on CPU.
# Override with env var WHISPER_MODEL_SIZE=medium|large-v3|tiny|base
MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "tiny")
BEAM_SIZE = int(os.environ.get("WHISPER_BEAM_SIZE", "3"))

PORT = 5001

app = Flask(__name__)

print(f"[whisper-service] Loading faster-whisper model '{MODEL_SIZE}' (beam_size={BEAM_SIZE})...", flush=True)
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=1)
print(f"[whisper-service] Model '{MODEL_SIZE}' loaded.", flush=True)


# -----------------------------
# HELPERS
# -----------------------------
def format_timestamp(seconds):
    """Convert seconds into SRT timestamp format: HH:MM:SS,mmm"""
    milliseconds = int(round(seconds * 1000))
    hours = milliseconds // 3600000
    milliseconds %= 3600000
    minutes = milliseconds // 60000
    milliseconds %= 60000
    secs = milliseconds // 1000
    milliseconds %= 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def group_words_into_captions(words, words_per_caption):
    """Group a flat list of word objects into chunks of `words_per_caption` words."""
    groups = []
    current = []
    for w in words:
        current.append(w)
        if len(current) >= words_per_caption:
            groups.append(current)
            current = []
    if current:
        groups.append(current)
    return groups


def groups_to_captions(groups):
    """Convert word-groups into {start, end, text} (seconds as floats)."""
    captions = []
    for group in groups:
        captions.append({
            "start": round(group[0].start, 3),
            "end": round(group[-1].end, 3),
            "text": " ".join(w.word.strip() for w in group).strip(),
        })
    return captions


def captions_to_srt_text(captions):
    lines = []
    for i, cap in enumerate(captions, start=1):
        start = format_timestamp(cap["start"])
        end = format_timestamp(cap["end"])
        lines.append(f"{i}\n{start} --> {end}\n{cap['text']}\n")
    return "\n".join(lines) + "\n"


SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$")


def is_safe_filename(name):
    return bool(SAFE_ID_RE.match(name)) and "/" not in name and "\\" not in name


# -----------------------------
# API ROUTES
# -----------------------------
@app.route("/health")
def health():
    return jsonify({"ok": True, "model": MODEL_SIZE, "port": PORT})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        words_per_caption = int(request.form.get("words_per_caption", 8))
        if words_per_caption < 1:
            words_per_caption = 1
    except (ValueError, TypeError):
        words_per_caption = 8

    mode = request.form.get("mode", "transcribe")
    if mode not in ("transcribe", "translate"):
        mode = "transcribe"

    # Prefer an already-uploaded media_id; fall back to a fresh file upload.
    media_id = request.form.get("media_id", "").strip()

    if media_id and is_safe_filename(media_id) and os.path.exists(os.path.join(MEDIA_DIR, media_id)):
        media_filename = media_id
        media_path = os.path.join(MEDIA_DIR, media_filename)
    elif "file" in request.files and request.files["file"].filename != "":
        file = request.files["file"]
        file_id = uuid.uuid4().hex
        _, ext = os.path.splitext(file.filename)
        media_filename = f"{file_id}{ext}"
        media_path = os.path.join(MEDIA_DIR, media_filename)
        file.save(media_path)
    else:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        segments, info = model.transcribe(
            media_path,
            beam_size=BEAM_SIZE,
            vad_filter=True,
            word_timestamps=True,
            task=mode,
        )

        all_words = []
        for segment in segments:
            if segment.words:
                all_words.extend(segment.words)

        if not all_words:
            return jsonify({"error": "No speech detected in this file"}), 422

        groups = group_words_into_captions(all_words, words_per_caption)
        captions = groups_to_captions(groups)

        srt_id = uuid.uuid4().hex + ".srt"
        srt_path = os.path.join(OUTPUT_DIR, srt_id)
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(captions_to_srt_text(captions))

        return jsonify({
            "success": True,
            "media_id": media_filename,
            "media_url": f"/media/{media_filename}",
            "srt_id": srt_id,
            "captions": captions,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "caption_count": len(captions),
            "mode": mode,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/upload_media", methods=["POST"])
def upload_media():
    """Save a media file on selection so the dashboard can play it immediately."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    file_id = uuid.uuid4().hex
    _, ext = os.path.splitext(file.filename)
    media_filename = f"{file_id}{ext}"
    media_path = os.path.join(MEDIA_DIR, media_filename)
    file.save(media_path)

    return jsonify({
        "success": True,
        "media_id": media_filename,
        "media_url": f"/media/{media_filename}",
    })


@app.route("/media/<path:filename>")
def media(filename):
    if not is_safe_filename(filename):
        return jsonify({"error": "Invalid file id"}), 400
    path = os.path.join(MEDIA_DIR, filename)
    if not os.path.exists(path):
        return jsonify({"error": "File not found"}), 404
    mimetype, _ = mimetypes.guess_type(path)
    return send_from_directory(MEDIA_DIR, filename, mimetype=mimetype)


@app.route("/download/<srt_id>")
def download(srt_id):
    if not is_safe_filename(srt_id) or not srt_id.endswith(".srt"):
        return jsonify({"error": "Invalid file id"}), 400
    path = os.path.join(OUTPUT_DIR, srt_id)
    if not os.path.exists(path):
        return jsonify({"error": "File not found"}), 404
    return send_file(path, as_attachment=True, download_name="captions.srt")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=False)
