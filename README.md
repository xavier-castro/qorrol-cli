# qorrol CLI

CLI for scaffolding projects from curated templates, taking a bounded process snapshot, and driving GitHub issues via `gh`.

## Installation

```bash
npm install -g qorrol
```

Or use without installing:

```bash
npx qorrol@latest
```

## Usage

```bash
qorrol --help
qorrol --json doctor
qorrol --json list
qorrol --json resolve saas-kit
qorrol create saas-kit --name my-awesome-app --dry-run
qorrol create saas-kit --name my-awesome-app
qorrol --json issues list --limit 20
qorrol --json ps -e vite,watch
```

`--json` may be passed globally (`qorrol --json doctor`) or on the command (`qorrol doctor --json`).

### Shell completions

Generate a completion script for your shell, then `source` it (or save it where your shell loads from):

```bash
# bash
qorrol completion bash > ~/.qorrol-completion.bash
echo 'source ~/.qorrol-completion.bash' >> ~/.bashrc

# zsh
qorrol completion zsh > "${fpath[1]}/_qorrol"
# then run: autoload -U compinit && compinit

# fish
qorrol completion fish > ~/.config/fish/completions/qorrol.fish
```

## JSON policy

Under `--json`, stdout is a single JSON value and nothing else. Spinners, warnings, and `gh` diagnostics go to stderr. Tokens are never printed.

Success envelope:

```json
{ "ok": true, "command": "list", "data": { } }
```

Error envelope (nonzero exit):

```json
{ "ok": false, "error": { "code": "template_not_found", "message": "...", "details": { } } }
```

`details` is omitted when empty. `doctor` uses the success envelope even when optional GitHub auth is missing; `data.ready` is false only when a required check (Node ≥ 18, git, non-empty template registry) fails.

Command families:

| command | `data` |
| --- | --- |
| `doctor` | version, checks, templates, github `{ tokenAvailable, source, ghAvailable }` |
| `list` | `{ templates, count }` |
| `resolve` | the template record (`name`, `description`, `repo`, `branch`, `category`) |
| `create` | `{ template, targetDir, projectName, renamedPackage, dryRun, ... }` |
| `ps` | `{ processes: [{ pid, command }], count }` |
| `issues.*` | issues, attention buckets, or the write preview |
| `request` | `{ args, kind, body }` (`body` is parsed JSON when `gh` printed JSON) |

## Commands

- **doctor** — Node, git, templates, `ps` platform support, optional `gh` + GitHub auth (`env` / `provider` / `missing`). Auth is not required.
- **list** / **resolve** — discover and resolve curated templates.
- **create** — clone a template (strips `.git`, optional `package.json` rename). `--dry-run` validates without writing.
- **ps** — macOS-only bounded snapshot. `-e/--exclude`, `-t/--timeout`.
- **issues** — `list`, `view`, `attention`, `comment`, `label`, `close`. Writes accept `--dry-run`. Requires `gh` and a git checkout.
- **request** — raw `gh` passthrough. Mutating verbs need `--write`.

Agent-oriented walkthrough: [docs/agents/cli.md](docs/agents/cli.md).

Templates are defined in `src/registry/inline-registry.ts`.

## Programmatic API

The same building blocks are also exported as subpath imports for use in other Node tooling:

```ts
import { createGhIssueTrackerBundle } from "qorrol/issue-tracker";
import { getRunningProcesses } from "qorrol/processes";
import { attentionBuckets } from "qorrol/triage";
```

## Local development (npm link)

To run your local checkout as the `qorrol` command instead of the published package:

```bash
# 1. Build first — bin/qorrol is a shim that imports ../dist/index.js,
#    so the CLI won't run until dist/ exists
pnpm install
pnpm run build

# 2a. Symlink into ~/.local/bin (preferred for agents)
make install-local

# 2b. Or register the checkout as a global npm/pnpm link
pnpm link --global

# 3. Verify it resolves outside this folder
command -v qorrol
qorrol --help
qorrol --json doctor
```

While iterating, keep the build fresh in another terminal so every `qorrol` invocation picks up your changes:

```bash
npm run dev   # tsc --watch
```

To consume the library subpath exports (`qorrol/issue-tracker`, `qorrol/processes`, etc.) from another local project, link it there:

```bash
cd /path/to/other-project
npm link qorrol
```

When you're done, unlink to go back to the published package:

```bash
# in the consuming project (if you linked it there)
npm unlink qorrol

# in the qorrol-cli checkout — removes the global link
npm unlink -g qorrol
```

> **Note:** `npx qorrol` may still resolve the published package from the npm cache. Use the linked `qorrol` binary directly when testing local changes.

## License

MIT
