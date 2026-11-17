import type { BRollClip } from "./broll";
import type { CaptionSegment, WordTimestamp } from "./captions";

type CaptionUnit = {
  segment: CaptionSegment;
  words: WordTimestamp[];
  start: number;
  end: number;
  firstInSegment: boolean;
};

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\uFE0F|\u200D)+$/u;

export function brollBelongsToSegment(clip: BRollClip, segment: CaptionSegment): boolean {
  if (clip.segmentId) return clip.segmentId === segment.id;
  return clip.windowId === `w-${segment.start.toFixed(1)}` ||
    clip.windowId === `direct-${segment.id}` ||
    clip.windowId === `manual-${segment.id}` ||
    clip.windowId === `user-upload-${segment.id}` ||
    clip.windowId === `auto-${segment.id}`;
}

function captionUnits(segment: CaptionSegment): CaptionUnit[] {
  const tokens = segment.text.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return [{ segment, words: [], start: segment.start, end: segment.end, firstInSegment: true }];
  }

  const groups: string[][] = [];
  for (const token of tokens) {
    if (EMOJI_ONLY.test(token) && groups.length) {
      groups[groups.length - 1].push(token);
    } else {
      groups.push([token]);
    }
  }

  const timedWords = segment.words;
  const hasTokenTimings = timedWords?.length === tokens.length &&
    timedWords.every((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start);
  const hasGroupTimings = timedWords?.length === groups.length &&
    timedWords.every((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start);
  let tokenIndex = 0;
  return groups.map((group, index) => {
    const fallbackStart = segment.start + ((segment.end - segment.start) * index) / groups.length;
    const fallbackEnd = segment.start + ((segment.end - segment.start) * (index + 1)) / groups.length;
    const timing = hasTokenTimings ? timedWords[tokenIndex] : hasGroupTimings ? timedWords[index] : null;
    const wordStart = timing?.start ?? fallbackStart;
    const wordEnd = timing?.end ?? fallbackEnd;
    const words = group.map((word, groupIndex) => {
      const current = hasTokenTimings ? timedWords[tokenIndex + groupIndex] : timing;
      return { word, start: current?.start ?? wordStart, end: current?.end ?? wordEnd };
    });
    tokenIndex += group.length;
    return {
      segment,
      words,
      start: index === 0 ? segment.start : wordStart,
      end: index === groups.length - 1 ? segment.end : words[words.length - 1].end,
      firstInSegment: index === 0,
    };
  });
}

export function regroupCaptions(
  segments: CaptionSegment[],
  brolls: BRollClip[],
  wordsPerCaption: number,
  pendingBrollSegmentIds: ReadonlySet<string> = new Set(),
): { segments: CaptionSegment[]; brolls: BRollClip[] } {
  if (!Number.isInteger(wordsPerCaption) || wordsPerCaption < 1 || wordsPerCaption > 12) {
    throw new RangeError("Words per caption must be an integer between 1 and 12.");
  }

  const anchoredClips = new Map<string, BRollClip[]>();
  for (const clip of brolls) {
    const segment = segments.find((candidate) => brollBelongsToSegment(clip, candidate));
    if (segment) anchoredClips.set(segment.id, [...(anchoredClips.get(segment.id) ?? []), clip]);
  }

  const reservedIds = new Set(segments.map((segment) => segment.id));
  for (const clip of brolls) {
    if (clip.segmentId) reservedIds.add(clip.segmentId);
    for (const prefix of ["direct-", "manual-", "user-upload-", "auto-"]) {
      if (clip.windowId.startsWith(prefix)) reservedIds.add(clip.windowId.slice(prefix.length));
    }
  }
  const usedIds = new Set<string>();
  const newClipSegments = new Map<BRollClip, string>();
  const result: CaptionSegment[] = [];
  let pending: CaptionUnit[] = [];
  let nextId = 0;

  const flush = () => {
    if (!pending.length) return;
    const first = pending[0];
    let id = first.segment.id;
    if (usedIds.has(id)) {
      do { id = `regroup-${nextId++}`; } while (reservedIds.has(id) || usedIds.has(id));
    }
    usedIds.add(id);
    const words = pending.flatMap((unit) => unit.words);
    result.push({
      id,
      start: first.start,
      end: pending[pending.length - 1].end,
      text: words.map((word) => word.word).join(" "),
      words,
      ...(first.segment.hidden ? { hidden: true } : {}),
    });
    for (const unit of pending) {
      if (unit.firstInSegment) {
        for (const clip of anchoredClips.get(unit.segment.id) ?? []) {
          newClipSegments.set(clip, id);
        }
      }
    }
    pending = [];
  };

  for (const segment of segments) {
    for (const unit of captionUnits(segment)) {
      const hiddenChanged = pending.length > 0 && !!pending[0].segment.hidden !== !!segment.hidden;
      const startsAnchor = unit.firstInSegment &&
        (anchoredClips.has(segment.id) || pendingBrollSegmentIds.has(segment.id));
      if (pending.length && (hiddenChanged || startsAnchor || !unit.words.length || pending.length >= wordsPerCaption)) {
        flush();
      }
      pending.push(unit);
      if (!unit.words.length) flush();
    }
  }
  flush();

  return {
    segments: result,
    brolls: brolls.map((clip) => {
      const segmentId = newClipSegments.get(clip);
      return segmentId ? { ...clip, segmentId } : clip;
    }),
  };
}
