# qorrol-cli — domain glossary

## Issue tracker (in code)

**IssueTracker** — Module at `src/issue-tracker/` (package export `qorrol/issue-tracker`). Callers use `IssueTracker` + `createGhIssueTrackerBundle(cwd)`; **GhIssueTracker** spawns `gh`; **InMemoryIssueTracker** for tests.

**IssueRecord** — Normalized view of one issue (or PR when enabled later): number, title, labels, author, timestamps, comment summaries. Produced by IssueTracker list/view; consumed by TriageAttention.

**TriageAttention** — Pure module: given open IssueRecords and label vocabulary from `docs/agents/triage-labels.md`, returns the three “needs attention” buckets (unlabeled, `needs-triage`, `needs-info` with reporter activity since last triage notes). No `gh` calls inside.

**Triage role** — Canonical state from the triage skill (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Tracker label strings are mapped via `docs/agents/triage-labels.md` (defaults 1:1).

## CLI (existing)

**Template** — Curated scaffold source (name, repo URL, description). Defined as data; resolved through a `TemplateRegistry`.

**TemplateRegistry** — Read-only source of `Template`s: `list()` and `resolve(name)`. The `InlineRegistry` adapter (`src/registry/inline-registry.ts`) is the curated default; future adapters (local-path, npm) plug in via the same interface. Four call sites converge on it: `scaffoldFromTemplate`, `commands/list`, `commands/completion`, `src/index.ts` (wiring).

**Scaffold** — Deep module: validate name/dir → materialize template → optional `package.json` rename. Interface is `scaffoldFromTemplate` + `ScaffoldResult`. Takes a `TemplateRegistry` (no module-global default) and an optional `TemplateMaterializer`; default materializer is git clone.

**Nimbus** — Documentation-site framework (Astro + MDX, deployable to Cloudflare/Vercel/Netlify/Static). The `nimbus-site` template (`src/registry/inline-registry.ts`) scaffolds a Nimbus site via the same `scaffoldFromTemplate` flow as every other template.

**Template category** — Bookkeeping tag on `Template` (e.g. `SaaS`, `Docs`, `Marketing`). No consumer in `qorrol list`, completions, or the scaffolder today; carried on the type for parity with curated templates and to anchor future grouping/filtering if it lands.

**Landing-kit** — Marketing landing-page template for creating a client-facing site; it is scaffolded through the same Template and Scaffold flow as the other curated templates.

## Processes (in code)

**RunningProcess** — `{ pid, command }` row from a point-in-time OS snapshot. Produced by `getRunningProcesses`; not a live handle and never blocks on the target process.

**getRunningProcesses** — Module at `src/processes/` (export `qorrol/processes`). Bounded-time snapshot via platform backend (macOS: `ps -axo pid=,command=`). Optional `excludeCommandSubstrings` drops watcher/dev-server rows from the result without waiting on them.

**qorrol ps** — CLI command (`src/commands/ps.ts`): runs `getRunningProcesses`, prints PID + command or `--json` envelope `{ processes, count }`. Flags: `-e/--exclude`, `-t/--timeout`.

**qorrol doctor / resolve / issues / request** — Agent-facing commands. `doctor` reports setup without requiring auth. `resolve` turns a template name into a registry record. `issues` is the GitHub IssueTracker CLI (`list`, `view`, `attention`, writes with `--dry-run`). `request` is the raw `gh` hatch. Companion skill: `docs/agents/cli.md`.