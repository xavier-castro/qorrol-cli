#!/usr/bin/env node

import { Command } from "commander";
import { createProject } from "./commands/create.js";
import { listTemplates } from "./commands/list.js";

const program = new Command();

program
<<<<<<< HEAD
  .name("qorrol")
  .description("A CLI tool for creating projects from curated templates")
  .version("1.0.14");
=======
  .name("backpine")
  .description("A CLI tool for creating projects from curated templates")
  .version("1.0.7");
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184

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

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log(
<<<<<<< HEAD
    "  $ qorrol list                           # List available templates",
  );
  console.log(
    "  $ qorrol create saas-kit                # Create in current directory",
  );
  console.log(
    '  $ qorrol create saas-kit --name my-app  # Create in new directory "my-app"',
=======
    "  $ backpine list                           # List available templates",
  );
  console.log(
    "  $ backpine create saas-kit                # Create in current directory",
  );
  console.log(
    '  $ backpine create saas-kit --name my-app  # Create in new directory "my-app"',
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
  );
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
