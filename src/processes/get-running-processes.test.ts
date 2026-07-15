import { test } from "node:test";
import assert from "node:assert/strict";
import { getRunningProcesses } from "./get-running-processes.js";
import { GetRunningProcessesError } from "./types.js";
import { parsePsOutput } from "./platform/darwin.js";

test("parsePsOutput maps pid and command", () => {
  const out = parsePsOutput(
    "  42 /bin/zsh\n123 node /path/to/vite --watch\n",
  );
  assert.deepEqual(out, [
    { pid: 42, command: "/bin/zsh" },
    { pid: 123, command: "node /path/to/vite --watch" },
  ]);
});

test("getRunningProcesses uses injectable snapshot without blocking", async () => {
  const rows = await getRunningProcesses({
    snapshot: async () => [
      { pid: 1, command: "sleep 9999" },
      { pid: 2, command: "node watcher.js" },
    ],
    timeoutMs: 100,
  });
  assert.equal(rows.length, 2);
});

test("getRunningProcesses rejects when snapshot exceeds timeout", async () => {
  await assert.rejects(
    () =>
      getRunningProcesses({
        snapshot: () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve([{ pid: 1, command: "late" }]),
              200,
            );
          }),
        timeoutMs: 30,
      }),
    (err: unknown) => {
      assert.ok(err instanceof GetRunningProcessesError);
      assert.equal(err.code, "timeout");
      return true;
    },
  );
});

test("excludeCommandSubstrings filters watcher-like commands", async () => {
  const rows = await getRunningProcesses({
    snapshot: async () => [
      { pid: 10, command: "/usr/bin/node vite dev" },
      { pid: 11, command: "/bin/ps" },
    ],
    excludeCommandSubstrings: ["vite"],
  });
  assert.deepEqual(rows, [{ pid: 11, command: "/bin/ps" }]);
});