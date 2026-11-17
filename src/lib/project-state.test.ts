import assert from "node:assert/strict";
import test from "node:test";
import { projectSnapshotSchema } from "./project-state";

test("loads saved projects while dropping removed caption animation settings", () => {
  const result = projectSnapshotSchema.safeParse({
    sourceName: "clip.mp4",
    isAudio: false,
    segments: [{ id: "hidden", start: 0, end: 1, text: "Hello", hidden: true }],
    style: {
      fontFamily: "inter",
      fontSize: 24,
      textColor: "#FFFFFF",
      bgColor: "#000000",
      bgOpacity: 0,
      position: "bottom",
      bold: false,
      italic: false,
      uppercase: false,
      letterSpacing: 0,
      animation: "pop",
      animationSpeed: 1,
      posX: 0,
      posY: 0,
    },
    brolls: [],
    aspectRatio: 16 / 9,
    wordsPerCaption: 5,
    autoEmojiEnabled: false,
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal("animation" in result.data.style, false);
  assert.equal("animationSpeed" in result.data.style, false);
  assert.equal(result.data.segments[0].hidden, true);
});
