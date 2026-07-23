import chalk from "chalk";
import type { TemplateRegistry } from "../registry/types.js";

export async function listTemplates(
  registry: TemplateRegistry,
): Promise<void> {
  console.log(chalk.blue.bold("\nAvailable Templates:\n"));

  registry.list().forEach((template) => {
    console.log(chalk.green(`  ${template.name}`));
    console.log(chalk.gray(`    ${template.description}`));
    console.log();
  });

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
}