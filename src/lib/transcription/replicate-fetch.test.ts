import assert from "node:assert/strict";
import test from "node:test";
import Replicate from "replicate";
import { createReplicateFetch, isReplicateRateLimitError } from "./replicate-fetch";

test("waits for the provider's retry delay on a prediction rate limit", async () => {
  const waits: number[] = [];
  const response = new Response(JSON.stringify({ retry_after: 2 }), { status: 429 });
  const wrapped = createReplicateFetch(async () => response, async (ms) => { waits.push(ms); });
  assert.equal(await wrapped("https://api.replicate.com/v1/predictions", { method: "POST" }), response);
  assert.deepEqual(waits, [2000]);
});

test("uses Retry-After and caps the wait", async () => {
  const waits: number[] = [];
  const response = new Response(null, { status: 429, headers: { "Retry-After": "100" } });
  const wrapped = createReplicateFetch(async () => response, async (ms) => { waits.push(ms); });
  await wrapped("https://api.replicate.com/v1/models/owner/name/predictions", { method: "POST" });
  assert.deepEqual(waits, [60000]);
});

test("does not delay unrelated requests or non-rate-limit failures", async () => {
  const waits: number[] = [];
  const wrapped = createReplicateFetch(async (_input, init) =>
    new Response(null, { status: init?.method === "POST" ? 500 : 429 }),
  async (ms) => { waits.push(ms); });
  await wrapped("https://api.replicate.com/v1/predictions", { method: "GET" });
  await wrapped("https://api.replicate.com/v1/predictions", { method: "POST" });
  assert.deepEqual(waits, []);
});

test("recognizes provider rate-limit errors without exposing other errors", () => {
  const limited = Object.assign(new Error("provider error"), { response: new Response(null, { status: 429 }) });
  assert.equal(isReplicateRateLimitError(limited), true);
  assert.equal(isReplicateRateLimitError(new Error("other error")), false);
});

test("the Replicate SDK retries a throttled prediction after the delay", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const client = new Replicate({
    auth: "test-token",
    fetch: createReplicateFetch(async () => {
      attempts++;
      return attempts === 1
        ? new Response(JSON.stringify({ retry_after: 1 }), { status: 429 })
        : new Response(JSON.stringify({ status: "succeeded", output: { text: "done" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
    }, async (ms) => { waits.push(ms); }),
  });
  assert.deepEqual(await client.run("owner/model:version", { input: {} }), { text: "done" });
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [1000]);
});
