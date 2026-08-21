import chalk from "chalk";
import type { TemplateRegistry } from "../registry/types.js";
import { emitErrorAndExit, emitSuccess } from "../utils/output.js";

export function resolveTemplate(
  name: string,
  registry: TemplateRegistry,
  json: boolean,
): void {
  const template = registry.resolve(name);
  if (!template) {
    emitErrorAndExit(
      json,
      "template_not_found",
      `Template "${name}" not found`,
      { availableTemplateNames: registry.list().map((t) => t.name) },
      () => {
        console.error(chalk.red(`Template "${name}" not found`));
        const names = registry.list().map((t) => t.name);
        if (names.length) {
          console.error(chalk.gray("Available templates:"));
          for (const n of names) console.error(chalk.gray(`  - ${n}`));
        }
      },
    );
  }

  emitSuccess(json, "resolve", template, () => {
    console.log(chalk.green(template.name));
    console.log(chalk.gray(`  ${template.description}`));
    console.log(chalk.gray(`  ${template.repo}`));
    if (template.branch) console.log(chalk.gray(`  branch: ${template.branch}`));
    if (template.category) console.log(chalk.gray(`  category: ${template.category}`));
  });
}
