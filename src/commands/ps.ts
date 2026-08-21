import chalk from "chalk";
import {
  getRunningProcesses,
  GetRunningProcessesError,
} from "../processes/index.js";
import { emitErrorAndExit, emitSuccess } from "../utils/output.js";

export type PsCommandOptions = {
  exclude?: string[];
  timeout?: number;
  json?: boolean;
};

export function parseExcludeList(values: string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  const parts = values.flatMap((v) =>
    v.split(",").map((s) => s.trim()).filter(Boolean),
  );
  return parts.length ? parts : undefined;
}

export async function listRunningProcesses(
  options: PsCommandOptions,
): Promise<void> {
  const excludeCommandSubstrings = parseExcludeList(options.exclude);
  const timeoutMs = options.timeout;
  const json = Boolean(options.json);

  try {
    const processes = await getRunningProcesses({
      excludeCommandSubstrings,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    });

    emitSuccess(
      json,
      "ps",
      { processes, count: processes.length },
      () => {
        if (processes.length === 0) {
          console.log(chalk.gray("No processes matched."));
          return;
        }

        console.log(chalk.blue.bold(`\nRunning processes (${processes.length}):\n`));
        for (const row of processes) {
          console.log(
            `${chalk.cyan(String(row.pid).padStart(6))}  ${row.command}`,
          );
        }
        console.log();
      },
    );
  } catch (error) {
    if (error instanceof GetRunningProcessesError) {
      emitErrorAndExit(json, error.code, error.message, undefined, () => {
        console.error(chalk.red(`Error: ${error.message}`));
      });
    }
    throw error;
  }
}
