import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryIssueTracker } from "../issue-tracker/memory-issue-tracker.js";
import { DEFAULT_TRIAGE_LABEL_MAP } from "../issue-tracker/labels.js";
import type { IssueDetail } from "../issue-tracker/types.js";
import {
  issuesAttention,
  issuesComment,
  issuesLabel,
  issuesList,
  issuesView,
} from "./issues.js";

function issue(partial: Partial<IssueDetail> & Pick<IssueDetail, "number" | "title">): IssueDetail {
  return {
    labels: [],
    authorLogin: "alice",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    body: "body",
    comments: [],
    ...partial,
  };
}

async function captureStdout(fn: () => Promise<void>): Promise<unknown> {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    await fn();
  } finally {
    process.stdout.write = orig;
  }
  return JSON.parse(chunks.join(""));
}

test("issues list --json uses the injected tracker", async () => {
  const tracker = new InMemoryIssueTracker().seed(
    issue({ number: 2, title: "later" }),
    issue({ number: 1, title: "first", labels: ["needs-triage"] }),
  );
  const payload = await captureStdout(() =>
    issuesList(
      { json: true, limit: 10 },
      { getBundle: async () => ({ tracker, labelMap: DEFAULT_TRIAGE_LABEL_MAP, cwd: "/tmp" }) },
    ),
  );
  assert.equal((payload as { ok: boolean }).ok, true);
  const data = (payload as { data: { count: number; issues: { number: number }[] } }).data;
  assert.equal(data.count, 2);
  assert.deepEqual(
    new Set(data.issues.map((i) => i.number)),
    new Set([1, 2]),
  );
});

test("issues view --json returns comments", async () => {
  const tracker = new InMemoryIssueTracker().seed(
    issue({
      number: 7,
      title: "need eyes",
      comments: [
        {
          id: "1",
          authorLogin: "bob",
          createdAt: "2026-01-02T00:00:00Z",
          body: "hello",
        },
      ],
    }),
  );
  const payload = (await captureStdout(() =>
    issuesView(
      "7",
      { json: true },
      { getBundle: async () => ({ tracker, labelMap: DEFAULT_TRIAGE_LABEL_MAP, cwd: "/tmp" }) },
    ),
  )) as { ok: boolean; data: IssueDetail };
  assert.equal(payload.ok, true);
  assert.equal(payload.data.number, 7);
  assert.equal(payload.data.comments[0]?.body, "hello");
});

test("issues attention --json buckets unlabeled and needs-triage", async () => {
  const tracker = new InMemoryIssueTracker().seed(
    issue({ number: 1, title: "no labels" }),
    issue({ number: 2, title: "triage me", labels: ["needs-triage"] }),
  );
  const payload = (await captureStdout(() =>
    issuesAttention(
      { json: true },
      { getBundle: async () => ({ tracker, labelMap: DEFAULT_TRIAGE_LABEL_MAP, cwd: "/tmp" }) },
    ),
  )) as {
    data: { buckets: { key: string; items: { number: number }[] }[] };
  };
  const unlabeled = payload.data.buckets.find((b) => b.key === "unlabeled");
  const triage = payload.data.buckets.find((b) => b.key === "needs_triage");
  assert.deepEqual(unlabeled?.items.map((i) => i.number), [1]);
  assert.deepEqual(triage?.items.map((i) => i.number), [2]);
});

test("issues comment --dry-run does not write", async () => {
  const tracker = new InMemoryIssueTracker().seed(issue({ number: 3, title: "x" }));
  const payload = (await captureStdout(() =>
    issuesComment("3", { json: true, dryRun: true, body: "draft note" }, {
      getBundle: async () => {
        throw new Error("bundle must not be created on dry-run");
      },
    }),
  )) as { data: { dryRun: boolean; body: string } };
  assert.equal(payload.data.dryRun, true);
  assert.equal(payload.data.body, "draft note");
  const still = await tracker.view(3);
  assert.equal(still.comments.length, 0);
});

test("issues label --dry-run previews add/remove", async () => {
  const payload = (await captureStdout(() =>
    issuesLabel("4", {
      json: true,
      dryRun: true,
      add: ["ready-for-agent"],
      remove: ["needs-triage"],
    }),
  )) as { data: { add: string[]; remove: string[]; dryRun: boolean } };
  assert.deepEqual(payload.data.add, ["ready-for-agent"]);
  assert.deepEqual(payload.data.remove, ["needs-triage"]);
  assert.equal(payload.data.dryRun, true);
});
