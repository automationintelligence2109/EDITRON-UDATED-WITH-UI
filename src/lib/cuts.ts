/**
 * Logic for "Text-to-Cut" editing.
 * Converts the state of caption segments (deleted vs kept)
 * into a list of time ranges to be removed from the video.
 */

import type { CaptionSegment } from "./captions";

export type CutRange = {
  start: number;
  end: number;
};

/**
 * Identifies all time ranges that should be excised from the final render.
 * This looks for segments marked as `deleted: true`.
 */
export function compileCutList(segments: (CaptionSegment & { deleted?: boolean })[]): CutRange[] {
  const cuts: CutRange[] = [];

  // Filter for deleted segments
  const deletedSegments = segments.filter(s => s.deleted);

  for (const seg of deletedSegments) {
    cuts.push({
      start: seg.start,
      end: seg.end
    });
  }

  // Merge overlapping or contiguous cuts to optimize FFmpeg performance
  return mergeCuts(cuts);
}

function mergeCuts(cuts: CutRange[]): CutRange[] {
  if (cuts.length <= 1) return cuts;

  // Sort by start time
  const sorted = [...cuts].sort((a, b) => a.start - b.start);
  const merged: CutRange[] = [];

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If the next cut starts before or exactly when the current one ends, merge them
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Inverts the cutlist to get the "keep" ranges.
 * Useful for renderers that prefer knowing what to KEEP rather than what to REMOVE.
 */
export function getKeepRanges(totalDuration: number, cuts: CutRange[]): CutRange[] {
  const keeps: CutRange[] = [];
  let lastEnd = 0;

  for (const cut of cuts) {
    if (cut.start > lastEnd) {
      keeps.push({ start: lastEnd, end: cut.start });
    }
    lastEnd = Math.max(lastEnd, cut.end);
  }

  if (lastEnd < totalDuration) {
    keeps.push({ start: lastEnd, end: totalDuration });
  }

  return keeps;
}
