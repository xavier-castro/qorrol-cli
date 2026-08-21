import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGhArgs } from "./request.js";

test("classifyGhArgs: issue list/view are reads", () => {
  assert.equal(classifyGhArgs(["issue", "list"]), "read");
  assert.equal(classifyGhArgs(["issue", "view", "12"]), "read");
  assert.equal(classifyGhArgs(["api", "repos/o/r/issues"]), "read");
});

test("classifyGhArgs: comment/close/create/edit are writes", () => {
  assert.equal(classifyGhArgs(["issue", "comment", "12", "--body", "hi"]), "write");
  assert.equal(classifyGhArgs(["issue", "close", "12"]), "write");
  assert.equal(classifyGhArgs(["issue", "create", "--title", "x"]), "write");
  assert.equal(classifyGhArgs(["issue", "edit", "12", "--add-label", "x"]), "write");
});

test("classifyGhArgs: gh api -X POST is a write", () => {
  assert.equal(classifyGhArgs(["api", "-X", "POST", "repos/o/r/issues"]), "write");
  assert.equal(classifyGhArgs(["api", "--method", "PATCH", "repos/o/r/issues/1"]), "write");
  assert.equal(classifyGhArgs(["api", "-X", "GET", "user"]), "read");
});
