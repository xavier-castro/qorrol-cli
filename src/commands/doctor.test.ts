import { test } from "node:test";
import assert from "node:assert/strict";
import { collectDoctorReport, CLI_VERSION } from "./doctor.js";
import { createInlineRegistry } from "../registry/inline-registry.js";

const registry = createInlineRegistry([
  {
    name: "fixture",
    description: "fixture",
    repo: "https://example.com/fixture.git",
  },
]);

test("doctor: reports missing GitHub auth without failing required checks", async () => {
  const report = await collectDoctorReport({
    registry,
    env: {},
    nodeVersion: "v22.0.0",
    osPlatform: "darwin",
    runner: async (file) => {
      if (file === "git") return { ok: true, stdout: "git version 2.50.0\n" };
      if (file === "gh") return { ok: false, stdout: "" };
      return { ok: false, stdout: "" };
    },
  });

  assert.equal(report.version, CLI_VERSION);
  assert.equal(report.ready, true);
  assert.equal(report.authRequired, false);
  assert.equal(report.github.source, "missing");
  assert.equal(report.github.tokenAvailable, false);
  assert.equal(report.github.ghAvailable, false);
  assert.deepEqual(report.templates.names, ["fixture"]);
  const auth = report.checks.find((c) => c.name === "github_auth");
  assert.equal(auth?.ok, false);
  assert.equal(auth?.required, false);
  assert.equal(auth?.source, "missing");
});

test("doctor: GH_TOKEN is reported as env and never echoed", async () => {
  const report = await collectDoctorReport({
    registry,
    env: { GH_TOKEN: "secret-should-not-leak" },
    nodeVersion: "v20.11.0",
    osPlatform: "linux",
    runner: async (file) => {
      if (file === "git") return { ok: true, stdout: "git version 2.50.0\n" };
      if (file === "gh") return { ok: true, stdout: "gh version 2.0.0\n" };
      return { ok: false, stdout: "" };
    },
  });

  assert.equal(report.github.source, "env");
  assert.equal(report.github.tokenAvailable, true);
  const blob = JSON.stringify(report);
  assert.equal(blob.includes("secret-should-not-leak"), false);
  const ps = report.checks.find((c) => c.name === "ps");
  assert.equal(ps?.ok, false);
  assert.equal(ps?.required, false);
});

test("doctor: gh auth status is provider, not a token", async () => {
  const report = await collectDoctorReport({
    registry,
    env: {},
    nodeVersion: "v22.0.0",
    osPlatform: "darwin",
    runner: async (file, args) => {
      if (file === "git") return { ok: true, stdout: "git version 2.50.0\n" };
      if (file === "gh" && args[0] === "--version") {
        return { ok: true, stdout: "gh version 2.0.0\n" };
      }
      if (file === "gh" && args[0] === "auth") {
        return { ok: true, stdout: "Logged in to github.com\n" };
      }
      return { ok: false, stdout: "" };
    },
  });
  assert.equal(report.github.source, "provider");
  assert.equal(report.github.tokenAvailable, false);
  assert.equal(report.github.ghAvailable, true);
});

test("doctor: node below 18 fails required check", async () => {
  const report = await collectDoctorReport({
    registry,
    env: {},
    nodeVersion: "v16.20.0",
    osPlatform: "darwin",
    runner: async () => ({ ok: true, stdout: "ok\n" }),
  });
  assert.equal(report.ready, false);
  const node = report.checks.find((c) => c.name === "node");
  assert.equal(node?.ok, false);
  assert.equal(node?.required, true);
});
