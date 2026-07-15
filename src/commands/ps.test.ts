import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExcludeList } from "./ps.js";
import { getRunningProcesses } from "../processes/index.js";

test("parseExcludeList splits comma and repeatable flags", () => {
  assert.deepEqual(parseExcludeList(["vite,watch", "webpack"]), [
    "vite",
    "watch",
    "webpack",
  ]);
});

test("CLI ps path: snapshot integration shape", async () => {
  const rows = await getRunningProcesses({
    snapshot: async () => [{ pid: 99, command: "qorrol ps" }],
  });
  assert.equal(rows[0].command, "qorrol ps");
});