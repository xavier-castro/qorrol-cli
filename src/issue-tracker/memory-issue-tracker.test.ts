import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryIssueTracker } from "./memory-issue-tracker.js";
import type { IssueDetail } from "./types.js";

const sample: IssueDetail = {
  number: 7,
  title: "Bug",
  labels: ["needs-triage"],
  authorLogin: "alice",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  body: "broken",
  comments: [],
};

test("InMemoryIssueTracker list, view, setLabels, close", async () => {
  const tracker = new InMemoryIssueTracker().seed(sample);
  const list = await tracker.listOpen();
  assert.equal(list.length, 1);
  await tracker.setLabels(7, ["needs-info"], ["needs-triage"]);
  const viewed = await tracker.view(7);
  assert.ok(viewed.labels.includes("needs-info"));
  await tracker.close(7);
  assert.equal((await tracker.listOpen()).length, 0);
});