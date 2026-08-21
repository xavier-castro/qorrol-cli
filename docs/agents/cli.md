# qorrol CLI — agent companion

Use the installed `qorrol` binary. Prefer `--json` for any output you will parse.

## Start

1. Confirm the command exists: `command -v qorrol`
2. Run `qorrol --json doctor` first. It does not require GitHub auth. It reports Node, git, curated templates, whether `qorrol ps` is supported, and GitHub auth as `env` / `provider` / `missing` without printing tokens.
3. Discover templates: `qorrol --json list`
4. Resolve a name to a stable record: `qorrol --json resolve saas-kit`

## Scaffold

Safe read/preview:

```bash
qorrol --json create saas-kit --name my-app --dry-run
```

Live write (clones the template, strips `.git`, optionally rewrites `package.json` name):

```bash
qorrol --json create saas-kit --name my-app
```

Do not run live `create` without `--dry-run` unless the user asked to scaffold.

## Issues (cwd must be a git clone; `gh` on PATH)

Safe reads:

```bash
qorrol --json issues list --limit 20
qorrol --json issues view 12
qorrol --json issues attention
```

Writes are one verb each. Preview first:

```bash
qorrol --json issues comment 12 --body "draft" --dry-run
qorrol --json issues label 12 --add ready-for-agent --remove needs-triage --dry-run
qorrol --json issues close 12 --comment "done" --dry-run
```

Do not comment, relabel, or close unless the user asked.

## Raw escape hatch

```bash
qorrol --json request issue view 12
```

Mutating `gh` verbs (`create`, `comment`, `close`, `edit`, `delete`, `api -X POST`, …) are refused unless `--write` is set. Do not pass `--write` without explicit user approval.

## Processes

```bash
qorrol --json ps -e vite,watch -t 5000
```

macOS only. Point-in-time snapshot; never waits on watchers.

## What not to do

- Do not print or log `GH_TOKEN` / `GITHUB_TOKEN`.
- Do not treat `request` as the main interface when `issues *` or `list` / `resolve` / `create` cover the job.
- Do not scaffold into a named directory that already exists.
