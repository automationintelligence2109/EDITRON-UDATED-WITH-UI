"""FFmpeg render: speed -> cut -> fade -> audio chain."""
from __future__ import annotations

import random
import subprocess
import sys
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
    preset: str = "veryfast",
    audio_bitrate: str = "160k",
    subtitles_path: Path | None = None,
    audio_src: Path | None = None,
    brolls: list[dict] | None = None,
) -> float:
    """Render the edited video using a faster CPU encoding preset."""

    transition_dir = Path(
        r"C:\Users\Rishika\Downloads\Sargam Transition Part-2-20261007T144710Z-1-001\Sargam Transition Part-2"
    )
    transition_files = []

    # Only scan for transitions when B-rolls are actually being used.
    if brolls:
        transition_files = list(transition_dir.glob("*.mov"))
        transition_files += list(transition_dir.glob("*.mp4"))

    inputs = [str(src)]

    if audio_src:
        inputs.append(str(audio_src))

    broll_data_map = []

    if brolls:
        for broll in brolls:
            src_path = broll.get("src")

            if not src_path:
                continue

            inputs.append(src_path)
            broll_idx = len(inputs) - 1

            t_in_path = (
                random.choice(transition_files)
                if transition_files
                else None
            )
            t_out_path = (
                random.choice(transition_files)
                if transition_files
                else None
            )

            t_in_idx = None
            if t_in_path:
                inputs.append(str(t_in_path))
                t_in_idx = len(inputs) - 1

            t_out_idx = None
            if t_out_path:
                inputs.append(str(t_out_path))
                t_out_idx = len(inputs) - 1

            broll_data_map.append(
                {
                    "clip_idx": broll_idx,
                    "t_in_idx": t_in_idx,
                    "t_out_idx": t_out_idx,
                    "start": broll.get("start", 0),
                    "end": broll.get("end", 0),
                }
            )

    parts: list[str] = []
    n = len(keep)
    v_idx = 0
    a_idx = 1 if audio_src else 0

    if n == 0:
        raise ValueError("Cut plan contains no video segments")

    if abs(speed - 1.0) < 1e-6:
        parts.append(
            f"[{v_idx}:v]split={n}"
            + "".join(f"[vs{i}]" for i in range(n))
        )
        parts.append(
            f"[{a_idx}:a]asplit={n}"
            + "".join(f"[as{i}]" for i in range(n))
        )
    else:
        parts.append(
            f"[{v_idx}:v]setpts=PTS/{speed},split={n}"
            + "".join(f"[vs{i}]" for i in range(n))
        )
        parts.append(
            f"[{a_idx}:a]atempo={speed},asplit={n}"
            + "".join(f"[as{i}]" for i in range(n))
        )

    labels: list[str] = []

    for i, (start, end) in enumerate(keep):
        duration = end - start
        fade_duration = min(fade, duration / 3)

        parts.append(
            f"[vs{i}]trim=start={start:.3f}:end={end:.3f},"
            f"setpts=PTS-STARTPTS[v{i}]"
        )

        parts.append(
            f"[as{i}]atrim=start={start:.3f}:end={end:.3f},"
            f"asetpts=PTS-STARTPTS,"
            f"afade=t=in:curve=tri:st=0:d={fade_duration:.3f},"
            f"afade=t=out:curve=tri:"
            f"st={duration - fade_duration:.3f}:"
            f"d={fade_duration:.3f}[a{i}]"
        )

        labels.append(f"[v{i}][a{i}]")

    concat = "".join(labels) + f"concat=n={n}:v=1:a=1[vc][ac]"
    filter_complex = ";".join(parts + [concat])

    current_video = "[vc]"

    if broll_data_map:
        overlay_filters = []
        video_stream = "[vc]"

        for i, broll in enumerate(broll_data_map):
            overlay_filters.append(
                f"[{video_stream}][{broll['clip_idx']}:v]"
                f"overlay=enable='between(t,{broll['start']},{broll['end']})'"
                f"[v_br{i}]"
            )
            video_stream = f"[v_br{i}]"

            if broll["t_in_idx"] is not None:
                overlay_filters.append(
                    f"[{video_stream}][{broll['t_in_idx']}:v]"
                    f"overlay=enable='between(t,{broll['start']},"
                    f"{broll['start'] + 0.5})'[v_ti{i}]"
                )
                video_stream = f"[v_ti{i}]"

            if broll["t_out_idx"] is not None:
                overlay_filters.append(
                    f"[{video_stream}][{broll['t_out_idx']}:v]"
                    f"overlay=enable='between(t,{broll['end'] - 0.5},"
                    f"{broll['end']})'[v_to{i}]"
                )
                video_stream = f"[v_to{i}]"

        filter_complex += ";" + ";".join(overlay_filters)
        current_video = video_stream

    audio_chain = [f"{current_video}null[vout]"]
    del audio_chain

    audio_parts = [f"[ac]highpass=f={highpass_hz}"]

    if compressor_ratio > 1.0:
        audio_parts.append(
            f"acompressor=threshold={compressor_threshold_db}dB:"
            f"ratio={compressor_ratio}:attack=10:release=200:makeup=2"
        )

    if deess_db < 0:
        audio_parts.append(
            f"equalizer=f=6500:t=q:w=3:g={deess_db}"
        )

    audio_parts.append(
        f"loudnorm=I={loudnorm_i}:TP={loudnorm_tp}:LRA=11"
    )
    audio_parts.append("[aout]")

    filter_complex += ";" + ",".join(audio_parts)

    if subtitles_path:
        subtitle_value = str(subtitles_path).replace("\\", "/")
        subtitle_value = subtitle_value.replace(":", r"\:")
        filter_complex += (
            f";{current_video}subtitles='{subtitle_value}'"
            ":force_style='Alignment=2,Fontname=Arial,"
            "Fontsize=18,PrimaryColour=&H00FFFF,"
            "OutlineColour=&H00000000,BorderStyle=3'[vout]"
        )
        video_map = "[vout]"
    else:
        video_map = current_video

    command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]

    for input_file in inputs:
        command.extend(["-i", input_file])

    command.extend(
        [
            "-filter_complex",
            filter_complex,
            "-map",
            video_map,
            "-map",
            "[aout]",
            "-c:v",
            "libx264",
            "-preset",
            preset,
            "-crf",
            str(crf),
            "-threads",
            "0",
            "-c:a",
            "aac",
            "-b:a",
            audio_bitrate,
            "-movflags",
            "+faststart",
            str(dst),
        ]
    )

    result = subprocess.run(
        command,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        text=True,
    )

    if result.returncode != 0:
        sys.stderr.write(result.stderr[-4000:])
        raise RuntimeError("ffmpeg render failed")

    ffprobe = ffmpeg.replace("ffmpeg", "ffprobe")
    output_duration = subprocess.check_output(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(dst),
        ],
        text=True,
    ).strip()

    return float(output_duration)
