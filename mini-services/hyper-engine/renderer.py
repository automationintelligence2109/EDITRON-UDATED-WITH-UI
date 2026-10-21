import subprocess
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HyperRenderer")

class HyperRenderer:
    def __init__(self, output_path="output_final.mp4"):
        self.output_path = output_path

    def get_video_info(self, video_path):
        """
        Uses ffprobe to get width and height of the source video.
        """
        cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "json", video_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            width = data["streams"][0]["width"]
            height = data["streams"][0]["height"]
            return width, height
        except Exception as e:
            logger.error(f"Failed to get video info: {e}")
            return 1080, 1920  # Default fallback

    def render(self, video_path, broll_data, project_data=None, max_duration=4.0, audio_path=None):
        """
        Renders the final video by overlaying B-roll cutaways and captions on the main video.
        """
        width, height = self.get_video_info(video_path)
        logger.info(f"Source resolution: {width}x{height}")

        # 1. Inputs
        inputs = ["-i", video_path]

        if audio_path and os.path.exists(audio_path):
            logger.info(f"Using enhanced audio from: {audio_path}")
            inputs.extend(["-i", audio_path]) # Index 1
            BROLL_START_IDX = 2
            main_a = "[1:a]"
        else:
            BROLL_START_IDX = 1
            main_a = "[0:a]"

        for clip in broll_data:
            inputs.extend(["-i", clip['path']])

        # 2. Filter Complex
        filter_complex = []
        main_v = "[0:v]"

        # Handle cuts in main video if provided
        if project_data and 'cuts' in project_data and project_data['cuts']:
            cuts = project_data['cuts']
            select_expr = " * ".join([f"not(between(t,{c['start']},{c['end']}))" for c in cuts])
            filter_complex.append(f"{main_v}select='{select_expr}',setpts=PTS-STARTPTS[v_cut]")
            main_v = "[v_cut]"

        # Process B-roll clips: scale and crop only (No transitions)
        for i in range(len(broll_data)):
            br_idx = i + BROLL_START_IDX
            trim_start = broll_data[i].get('trimStart', 0)
            duration = broll_data[i]['end'] - broll_data[i]['start']

            filter_complex.append(
                f"[{br_idx}:v]trim=start={trim_start}:duration={duration},setpts=PTS-STARTPTS,scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1[br{i}]"
            )

        # Overlay B-roll clips on top of the main video
        current_v = main_v
        for i, clip in enumerate(broll_data):
            start = clip['start']
            duration = clip['end'] - clip['start']
            next_v = f"[v_ov{i}]"
            filter_complex.append(
                f"{current_v}[br{i}]overlay=x=0:y=0:enable='between(t,{start},{start + duration})'{next_v}"
            )
            current_v = next_v

        # Overlay Captions from project_data
        if project_data and 'composition' in project_data:
            elements = project_data['composition'].get('elements', [])
            for i, el in enumerate(elements):
                if el.get('type') == 'text':
                    text = el.get('content', '').replace("'", "\\'")
                    start = el['timing'].get('start', 0)
                    end = el['timing'].get('end', 0)
                    style = el.get('style', {})

                    # Simple mapping of JSON styles to FFmpeg drawtext
                    # In a real hyper-engine, we would use a font file, here we use system default or a placeholder
                    font_color = style.get('color', 'white')
                    font_size = style.get('fontSize', 72)

                    # We use x=(w-text_w)/2 and y=H-200 for centered bottom captions
                    caption_filter = (
                        f"drawtext=text='{text}':x=(w-text_w)/2:y=h-400:"
                        f"fontsize={font_size}:fontcolor={font_color}:"
                        f"enable='between(t,{start},{end})'"
                    )

                    next_v = f"[cap{i}]"
                    filter_complex.append(f"{current_v}{caption_filter}{next_v}")
                    current_v = next_v

        # Final FFmpeg command
        cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", ";".join(filter_complex),
            "-map", current_v,
            "-map", main_a,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            self.output_path
        ]


        logger.info(f"Executing FFmpeg command: {' '.join(cmd)}")
        return self.execute_ffmpeg(cmd)

    def execute_ffmpeg(self, cmd):
        try:
            subprocess.run(cmd, check=True)
            logger.info(f"Successfully rendered to {self.output_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed: {e}")
            return False
