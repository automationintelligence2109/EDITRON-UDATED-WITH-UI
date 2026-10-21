"""Build cut plan from transcript + silences + optional LLM redundancy ranges."""
from __future__ import annotations
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path

from silence import snap


FILLER_PATTERNS = {
    "en": r"^(um|uh|uhm|er|ah)[,.!?]?$",
    "de": r"^(äh|ähm|öh|öhm|hm)[,.!?]?$",
}


@dataclass
class Removal:
    kind: str        # "redundancy" | "filler" | "pause"
    start: float
    end: float
    note: str = ""


@dataclass
class CutPlan:
    source: str
    duration: float
    keep: list[tuple[float, float]]
    removed: list[Removal]

    def total_removed(self) -> float:
        return sum(r.end - r.start for r in self.removed)

    def write(self, path: Path):
        path.write_text(json.dumps({
            "source":   self.source,
            "duration": self.duration,
            "keep":     self.keep,
            "removed":  [asdict(r) for r in self.removed],
        }, indent=2))


def build_plan(
    *,
    source: str,
    duration: float,
    words: list[dict],
    silences_coarse: list[tuple[float, float]],   # -35dB, 0.25s
    silences_fine:   list[tuple[float, float]],   # -40dB, 0.15s
    language: str = "en",
    redundancy_ranges: list[tuple[float, float, str]] | None = None,
    protect_ranges: list[tuple[float, float]] | None = None,
    pause_trim_narrator_above: float = 0.35,
    pause_trim_narrator_keep:  float = 0.20,
    pause_trim_protected_above: float = 0.6,
    pause_trim_protected_keep:  float = 0.30,
    cut_fillers: bool = True,
    filler_pad: float = 0.06,
    min_keep: float = 0.10,
) -> CutPlan:
    protect_ranges = protect_ranges or []
    redundancy_ranges = redundancy_ranges or []

    def in_protected(s: float, e: float) -> bool:
        return any(s >= ps and e <= pe for ps, pe in protect_ranges)

    # Market-Level Padding Constants
    # We use different padding based on whether it's a start or end of a word
    PAD_PRE = 0.040
    PAD_POST = 0.120

    removals: list[Removal] = []

    # 1) Redundancy blocks (skip inside protected ranges)
    for s, e, note in redundancy_ranges:
        if in_protected(s, e):
            continue
        removals.append(Removal(
            kind="redundancy",
            start=snap(s, silences_coarse, words=words),
            end=snap(e, silences_coarse, words=words),
            note=note,
        ))

    # 2) Filler words (skip inside protected)
    if cut_fillers:
        rx = re.compile(FILLER_PATTERNS.get(language, FILLER_PATTERNS["en"]), re.I)
        for i, w in enumerate(words):
            if not rx.match(w["word"]):
                continue

            is_end_of_thought = False
            if any(char in w["word"] for char in ".!?"):
                is_end_of_thought = True
            elif i > 0 and any(char in words[i-1]["word"] for char in ".!?"):
                is_end_of_thought = True

            current_pad = 0.200 if is_end_of_thought else PAD_POST

            # We snap the filler start/end to the closest silence or word boundary
            # to prevent clicking sounds.
            s = snap(w["startTime"] - PAD_PRE, silences_fine, words=words, window=0.12)
            e = snap(w["endTime"]   + current_pad, silences_fine, words=words, window=0.12)
            if in_protected(s, e):
                continue
            removals.append(Removal(kind="filler", start=s, end=e, note=w["word"]))

    # 3) Narrator pauses - BRUTAL MODE
    for s, e in silences_fine:
        dur = e - s
        # Lowered threshold: cut almost every gap above 0.15s
        if dur <= 0.15: continue
        if in_protected(s, e): continue

        prev_word = next((w["word"] for w in reversed(words) if w["endTime"] <= s + 0.1), "")
        is_end_of_thought = any(char in prev_word for char in ".!?")

        # Extremely tight keep values for that robotic, fast-paced feel
        keep_s = 0.100 if is_end_of_thought else 0.050

        mid = (s + e) / 2
        rs, re_ = mid - (dur - keep_s) / 2, mid + (dur - keep_s) / 2

        # Tight snap to word boundaries
        rs = snap(rs, silences_fine, words=words)
        re_ = snap(re_, silences_fine, words=words)

        removals.append(Removal(kind="pause", start=rs, end=re_, note=f"{dur:.2f}s"))

    # 4) Protected-block pauses
    for s, e in silences_coarse:
        if not in_protected(s, e): continue
        dur = e - s
        if dur <= pause_trim_protected_above: continue
        keep_s = pause_trim_protected_keep
        mid = (s + e) / 2
        rs, re_ = mid - (dur - keep_s) / 2, mid + (dur - keep_s) / 2
        removals.append(Removal(kind="pause", start=rs, end=re_, note=f"{dur:.2f}s (protected)"))

    # Merge overlapping removals
    removals.sort(key=lambda r: r.start)
    merged: list[Removal] = []
    for r in removals:
        if merged and r.start <= merged[-1].end + 0.02:
            prev = merged[-1]
            prev.end = max(prev.end, r.end)
            if r.kind not in prev.kind:
                prev.kind = f"{prev.kind}+{r.kind}"
        else:
            merged.append(r)

    # Invert → keep
    keep: list[tuple[float, float]] = []
    cursor = 0.0
    for r in merged:
        if r.start > cursor:
            keep.append((cursor, r.start))
        cursor = max(cursor, r.end)
    if cursor < duration:
        keep.append((cursor, duration))
    keep = [(s, e) for s, e in keep if e - s >= min_keep]

    return CutPlan(source=source, duration=duration, keep=keep, removed=merged)
