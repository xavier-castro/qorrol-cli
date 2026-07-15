import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadTriageLabelMap, DEFAULT_TRIAGE_LABEL_MAP } from "./labels.js";

test("loadTriageLabelMap reads docs/agents/triage-labels.md in repo", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const map = await loadTriageLabelMap(repoRoot);
  assert.equal(map["needs-triage"], "needs-triage");
  assert.equal(map["ready-for-agent"], "ready-for-agent");
});

test("loadTriageLabelMap falls back when file missing", async () => {
  const map = await loadTriageLabelMap("/tmp/nonexistent-qorrol-cwd-xyz");
  assert.deepEqual(map, DEFAULT_TRIAGE_LABEL_MAP);
});