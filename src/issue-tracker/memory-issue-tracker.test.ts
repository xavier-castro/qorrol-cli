import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryIssueTracker } from "./memory-issue-tracker.js";
import { IssueTrackerError, type IssueDetail, type IssueComment } from "./types.js";

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

function makeIssueDetail(partial: {
  number: number;
  title?: string;
  labels?: string[];
  comments?: IssueComment[];
}): IssueDetail {
  return {
    number: partial.number,
    title: partial.title ?? `issue ${partial.number}`,
    labels: partial.labels ?? [],
    authorLogin: "reporter",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    body: "",
    comments: partial.comments ?? [],
  };
}

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

test("InMemoryIssueTracker.viewMany returns details in the requested order", async () => {
  const tracker = new InMemoryIssueTracker().seed(
    makeIssueDetail({ number: 1, title: "alpha", labels: ["needs-triage"] }),
    makeIssueDetail({ number: 2, title: "beta", labels: ["needs-info"] }),
    makeIssueDetail({ number: 3, title: "gamma", labels: [] }),
  );

  const details = await tracker.viewMany([3, 1, 2]);
  assert.deepEqual(
    details.map((d) => d.title),
    ["gamma", "alpha", "beta"],
  );
});

test("InMemoryIssueTracker.viewMany returns IssueDetail values with comments", async () => {
  const tracker = new InMemoryIssueTracker().seed(
    makeIssueDetail({
      number: 1,
      labels: ["needs-info"],
      comments: [
        {
          id: "c1",
          authorLogin: "maintainer",
          createdAt: "2026-01-05T00:00:00Z",
          body: "## Triage Notes\nNeed logs",
        },
        {
          id: "c2",
          authorLogin: "reporter",
          createdAt: "2026-01-06T00:00:00Z",
          body: "here are logs",
        },
      ],
    }),
  );

  const [d1] = await tracker.viewMany([1]);
  assert.equal(d1.number, 1);
  assert.equal(d1.comments.length, 2);
  assert.equal(d1.comments[1]!.body, "here are logs");
});

test("InMemoryIssueTracker.viewMany throws issue_not_found on unknown number", async () => {
  const tracker = new InMemoryIssueTracker().seed(makeIssueDetail({ number: 1 }));
  await assert.rejects(
    tracker.viewMany([1, 99]),
    (err: unknown) =>
      err instanceof IssueTrackerError && err.code === "issue_not_found",
  );
});

test("InMemoryIssueTracker.viewMany returns empty array when given no numbers", async () => {
  const tracker = new InMemoryIssueTracker().seed(makeIssueDetail({ number: 1 }));
  const details = await tracker.viewMany([]);
  assert.deepEqual(details, []);
});
