# qorrol-cli — domain glossary

## Issue tracker (in code)

**IssueTracker** — Module at `src/issue-tracker/` (package export `qorrol/issue-tracker`). Callers use `IssueTracker` + `createGhIssueTrackerBundle(cwd)`; **GhIssueTracker** spawns `gh`; **InMemoryIssueTracker** for tests.

**IssueRecord** — Normalized view of one issue (or PR when enabled later): number, title, labels, author, timestamps, comment summaries. Produced by IssueTracker list/view; consumed by TriageAttention.

**TriageAttention** — Pure module: given open IssueRecords and label vocabulary from `docs/agents/triage-labels.md`, returns the three “needs attention” buckets (unlabeled, `needs-triage`, `needs-info` with reporter activity since last triage notes). No `gh` calls inside.

**Triage role** — Canonical state from the triage skill (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Tracker label strings are mapped via `docs/agents/triage-labels.md` (defaults 1:1).

## CLI (existing)

**Template** — Curated scaffold source (name, repo URL, description). Registry in code today; not the issue tracker.

**Scaffold** — Deep module: validate name/dir → materialize template → optional `package.json` rename. Interface is `scaffoldFromTemplate` + `ScaffoldResult`.