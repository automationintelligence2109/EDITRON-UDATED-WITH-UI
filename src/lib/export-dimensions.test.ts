import assert from "node:assert/strict";
import test from "node:test";
import { getExportDimensions } from "./export-dimensions";

test("uses standard 1080p and 4K dimensions in both orientations", () => {
  assert.deepEqual(getExportDimensions(1920, 1080, "1080p"), { width: 1920, height: 1080 });
  assert.deepEqual(getExportDimensions(1080, 1920, "4k"), { width: 2160, height: 3840 });
  assert.deepEqual(getExportDimensions(1280, 720, "4k"), { width: 3840, height: 2160 });
});

test("fits square and nonstandard ratios within the quality box", () => {
  assert.deepEqual(getExportDimensions(1000, 1000, "4k"), { width: 2160, height: 2160 });
  assert.deepEqual(getExportDimensions(2560, 1080, "1080p"), { width: 1920, height: 810 });
  assert.deepEqual(getExportDimensions(1000, 2000, "720p"), { width: 640, height: 1280 });
  assert.throws(() => getExportDimensions(0, 1080, "4k"), /valid dimensions/);
});

test("keeps diverse aspect ratios within the 4K bounds and encoder-compatible", () => {
  for (const [width, height] of [[4000, 3000], [3000, 4000], [3840, 1600], [1000, 1000]]) {
    const result = getExportDimensions(width, height, "4k");
    const maxWidth = width >= height ? 3840 : 2160;
    const maxHeight = width >= height ? 2160 : 3840;
    assert.ok(result.width <= maxWidth && result.height <= maxHeight);
    assert.equal(result.width % 2, 0);
    assert.equal(result.height % 2, 0);
    assert.ok(Math.abs(result.width / result.height - width / height) < 0.002);
  }
});
