import { execFile } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";
import { emitErrorAndExit, emitSuccess } from "../utils/output.js";

const execFileAsync = promisify(execFile);

const WRITE_VERBS = new Set([
  "create",
  "comment",
  "close",
  "edit",
  "delete",
  "lock",
  "unlock",
  "merge",
  "ready",
  "reopen",
  "transfer",
  "pin",
  "unpin",
]);

const WRITE_HTTP = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type RequestOptions = {
  json?: boolean;
  write?: boolean;
};

export type RequestRunner = (
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

export function classifyGhArgs(args: string[]): "read" | "write" {
  const tokens = args.filter((a) => a !== "--");
  if (tokens.length === 0) return "read";

  const methodFlag = tokens.findIndex((t) => t === "-X" || t === "--method");
  if (methodFlag >= 0) {
    const method = (tokens[methodFlag + 1] ?? "GET").toUpperCase();
    if (WRITE_HTTP.has(method)) return "write";
  }

  for (const token of tokens) {
    if (WRITE_VERBS.has(token)) return "write";
  }
  return "read";
}

async function defaultRunner(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("gh", args, {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export async function runRequest(
  args: string[],
  options: RequestOptions,
  runner: RequestRunner = defaultRunner,
): Promise<void> {
  const json = Boolean(options.json);
  if (args.length === 0) {
    emitErrorAndExit(
      json,
      "missing_request_args",
      "Pass gh arguments after request, e.g. qorrol request issue list",
    );
  }

  const kind = classifyGhArgs(args);
  if (kind === "write" && !options.write) {
    emitErrorAndExit(
      json,
      "write_not_allowed",
      "Refusing a mutating gh invocation without --write",
      { args, hint: "Re-run with --write after explicit user approval" },
      () => {
        console.error(
          chalk.red(
            "Refusing a mutating gh invocation without --write. Re-run with --write if the user asked for this write.",
          ),
        );
      },
    );
  }

  try {
    const { stdout, stderr } = await runner(args);
    if (stderr.trim()) {
      process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
    }
    const body = tryParseJson(stdout);
    emitSuccess(
      json,
      "request",
      { args, kind, body },
      () => {
        process.stdout.write(stdout.endsWith("\n") || stdout.length === 0 ? stdout : `${stdout}\n`);
      },
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    const message =
      err.stderr?.toString().trim() ||
      (error instanceof Error ? error.message : String(error));
    emitErrorAndExit(json, "gh_failed", message, { args });
  }
}
