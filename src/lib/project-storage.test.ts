import assert from "node:assert/strict";
import test from "node:test";
import { projectStorageConfigurationError } from "./project-storage";

test("reports missing PostgreSQL configuration instead of attempting a save", async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const response = projectStorageConfigurationError();
    assert.ok(response);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /DATABASE_URL/);
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
