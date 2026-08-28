import { test } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";
import fs from "fs-extra";
import {
  rewriteWranglerName,
  findWranglerFiles,
  rewriteWranglerNames,
} from "./wrangler.js";

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "qorrol-wrangler-test-"));
}

test("rewriteWranglerName: updates JSONC file preserving comments", async () => {
  const dir = await tmpDir();
  try {
    const wranglerPath = path.join(dir, "wrangler.jsonc");
    await fs.writeFile(
      wranglerPath,
      `{
  // Worker name
  "name": "old-name",
  "main": "src/index.ts"
}`,
      "utf8",
    );

    await rewriteWranglerName(wranglerPath, "new-name");
    const content = await fs.readFile(wranglerPath, "utf8");

    assert.match(content, /"name":\s*"new-name"/);
    assert.match(content, /\/\/ Worker name/);
    assert.match(content, /"main":\s*"src\/index\.ts"/);
  } finally {
    await fs.remove(dir);
  }
});

test("rewriteWranglerName: updates TOML file", async () => {
  const dir = await tmpDir();
  try {
    const wranglerPath = path.join(dir, "wrangler.toml");
    await fs.writeFile(
      wranglerPath,
      `name = "old-name"
main = "src/index.ts"`,
      "utf8",
    );

    await rewriteWranglerName(wranglerPath, "new-name");
    const content = await fs.readFile(wranglerPath, "utf8");

    assert.match(content, /name = "new-name"/);
    assert.match(content, /main = "src\/index\.ts"/);
  } finally {
    await fs.remove(dir);
  }
});

test("findWranglerFiles: discovers wrangler.jsonc and wrangler.toml, excludes node_modules and .git", async () => {
  const dir = await tmpDir();
  try {
    await fs.ensureDir(path.join(dir, "apps", "user-application"));
    await fs.ensureDir(path.join(dir, "apps", "data-service"));
    await fs.ensureDir(path.join(dir, "node_modules", "some-package"));
    await fs.ensureDir(path.join(dir, ".git"));

    await fs.writeFile(
      path.join(dir, "apps", "user-application", "wrangler.jsonc"),
      "{}",
    );
    await fs.writeFile(
      path.join(dir, "apps", "data-service", "wrangler.toml"),
      "",
    );
    await fs.writeFile(
      path.join(dir, "node_modules", "some-package", "wrangler.jsonc"),
      "{}",
    );
    await fs.writeFile(path.join(dir, ".git", "wrangler.jsonc"), "{}");

    const found = await findWranglerFiles(dir);
    const relative = found.map((f) => path.relative(dir, f)).sort();

    assert.deepEqual(relative, [
      path.join("apps", "data-service", "wrangler.toml"),
      path.join("apps", "user-application", "wrangler.jsonc"),
    ]);
  } finally {
    await fs.remove(dir);
  }
});

test("rewriteWranglerNames: saas-kit monorepo pattern with apps/<appDir>/wrangler.jsonc", async () => {
  const dir = await tmpDir();
  try {
    await fs.ensureDir(path.join(dir, "apps", "user-application"));
    await fs.ensureDir(path.join(dir, "apps", "data-service"));

    await fs.writeFile(
      path.join(dir, "apps", "user-application", "wrangler.jsonc"),
      `{ "name": "template-user-application" }`,
    );
    await fs.writeFile(
      path.join(dir, "apps", "data-service", "wrangler.jsonc"),
      `{ "name": "template-data-service" }`,
    );

    const rewritten = await rewriteWranglerNames(dir, "my-app");
    assert.equal(rewritten, 2);

    const userApp = await fs.readJson(
      path.join(dir, "apps", "user-application", "wrangler.jsonc"),
    );
    const dataService = await fs.readJson(
      path.join(dir, "apps", "data-service", "wrangler.jsonc"),
    );

    assert.equal(userApp.name, "my-app-user-application");
    assert.equal(dataService.name, "my-app-data-service");
  } finally {
    await fs.remove(dir);
  }
});

test("rewriteWranglerNames: single app at repo root", async () => {
  const dir = await tmpDir();
  try {
    await fs.writeFile(
      path.join(dir, "wrangler.jsonc"),
      `{ "name": "template-name" }`,
    );

    const rewritten = await rewriteWranglerNames(dir, "my-single-app");
    assert.equal(rewritten, 1);

    const config = await fs.readJson(path.join(dir, "wrangler.jsonc"));
    assert.equal(config.name, "my-single-app");
  } finally {
    await fs.remove(dir);
  }
});

test("rewriteWranglerNames: no wrangler files returns 0", async () => {
  const dir = await tmpDir();
  try {
    await fs.writeFile(path.join(dir, "package.json"), "{}");

    const rewritten = await rewriteWranglerNames(dir, "my-app");
    assert.equal(rewritten, 0);
  } finally {
    await fs.remove(dir);
  }
});
