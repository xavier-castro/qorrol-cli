/** Canonical triage state roles from the triage skill. */
export type TriageRole =
  | "needs-triage"
  | "needs-info"
  | "ready-for-agent"
  | "ready-for-human"
  | "wontfix";

/** Maps each canonical role to the label string on the issue tracker. */
export type TriageLabelMap = Record<TriageRole, string>;

export interface IssueComment {
  id: string;
  authorLogin: string;
  createdAt: string;
  body: string;
}

export interface IssueRecord {
  number: number;
  title: string;
  labels: string[];
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetail extends IssueRecord {
  body: string;
  comments: IssueComment[];
}

export type IssueTrackerErrorCode =
  | "gh_not_found"
  | "gh_failed"
  | "not_in_repo"
  | "issue_not_found"
  | "invalid_json";

export class IssueTrackerError extends Error {
  readonly code: IssueTrackerErrorCode;
  readonly stderr?: string;

  constructor(
    code: IssueTrackerErrorCode,
    message: string,
    stderr?: string,
  ) {
    super(message);
    this.name = "IssueTrackerError";
    this.code = code;
    this.stderr = stderr;
  }
}