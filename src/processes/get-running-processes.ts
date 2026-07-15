import { snapshotPlatformProcesses } from "./platform/index.js";
import type {
  GetRunningProcessesOptions,
  RunningProcess,
} from "./types.js";
import { GetRunningProcessesError } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5_000;

function applyExclusions(
  processes: RunningProcess[],
  excludeCommandSubstrings: string[] | undefined,
): RunningProcess[] {
  if (!excludeCommandSubstrings?.length) return processes;
  const needles = excludeCommandSubstrings.map((s) => s.toLowerCase());
  return processes.filter(
    (p) => !needles.some((n) => p.command.toLowerCase().includes(n)),
  );
}

async function withTimeout<T>(
  work: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new GetRunningProcessesError(
          "timeout",
          `Process snapshot timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Returns a point-in-time list of running processes. Does not attach to or
 * wait on any process (including long-running file watchers or dev servers).
 */
export async function getRunningProcesses(
  options: GetRunningProcessesOptions = {},
): Promise<RunningProcess[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const snapshot = options.snapshot ?? (() => snapshotPlatformProcesses(timeoutMs));

  const rows = await withTimeout(() => snapshot(), timeoutMs);
  return applyExclusions(rows, options.excludeCommandSubstrings);
}