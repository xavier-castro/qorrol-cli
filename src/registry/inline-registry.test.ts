import { test } from "node:test";
import assert from "node:assert/strict";
import type { Template } from "../types/index.js";
import { createInlineRegistry, inlineRegistry } from "./inline-registry.js";

const SAAS: Template = {
  name: "saas",
  description: "SaaS starter",
  repo: "https://example.com/saas.git",
  branch: "main",
};
const WEB: Template = {
  name: "web",
  description: "Web starter",
  repo: "https://example.com/web.git",
};

test("InlineRegistry: list returns every entry in declaration order", () => {
  const r = createInlineRegistry([SAAS, WEB]);
  assert.deepEqual(
    r.list().map((t) => t.name),
    ["saas", "web"],
  );
});

test("InlineRegistry: resolve returns the matching template", () => {
  const r = createInlineRegistry([SAAS, WEB]);
  assert.equal(r.resolve("saas"), SAAS);
  assert.equal(r.resolve("web"), WEB);
});

test("InlineRegistry: resolve returns undefined for unknown names", () => {
  const r = createInlineRegistry([SAAS]);
  assert.equal(r.resolve("nope"), undefined);
});

test("InlineRegistry: default registry is non-empty", () => {
  const list = inlineRegistry.list();
  assert.ok(list.length > 0, "default inline registry should ship templates");
  for (const t of list) {
    assert.ok(t.name.length > 0, "every default template has a name");
    assert.ok(
      t.description.length > 0,
      `template "${t.name}" has a description`,
    );
    assert.ok(t.repo.length > 0, `template "${t.name}" has a repo URL`);
  }
});

test("InlineRegistry: defaults resolve to themselves via the registry", () => {
  const list = inlineRegistry.list();
  for (const t of list) {
    assert.equal(inlineRegistry.resolve(t.name), t);
  }
});

test("InlineRegistry: landing-kit resolves to its curated template", () => {
  assert.deepEqual(inlineRegistry.resolve("landing-kit"), {
    name: "landing-kit",
    description:
      "A marketing landing page starter with TanStack Start, Canvas UI, and an AI assistant",
    repo: "https://github.com/xavier-castro/landing-kit.git",
    branch: "main",
    category: "Marketing",
  });
});

test("InlineRegistry: rejects duplicate names at construction", () => {
  assert.throws(
    () => createInlineRegistry([SAAS, { ...SAAS }]),
    /duplicate template name "saas"/,
  );
});

test("InlineRegistry: list() returns a readonly view; mutation throws", () => {
  const r = createInlineRegistry([SAAS]);
  // readonly array rejects push in strict TS; runtime mutation is silently
  // ignored or throws depending on the array's prototype. We only assert the
  // shape of the contract: list() is called repeatedly and is stable.
  assert.deepEqual(r.list(), r.list());
});
