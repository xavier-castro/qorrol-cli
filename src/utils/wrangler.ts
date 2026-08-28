import path from "path";
import fs from "fs-extra";
import { parse, modify, applyEdits } from "jsonc-parser";

interface WranglerConfig {
  name?: string;
  env?: {
    [envName: string]: {
      name?: string;
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

/**
 * Rewrite the top-level `name` field in a wrangler.jsonc or wrangler.toml file.
 * For JSONC files, preserves comments. For TOML files, uses simple string replacement
 * of the name = "..." line.
 */
export async function rewriteWranglerName(
  wranglerPath: string,
  newName: string,
): Promise<void> {
  const content = await fs.readFile(wranglerPath, "utf8");
  const ext = path.extname(wranglerPath);

  if (ext === ".jsonc" || ext === ".json") {
    const edits = modify(content, ["name"], newName, {});
    const updated = applyEdits(content, edits);
    await fs.writeFile(wranglerPath, updated, "utf8");
  } else if (ext === ".toml") {
    const nameRegex = /^name\s*=\s*"[^"]*"/m;
    if (nameRegex.test(content)) {
      const updated = content.replace(nameRegex, `name = "${newName}"`);
      await fs.writeFile(wranglerPath, updated, "utf8");
    }
  }
}

/**
 * Find all wrangler.jsonc and wrangler.toml files in a directory tree,
 * excluding node_modules and .git.
 */
export async function findWranglerFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.name === "wrangler.jsonc" ||
        entry.name === "wrangler.toml"
      ) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

/**
 * Rewrite wrangler names in a scaffolded project.
 *
 * - For wrangler files under apps/<appDir>/, set name to `{projectName}-{appDir}`
 * - For wrangler at repo root (no apps/), set name to `{projectName}`
 */
export async function rewriteWranglerNames(
  targetDir: string,
  projectName: string,
): Promise<number> {
  const wranglerFiles = await findWranglerFiles(targetDir);
  let rewritten = 0;

  for (const wranglerPath of wranglerFiles) {
    const relativePath = path.relative(targetDir, wranglerPath);
    const parts = relativePath.split(path.sep);

    let newName: string;
    if (parts[0] === "apps" && parts.length >= 3) {
      const appDir = parts[1];
      newName = `${projectName}-${appDir}`;
    } else if (
      parts.length === 1 &&
      (parts[0] === "wrangler.jsonc" || parts[0] === "wrangler.toml")
    ) {
      newName = projectName;
    } else {
      continue;
    }

    await rewriteWranglerName(wranglerPath, newName);
    rewritten++;
  }

  return rewritten;
}
