#!/usr/bin/env node

import { Command } from "commander";
import { createProject } from "./commands/create.js";
import { listTemplates } from "./commands/list.js";
import { listRunningProcesses } from "./commands/ps.js";
import { getCompletionScript, listSupportedShells } from "./commands/completion.js";
import { runDoctor, CLI_VERSION } from "./commands/doctor.js";
import { resolveTemplate } from "./commands/resolve.js";
import {
  issuesAttention,
  issuesClose,
  issuesComment,
  issuesLabel,
  issuesList,
  issuesView,
} from "./commands/issues.js";
import { runRequest } from "./commands/request.js";
import { inlineRegistry } from "./registry/inline-registry.js";
import { isJsonMode } from "./utils/output.js";

const program = new Command();

program
  .name("qorrol")
  .description(
    "Scaffold projects from curated templates, snapshot processes, and drive GitHub issues",
  )
  .version(CLI_VERSION)
  .enablePositionalOptions()
  .option("--json", "Print a stable JSON envelope to stdout");

function jsonFrom(options: { json?: boolean }, cmd: Command): boolean {
  return isJsonMode(options, cmd);
}

program
  .command("doctor")
  .description("Verify Node, git, templates, ps support, and optional GitHub auth")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(async (options: { json?: boolean }, cmd: Command) => {
    await runDoctor(jsonFrom(options, cmd), inlineRegistry);
  });

program
  .command("list")
  .description("List available templates")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(async (options: { json?: boolean }, cmd: Command) => {
    await listTemplates(inlineRegistry, jsonFrom(options, cmd));
  });

program
  .command("resolve <template-name>")
  .description("Resolve a template name to its registry record")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action((templateName: string, options: { json?: boolean }, cmd: Command) => {
    resolveTemplate(templateName, inlineRegistry, jsonFrom(options, cmd));
  });

program
  .command("create <template-name>")
  .description("Create a new project from a template")
  .option(
    "-n, --name <name>",
    "Project directory name (creates in current directory if not specified)",
  )
  .option("--dry-run", "Validate and resolve without cloning")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(
    (
      templateName: string,
      options: { name?: string; dryRun?: boolean; json?: boolean },
      cmd: Command,
    ) => createProject(templateName, { ...options, json: jsonFrom(options, cmd) }, inlineRegistry),
  );

program
  .command("ps")
  .description("List running processes (bounded-time snapshot; does not wait on watchers)")
  .option(
    "-e, --exclude <patterns>",
    "Comma-separated command substrings to omit (repeatable)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option(
    "-t, --timeout <ms>",
    "Snapshot timeout in milliseconds",
    (value) => Number.parseInt(value, 10),
  )
  .option("--json", "Print a stable JSON envelope to stdout")
  .action((options: { exclude?: string[]; timeout?: number; json?: boolean }, cmd: Command) =>
    listRunningProcesses({ ...options, json: jsonFrom(options, cmd) }),
  );

const issues = program
  .command("issues")
  .description("Read and write GitHub issues via the gh CLI (repo inferred from cwd)")
  .enablePositionalOptions()
  .option("--json", "Print a stable JSON envelope to stdout")
  .action((_options: { json?: boolean }, cmd: Command) => {
    cmd.help();
  });

issues
  .command("list")
  .description("List open issues")
  .option("--limit <n>", "Max issues to return (default 50)", (v) => Number.parseInt(v, 10))
  .option(
    "-l, --label <name>",
    "Require this label (repeatable)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(
    (
      options: { limit?: number; label?: string[]; json?: boolean },
      cmd: Command,
    ) => issuesList({ ...options, json: jsonFrom(options, cmd) }),
  );

issues
  .command("view <number>")
  .description("Read one issue including body and comments")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action((number: string, options: { json?: boolean }, cmd: Command) =>
    issuesView(number, { ...options, json: jsonFrom(options, cmd) }),
  );

issues
  .command("attention")
  .description("Bucket open issues that need triage attention")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action((options: { json?: boolean }, cmd: Command) =>
    issuesAttention({ ...options, json: jsonFrom(options, cmd) }),
  );

issues
  .command("comment <number>")
  .description("Comment on an issue")
  .option("--body <text>", "Comment body")
  .option("--body-file <path>", "Read comment body from a file")
  .option("--dry-run", "Print the comment without posting it")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(
    (
      number: string,
      options: { body?: string; bodyFile?: string; dryRun?: boolean; json?: boolean },
      cmd: Command,
    ) => issuesComment(number, { ...options, json: jsonFrom(options, cmd) }),
  );

issues
  .command("label <number>")
  .description("Add and/or remove labels on an issue")
  .option(
    "--add <name>",
    "Label to add (repeatable, comma-separated)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option(
    "--remove <name>",
    "Label to remove (repeatable, comma-separated)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option("--dry-run", "Print the label edit without applying it")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(
    (
      number: string,
      options: { add?: string[]; remove?: string[]; dryRun?: boolean; json?: boolean },
      cmd: Command,
    ) => issuesLabel(number, { ...options, json: jsonFrom(options, cmd) }),
  );

issues
  .command("close <number>")
  .description("Close an issue")
  .option("--comment <text>", "Optional closing comment")
  .option("--dry-run", "Print the close without applying it")
  .option("--json", "Print a stable JSON envelope to stdout")
  .action(
    (
      number: string,
      options: { comment?: string; dryRun?: boolean; json?: boolean },
      cmd: Command,
    ) => issuesClose(number, { ...options, json: jsonFrom(options, cmd) }),
  );

program
  .command("request [args...]")
  .description("Raw gh CLI escape hatch (read-only unless --write)")
  .option("--write", "Allow mutating gh subcommands")
  .option("--json", "Print a stable JSON envelope to stdout")
  .passThroughOptions()
  .action((args: string[], options: { write?: boolean; json?: boolean }, cmd: Command) =>
    runRequest(args ?? [], { ...options, json: jsonFrom(options, cmd) }),
  );

program
  .command("completion <shell>")
  .description(
    `Output a shell completion script (supported: ${listSupportedShells().join(", ")})`,
  )
  .action((shell: string) => {
    try {
      process.stdout.write(getCompletionScript(shell, inlineRegistry));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ qorrol --json doctor                 # Setup / auth / template checks");
  console.log("  $ qorrol --json list                   # Discover templates");
  console.log("  $ qorrol --json resolve saas-kit       # Resolve a template name to IDs");
  console.log("  $ qorrol create saas-kit --dry-run     # Preview a scaffold");
  console.log("  $ qorrol --json issues list --limit 20");
  console.log("  $ qorrol --json issues attention");
  console.log("  $ qorrol request issue view 12         # Raw gh read");
  console.log("  $ qorrol ps -e vite,watch --json");
});

await program.parseAsync(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
