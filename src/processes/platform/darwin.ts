import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RunningProcess } from "../types.js";
import { GetRunningProcessesError } from "../types.js";

const execFileAsync = promisify(execFile);

/** Parses `ps -axo pid=,command=` lines into RunningProcess rows. */
export function parsePsOutput(stdout: string): RunningProcess[] {
  const rows: RunningProcess[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    if (!Number.isFinite(pid)) continue;
    rows.push({ pid, command: match[2].trim() });
  }
  return rows;
}

export async function snapshotDarwinProcesses(
  timeoutMs: number,
): Promise<RunningProcess[]> {
  try {
    const { stdout } = await execFileAsync(
      "ps",
      ["-axo", "pid=,command="],
      {
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    return parsePsOutput(stdout.toString());
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      killed?: boolean;
      signal?: string;
    };
    if (err.killed || err.code === "ABORT_ERR" || err.signal === "SIGTERM") {
      throw new GetRunningProcessesError(
        "timeout",
        `Process snapshot timed out after ${timeoutMs}ms`,
        error,
      );
    }
    throw new GetRunningProcessesError(
      "snapshot_failed",
      err.message || "ps failed",
      error,
    );
  }
}