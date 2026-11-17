import assert from "node:assert/strict";
import test from "node:test";
import { brollBelongsToSegment, regroupCaptions } from "./caption-regroup";
import { projectSnapshotSchema } from "./project-state";
import { DEFAULT_STYLE, generateTXT, type CaptionSegment } from "./captions";
import type { BRollClip } from "./broll";

const captions: CaptionSegment[] = [
  {
    id: "one", start: 0, end: 2, text: "Hello money 💰",
    words: [{ word: "Hello", start: 0, end: 0.7 }, { word: "money", start: 0.7, end: 2 }],
  },
  {
    id: "two", start: 2, end: 4, text: "edited words here",
    words: [{ word: "old", start: 2, end: 4 }],
  },
];

const clip: BRollClip = {
  id: "clip", windowId: "direct-two", start: 2, end: 5, source: "user",
  previewUrl: "/clip.mp4", thumbnail: "/clip.jpg", query: "example",
};

test("regroups edited captions without retranscription and keeps emoji with its word", () => {
  const first = regroupCaptions(captions, [], 1).segments;
  assert.deepEqual(first.map((segment) => segment.text), ["Hello", "money 💰", "edited", "words", "here"]);
  assert.deepEqual(first.slice(0, 2).map(({ start, end }) => [start, end]), [[0, 0.7], [0.7, 2]]);
  assert.equal(first[2].start, 2);
  assert.equal(first[4].end, 4);
  assert.equal(generateTXT(first), "Hello money 💰 edited words here");
  assert.deepEqual(regroupCaptions(first, [], 3).segments.map((segment) => segment.text),
    ["Hello money 💰 edited", "words here"]);
});

test("keeps hidden words hidden and retains B-roll timing, assignment, and saved state", () => {
  const input = [captions[0], { ...captions[1], hidden: true }];
  const result = regroupCaptions(input, [clip], 3);
  assert.deepEqual(result.segments.map((segment) => [segment.text, !!segment.hidden]), [
    ["Hello money 💰", false], ["edited words here", true],
  ]);
  assert.equal(result.brolls[0].start, 2);
  assert.equal(result.brolls[0].end, 5);
  assert.ok(brollBelongsToSegment(result.brolls[0], result.segments[1]));
  const snapshot = projectSnapshotSchema.parse({
    sourceName: "clip.mp4", isAudio: false, segments: result.segments, style: DEFAULT_STYLE,
    brolls: result.brolls, aspectRatio: 16 / 9, wordsPerCaption: 3, autoEmojiEnabled: true,
  });
  const again = regroupCaptions(snapshot.segments, snapshot.brolls, 1);
  assert.ok(brollBelongsToSegment(again.brolls[0], again.segments[2]));
  assert.deepEqual(again.segments.map((segment) => !!segment.hidden), [false, false, true, true, true]);
});

test("retains empty caption segments and prevents identifier collisions", () => {
  const result = regroupCaptions([
    { id: "regroup-0", start: 0, end: 2, text: "one two" },
    { id: "empty", start: 2, end: 3, text: "", hidden: true },
  ], [{ ...clip, windowId: "direct-regroup-1" }], 1);
  assert.deepEqual(result.segments.map((segment) => segment.text), ["one", "two", ""]);
  assert.equal(result.segments[2].hidden, true);
  assert.equal(new Set(result.segments.map((segment) => segment.id)).size, 3);
  assert.equal(result.segments.some((segment) => brollBelongsToSegment(result.brolls[0], segment)), false);
  assert.throws(() => regroupCaptions([], [], 0), RangeError);
});

test("keeps anchors stable while automatic B-roll suggestions are still loading", () => {
  const result = regroupCaptions(captions, [], 3, new Set(["two"]));
  assert.deepEqual(result.segments.map((segment) => segment.text), [
    "Hello money 💰", "edited words here",
  ]);
  assert.equal(result.segments[1].id, "two");
});
