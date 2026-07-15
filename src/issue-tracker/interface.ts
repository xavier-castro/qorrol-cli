import type { IssueDetail, IssueRecord } from "./types.js";

export interface ListOpenOptions {
  /** When set, only issues that have every listed label. */
  labels?: string[];
  limit?: number;
}

export interface IssueTracker {
  listOpen(options?: ListOpenOptions): Promise<IssueRecord[]>;
  view(number: number): Promise<IssueDetail>;
  comment(number: number, body: string): Promise<void>;
  setLabels(number: number, add: string[], remove: string[]): Promise<void>;
  close(number: number, comment?: string): Promise<void>;
}