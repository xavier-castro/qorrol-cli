// Regression for cloneRepository: the temp clone dir must be cleaned up
// when the underlying git clone throws, so a failed create does not leave
// stray `.temp-clone` directories in the user's project dir.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { cloneRepository } from "./git.js";
import type { Template } from "../types/index.js";

function tmpCwd(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "qorrol-clone-test-"));
}

const fakeTemplate: Template = {
  name: "fake",
  description: "fake template",
  repo: "https://example.invalid/repo.git",
  branch: "main",
  category: "Test",
};

test("cloneRepository cleans up temp dir when the clone throws", async () => {
  const cwd = tmpCwd();
  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    // Inject a clone function that throws, simulating network/branch failures.
    await assert.rejects(
      () =>
        cloneRepository(fakeTemplate, cwd, {
          clone: async () => {
            throw new Error("simulated git failure");
          },
        }),
      /simulated git failure/,
    );

    // The temp clone dir must NOT remain in the user's cwd.
    const stray = await fs.readdir(cwd);
    assert.deepEqual(
      stray,
      [],
      `expected empty cwd after failure, found: ${stray.join(", ")}`,
    );
  } finally {
    process.chdir(previousCwd);
    await fs.remove(cwd);
  }
});

test("cloneRepository does not reuse a stale .temp-clone dir", async () => {
  const cwd = tmpCwd();
  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    // Pre-seed a stale .temp-clone dir to prove we use a unique temp location.
    await fs.ensureDir(path.join(cwd, ".temp-clone"));
    await fs.writeFile(
      path.join(cwd, ".temp-clone", "sentinel.txt"),
      "stale",
    );

    await assert.rejects(
      () =>
        cloneRepository(fakeTemplate, cwd, {
          clone: async () => {
            throw new Error("simulated git failure");
          },
        }),
      /simulated git failure/,
    );

    // The stale sentinel must still be there (we didn't touch it), and no
    // new temp dirs were left behind.
    const sentinel = await fs.readFile(
      path.join(cwd, ".temp-clone", "sentinel.txt"),
      "utf8",
    );
    assert.equal(sentinel, "stale");
    const stray = (await fs.readdir(cwd)).filter(
      (n) => n !== ".temp-clone",
    );
    assert.deepEqual(stray, [], `unexpected leftover entries: ${stray.join(", ")}`);
  } finally {
    process.chdir(previousCwd);
    await fs.remove(cwd);
  }
});
