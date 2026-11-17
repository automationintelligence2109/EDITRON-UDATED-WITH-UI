import assert from "node:assert/strict";
import test from "node:test";
import { hasUnsavedWorkspaceWork, parseWorkspaceSession } from "./workspace-session";

test("restores the current page and only reopens projects in the editor", () => {
  assert.deepEqual(parseWorkspaceSession('{"page":"editor","projectId":"project-1"}'),
    { page: "editor", projectId: "project-1" });
  assert.deepEqual(parseWorkspaceSession('{"page":"projects","projectId":"project-1"}'),
    { page: "projects", projectId: null });
  assert.equal(parseWorkspaceSession('{"page":"unknown"}'), null);
});

test("warns before refresh for uploads, processing and unsaved or failed saves", () => {
  assert.equal(hasUnsavedWorkspaceWork("uploading", true, false, "idle"), true);
  assert.equal(hasUnsavedWorkspaceWork("transcribing", true, false, "idle"), true);
  assert.equal(hasUnsavedWorkspaceWork("idle", true, false, "idle"), true);
  assert.equal(hasUnsavedWorkspaceWork("done", false, true, "saving"), true);
  assert.equal(hasUnsavedWorkspaceWork("done", false, true, "error"), true);
  assert.equal(hasUnsavedWorkspaceWork("done", false, true, "saved"), false);
  assert.equal(hasUnsavedWorkspaceWork("idle", false, false, "idle"), false);
});
