import type { IssueTracker } from "../issue-tracker/interface.js";
import type { IssueDetail, IssueRecord, TriageLabelMap } from "../issue-tracker/types.js";

export interface AttentionItem {
  number: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttentionBucket {
  key: "unlabeled" | "needs_triage" | "needs_info_reporter_activity";
  label: string;
  items: AttentionItem[];
}

export interface AttentionReport {
  buckets: AttentionBucket[];
}

const TRIAGE_NOTES_MARKER = "## triage notes";

function toItem(issue: IssueRecord): AttentionItem {
  return {
    number: issue.number,
    title: issue.title,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

function sortOldestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Last triage-notes comment timestamp, or null if none. */
export function lastTriageNotesAt(issue: IssueDetail): string | null {
  let latest: string | null = null;
  for (const comment of issue.comments) {
    const hasMarker = comment.body
      .toLowerCase()
      .includes(TRIAGE_NOTES_MARKER);
    if (!hasMarker) continue;
    if (
      !latest ||
      new Date(comment.createdAt).getTime() > new Date(latest).getTime()
    ) {
      latest = comment.createdAt;
    }
  }
  return latest;
}

/** Reporter commented after the most recent triage notes (or any comment if no notes). */
export function hasReporterActivitySinceTriageNotes(
  issue: IssueDetail,
): boolean {
  const notesAt = lastTriageNotesAt(issue);
  const cutoff = notesAt ? new Date(notesAt).getTime() : 0;
  return issue.comments.some(
    (c) =>
      c.authorLogin === issue.authorLogin &&
      new Date(c.createdAt).getTime() > cutoff,
  );
}

/**
 * Builds the three "needs attention" buckets from the triage skill.
 * Pass {@link IssueDetail} when evaluating needs-info reporter activity; {@link IssueRecord} is enough for the other buckets.
 */
export function attentionBuckets(
  issues: Array<IssueRecord | IssueDetail>,
  labelMap: TriageLabelMap,
): AttentionReport {
  const needsTriageLabel = labelMap["needs-triage"];
  const needsInfoLabel = labelMap["needs-info"];

  const unlabeled: AttentionItem[] = [];
  const needsTriage: AttentionItem[] = [];
  const needsInfo: AttentionItem[] = [];

  for (const issue of issues) {
    const item = toItem(issue);
    if (issue.labels.length === 0) {
      unlabeled.push(item);
      continue;
    }
    if (issue.labels.includes(needsTriageLabel)) {
      needsTriage.push(item);
    }
    if (
      issue.labels.includes(needsInfoLabel) &&
      "comments" in issue &&
      hasReporterActivitySinceTriageNotes(issue)
    ) {
      needsInfo.push(item);
    }
  }

  return {
    buckets: [
      {
        key: "unlabeled",
        label: "Unlabeled",
        items: sortOldestFirst(unlabeled),
      },
      {
        key: "needs_triage",
        label: "needs-triage",
        items: sortOldestFirst(needsTriage),
      },
      {
        key: "needs_info_reporter_activity",
        label: "needs-info (reporter activity since triage notes)",
        items: sortOldestFirst(needsInfo),
      },
    ],
  };
}

/**
 * Fetches details for open issues and computes attention buckets.
 *
 * Delegates bulk read to `IssueTracker.viewMany` — a future adapter (e.g.
 * GraphQL-backed) can collapse the per-issue round-trips into one query
 * without touching this function.
 */
export async function attentionFromTracker(
  tracker: IssueTracker,
  labelMap: TriageLabelMap,
): Promise<AttentionReport> {
  const open = await tracker.listOpen();
  const details = await tracker.viewMany(open.map((r) => r.number));
  return attentionBuckets(details, labelMap);
}