import type { IssueTracker } from "./interface.js";
import type { IssueDetail, IssueRecord } from "./types.js";
import { IssueTrackerError } from "./types.js";

export class InMemoryIssueTracker implements IssueTracker {
  private issues = new Map<number, IssueDetail>();

  seed(...details: IssueDetail[]): this {
    for (const d of details) {
      this.issues.set(d.number, structuredClone(d));
    }
    return this;
  }

  async listOpen(options?: {
    labels?: string[];
    limit?: number;
  }): Promise<IssueRecord[]> {
    let list = [...this.issues.values()];
    if (options?.labels?.length) {
      const required = options.labels;
      list = list.filter((issue) =>
        required.every((l) => issue.labels.includes(l)),
      );
    }
    list.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const limit = options?.limit ?? list.length;
    return list.slice(0, limit).map((d) => ({
      number: d.number,
      title: d.title,
      labels: [...d.labels],
      authorLogin: d.authorLogin,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async view(number: number): Promise<IssueDetail> {
    const issue = this.issues.get(number);
    if (!issue) {
      throw new IssueTrackerError(
        "issue_not_found",
        `Issue #${number} not found`,
      );
    }
    return structuredClone(issue);
  }

  async comment(number: number, body: string): Promise<void> {
    const issue = await this.view(number);
    issue.comments.push({
      id: `mem-${issue.comments.length + 1}`,
      authorLogin: "maintainer",
      createdAt: new Date().toISOString(),
      body,
    });
    issue.updatedAt = new Date().toISOString();
    this.issues.set(number, issue);
  }

  async setLabels(
    number: number,
    add: string[],
    remove: string[],
  ): Promise<void> {
    const issue = await this.view(number);
    const labels = new Set(issue.labels);
    for (const r of remove) labels.delete(r);
    for (const a of add) labels.add(a);
    issue.labels = [...labels];
    issue.updatedAt = new Date().toISOString();
    this.issues.set(number, issue);
  }

  async close(number: number, comment?: string): Promise<void> {
    if (comment) {
      await this.comment(number, comment);
    }
    this.issues.delete(number);
  }
}