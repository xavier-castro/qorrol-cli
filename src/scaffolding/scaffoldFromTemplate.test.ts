import { test } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";
import fs from "fs-extra";
import type { Template } from "../types/index.js";
import type { TemplateRegistry } from "../registry/types.js";
import { createInlineRegistry } from "../registry/inline-registry.js";
import { scaffoldFromTemplate } from "./scaffoldFromTemplate.js";

const TEMPLATE: Template = {
  name: "fixture",
  description: "fixture template",
  repo: "https://example.com/fixture.git",
  branch: "main",
};

function makeRegistry(templates: Template[] = [TEMPLATE]): TemplateRegistry {
  return createInlineRegistry(templates);
}

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "qorrol-scaffold-test-"));
}

test("scaffoldFromTemplate: ok path with materialize injection and package.json rename", async () => {
  const cwd = await tmpDir();
  try {
    let materialized = "";
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "my-app",
      cwd,
      registry: makeRegistry(),
      materialize: async (_t, targetDir) => {
        materialized = targetDir;
        await fs.ensureDir(targetDir);
        await fs.writeJson(path.join(targetDir, "package.json"), {
          name: "fixture-template",
          version: "0.0.0",
        });
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(materialized, path.join(cwd, "my-app"));
    assert.equal(result.renamedPackage, true);
    assert.equal(result.renamedWranglers, 0);
    assert.equal(result.projectName, "my-app");
    const pkg = await fs.readJson(path.join(cwd, "my-app", "package.json"));
    assert.equal(pkg.name, "my-app");
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: template_not_found returns the registry's available names", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: "missing",
      cwd,
      registry: makeRegistry(),
      materialize: async () => {},
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "template_not_found");
    assert.deepEqual(result.availableTemplateNames, [TEMPLATE.name]);
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: invalid_project_name for non-npm-safe names", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "Has Spaces",
      cwd,
      registry: makeRegistry(),
      materialize: async () => {
        throw new Error("materialize must not be called");
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "invalid_project_name");
    assert.ok(
      result.validationErrors && result.validationErrors.length > 0,
      "validationErrors surfaces the npm-name validator output",
    );
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: target_directory_exists when projectName dir is taken", async () => {
  const cwd = await tmpDir();
  try {
    await fs.ensureDir(path.join(cwd, "taken"));
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "taken",
      cwd,
      registry: makeRegistry(),
      materialize: async () => {
        throw new Error("materialize must not be called");
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "target_directory_exists");
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: materialize_failed surfaces the upstream error", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      cwd,
      registry: makeRegistry(),
      materialize: async () => {
        throw new Error("network down");
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "materialize_failed");
    assert.match(result.message, /network down/);
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: warns on non-empty cwd when no projectName given", async () => {
  const cwd = await tmpDir();
  try {
    await fs.writeFile(path.join(cwd, "stray.txt"), "x");
    let materializedTo = "";
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      cwd,
      registry: makeRegistry(),
      materialize: async (_t, targetDir) => {
        materializedTo = targetDir;
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.warnedNonEmptyCwd, true);
    assert.equal(materializedTo, cwd);
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: dryRun skips materialize after validation", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "preview-app",
      cwd,
      registry: makeRegistry(),
      dryRun: true,
      materialize: async () => {
        throw new Error("materialize must not be called");
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.dryRun, true);
    assert.equal(result.renamedPackage, false);
    assert.equal(result.renamedWranglers, 0);
    assert.equal(result.projectName, "preview-app");
    assert.equal(result.targetDir, path.join(cwd, "preview-app"));
    assert.equal(await fs.pathExists(result.targetDir), false);
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: progress emits validated, materialize, rename_package, rename_wranglers", async () => {
  const cwd = await tmpDir();
  try {
    const phases: string[] = [];
    await scaffoldFromTemplate(
      {
        templateName: TEMPLATE.name,
        projectName: "p",
        cwd,
        registry: makeRegistry(),
        materialize: async (_t, targetDir) => {
          await fs.ensureDir(targetDir);
          await fs.writeJson(path.join(targetDir, "package.json"), {
            name: "fixture",
          });
        },
      },
      (p) => phases.push(p.phase),
    );
    assert.deepEqual(phases, [
      "validated",
      "materialize",
      "rename_package",
      "rename_wranglers",
    ]);
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: rewrites wrangler names in saas-kit monorepo pattern", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "valenteer-accounting",
      cwd,
      registry: makeRegistry(),
      materialize: async (_t, targetDir) => {
        await fs.ensureDir(targetDir);
        await fs.ensureDir(path.join(targetDir, "apps", "user-application"));
        await fs.ensureDir(path.join(targetDir, "apps", "data-service"));

        await fs.writeJson(path.join(targetDir, "package.json"), {
          name: "saas-kit-template",
        });

        await fs.writeJson(
          path.join(targetDir, "apps", "user-application", "wrangler.jsonc"),
          {
            name: "saas-kit-user-application",
            main: "src/index.ts",
          },
        );

        await fs.writeJson(
          path.join(targetDir, "apps", "data-service", "wrangler.jsonc"),
          {
            name: "saas-kit-data-service",
            main: "src/index.ts",
          },
        );
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.renamedPackage, true);
    assert.equal(result.renamedWranglers, 2);

    const userAppWrangler = await fs.readJson(
      path.join(cwd, "valenteer-accounting", "apps", "user-application", "wrangler.jsonc"),
    );
    const dataServiceWrangler = await fs.readJson(
      path.join(cwd, "valenteer-accounting", "apps", "data-service", "wrangler.jsonc"),
    );

    assert.equal(userAppWrangler.name, "valenteer-accounting-user-application");
    assert.equal(dataServiceWrangler.name, "valenteer-accounting-data-service");
  } finally {
    await fs.remove(cwd);
  }
});

test("scaffoldFromTemplate: rewrites wrangler name at repo root", async () => {
  const cwd = await tmpDir();
  try {
    const result = await scaffoldFromTemplate({
      templateName: TEMPLATE.name,
      projectName: "my-single-worker",
      cwd,
      registry: makeRegistry(),
      materialize: async (_t, targetDir) => {
        await fs.ensureDir(targetDir);

        await fs.writeJson(path.join(targetDir, "package.json"), {
          name: "template-name",
        });

        await fs.writeJson(path.join(targetDir, "wrangler.jsonc"), {
          name: "template-name",
          main: "src/index.ts",
        });
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.renamedPackage, true);
    assert.equal(result.renamedWranglers, 1);

    const wrangler = await fs.readJson(
      path.join(cwd, "my-single-worker", "wrangler.jsonc"),
    );

    assert.equal(wrangler.name, "my-single-worker");
  } finally {
    await fs.remove(cwd);
  }
});
