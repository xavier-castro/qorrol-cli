import path from "path";
import fs from "fs-extra";
import { cloneRepository } from "../utils/git.js";
import {
  validateProjectName,
  checkDirectoryExists,
  isDirectoryEmpty,
} from "../utils/validation.js";
import type {
  ScaffoldInput,
  ScaffoldProgress,
  ScaffoldResult,
  TemplateMaterializer,
} from "./types.js";

const defaultMaterialize: TemplateMaterializer = (template, targetDir) =>
  cloneRepository(template, targetDir);

export async function scaffoldFromTemplate(
  input: ScaffoldInput,
  onProgress?: (progress: ScaffoldProgress) => void,
): Promise<ScaffoldResult> {
  const materialize = input.materialize ?? defaultMaterialize;

  const template = input.registry.resolve(input.templateName);
  if (!template) {
    return {
      ok: false,
      code: "template_not_found",
      message: `Template "${input.templateName}" not found`,
      availableTemplateNames: input.registry.list().map((t) => t.name),
    };
  }

  const projectName = input.projectName;
  const targetDir = projectName
    ? path.resolve(input.cwd, projectName)
    : input.cwd;

  if (projectName) {
    const nameValidation = validateProjectName(projectName);
    if (!nameValidation.valid) {
      return {
        ok: false,
        code: "invalid_project_name",
        message: "Invalid project name",
        validationErrors: nameValidation.errors,
      };
    }
  }

  let warnedNonEmptyCwd = false;
  const dirExists = await checkDirectoryExists(targetDir);
  if (dirExists && !projectName) {
    const isEmpty = await isDirectoryEmpty(targetDir);
    if (!isEmpty) {
      warnedNonEmptyCwd = true;
    }
  } else if (dirExists && projectName) {
    return {
      ok: false,
      code: "target_directory_exists",
      message: `Directory "${projectName}" already exists`,
    };
  }

  onProgress?.({ phase: "validated", warnedNonEmptyCwd });

  onProgress?.({ phase: "materialize" });
  try {
    await materialize(template, targetDir);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: "materialize_failed",
      message,
    };
  }

  let renamedPackage = false;
  if (projectName) {
    const packageJsonPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      onProgress?.({ phase: "rename_package" });
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = projectName;
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      renamedPackage = true;
    }
  }

  return {
    ok: true,
    template,
    targetDir,
    projectName,
    renamedPackage,
    warnedNonEmptyCwd,
  };
}