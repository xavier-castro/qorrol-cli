import { test } from "node:test";
import assert from "node:assert/strict";
import { createInlineRegistry } from "../registry/inline-registry.js";
import { resolveTemplate } from "./resolve.js";

test("resolve --json returns the template record", () => {
  const registry = createInlineRegistry([
    {
      name: "saas-kit",
      description: "SaaS",
      repo: "https://example.com/saas.git",
      branch: "main",
      category: "SaaS",
    },
  ]);
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    resolveTemplate("saas-kit", registry, true);
  } finally {
    process.stdout.write = orig;
  }
  const payload = JSON.parse(chunks.join("")) as {
    ok: boolean;
    command: string;
    data: { name: string; repo: string };
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.command, "resolve");
  assert.equal(payload.data.name, "saas-kit");
  assert.equal(payload.data.repo, "https://example.com/saas.git");
});
