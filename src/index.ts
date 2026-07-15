#!/usr/bin/env node

import { Command } from "commander";
import { createProject } from "./commands/create.js";
import { listTemplates } from "./commands/list.js";
import { listRunningProcesses } from "./commands/ps.js";

const program = new Command();

program
  .name("qorrol")
  .description("A CLI tool for creating projects from curated templates")
  .version("1.0.14");

program
  .command("create <template-name>")
  .description("Create a new project from a template")
  .option(
    "-n, --name <name>",
    "Project directory name (creates in current directory if not specified)",
  )
  .action(createProject);

program
  .command("list")
  .description("List available templates")
  .action(listTemplates);

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
  .option("--json", "Print JSON array of { pid, command }")
  .action(listRunningProcesses);

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log(
    "  $ qorrol list                           # List available templates",
  );
  console.log(
    "  $ qorrol create saas-kit                # Create in current directory",
  );
  console.log(
    '  $ qorrol create saas-kit --name my-app  # Create in new directory "my-app"',
  );
  console.log(
    "  $ qorrol ps                              # Snapshot of running processes",
  );
  console.log(
    '  $ qorrol ps -e vite,watch --json         # JSON, excluding watcher-like commands',
  );
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}