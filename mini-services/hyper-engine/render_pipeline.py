import json
import os
import requests
import subprocess
from assets import download_broll_assets, cleanup_work_dir
from audio_enhancer import AudioEnhancer
import bridge
from renderer import HyperRenderer
import sys
from pathlib import Path

# Import silence detection logic from the cut_engine
# Note: BASE_DIR is defined below, so this import needs to be after BASE_DIR definition
# Fix: Moved BASE_DIR definition up

# RELATIVE PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STYLE_REGISTRY = os.path.join(BASE_DIR, "styles.json")
WHISPER_SERVICE_URL = "http://localhost:5001"

# Now import from the cut_engine
sys.path.append(os.path.join(BASE_DIR, "..", "..", "src", "backend", "cut_engine"))
try:
    from silence import detect_silences
except ImportError:
    logger.error("Could not import detect_silences from cut_engine")

class HyperCaptionsPipeline:
    def __init__(self):
        self.bridge = bridge.HyperCaptionsBridge(styles_path=STYLE_REGISTRY)
        self.enhancer = AudioEnhancer()

    def run(self, video_path, style_id="pop-cinematic", output_path="output_final.mp4", brolls=None):
        print(f"🚀 Starting Pipeline for: {video_path}")
        work_dir = os.path.join(os.path.dirname(output_path), "temp_assets")

        try:
            # STEP 0: Download B-Roll Assets
            broll_render_data = []
            if brolls:
                print(f"📥 Downloading {len(brolls)} B-roll clips...")
                # assets.py download_broll_assets returns {index: path}
                broll_map = download_broll_assets(brolls, work_dir)

                # Create a timing-aware list for the renderer
                for i, broll in enumerate(brolls):
                    if i in broll_map:
                        broll_render_data.append({
                            "path": broll_map[i],
                            "start": broll.get("start", 0),
                            "end": broll.get("end", 0),
                            "trimStart": broll.get("trimStart", 0),
                            "trimEnd": broll.get("trimEnd", None),
                        })

            # STEP 1: Transcribe via CapGen Whisper Service
            print("📝 Transcribing audio...")
            try:
                with open(video_path, "rb") as f:
                    response = requests.post(
                        f"{WHISPER_SERVICE_URL}/transcribe",
                        files={"file": f},
                        data={"words_per_caption": 8}
                    )
                response.raise_for_status()
                data = response.json()
                captions = data["captions"]
            except Exception as e:
                print(f"❌ Transcription failed: {e}")
                return None

            # STEP 1.5: Automatic Noise Removal
            print("🔊 Cleaning audio background noise...")
            temp_audio_dir = os.path.join(work_dir, "cleaned_audio")
            cleaned_audio_path = self.enhancer.process_video_audio(video_path, temp_audio_dir)
            if not cleaned_audio_path:
                print("⚠️ Noise removal failed, proceeding with original audio.")
            else:
                print(f"✅ Audio cleaned: {cleaned_audio_path}")

            print(f"✅ Transcription complete. Found {len(captions)} segments.")

            # STEP 2: Synthesize Hyperframes Project
            print(f"🎨 Applying style: {style_id}...")
            project_data = self.bridge.synthesize(captions, style_id, brolls=brolls)

            # Save project in a local output folder
            output_dir = os.path.join(BASE_DIR, "outputs")
            os.makedirs(output_dir, exist_ok=True)

            project_filename = f"project_{os.path.basename(video_path).split('.')[0]}.json"
            project_path = os.path.join(output_dir, project_filename)

            with open(project_path, "w") as f:
                json.dump(project_data, f, indent=2)

            print(f"✅ Hyperframes project synthesized at: {project_path}")

            # STEP 3: Render Final Video
            print(f"🎬 Rendering final video with {len(broll_render_data)} B-roll cutaways...")
            renderer = HyperRenderer(output_path=output_path)
            success = renderer.render(video_path, broll_render_data, project_data=project_data, audio_path=cleaned_audio_path if 'cleaned_audio_path' in locals() else None)

            if success:
                print(f"✨ SUCCESS! Your market-ready video is rendered to: {output_path}")
                return output_path
            else:
                print(f"❌ Rendering failed.")
                return None

        except Exception as e:
            print(f"❌ Pipeline failed: {e}")
            return None
        finally:
            cleanup_work_dir(work_dir)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python render_pipeline.py <video_path> <style_id>")
    else:
        pipeline = HyperCaptionsPipeline()
        pipeline.run(sys.argv[1], style_id=sys.argv[2])
