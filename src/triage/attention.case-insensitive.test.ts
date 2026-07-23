// Regression for case-sensitivity in lastTriageNotesAt. AGENTS.md documents
// the marker as case-insensitive, so any case ("TRIAGE NOTES", "Triage Notes",
// "triage notes") must match.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lastTriageNotesAt } from "./attention.js";
import type { IssueDetail } from "../issue-tracker/types.js";

test("lastTriageNotesAt is case-insensitive per AGENTS.md", () => {
  const i: IssueDetail = {
    number: 99,
    title: "uppercase notes",
    labels: ["needs-info"],
    authorLogin: "reporter",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    body: "",
    comments: [
      {
        id: "1",
        authorLogin: "bot",
        createdAt: "2026-01-05T00:00:00Z",
        body: "## TRIAGE NOTES\n\nNeed logs",
      },
    ],
  };
  assert.equal(lastTriageNotesAt(i), "2026-01-05T00:00:00Z");
});

test("lastTriageNotesAt matches Mixed Case too", () => {
  const i: IssueDetail = {
    number: 100,
    title: "mixed case",
    labels: ["needs-info"],
    authorLogin: "reporter",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    body: "",
    comments: [
      {
        id: "1",
        authorLogin: "bot",
        createdAt: "2026-01-06T00:00:00Z",
        body: "## Triage NOTES\n\nlogs?",
      },
    ],
  };
  assert.equal(lastTriageNotesAt(i), "2026-01-06T00:00:00Z");
});
