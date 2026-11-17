import assert from "node:assert/strict";
import test from "node:test";
import {
  getActiveWordIndex,
  getCaptionWordRenderState,
  getCaptionWords,
  activeSegmentIndex,
  generateSRT,
  generateVTT,
  generateTXT,
  layoutCaptionWords,
  type CaptionSegment,
} from "./captions";

const segment: CaptionSegment = {
  id: "caption-1",
  start: 1,
  end: 3,
  text: "Hello there",
  words: [
    { word: "Hello", start: 1, end: 1.8 },
    { word: "there", start: 1.8, end: 3 },
  ],
};

test("uses Whisper word timestamps and falls back to even timing for older captions", () => {
  assert.deepEqual(getCaptionWords(segment), segment.words);
  assert.deepEqual(getCaptionWords({ ...segment, words: undefined }), [
    { word: "Hello", start: 1, end: 2 },
    { word: "there", start: 2, end: 3 },
  ]);
});

test("finds the active word at word boundaries", () => {
  const words = getCaptionWords(segment);
  assert.equal(getActiveWordIndex(words, 1.79), 0);
  assert.equal(getActiveWordIndex(words, 1.8), 1);
});

test("keeps the previous caption visible across tiny transcription timing gaps", () => {
  const captions: CaptionSegment[] = [
    { id: "first", start: 0, end: 1, text: "First caption" },
    { id: "second", start: 1.18, end: 2, text: "Second caption" },
  ];

  assert.equal(activeSegmentIndex(captions, 1.1), 0);
  assert.equal(activeSegmentIndex(captions, 1.18), 1);

  captions[1].start = 1.4;
  assert.equal(activeSegmentIndex(captions, 1.1), -1);
});

test("hidden captions stay out of preview timing and text exports", () => {
  const captions: CaptionSegment[] = [
    { id: "first", start: 0, end: 1, text: "Visible" },
    { id: "second", start: 1.1, end: 2, text: "Hidden", hidden: true },
    { id: "third", start: 2.1, end: 3, text: "Restored", hidden: false },
  ];

  assert.equal(activeSegmentIndex(captions, 1.5), -1);
  assert.equal(activeSegmentIndex(captions, 2.05), -1);
  assert.equal(activeSegmentIndex(captions, 2.5), 2);
  assert.equal(generateTXT(captions), "Visible Restored");
  assert.doesNotMatch(generateSRT(captions), /Hidden/);
  assert.match(generateSRT(captions), /2\n00:00:02,100/);
  assert.doesNotMatch(generateVTT(captions), /Hidden/);
});

test("applies the cubic blur reveal to each spoken word", () => {
  const word = segment.words![0];
  const state = getCaptionWordRenderState("blur-reveal", word, 0, 0, 1.09);

  assert.ok(Math.abs(state.opacity - 0.875) < 0.001);
  assert.ok(Math.abs(state.blur - 1) < 0.001);
});

test("dims unspoken karaoke words and gives the active word a restrained scale", () => {
  const words = getCaptionWords(segment);
  const future = getCaptionWordRenderState("karaoke-dim", words[1], 1, 0, 1.5);
  const active = getCaptionWordRenderState("karaoke-dim", words[0], 0, 0, 1.08);
  const settled = getCaptionWordRenderState("karaoke-dim", words[0], 0, 0, 1.7);

  assert.equal(future.opacity, 0.38);
  assert.ok(active.opacity > 0.38 && active.opacity <= 1);
  assert.ok(active.scale > 1 && active.scale <= 1.04);
  assert.equal(settled.opacity, 1);
  assert.equal(settled.scale, 1.04);
});

test("lays out measured words on centered lines", () => {
  const words = getCaptionWords(segment);
  const layout = layoutCaptionWords(words, 70, 20, (word) => word.length * 10, 10);

  assert.equal(layout.words.length, 2);
  assert.equal(layout.words[0].centerY, -11);
  assert.equal(layout.words[1].centerY, 11);
  assert.equal(layout.width, 50);
});
