import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCompletionScript,
  listSupportedShells,
} from "./completion.js";
import { inlineRegistry } from "../registry/inline-registry.js";

test("completion: supported shells are bash, zsh, fish", () => {
  assert.deepEqual(listSupportedShells(), ["bash", "zsh", "fish"]);
});

test("completion: bash script registers _qorrol_completion and wires `complete`", () => {
  const out = getCompletionScript("bash", inlineRegistry);
  assert.ok(out.includes("_qorrol_completion"));
  assert.ok(out.includes("complete -F _qorrol_completion qorrol"));
  // Top-level commands
  assert.ok(out.includes("create"));
  assert.ok(out.includes("list"));
  assert.ok(out.includes("ps"));
  assert.ok(out.includes("doctor"));
  assert.ok(out.includes("resolve"));
  assert.ok(out.includes("issues"));
  assert.ok(out.includes("request"));
  // Each template name appears in the suggestion set
  for (const t of inlineRegistry.list()) {
    assert.ok(out.includes(t.name), `bash script missing template ${t.name}`);
  }
});

test("completion: zsh script declares #compdef qorrol and lists templates", () => {
  const out = getCompletionScript("zsh", inlineRegistry);
  assert.ok(out.includes("#compdef qorrol"));
  for (const t of inlineRegistry.list()) {
    assert.ok(out.includes(t.name), `zsh script missing template ${t.name}`);
  }
});

test("completion: fish script lists subcommands and templates", () => {
  const out = getCompletionScript("fish", inlineRegistry);
  assert.ok(out.includes("complete -c qorrol"));
  for (const t of inlineRegistry.list()) {
    assert.ok(out.includes(t.name), `fish script missing template ${t.name}`);
  }
});

test("completion: throws on unsupported shell with a helpful message", () => {
  assert.throws(
    () => getCompletionScript("powershell", inlineRegistry),
    /Unsupported shell "powershell"/,
  );
});
