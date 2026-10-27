import modal
import os

# 1. Define the exact isolated container environment
app = modal.App("editron-whisper-worker")

whisper_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg") # Crucial for processing video/audio files
    .pip_install("faster-whisper")
)

@app.function(
    image=whisper_image,
    gpu="T4",               # High-performance, budget-friendly Nvidia GPU
    timeout=600,            # 10-minute safety wall per video execution
    allow_concurrent_inputs=10
)
@modal.web_endpoint(method="POST") # Turns this script into a secure web url
def transcribe_video(data: dict):
    """
    Expects JSON: { "video_url": "https://..." }
    Returns: Word-level timestamp JSON array
    """
    video_url = data.get("video_url")
    if not video_url:
        return {"error": "Missing video_url"}, 400
        
    from faster_whisper import WhisperModel
    
    # Load model directly into GPU memory
    model = WhisperModel("small", device="cuda", compute_type="float16")
    
    # Run faster-whisper directly over the Cloudflare R2 file link
    segments, info = model.transcribe(
        video_url, 
        beam_size=5, 
        word_timestamps=True, # Generates exact word timings for captions
        vad_filter=True        # Strips out long dead silences automatically
    )
    
    output_segments = []
    for segment in segments:
        for word in segment.words:
            output_segments.append({
                "word": word.word.strip(),
                "start": round(word.start, 2),
                "end": round(word.end, 2),
                "probability": round(word.probability, 2)
            })
            
    return {"language": info.language, "words": output_segments}
