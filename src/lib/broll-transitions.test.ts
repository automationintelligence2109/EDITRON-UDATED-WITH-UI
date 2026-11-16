import assert from "node:assert/strict";
import test from "node:test";
import type { BRollClip } from "./broll";
import {
  activeBrollTransitionAt,
  assignBrollTransitions,
  BROLL_TRANSITIONS,
  cycleBrollTransitions,
} from "./broll-transitions";

const clip: BRollClip = {
  id: "window-a-clip-a",
  windowId: "window-a",
  start: 5,
  end: 9,
  source: "pexels",
  previewUrl: "https://example.com/broll.mp4",
  thumbnail: "https://example.com/thumbnail.jpg",
  query: "test clip",
};

test("assigns two stable, distinct effects to each B-roll clip", () => {
  const assigned = assignBrollTransitions(clip);
  const reassigned = assignBrollTransitions({ ...assigned, start: 6, end: 10 });

  assert.equal(assigned.transitionIn, reassigned.transitionIn);
  assert.equal(assigned.transitionOut, reassigned.transitionOut);
  assert.notEqual(assigned.transitionIn, assigned.transitionOut);
});

test("cycles through every effect before repeating and keeps opening/closing effects distinct", () => {
  const clips = Array.from({ length: Math.ceil(BROLL_TRANSITIONS.length / 2) + 1 }, (_, index) => ({
    ...clip,
    id: `clip-${index}`,
    windowId: `window-${index}`,
    start: index * 10,
    end: index * 10 + 5,
    transitionIn: "fade",
    transitionOut: "slideleft",
  }));
  const assigned = cycleBrollTransitions(clips);
  const effectSequence = assigned.flatMap((item) => [
    item.transitionIn,
    item.transitionOut,
  ]);

  assert.deepEqual(
    effectSequence.slice(0, BROLL_TRANSITIONS.length),
    BROLL_TRANSITIONS.map((asset) => asset.id)
  );
  assert.equal(effectSequence[BROLL_TRANSITIONS.length], BROLL_TRANSITIONS[0].id);
  assert.ok(assigned.every((item) => item.transitionIn !== item.transitionOut));
});

test("preserves cycle assignments when B-roll timing changes", () => {
  const [assigned] = cycleBrollTransitions([clip]);
  const [moved] = cycleBrollTransitions([{ ...assigned, start: 6, end: 10 }]);

  assert.equal(moved.transitionOrder, assigned.transitionOrder);
  assert.equal(moved.transitionIn, assigned.transitionIn);
  assert.equal(moved.transitionOut, assigned.transitionOut);
});

test("keeps a B-roll slot's effects when its source clip is replaced", () => {
  const [assigned] = cycleBrollTransitions([clip]);
  const [replacement] = cycleBrollTransitions([
    {
      ...assigned,
      id: "replacement-clip",
      previewUrl: "https://example.com/replacement.mp4",
    },
  ]);

  assert.equal(replacement.transitionOrder, assigned.transitionOrder);
  assert.equal(replacement.transitionIn, assigned.transitionIn);
  assert.equal(replacement.transitionOut, assigned.transitionOut);
});

test("moves transition windows with B-roll timing edits", () => {
  const assigned = assignBrollTransitions(clip);
  const moved = { ...assigned, start: 6, end: 10 };

  assert.equal(activeBrollTransitionAt([assigned], 5)?.type, "in");
  assert.equal(activeBrollTransitionAt([moved], 5), null);
  assert.equal(activeBrollTransitionAt([moved], 6)?.type, "in");
});

test("keeps both transition windows under one second without cutting off their effects", () => {
  const assigned = assignBrollTransitions(clip);
  const transitionIn = activeBrollTransitionAt([assigned], assigned.start);
  const transitionOut = activeBrollTransitionAt([assigned], assigned.end);

  assert.ok(transitionIn);
  assert.ok(transitionOut);
  assert.ok(transitionIn.end - transitionIn.start <= 0.7);
  assert.ok(transitionOut.end - transitionOut.start <= 0.7);
  assert.ok(transitionIn.asset.duration > transitionIn.end - transitionIn.start);
  assert.ok(transitionOut.asset.duration > transitionOut.end - transitionOut.start);
});

test("keeps transitions valid for short clips and timeline boundaries", () => {
  const shortClip = assignBrollTransitions({ ...clip, start: 0, end: 0.2 });

  assert.equal(activeBrollTransitionAt([shortClip], 0, 0.2)?.type, "in");
  assert.equal(activeBrollTransitionAt([shortClip], 0.199, 0.2)?.type, "out");
  assert.equal(activeBrollTransitionAt([shortClip], 0.2, 0.2), null);
});
