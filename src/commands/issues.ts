import { readFile } from "node:fs/promises";
import chalk from "chalk";
import {
  createGhIssueTrackerBundle,
  IssueTrackerError,
  type IssueTrackerBundle,
} from "../issue-tracker/index.js";
import { attentionFromTracker } from "../triage/index.js";
import { emitErrorAndExit, emitSuccess } from "../utils/output.js";

export type IssuesCommandOptions = {
  json?: boolean;
  dryRun?: boolean;
  limit?: number;
  label?: string[];
  add?: string[];
  remove?: string[];
  body?: string;
  bodyFile?: string;
  comment?: string;
};

export type IssuesDeps = {
  getBundle?: (cwd?: string) => Promise<IssueTrackerBundle>;
};

const defaultGetBundle = (cwd?: string) => createGhIssueTrackerBundle(cwd);

function failTracker(
  json: boolean,
  error: unknown,
): never {
  if (error instanceof IssueTrackerError) {
    emitErrorAndExit(json, error.code, error.message);
  }
  const message = error instanceof Error ? error.message : String(error);
  emitErrorAndExit(json, "issues_failed", message);
}

function parseIssueNumber(raw: string, json: boolean): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0 || String(n) !== raw.trim()) {
    emitErrorAndExit(json, "invalid_issue_number", `Invalid issue number "${raw}"`);
  }
  return n;
}

function parseRepeatable(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return values.flatMap((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

async function bundleOrExit(
  json: boolean,
  deps: IssuesDeps,
): Promise<IssueTrackerBundle> {
  try {
    return await (deps.getBundle ?? defaultGetBundle)(process.cwd());
  } catch (error) {
    failTracker(json, error);
  }
}

async function resolveCommentBody(
  options: IssuesCommandOptions,
  json: boolean,
): Promise<string> {
  if (options.bodyFile) {
    try {
      return (await readFile(options.bodyFile, "utf8")).trimEnd();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitErrorAndExit(json, "body_file_unreadable", message, {
        path: options.bodyFile,
      });
    }
  }
  if (options.body !== undefined) return options.body;
  emitErrorAndExit(
    json,
    "missing_body",
    "Provide --body or --body-file",
  );
}

export async function issuesList(
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const bundle = await bundleOrExit(json, deps);
  try {
    const labels = parseRepeatable(options.label);
    const issues = await bundle.tracker.listOpen({
      ...(labels.length ? { labels } : {}),
      limit: options.limit ?? 50,
    });
    emitSuccess(json, "issues.list", { issues, count: issues.length }, () => {
      if (issues.length === 0) {
        console.log(chalk.gray("No open issues."));
        return;
      }
      console.log(chalk.blue.bold(`\nOpen issues (${issues.length}):\n`));
      for (const issue of issues) {
        const labelsText = issue.labels.length
          ? chalk.gray(` [${issue.labels.join(", ")}]`)
          : "";
        console.log(
          `${chalk.cyan(`#${issue.number}`)}  ${issue.title}${labelsText}`,
        );
      }
      console.log();
    });
  } catch (error) {
    failTracker(json, error);
  }
}

export async function issuesView(
  numberRaw: string,
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const number = parseIssueNumber(numberRaw, json);
  const bundle = await bundleOrExit(json, deps);
  try {
    const issue = await bundle.tracker.view(number);
    emitSuccess(json, "issues.view", issue, () => {
      console.log(chalk.green.bold(`#${issue.number}  ${issue.title}`));
      console.log(chalk.gray(`author: ${issue.authorLogin}`));
      if (issue.labels.length) {
        console.log(chalk.gray(`labels: ${issue.labels.join(", ")}`));
      }
      console.log();
      console.log(issue.body || chalk.gray("(no body)"));
      if (issue.comments.length) {
        console.log(chalk.blue.bold(`\nComments (${issue.comments.length}):\n`));
        for (const comment of issue.comments) {
          console.log(chalk.cyan(`${comment.authorLogin}  ${comment.createdAt}`));
          console.log(comment.body);
          console.log();
        }
      }
    });
  } catch (error) {
    failTracker(json, error);
  }
}

export async function issuesAttention(
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const bundle = await bundleOrExit(json, deps);
  try {
    const report = await attentionFromTracker(bundle.tracker, bundle.labelMap);
    emitSuccess(json, "issues.attention", report, () => {
      for (const bucket of report.buckets) {
        console.log(
          chalk.blue.bold(`\n${bucket.label} (${bucket.items.length})`),
        );
        if (bucket.items.length === 0) {
          console.log(chalk.gray("  (none)"));
          continue;
        }
        for (const item of bucket.items) {
          console.log(`  ${chalk.cyan(`#${item.number}`)}  ${item.title}`);
        }
      }
      console.log();
    });
  } catch (error) {
    failTracker(json, error);
  }
}

export async function issuesComment(
  numberRaw: string,
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const number = parseIssueNumber(numberRaw, json);
  const body = await resolveCommentBody(options, json);
  const preview = {
    number,
    body,
    dryRun: Boolean(options.dryRun),
  };
  if (options.dryRun) {
    emitSuccess(json, "issues.comment", preview, () => {
      console.log(chalk.yellow(`Dry run: would comment on #${number}`));
      console.log(body);
    });
    return;
  }
  const bundle = await bundleOrExit(json, deps);
  try {
    await bundle.tracker.comment(number, body);
    emitSuccess(json, "issues.comment", { number, dryRun: false }, () => {
      console.log(chalk.green(`Commented on #${number}`));
    });
  } catch (error) {
    failTracker(json, error);
  }
}

export async function issuesLabel(
  numberRaw: string,
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const number = parseIssueNumber(numberRaw, json);
  const add = parseRepeatable(options.add);
  const remove = parseRepeatable(options.remove);
  if (add.length === 0 && remove.length === 0) {
    emitErrorAndExit(
      json,
      "missing_labels",
      "Provide --add and/or --remove",
    );
  }
  const preview = { number, add, remove, dryRun: Boolean(options.dryRun) };
  if (options.dryRun) {
    emitSuccess(json, "issues.label", preview, () => {
      console.log(chalk.yellow(`Dry run: would edit labels on #${number}`));
      if (add.length) console.log(chalk.gray(`  add: ${add.join(", ")}`));
      if (remove.length) console.log(chalk.gray(`  remove: ${remove.join(", ")}`));
    });
    return;
  }
  const bundle = await bundleOrExit(json, deps);
  try {
    await bundle.tracker.setLabels(number, add, remove);
    emitSuccess(json, "issues.label", { ...preview, dryRun: false }, () => {
      console.log(chalk.green(`Updated labels on #${number}`));
    });
  } catch (error) {
    failTracker(json, error);
  }
}

export async function issuesClose(
  numberRaw: string,
  options: IssuesCommandOptions,
  deps: IssuesDeps = {},
): Promise<void> {
  const json = Boolean(options.json);
  const number = parseIssueNumber(numberRaw, json);
  const preview = {
    number,
    comment: options.comment,
    dryRun: Boolean(options.dryRun),
  };
  if (options.dryRun) {
    emitSuccess(json, "issues.close", preview, () => {
      console.log(chalk.yellow(`Dry run: would close #${number}`));
      if (options.comment) console.log(options.comment);
    });
    return;
  }
  const bundle = await bundleOrExit(json, deps);
  try {
    await bundle.tracker.close(number, options.comment);
    emitSuccess(json, "issues.close", { number, dryRun: false }, () => {
      console.log(chalk.green(`Closed #${number}`));
    });
  } catch (error) {
    failTracker(json, error);
  }
}
