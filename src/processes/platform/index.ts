import { platform } from "node:os";
import type { RunningProcess } from "../types.js";
import { GetRunningProcessesError } from "../types.js";
import { snapshotDarwinProcesses } from "./darwin.js";

export async function snapshotPlatformProcesses(
  timeoutMs: number,
): Promise<RunningProcess[]> {
  const os = platform();
  if (os === "darwin") {
    return snapshotDarwinProcesses(timeoutMs);
  }
  throw new GetRunningProcessesError(
    "unsupported_platform",
    `getRunningProcesses is not implemented for platform "${os}" yet`,
  );
}