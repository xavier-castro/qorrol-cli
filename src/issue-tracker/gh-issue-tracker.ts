import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { IssueTracker } from "./interface.js";
import type { IssueComment, IssueDetail, IssueRecord } from "./types.js";
import { IssueTrackerError } from "./types.js";
import { assertGhAvailable, type RepoContext } from "./discovery.js";

const execFileAsync = promisify(execFile);

interface GhAuthor {
  login?: string;
}

interface GhLabel {
  name: string;
}

interface GhComment {
  id: string;
  author?: GhAuthor;
  body: string;
  createdAt: string;
}

interface GhIssueJson {
  number: number;
  title: string;
  body?: string;
  labels?: GhLabel[];
  author?: GhAuthor;
  createdAt: string;
  updatedAt: string;
  comments?: GhComment[];
}

function mapRecord(raw: GhIssueJson): IssueRecord {
  return {
    number: raw.number,
    title: raw.title,
    labels: (raw.labels ?? []).map((l) => l.name),
    authorLogin: raw.author?.login ?? "unknown",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapDetail(raw: GhIssueJson): IssueDetail {
  const comments: IssueComment[] = (raw.comments ?? []).map((c) => ({
    id: c.id,
    authorLogin: c.author?.login ?? "unknown",
    createdAt: c.createdAt,
    body: c.body,
  }));
  return {
    ...mapRecord(raw),
    body: raw.body ?? "",
    comments,
  };
}

async function runGh(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("gh", args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    const stderr = err.stderr?.toString() ?? "";
    const message = stderr.trim() || err.message || "gh command failed";
    if (message.includes("Could not resolve to an Issue")) {
      throw new IssueTrackerError("issue_not_found", message, stderr);
    }
    throw new IssueTrackerError("gh_failed", message, stderr);
  }
}

function parseJson<T>(stdout: string, context: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new IssueTrackerError(
      "invalid_json",
      `Empty JSON from gh (${context})`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new IssueTrackerError(
      "invalid_json",
      `Invalid JSON from gh (${context})`,
    );
  }
}

export class GhIssueTracker implements IssueTracker {
  readonly context: RepoContext;

  constructor(context: RepoContext) {
    this.context = context;
  }

  static async create(cwd: string): Promise<GhIssueTracker> {
    const { resolveRepoContext } = await import("./discovery.js");
    await assertGhAvailable();
    const context = await resolveRepoContext(cwd);
    return new GhIssueTracker(context);
  }

  async listOpen(options?: {
    labels?: string[];
    limit?: number;
  }): Promise<IssueRecord[]> {
    const limit = options?.limit ?? 200;
    const args = [
      "issue",
      "list",
      "--state",
      "open",
      "--json",
      "number,title,labels,author,createdAt,updatedAt",
      "--limit",
      String(limit),
    ];
    if (options?.labels?.length === 1) {
      args.push("--label", options.labels[0]!);
    }

    const { stdout } = await runGh(this.context.cwd, args);
    let records = parseJson<GhIssueJson[]>(stdout, "issue list").map(mapRecord);

    if (options?.labels && options.labels.length > 1) {
      const required = new Set(options.labels);
      records = records.filter((r) =>
        [...required].every((l) => r.labels.includes(l)),
      );
    }

    return records;
  }

  async view(number: number): Promise<IssueDetail> {
    const args = [
      "issue",
      "view",
      String(number),
      "--json",
      "number,title,body,labels,author,createdAt,updatedAt,comments",
    ];
    const { stdout } = await runGh(this.context.cwd, args);
    return mapDetail(parseJson<GhIssueJson>(stdout, "issue view"));
  }

  async comment(number: number, body: string): Promise<void> {
    await runGh(this.context.cwd, [
      "issue",
      "comment",
      String(number),
      "--body",
      body,
    ]);
  }

  async setLabels(
    number: number,
    add: string[],
    remove: string[],
  ): Promise<void> {
    const args = ["issue", "edit", String(number)];
    for (const label of add) {
      args.push("--add-label", label);
    }
    for (const label of remove) {
      args.push("--remove-label", label);
    }
    await runGh(this.context.cwd, args);
  }

  async close(number: number, comment?: string): Promise<void> {
    const args = ["issue", "close", String(number)];
    if (comment) {
      args.push("--comment", comment);
    }
    await runGh(this.context.cwd, args);
  }
}