import chalk from "chalk";
import { templates } from "../templates.js";

export async function listTemplates(): Promise<void> {
  console.log(chalk.blue.bold("\nAvailable Templates:\n"));

  templates.forEach((template) => {
    console.log(chalk.green(`  ${template.name}`));
    console.log(chalk.gray(`    ${template.description}`));
    console.log();
  });

  console.log(chalk.gray("Usage:"));
  console.log(
    chalk.gray(
<<<<<<< HEAD
      "  qorrol create <template-name>                # Create in current directory",
=======
      "  backpine create <template-name>                # Create in current directory",
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
    ),
  );
  console.log(
    chalk.gray(
<<<<<<< HEAD
      "  qorrol create <template-name> --name <name>  # Create in new directory",
=======
      "  backpine create <template-name> --name <name>  # Create in new directory",
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
    ),
  );
  console.log();
}
