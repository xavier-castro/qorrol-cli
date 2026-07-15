import chalk from "chalk";
import {
  getRunningProcesses,
  GetRunningProcessesError,
} from "../processes/index.js";

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

  try {
    const rows = await getRunningProcesses({
      excludeCommandSubstrings,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    });

    if (options.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    if (rows.length === 0) {
      console.log(chalk.gray("No processes matched."));
      return;
    }

    console.log(chalk.blue.bold(`\nRunning processes (${rows.length}):\n`));
    for (const row of rows) {
      console.log(
        `${chalk.cyan(String(row.pid).padStart(6))}  ${row.command}`,
      );
    }
    console.log();
  } catch (error) {
    if (error instanceof GetRunningProcessesError) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
    throw error;
  }
}