import assert from "node:assert/strict";
import test from "node:test";
import { supportedRecordingTypes } from "./export-recording";

test("keeps compatible formats available for fallback with audio", () => {
  assert.deepEqual(
    supportedRecordingTypes((mime) => mime === "video/mp4" || mime === "video/webm;codecs=vp8,opus", true),
    ["video/mp4", "video/webm;codecs=vp8,opus"],
  );
});

test("does not use audio-specific codecs for silent streams", () => {
  const formats = supportedRecordingTypes(() => true, false);
  assert.ok(formats.includes("video/webm;codecs=vp8"));
  assert.ok(formats.every((format) => !format.includes("opus")));
});
