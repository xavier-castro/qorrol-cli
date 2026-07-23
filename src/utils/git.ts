import path from "path";
import fs from "fs-extra";
import simpleGit from "simple-git";
import type { Template } from "../types/index.js";

type CloneFn = (
  repo: string,
  target: string,
  options: { branch?: string },
) => Promise<void>;

const defaultClone: CloneFn = async (repo, target, options) => {
  const git = simpleGit();
  await git.clone(repo, target, {
    "--branch": options.branch || "main",
    "--single-branch": null,
    "--depth": "1",
  });
};

export interface CloneRepositoryOptions {
  /**
   * Override the underlying clone call. Defaults to a `simple-git` clone of
   * `template.repo` into the target dir with `--depth 1 --single-branch`.
   */
  clone?: CloneFn;
}

export async function cloneRepository(
  template: Template,
  targetDir: string,
  options: CloneRepositoryOptions = {},
): Promise<void> {
  const clone = options.clone ?? defaultClone;

  // If cloning to the current directory, materialize into a unique temp
  // directory first, then move the contents into place. This avoids:
  //   1) collisions with a stale `.temp-clone` already in the user's cwd
  //   2) a half-cloned dir left behind if the clone throws mid-flight
  const isCurrentDir = targetDir === process.cwd();
  const cloneTarget = isCurrentDir
    ? await fs.mkdtemp(path.join(targetDir, ".qorrol-clone-"))
    : targetDir;

  try {
    await clone(template.repo, cloneTarget, { branch: template.branch });

    // Strip the cloned .git so the new project is "repoless" until re-init.
    const clonedGitDir = path.join(cloneTarget, ".git");
    if (await fs.pathExists(clonedGitDir)) {
      await fs.remove(clonedGitDir);
    }

    if (isCurrentDir) {
      const tempContents = await fs.readdir(cloneTarget);
      for (const item of tempContents) {
        const srcPath = path.join(cloneTarget, item);
        const destPath = path.join(targetDir, item);
        await fs.move(srcPath, destPath, { overwrite: true });
      }
    }
  } finally {
    if (isCurrentDir) {
      // Best-effort cleanup; the dir may already be gone on the happy path.
      await fs.remove(cloneTarget).catch(() => undefined);
    }
  }
}
