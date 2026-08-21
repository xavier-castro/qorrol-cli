import { test } from "node:test";
import assert from "node:assert/strict";
import { isJsonMode, jsonError, jsonSuccess } from "./output.js";

test("jsonSuccess envelope is { ok, command, data }", () => {
  assert.deepEqual(jsonSuccess("list", { templates: [] }), {
    ok: true,
    command: "list",
    data: { templates: [] },
  });
});

test("jsonError omits details when absent", () => {
  assert.deepEqual(jsonError("template_not_found", "missing"), {
    ok: false,
    error: { code: "template_not_found", message: "missing" },
  });
});

test("jsonError includes details when provided", () => {
  const payload = jsonError("invalid_project_name", "bad", {
    validationErrors: ["spaces"],
  });
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.error.details, { validationErrors: ["spaces"] });
});

test("isJsonMode walks parent chain for nested commands", () => {
  assert.equal(isJsonMode({ json: true }), true);
  assert.equal(isJsonMode({}), false);
  assert.equal(
    isJsonMode(
      {},
      { parent: { opts: () => ({ json: true }) } },
    ),
    true,
  );
  assert.equal(
    isJsonMode(
      {},
      {
        opts: () => ({}),
        parent: {
          opts: () => ({}),
          parent: { opts: () => ({ json: true }) },
        },
      },
    ),
    true,
  );
});
