import path from "path";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { IssueTrackerError } from "./types.js";

const execFileAsync = promisify(execFile);

export interface RepoContext {
  cwd: string;
}

export async function resolveRepoContext(
  cwd: string = process.cwd(),
): Promise<RepoContext> {
  const gitDir = path.join(cwd, ".git");
  try {
    await access(gitDir);
  } catch {
    throw new IssueTrackerError(
      "not_in_repo",
      `Not a git repository: ${cwd}`,
    );
  }
  return { cwd: path.resolve(cwd) };
}

export async function assertGhAvailable(): Promise<void> {
  try {
    await execFileAsync("gh", ["--version"], { timeout: 10_000 });
  } catch {
    throw new IssueTrackerError(
      "gh_not_found",
      "GitHub CLI (gh) is not installed or not on PATH",
    );
  }
}