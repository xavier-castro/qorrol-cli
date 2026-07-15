import type { Template } from "../types/index.js";

/** Materializes template bytes into targetDir (git clone, fixture copy, etc.). */
export type TemplateMaterializer = (
  template: Template,
  targetDir: string,
) => Promise<void>;

export interface ScaffoldInput {
  templateName: string;
  /** When set, scaffold into a new directory with this npm-safe name. */
  projectName?: string;
  cwd: string;
  materialize?: TemplateMaterializer;
}

export type ScaffoldFailureCode =
  | "template_not_found"
  | "invalid_project_name"
  | "target_directory_exists"
  | "materialize_failed";

export type ScaffoldResult =
  | {
      ok: true;
      template: Template;
      targetDir: string;
      projectName?: string;
      renamedPackage: boolean;
      warnedNonEmptyCwd: boolean;
    }
  | {
      ok: false;
      code: ScaffoldFailureCode;
      message: string;
      availableTemplateNames?: string[];
      validationErrors?: string[];
    };

export type ScaffoldProgress =
  | { phase: "validated"; warnedNonEmptyCwd: boolean }
  | { phase: "materialize" }
  | { phase: "rename_package" };