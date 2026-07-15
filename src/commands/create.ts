import chalk from "chalk";
import ora from "ora";
import { CreateOptions } from "../types/index.js";
import { scaffoldFromTemplate } from "../scaffolding/index.js";

export async function createProject(
  templateName: string,
  options: CreateOptions = {},
): Promise<void> {
  const projectName = options.name;
  const locationMessage = projectName
    ? `Creating project "${projectName}" from template "${templateName}"`
    : `Creating project in current directory from template "${templateName}"`;

  console.log(chalk.blue(`\n🚀 ${locationMessage}\n`));

  let spinner = ora("Cloning template repository...");

  const result = await scaffoldFromTemplate(
    {
      templateName,
      projectName: options.name,
      cwd: process.cwd(),
    },
    (progress) => {
      if (progress.phase === "validated" && progress.warnedNonEmptyCwd) {
        console.log(
          chalk.yellow(
            "Current directory is not empty. This will add template files to the existing directory.",
          ),
        );
      }
      if (progress.phase === "materialize") {
        spinner.start();
      }
      if (progress.phase === "rename_package") {
        spinner.text = "Updating package.json...";
      }
    },
  );

  if (!result.ok) {
    spinner.stop();
    switch (result.code) {
      case "template_not_found":
        console.log(chalk.red(result.message));
        if (result.availableTemplateNames?.length) {
          console.log(chalk.gray("Available templates:"));
          result.availableTemplateNames.forEach((name) =>
            console.log(chalk.gray(`  - ${name}`)),
          );
        }
        process.exit(1);
        break;
      case "invalid_project_name":
        console.log(
          chalk.red(
            `Invalid project name: ${result.validationErrors?.join(", ") ?? result.message}`,
          ),
        );
        process.exit(1);
        break;
      case "target_directory_exists":
        console.log(chalk.red(result.message));
        process.exit(1);
        break;
      case "materialize_failed":
        spinner.fail("Failed to create project");
        console.error(chalk.red("Error:"), result.message);
        process.exit(1);
        break;
    }
    return;
  }

  spinner.succeed("Template cloned successfully (repoless)");
  if (result.renamedPackage) {
    console.log(chalk.green("Package.json updated with new project name"));
  }

  const successMessage = result.projectName
    ? `\n✅ Successfully created project "${result.projectName}"!`
    : `\n✅ Successfully created project in current directory!`;

  console.log(chalk.green.bold(successMessage));
}