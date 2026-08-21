# qorrol-cli — agent notes

## What this is

Node CLI + library. The CLI (`qorrol`) scaffolds projects from a curated template registry, ships a `ps` command for bounded process snapshots, and exposes GitHub issues (`qorrol issues …`) plus a raw `gh` hatch (`qorrol request`). Subpath exports also re-export the building blocks as a library:

- `qorrol` → `dist/index.js` (CLI entry, also the default library surface)
- `qorrol/issue-tracker` → `dist/issue-tracker/index.js`
- `qorrol/processes` → `dist/processes/index.js`
- `qorrol/triage` → `dist/triage/index.js`
- `qorrol/scaffolding` → `dist/scaffolding/index.js` (also re-exports `TemplateRegistry`, `inlineRegistry`)

`package.json` is `"type": "module"`, ESM, Node ≥ 18. `tsc` builds to `dist/`; `bin/qorrol` is a 1-line `import("../dist/index.js")` shim (no extension; shebang `#!/usr/bin/env node`) — always rebuild before running the binary.

## Commands

There is **no lint or formatter configured** (no eslint/prettier/biome in deps or CI). Don't add lint scripts unless asked. The verification surface is just two commands:

- `npm run build` — `tsc`; `*.test.ts` is excluded via `tsconfig.json`.
- `npm test` — `tsx --test src/**/*.test.ts` (built-in `node:test` runner, no Jest/Vitest).

Run a single file: `npx tsx --test src/processes/get-running-processes.test.ts`.
Run a single test by name: `npx tsx --test --test-name-pattern="..." src/.../*.test.ts`.

PR template (`.github/PULL_REQUEST_TEMPLATE.md`) asks for `npm run build` plus a manual `node dist/index.js list` / `create` smoke. CI (`.github/workflows/publish.yml`) publishes to npm on every push to `main`.

## Layout

```
src/
├── index.ts                  CLI entry (commander program); wires inlineRegistry
├── registry/                 TemplateRegistry interface + InlineRegistry adapter
├── commands/                 CLI command handlers (create, list, resolve, doctor, ps, issues, request, completion)
├── scaffolding/              scaffoldFromTemplate + types (takes a registry + optional materializer)
├── issue-tracker/            IssueTracker interface, GhIssueTracker, InMemoryIssueTracker, label map
├── processes/                getRunningProcesses + darwin platform backend
├── triage/                   attentionBuckets — pure, no I/O
└── utils/                    git, validation, JSON envelope (output.ts)
```

Module boundaries are enforced by package subpath exports — cross-boundary imports go through `dist/<module>/index.js`, never by reaching into `dist/<module>/file.js`.

## Quirks / things an agent would miss

- **`--json` envelope.** Success is `{ ok: true, command, data }` on stdout; errors are `{ ok: false, error: { code, message, details? } }` and a nonzero exit. Global `--json` walks parent commands (`qorrol --json issues list`). Progress stays on stderr. Policy is in the README.
- **`doctor` never requires GitHub auth.** Missing `gh` / tokens are optional checks (`source`: `env` | `provider` | `missing`). Tokens are never printed.
- **`create --dry-run`** validates and resolves but does not clone. **`issues comment|label|close --dry-run`** previews writes. **`request`** refuses mutating `gh` verbs unless `--write`.
- **`getRunningProcesses` is macOS-only.** `src/processes/platform/index.ts` throws `GetRunningProcessesError("unsupported_platform", ...)` for anything other than `darwin`. On Linux/Windows CI it will fail. The test seam is the `snapshot` option on `getRunningProcesses` / `snapshotPlatformProcesses` — pass an injectable `() => Promise<RunningProcess[]>` and don't shell out.
- **Default timeout is 5_000 ms** for the process snapshot (`src/processes/get-running-processes.ts`). Raise via `-t`/`--timeout` or `timeoutMs`.
- **Template registry is in code, not config.** `src/registry/inline-registry.ts` exports `inlineRegistry` (default) and `createInlineRegistry([...])` (factory). To add/remove a template, edit the `DEFAULT_TEMPLATES` array. Each entry needs `name`, `description`, `repo`, `branch`, `category`. `cloneRepository` in `src/utils/git.ts` does `--depth 1` and strips `.git` from the clone.
- **`scaffoldFromTemplate` mutates `package.json`** in the target dir when `--name` is supplied (sets `packageJson.name = projectName`). No-op if the template has no `package.json`.
- **Issue tracker requires `gh` CLI on PATH** and a git repo cwd. `resolveRepoContext` throws `not_in_repo` if `.git` is missing; `assertGhAvailable` throws `gh_not_found` if `gh --version` fails. `loadTriageLabelMap` parses `docs/agents/triage-labels.md` and falls back to the 1:1 default map if the file is absent.
- **Triage notes marker.** `attention.ts` treats any comment body containing `## Triage Notes` (case-insensitive) as a triage-notes marker; the `needs-info` bucket only fires when the reporter commented _after_ the latest such marker.

## Naming

The CLI is canonicalized on `qorrol`: `package.json` (`name: "qorrol"`, `bin: "qorrol"`), the binary is `bin/qorrol` (no extension, shebang `#!/usr/bin/env node`), and the README only refers to `qorrol`. Templates live under the `xavier-castro` GitHub account (see `src/registry/inline-registry.ts`).

## Skill routing (injected from system prompt, summarized here)

These are real and present in the repo:

### Task management — `td` (MANDATORY at session start)

- Run `td usage --new-session` at the start of every conversation (or after `/clear`); `td usage -q` for subsequent reads.
- Workflow: `td start <id>` → `td log` → `td handoff` → `td review` → reviewer `td approve`/`reject`. Multi-issue: `td ws start "name"`, `td ws tag`, `td ws handoff`.
- State lives in a local SQLite DB at `.todos/issues.db` (gitignored). Don't delete `.todos/`.

### Issue tracker

- GitHub Issues via `gh` CLI. Conventions in `docs/agents/issue-tracker.md`. Use `createGhIssueTrackerBundle(cwd)` from `qorrol/issue-tracker` for programmatic access.
- Map: `gh issue create` / `view <n>` / `list` / `comment` / `edit --add-label/--remove-label` / `close`. Inferred repo from `git remote -v` — must run inside a clone.

### Triage labels

- Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Mapping in `docs/agents/triage-labels.md` (currently 1:1, but that file is the override point).

### Domain docs

- Single-context layout. Glossary at root `CONTEXT.md` (IssueTracker, IssueRecord, TriageAttention, TriageRole, Template, Scaffold, RunningProcess, getRunningProcesses, `qorrol ps`). No `CONTEXT-MAP.md`, no `docs/adr/`. Use the glossary's vocabulary in issue titles, test names, refactor proposals.

### Wayfinding (when using `/wayfinder`)

- Map = single issue labelled `wayfinder:map`; child tickets are sub-issues or task-list items with `Part of #<map>`. Blocking uses GitHub native dependencies (`gh api .../issues/<child>/dependencies/blocked_by` with the blocker's **database id**, not `#number`). Frontier: list map's open children, drop any with an open blocker or assignee.
