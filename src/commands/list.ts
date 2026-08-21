import chalk from "chalk";
import type { TemplateRegistry } from "../registry/types.js";
import { emitSuccess } from "../utils/output.js";

export async function listTemplates(
  registry: TemplateRegistry,
  json = false,
): Promise<void> {
  const templates = registry.list().map((t) => ({
    name: t.name,
    description: t.description,
    repo: t.repo,
    branch: t.branch ?? "main",
    category: t.category,
  }));

  emitSuccess(json, "list", { templates, count: templates.length }, () => {
    console.log(chalk.blue.bold("\nAvailable Templates:\n"));

    for (const template of templates) {
      console.log(chalk.green(`  ${template.name}`));
      console.log(chalk.gray(`    ${template.description}`));
      console.log();
    }

    console.log(chalk.gray("Usage:"));
    console.log(
      chalk.gray(
        "  qorrol create <template-name>                # Create in current directory",
      ),
    );
    console.log(
      chalk.gray(
        "  qorrol create <template-name> --name <name>  # Create in new directory",
      ),
    );
    console.log();
  });
}
