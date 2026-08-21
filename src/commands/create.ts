import chalk from "chalk";
import ora from "ora";
import { CreateOptions } from "../types/index.js";
import { scaffoldFromTemplate } from "../scaffolding/index.js";
import type { TemplateRegistry } from "../registry/types.js";
import { emitErrorAndExit, emitSuccess } from "../utils/output.js";

export async function createProject(
  templateName: string,
  options: CreateOptions,
  registry: TemplateRegistry,
): Promise<void> {
  const json = Boolean(options.json);
  const projectName = options.name;
  const locationMessage = projectName
    ? `Creating project "${projectName}" from template "${templateName}"`
    : `Creating project in current directory from template "${templateName}"`;

  if (!json) {
    console.log(chalk.blue(`\n🚀 ${locationMessage}\n`));
  }

  let spinner = json ? null : ora("Cloning template repository...");

  const result = await scaffoldFromTemplate(
    {
      templateName,
      projectName: options.name,
      cwd: process.cwd(),
      registry,
      dryRun: options.dryRun,
    },
    (progress) => {
      if (json) return;
      if (progress.phase === "validated" && progress.warnedNonEmptyCwd) {
        console.log(
          chalk.yellow(
            "Current directory is not empty. This will add template files to the existing directory.",
          ),
        );
      }
      if (progress.phase === "materialize") {
        spinner?.start();
      }
      if (progress.phase === "rename_package") {
        if (spinner) spinner.text = "Updating package.json...";
      }
    },
  );

  if (!result.ok) {
    spinner?.stop();
    switch (result.code) {
      case "template_not_found":
        emitErrorAndExit(
          json,
          result.code,
          result.message,
          { availableTemplateNames: result.availableTemplateNames },
          () => {
            console.log(chalk.red(result.message));
            if (result.availableTemplateNames?.length) {
              console.log(chalk.gray("Available templates:"));
              result.availableTemplateNames.forEach((name) =>
                console.log(chalk.gray(`  - ${name}`)),
              );
            }
          },
        );
      case "invalid_project_name":
        emitErrorAndExit(
          json,
          result.code,
          result.message,
          { validationErrors: result.validationErrors },
          () => {
            console.log(
              chalk.red(
                `Invalid project name: ${result.validationErrors?.join(", ") ?? result.message}`,
              ),
            );
          },
        );
      case "target_directory_exists":
        emitErrorAndExit(json, result.code, result.message, undefined, () => {
          console.log(chalk.red(result.message));
        });
      case "materialize_failed":
        if (!json) spinner?.fail("Failed to create project");
        emitErrorAndExit(json, result.code, result.message, undefined, () => {
          console.error(chalk.red("Error:"), result.message);
        });
    }
    return;
  }

  const data = {
    template: result.template,
    targetDir: result.targetDir,
    projectName: result.projectName,
    renamedPackage: result.renamedPackage,
    warnedNonEmptyCwd: result.warnedNonEmptyCwd,
    dryRun: result.dryRun,
  };

  emitSuccess(json, "create", data, () => {
    if (result.dryRun) {
      console.log(chalk.yellow("Dry run — no files written"));
      console.log(chalk.gray(`  template: ${result.template.name}`));
      console.log(chalk.gray(`  target:   ${result.targetDir}`));
      return;
    }
    spinner?.succeed("Template cloned successfully (repoless)");
    if (result.renamedPackage) {
      console.log(chalk.green("Package.json updated with new project name"));
    }

    const successMessage = result.projectName
      ? `\n✅ Successfully created project "${result.projectName}"!`
      : `\n✅ Successfully created project in current directory!`;

    console.log(chalk.green.bold(successMessage));
  });
}
