"""ffmpeg render: speed → cut → fade → audio chain."""
from __future__ import annotations
import subprocess
import sys
import random
import os
from pathlib import Path

def render(
    *,
    ffmpeg: str,
    src: Path,
    dst: Path,
    keep: list[tuple[float, float]],
    speed: float = 1.0,
    fade: float = 0.040,
    highpass_hz: int = 80,
    compressor_threshold_db: float = -22.0,
    compressor_ratio: float = 2.5,
    deess_db: float = -2.5,
    loudnorm_i: float = -16.0,
    loudnorm_tp: float = -1.5,
    crf: int = 20,
    preset: str = "medium",
    audio_bitrate: str = "160k",
    subtitles_path: Path | None = None,
    audio_src: Path | None = None,
    brolls: list[dict] | None = None,
) -> float:
    TRANSITIONS_DIR = Path(r"C:\Users\Rishika\Downloads\Sargam Transition Part-2-20261007T144710Z-1-001\Sargam Transition Part-2")
    transition_files = list(TRANSITIONS_DIR.glob("*.mov")) + list(TRANSITIONS_DIR.glob("*.mp4"))

    inputs = [str(src)]
    if audio_src:
        inputs.append(str(audio_src))

    # Prepare inputs for B-rolls and their transitions
    # Every B-roll needs: [B-roll clip, Transition In, Transition Out]
    broll_data_map = []
    if brolls:
        for broll in brolls:
            src_path = broll.get("src")
            if src_path:
                inputs.append(src_path)
                broll_idx = len(inputs) - 1

                # Assign random transitions
                t_in_path = random.choice(transition_files) if transition_files else None
                t_out_path = random.choice(transition_files) if transition_files else None

                # Add transition files as inputs
                t_in_idx = None
                if t_in_path:
                    inputs.append(str(t_in_path))
                    t_in_idx = len(inputs) - 1

                t_out_idx = None
                if t_out_path:
                    inputs.append(str(t_out_path))
                    t_out_idx = len(inputs) - 1

                broll_data_map.append({
                    "clip_idx": broll_idx,
                    "t_in_idx": t_in_idx,
                    "t_out_idx": t_out_idx,
                    "start": broll.get("start", 0),
                    "end": broll.get("end", 0)
                })

    parts: list[str] = []
    n = len(keep)
    v_idx = 0
    a_idx = 1 if audio_src else 0

    if abs(speed - 1.0) < 1e-6:
        parts.append(f"[{v_idx}:v]split={n}" + "".join(f"[vs{i}]" for i in range(n)))
        parts.append(f"[{a_idx}:a]asplit={n}" + "".join(f"[as{i}]" for i in range(n)))
    else:
        parts.append(f"[{v_idx}:v]setpts=PTS/{speed},split={n}" + "".join(f"[vs{i}]" for i in range(n)))
        parts.append(f"[{a_idx}:a]atempo={speed},asplit={n}" + "".join(f"[as{i}]" for i in range(n)))

    labels: list[str] = []
    for i, (s, e) in enumerate(keep):
        dur = e - s
        fd = min(fade, dur / 3)
        parts.append(f"[vs{i}]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[as{i}]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,afade=t=in:curve=tri:st=0:d={fd:.3f},afade=t=out:curve=tri:st={dur-fd:.3f}:d={fd:.3f}[a{i}]")
        labels.append(f"[v{i}][a{i}]")

    concat = "".join(labels) + f"concat=n={n}:v=1:a=1[vc][ac]"

    # APPLY TRANSITIONS AS OVERLAYS
    # We use the 'enable' parameter to show the transition only at specific timestamps
    current_v = "[vc]"
    if broll_data_map:
        for i, b in enumerate(broll_data_map):
            # Overlay the B-roll clip itself first
            current_v = f"[{current_v}][{b['clip_idx']}:v]overlay=enable='between(t,{b['start']},{b['end']})'[v_broll{i}]"
            current_v = f"[v_broll{i}]"

            # Overlay Transition In
            if b['t_in_idx'] is not None:
                # Assume transition is ~0.5s
                current_v = f"[{current_v}][{b['t_in_idx']}:v]overlay=enable='between(t,{b['start']},{b['start']+0.5})'[v_tin{i}]"
                current_v = f"[v_tin{i}]"

            # Overlay Transition Out
            if b['t_out_idx'] is not None:
                current_v = f"[{current_v}][{b['t_out_idx']}:v]overlay=enable='between(t,{b['end']-0.5},{b['end']})'[v_tout{i}]"
                current_v = f"[v_tout{i}]"
    else:
        current_v = "[vc]"

    # Audio chain
    audio_chain_parts = [f"[ac]highpass=f={highpass_hz}"]
    if compressor_ratio > 1.0:
        audio_chain_parts.append(f"acompressor=threshold={compressor_threshold_db}dB:ratio={compressor_ratio}:attack=10:release=200:makeup=2")
    if deess_db < 0:
        audio_chain_parts.append(f"equalizer=f=6500:t=q:w=3:g={deess_db}")
    audio_chain_parts.append(f"loudnorm=I={loudnorm_i}:TP={loudnorm_tp}:LRA=11")
    audio_post = ",".join(audio_chain_parts) + "[aout]"

    filter_complex = ";".join(parts + [concat])
    # Add the transition overlay chain
    if current_v != "[vc]":
        # We need to make sure the overlay chain is part of the filter_complex
        # The overlay chain is built using labels [v_out...]
        # We must add the actual overlay logic to the complex
        # Since I built current_v as a chain of overlays, I need to convert that to the complex string
        # Let's rebuild the overlay part properly
        overlay_filters = []
        v_stream = "[vc]"
        for i, b in enumerate(broll_data_map):
            # B-roll overlay
            overlay_filters.append(f"[{v_stream}][{b['clip_idx']}:v]overlay=enable='between(t,{b['start']},{b['end']})'[v_br{i}]")
            v_stream = f"[v_br{i}]"
            # Transition In
            if b['t_in_idx'] is not None:
                overlay_filters.append(f"[{v_stream}][{b['t_in_idx']}:v]overlay=enable='between(t,{b['start']},{b['start']+0.5})'[v_ti{i}]")
                v_stream = f"[v_ti{i}]"
            # Transition Out
            if b['t_out_idx'] is not None:
                overlay_filters.append(f"[{v_stream}][{b['t_out_idx']}:v]overlay=enable='between(t,{b['end']-0.5},{b['end']})'[v_to{i}]")
                v_stream = f"[v_to{i}]"

        filter_complex += ";" + ";".join(overlay_filters)
        v_map = v_stream
    else:
        v_map = "[vc]"

    # Subtitles
    if subtitles_path:
        path_str = str(subtitles_path).replace("\\", "/")
        if ":" in path_str: path_str = path_str.replace(":", ":\\")
        sub_filter = f"subtitles='{path_str}:force_style='Alignment=2,Fontname=Arial,Fontsize=18,PrimaryColour=&H00FFFF,OutlineColour=&H00000000,BorderStyle=3'"
        filter_complex += f";{v_map}{sub_filter}[vout]"
        v_map = "[vout]"

    filter_complex += f";{audio_post}"

    cmd = [ffmpeg, "-y", "-hide_banner"]
    for inp in inputs:
        cmd.extend(["-i", inp])

    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", v_map, "-map", "[aout]",
        "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
        "-c:a", "aac", "-b:a", audio_bitrate,
        "-movflags", "+faststart",
        str(dst),
    ])

    r = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:])
        raise RuntimeError("ffmpeg render failed")

    out = subprocess.check_output(
        [ffmpeg.replace("ffmpeg", "ffprobe"), "-v", "error",
         "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(dst)],
        text=True,
    ).strip()
    return float(out)
