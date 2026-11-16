import assert from "node:assert/strict";
import test from "node:test";
import type { BRollClip } from "./broll";
import {
  activeBrollAt,
  buildBrollWindows,
  chunkBrollWindows,
  isBrollImage,
  limitBrollWindows,
} from "./broll";

const clip = (id: string, start: number, end: number): BRollClip => ({
  id,
  windowId: id,
  start,
  end,
  source: "pexels",
  previewUrl: `https://example.com/${id}.mp4`,
  thumbnail: "",
  query: id,
});

test("chunks B-roll searches to the API request limit", () => {
  const items = Array.from({ length: 45 }, (_, index) => index);
  const batches = chunkBrollWindows(items);

  assert.deepEqual(batches.map((batch) => batch.length), [20, 20, 5]);
  assert.deepEqual(batches.flat(), items);
});

test("limits B-roll search windows evenly across the timeline", () => {
  const windows = Array.from({ length: 10 }, (_, index) => index);

  assert.deepEqual(limitBrollWindows(windows, 4), [0, 3, 6, 9]);
});

test("caps generated search windows to the supported video duration", () => {
  const segments = Array.from({ length: 360 }, (_, index) => ({
    id: `segment-${index}`,
    start: index * 10,
    end: index * 10 + 5,
    text: "healthy lifestyle",
  }));

  assert.equal(buildBrollWindows(segments, { videoDuration: 3_600 }).length, 180);
});

test("selects the most recently started clip when B-roll assignments overlap", () => {
  const earlier = clip("earlier", 2, 8);
  const later = clip("later", 5, 9);

  assert.equal(activeBrollAt([later, earlier], 6)?.id, "later");
  assert.equal(activeBrollAt([later, earlier], 3)?.id, "earlier");
  assert.equal(activeBrollAt([later, earlier], 9), null);
});

test("identifies uploaded images and honors explicit media types", () => {
  assert.equal(isBrollImage({ ...clip("photo", 0, 3), source: "user", sourceKey: "user/broll/photo.png" }), true);
  assert.equal(isBrollImage({ ...clip("video", 0, 3), source: "user", mediaType: "video", sourceKey: "user/broll/photo.png" }), false);
  assert.equal(isBrollImage({ ...clip("legacy-photo", 0, 3), source: "user" }), false);
});
