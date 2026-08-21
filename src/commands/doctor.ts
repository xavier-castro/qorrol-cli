import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { platform } from "node:os";
import chalk from "chalk";
import type { TemplateRegistry } from "../registry/types.js";
import { emitSuccess } from "../utils/output.js";

const execFileAsync = promisify(execFile);

export type AuthSource = "env" | "provider" | "missing";

export type DoctorCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  detail: string;
  source?: AuthSource | "n/a";
};

export type DoctorReport = {
  version: string;
  node: string;
  platform: string;
  ready: boolean;
  authRequired: boolean;
  checks: DoctorCheck[];
  templates: { count: number; names: string[] };
  github: {
    tokenAvailable: boolean;
    source: AuthSource;
    ghAvailable: boolean;
  };
};

export type DoctorRunner = (
  file: string,
  args: string[],
) => Promise<{ ok: boolean; stdout: string }>;

export const CLI_VERSION = "1.0.14";

export async function defaultDoctorRunner(
  file: string,
  args: string[],
): Promise<{ ok: boolean; stdout: string }> {
  try {
    const { stdout } = await execFileAsync(file, args, { timeout: 10_000 });
    return { ok: true, stdout: stdout.toString() };
  } catch {
    return { ok: false, stdout: "" };
  }
}

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/, 1)[0] ?? "";
}

function githubTokenSource(
  env: NodeJS.ProcessEnv,
): { available: boolean; source: AuthSource } {
  if (env.GH_TOKEN || env.GITHUB_TOKEN) {
    return { available: true, source: "env" };
  }
  return { available: false, source: "missing" };
}

export async function collectDoctorReport(options: {
  registry: TemplateRegistry;
  runner?: DoctorRunner;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  nodeVersion?: string;
  osPlatform?: NodeJS.Platform;
}): Promise<DoctorReport> {
  const runner = options.runner ?? defaultDoctorRunner;
  const env = options.env ?? process.env;
  const osPlatform = options.osPlatform ?? platform();
  const nodeVersion = options.nodeVersion ?? process.version;

  const git = await runner("git", ["--version"]);
  const gh = await runner("gh", ["--version"]);
  const token = githubTokenSource(env);

  let ghAuthed = false;
  if (gh.ok && !token.available) {
    const status = await runner("gh", ["auth", "status"]);
    ghAuthed = status.ok;
  }

  const githubSource: AuthSource = token.available
    ? "env"
    : ghAuthed
      ? "provider"
      : "missing";

  const nodeMajor = Number.parseInt(nodeVersion.replace(/^v/, "").split(".")[0] ?? "0", 10);
  const nodeOk = nodeMajor >= 18;
  const psSupported = osPlatform === "darwin";
  const templates = options.registry.list();

  const checks: DoctorCheck[] = [
    {
      name: "node",
      ok: nodeOk,
      required: true,
      detail: nodeOk
        ? `Node ${nodeVersion} (>= 18)`
        : `Node ${nodeVersion} is below the required >= 18`,
      source: "n/a",
    },
    {
      name: "git",
      ok: git.ok,
      required: true,
      detail: git.ok
        ? firstLine(git.stdout) || "git available"
        : "git is not installed or not on PATH (needed by qorrol create)",
      source: "n/a",
    },
    {
      name: "templates",
      ok: templates.length > 0,
      required: true,
      detail: `${templates.length} curated template(s)`,
      source: "n/a",
    },
    {
      name: "ps",
      ok: psSupported,
      required: false,
      detail: psSupported
        ? "qorrol ps supported on darwin"
        : `qorrol ps is unsupported on ${osPlatform}`,
      source: "n/a",
    },
    {
      name: "gh",
      ok: gh.ok,
      required: false,
      detail: gh.ok
        ? firstLine(gh.stdout) || "gh available"
        : "GitHub CLI (gh) is not installed; qorrol issues / request are unavailable",
      source: "n/a",
    },
    {
      name: "github_auth",
      ok: githubSource !== "missing",
      required: false,
      detail:
        githubSource === "env"
          ? "GitHub token present in GH_TOKEN or GITHUB_TOKEN"
          : githubSource === "provider"
            ? "gh auth status reports a logged-in host"
            : "No GitHub token in env and gh is not logged in",
      source: githubSource,
    },
  ];

  const ready = checks.filter((c) => c.required).every((c) => c.ok);

  return {
    version: CLI_VERSION,
    node: nodeVersion,
    platform: osPlatform,
    ready,
    authRequired: false,
    checks,
    templates: {
      count: templates.length,
      names: templates.map((t) => t.name),
    },
    github: {
      tokenAvailable: githubSource === "env",
      source: githubSource,
      ghAvailable: gh.ok,
    },
  };
}

export async function runDoctor(
  json: boolean,
  registry: TemplateRegistry,
): Promise<void> {
  const report = await collectDoctorReport({ registry });
  emitSuccess(json, "doctor", report, () => {
    console.log(
      report.ready
        ? chalk.green(`qorrol ${report.version} — ready`)
        : chalk.yellow(`qorrol ${report.version} — setup incomplete`),
    );
    console.log(chalk.gray(`node ${report.node}  platform ${report.platform}`));
    console.log();
    for (const check of report.checks) {
      const mark = check.ok ? chalk.green("ok") : check.required ? chalk.red("fail") : chalk.yellow("skip");
      const req = check.required ? "" : " (optional)";
      console.log(`  ${mark}  ${check.name}${req}  ${check.detail}`);
    }
    console.log();
    console.log(
      chalk.gray(
        `templates: ${report.templates.names.join(", ") || "(none)"}`,
      ),
    );
    console.log(
      chalk.gray(
        `github auth: ${report.github.source}  gh: ${report.github.ghAvailable ? "yes" : "no"}`,
      ),
    );
  });
}
