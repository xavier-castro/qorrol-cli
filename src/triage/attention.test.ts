import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TRIAGE_LABEL_MAP } from "../issue-tracker/labels.js";
import type { IssueDetail } from "../issue-tracker/types.js";
import {
  attentionBuckets,
  hasReporterActivitySinceTriageNotes,
  lastTriageNotesAt,
} from "./attention.js";

function issue(partial: Partial<IssueDetail> & Pick<IssueDetail, "number">): IssueDetail {
  return {
    title: "t",
    labels: [],
    authorLogin: "reporter",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    body: "",
    comments: [],
    ...partial,
  };
}

test("attentionBuckets: unlabeled and needs-triage", () => {
  const issues: IssueDetail[] = [
    issue({ number: 1, labels: [] }),
    issue({ number: 2, labels: ["needs-triage"], createdAt: "2026-01-02T00:00:00Z" }),
    issue({ number: 3, labels: ["ready-for-agent"] }),
  ];
  const report = attentionBuckets(issues, DEFAULT_TRIAGE_LABEL_MAP);
  assert.equal(report.buckets[0]!.items.length, 1);
  assert.equal(report.buckets[0]!.items[0]!.number, 1);
  assert.equal(report.buckets[1]!.items[0]!.number, 2);
  assert.equal(report.buckets[2]!.items.length, 0);
});

test("needs-info bucket requires reporter activity after triage notes", () => {
  const i = issue({
    number: 10,
    labels: ["needs-info"],
    comments: [
      {
        id: "1",
        authorLogin: "maintainer",
        createdAt: "2026-01-05T00:00:00Z",
        body: "## Triage Notes\n\nNeed logs",
      },
      {
        id: "2",
        authorLogin: "reporter",
        createdAt: "2026-01-06T00:00:00Z",
        body: "here are logs",
      },
    ],
  });
  assert.ok(hasReporterActivitySinceTriageNotes(i));
  const report = attentionBuckets([i], DEFAULT_TRIAGE_LABEL_MAP);
  assert.equal(report.buckets[2]!.items[0]!.number, 10);
});

test("needs-info without reporter reply after notes is excluded", () => {
  const i = issue({
    number: 11,
    labels: ["needs-info"],
    comments: [
      {
        id: "1",
        authorLogin: "maintainer",
        createdAt: "2026-01-05T00:00:00Z",
        body: "## Triage Notes\n\nNeed logs",
      },
    ],
  });
  const report = attentionBuckets([i], DEFAULT_TRIAGE_LABEL_MAP);
  assert.equal(report.buckets[2]!.items.length, 0);
});

test("lastTriageNotesAt picks latest notes comment", () => {
  const i = issue({
    number: 12,
    comments: [
      {
        id: "1",
        authorLogin: "bot",
        createdAt: "2026-01-01T00:00:00Z",
        body: "## Triage Notes\n\nv1",
      },
      {
        id: "2",
        authorLogin: "bot",
        createdAt: "2026-01-03T00:00:00Z",
        body: "## Triage Notes\n\nv2",
      },
    ],
  });
  assert.equal(lastTriageNotesAt(i), "2026-01-03T00:00:00Z");
});