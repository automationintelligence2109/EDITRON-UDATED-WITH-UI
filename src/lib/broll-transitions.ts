import type { BRollClip } from "./broll";

type TransitionAsset = {
  id: string;
  src: string;
  duration: number;
};

const MAX_TRANSITION_DURATION = 0.7;

const transitionFiles: Array<[string, number]> = [
  ["1.mp4", 2.28],
  ["2.mp4", 1.48],
  ["3.mp4", 1.56],
  ["4.mp4", 1.96],
  ["5.mp4", 1.88],
  ["6.mp4", 1.44],
  ["7.mp4", 1.76],
  ["8.mp4", 1.32],
  ["9.mp4", 1.96],
  ["10.mp4", 1.28],
  ["11.mp4", 1.4],
  ["12.mp4", 1.76],
  ["13.mp4", 1.12],
  ["14.mp4", 1.8],
  ["15.mp4", 1.52],
  ["16.mp4", 1.8],
  ["17.mp4", 0.96],
  ["18.mp4", 1],
  ["19.mp4", 1.04],
  ["20.mp4", 1.48],
  ["21.mp4", 1.12],
  ["Analog Burn.mp4", 1.48],
  ["Celluloid Blaze.mp4", 1.2],
  ["Cinematic Scorch.mp4", 1.28],
  ["Classic Burn.mp4", 2],
  ["Film Noir Fade.mp4", 1.56],
  ["Filmstrip Flare.mp4", 1.32],
  ["Frame Fuse.mp4", 1.24],
  ["Projector Flare.mp4", 1.32],
  ["Projector Glow.mp4", 1.48],
  ["Reel Ignition.mp4", 1.52],
  ["Retro Melt.mp4", 1.32],
  ["Vintage Flicker.mp4", 1.4],
];

export const BROLL_TRANSITIONS: readonly TransitionAsset[] = transitionFiles.map(
  ([fileName, duration]) => {
    const id = fileName.slice(0, -4);
    return {
      id,
      src: `/transitions/${encodeURIComponent(fileName)}`,
      duration,
    };
  }
);

export type BrollTransitionType = "in" | "out";

export type ActiveBrollTransition = {
  key: string;
  brollId: string;
  type: BrollTransitionType;
  asset: TransitionAsset;
  start: number;
  end: number;
  progress: number;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isKnownTransition(id: string | undefined): id is string {
  return !!id && BROLL_TRANSITIONS.some((asset) => asset.id === id);
}

export function assignBrollTransitionOrder(clip: BRollClip, order: number): BRollClip {
  const transitionOrder = Number.isSafeInteger(order) && order >= 0 ? order : 0;
  const inIndex = ((transitionOrder % BROLL_TRANSITIONS.length) * 2) % BROLL_TRANSITIONS.length;
  const outIndex = (inIndex + 1) % BROLL_TRANSITIONS.length;

  return {
    ...clip,
    transitionIn: BROLL_TRANSITIONS[inIndex].id,
    transitionOut: BROLL_TRANSITIONS[outIndex].id,
    transitionOrder,
  };
}

export function cycleBrollTransitions(clips: BRollClip[]): BRollClip[] {
  const validOrders = clips
    .map((clip) => clip.transitionOrder)
    .filter(
      (order): order is number =>
        typeof order === "number" && Number.isSafeInteger(order) && order >= 0
    );
  const usedOrders = new Set<number>();
  let nextOrder = validOrders.length ? Math.max(...validOrders) + 1 : 0;

  return clips.map((clip) => {
    let order = clip.transitionOrder;
    if (
      typeof order !== "number" ||
      !Number.isSafeInteger(order) ||
      order < 0 ||
      usedOrders.has(order)
    ) {
      while (usedOrders.has(nextOrder)) nextOrder++;
      order = nextOrder++;
    }

    usedOrders.add(order);
    return assignBrollTransitionOrder(clip, order);
  });
}

export function assignBrollTransitions(clip: BRollClip): BRollClip {
  if (Number.isSafeInteger(clip.transitionOrder) && (clip.transitionOrder ?? -1) >= 0) {
    return assignBrollTransitionOrder(clip, clip.transitionOrder ?? 0);
  }

  const defaultIndex = hashString(clip.id) % BROLL_TRANSITIONS.length;
  const defaultIn = BROLL_TRANSITIONS[defaultIndex];
  const defaultOut = BROLL_TRANSITIONS[(defaultIndex + 1) % BROLL_TRANSITIONS.length];

  const transitionIn = isKnownTransition(clip.transitionIn)
    ? clip.transitionIn
    : defaultIn.id;
  const transitionOut =
    isKnownTransition(clip.transitionOut) && clip.transitionOut !== transitionIn
      ? clip.transitionOut
      : defaultOut.id === transitionIn
        ? BROLL_TRANSITIONS[(defaultIndex + 2) % BROLL_TRANSITIONS.length].id
        : defaultOut.id;

  if (clip.transitionIn === transitionIn && clip.transitionOut === transitionOut) {
    return clip;
  }

  return { ...clip, transitionIn, transitionOut };
}

function getTransitionWindow(
  clip: BRollClip,
  type: BrollTransitionType,
  totalDuration: number
): Omit<ActiveBrollTransition, "progress"> | null {
  const timelineDuration =
    Number.isFinite(totalDuration) && totalDuration >= 0
      ? totalDuration
      : Number.POSITIVE_INFINITY;
  const assignedClip = assignBrollTransitions(clip);
  const assetId = type === "in" ? assignedClip.transitionIn : assignedClip.transitionOut;
  const asset = BROLL_TRANSITIONS.find((candidate) => candidate.id === assetId);
  if (!asset || !Number.isFinite(clip.start) || !Number.isFinite(clip.end) || clip.end <= clip.start) {
    return null;
  }

  const inAsset = BROLL_TRANSITIONS.find((candidate) => candidate.id === assignedClip.transitionIn);
  const outAsset = BROLL_TRANSITIONS.find((candidate) => candidate.id === assignedClip.transitionOut);
  if (!inAsset || !outAsset) return null;

  const clipDuration = clip.end - clip.start;
  const inDuration = Math.min(inAsset.duration, MAX_TRANSITION_DURATION);
  const outDuration = Math.min(outAsset.duration, MAX_TRANSITION_DURATION);
  const scale = Math.min(1, (2 * clipDuration) / (inDuration + outDuration));
  const duration = Math.min(asset.duration, MAX_TRANSITION_DURATION) * scale;
  const boundary = type === "in" ? clip.start : clip.end;
  const start = Math.max(0, boundary - duration / 2);
  const end = Math.min(timelineDuration, boundary + duration / 2);
  if (end <= start) return null;

  return {
    key: `${clip.id}:${type}:${asset.id}`,
    brollId: clip.id,
    type,
    asset,
    start,
    end,
  };
}

export function activeBrollTransitionAt(
  clips: BRollClip[],
  time: number,
  totalDuration = Number.POSITIVE_INFINITY
): ActiveBrollTransition | null {
  for (const clip of clips) {
    for (const type of ["in", "out"] as const) {
      const window = getTransitionWindow(clip, type, totalDuration);
      if (window && time >= window.start && time < window.end) {
        return {
          ...window,
          progress: (time - window.start) / (window.end - window.start),
        };
      }
    }
  }
  return null;
}
