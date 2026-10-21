import os
import requests
from pathlib import Path
import shutil

def download_broll_assets(brolls, work_dir):
    """
    Downloads B-roll clips to a local directory for FFmpeg processing.
    Returns a map of {original_index: local_path}.
    """
    if not brolls:
        return {}

    os.makedirs(work_dir, exist_ok=True)
    local_map = {}

    for i, clip in enumerate(brolls):
        url = clip.get("previewUrl")
        if not url:
            continue

        try:
            # Use a simple filename based on index
            ext = ".mp4" # Default to mp4 for stock footage
            filename = f"broll_{i}{ext}"
            local_path = os.path.join(work_dir, filename)

            print(f"Downloading B-roll {i} from {url}...")
            response = requests.get(url, stream=True, timeout=15)
            response.raise_for_status()

            with open(local_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            local_map[i] = local_path
        except Exception as e:
            print(f"❌ Failed to download B-roll {i}: {e}")
            # We don't raise an exception here so the render can continue
            # using the main footage instead of crashing.

    return local_map

def cleanup_work_dir(work_dir):
    """Remove temporary assets after render."""
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
