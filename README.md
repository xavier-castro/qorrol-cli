# qorrol CLI

A powerful CLI tool for creating projects from curated templates. Get started quickly with modern, production-ready project templates.

## Installation

```bash
npm install -g qorrol
```

Or use without installing:

```bash
npx qorrol@latest
```

## Usage

### Create a new project

```bash
# Create project in current directory
qorrol create saas-kit
# or
npx qorrol@latest create saas-kit

# Create project in a new directory
qorrol create saas-kit --name my-awesome-app
# or
npx qorrol@latest create saas-kit --name my-awesome-app
```

### List available templates

```bash
qorrol list
```

### Get help

```bash
qorrol --help
qorrol create --help
```

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

## Available Templates

Run `qorrol list` to see the current curated registry. Templates are defined in `src/registry/inline-registry.ts`; add a new entry there to publish a template.

## Features

- 🚀 **Fast setup** - Get a new project running in seconds
- 🎯 **Curated templates** - Production-ready templates with best practices
- 🔧 **Smart initialization** - Automatically sets up git repository and updates package.json
- 🎨 **Beautiful output** - Colored terminal output with progress indicators
- 📸 **`qorrol ps`** - Bounded-time snapshot of running processes (no waiting on watchers)

## What it does

When you run `qorrol create <template>`:

1. **Clones** the selected template repository
2. **Removes** git history from the template
3. **Updates** project name in package.json (if `--name` is provided)
4. **Initializes** a fresh git repository

`qorrol ps` takes a point-in-time snapshot of running processes (macOS only) with `-e/--exclude` (repeatable, comma-separated substrings) and `--json` flags, and a configurable timeout via `-t/--timeout`.

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
npm install
npm run build

# 2. Register the checkout as a global link
npm link

# 3. Verify it resolves to your checkout
which qorrol
qorrol --help
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
