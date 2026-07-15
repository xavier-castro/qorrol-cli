/** One OS process entry from a point-in-time snapshot (no wait on the process). */
export type RunningProcess = {
  pid: number;
  command: string;
};

export type GetRunningProcessesOptions = {
  /** Override snapshot source (tests). Default: platform `ps` with timeout. */
  snapshot?: () => Promise<RunningProcess[]>;
  /** Max time to wait for the snapshot; default 5_000 ms. */
  timeoutMs?: number;
  /** Drop processes whose command matches these substrings (case-insensitive). */
  excludeCommandSubstrings?: string[];
};

export type GetRunningProcessesErrorCode = "timeout" | "unsupported_platform" | "snapshot_failed";

export class GetRunningProcessesError extends Error {
  readonly code: GetRunningProcessesErrorCode;
  readonly cause?: unknown;

  constructor(
    code: GetRunningProcessesErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "GetRunningProcessesError";
    this.code = code;
    this.cause = cause;
  }
}