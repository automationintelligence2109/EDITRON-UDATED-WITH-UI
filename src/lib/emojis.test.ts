import assert from "node:assert/strict";
import test from "node:test";
import { applyAutoEmojis } from "./emojis";
import { groupIntoCaptions } from "./transcription/processor";

test("transcription adds emojis by default without changing speech timings", () => {
  const words = [
    { word: "money", start: 0, end: 0.4 },
    { word: "matters", start: 0.4, end: 0.8 },
  ];
  const captions = groupIntoCaptions(words, 5);
  assert.match(captions[0].text, /^money \p{Extended_Pictographic}/u);
  assert.match(captions[0].text, /matters$/);
  assert.deepEqual(captions[0].words, words);
  assert.equal(captions[0].start, 0);
  assert.equal(captions[0].end, 0.8);
});

test("reapplying emojis to edited captions preserves existing emojis without duplicates", () => {
  const text = applyAutoEmojis("money matters");
  assert.equal(applyAutoEmojis(text), text);
  assert.equal(applyAutoEmojis("money 💰 matters"), "money 💰 matters");
});
