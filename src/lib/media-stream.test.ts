import assert from "node:assert/strict";
import test from "node:test";
import { getUserR2Prefix } from "./r2";
import { streamUserMedia } from "./media-stream";

const userId = "test-user";
const sourceKey = `${getUserR2Prefix(userId)}source/video.mp4`;
const request = (key: string, range?: string) => new Request(
  `http://localhost/api/media?key=${encodeURIComponent(key)}`,
  { headers: range ? { Range: range } : undefined },
);

test("streams owned source media and forwards byte ranges", async () => {
  let receivedRange: string | undefined;
  const response = await streamUserMedia(request(sourceKey, "bytes=2-4"), userId, async (key, range) => {
    assert.equal(key, sourceKey);
    receivedRange = range;
    return {
      body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([2, 3, 4])); controller.close(); } }),
      contentType: "video/mp4",
      contentLength: 3,
      contentRange: "bytes 2-4/10",
    };
  });
  assert.equal(receivedRange, "bytes=2-4");
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2, 3, 4]);
});

test("rejects unauthenticated, foreign and invalid media requests", async () => {
  const unavailable = async () => { throw new Error("Storage must not be accessed."); };
  assert.equal((await streamUserMedia(request(sourceKey), null, unavailable)).status, 401);
  assert.equal((await streamUserMedia(request(sourceKey), "other-user", unavailable)).status, 404);
  assert.equal((await streamUserMedia(request(`${getUserR2Prefix(userId)}source/../secret`), userId, unavailable)).status, 404);
  assert.equal((await streamUserMedia(request(sourceKey, "bytes=0-1,4-5"), userId, unavailable)).status, 416);
});

test("streams owned B-roll images without a range", async () => {
  const key = `${getUserR2Prefix(userId)}broll/photo.png`;
  const response = await streamUserMedia(request(key), userId, async (requestedKey, range) => {
    assert.equal(requestedKey, key);
    assert.equal(range, undefined);
    return {
      body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } }),
      contentType: "image/png",
      contentLength: 1,
    };
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
