export type {
  IssueComment,
  IssueDetail,
  IssueRecord,
  TriageLabelMap,
  TriageRole,
  IssueTrackerErrorCode,
} from "./types.js";
export { IssueTrackerError } from "./types.js";
export type { IssueTracker, ListOpenOptions } from "./interface.js";
export {
  DEFAULT_TRIAGE_LABEL_MAP,
  loadTriageLabelMap,
} from "./labels.js";
export { resolveRepoContext, assertGhAvailable } from "./discovery.js";
export { GhIssueTracker } from "./gh-issue-tracker.js";
export { InMemoryIssueTracker } from "./memory-issue-tracker.js";

import { GhIssueTracker } from "./gh-issue-tracker.js";
import { loadTriageLabelMap } from "./labels.js";
import type { IssueTracker } from "./interface.js";
import type { TriageLabelMap } from "./types.js";

export interface IssueTrackerBundle {
  tracker: IssueTracker;
  labelMap: TriageLabelMap;
  cwd: string;
}

/** Resolves repo cwd, loads triage labels from docs/agents, returns gh-backed tracker. */
export async function createGhIssueTrackerBundle(
  cwd: string = process.cwd(),
): Promise<IssueTrackerBundle> {
  const [tracker, labelMap] = await Promise.all([
    GhIssueTracker.create(cwd),
    loadTriageLabelMap(cwd),
  ]);
  return { tracker, labelMap, cwd };
}