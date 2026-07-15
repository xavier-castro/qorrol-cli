# Backpine CLI

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

## Available Templates

- **saas-kit** - A complete SaaS starter kit with authentication, billing, and more

## Features

- 🚀 **Fast setup** - Get a new project running in seconds
- 🎯 **Curated templates** - Production-ready templates with best practices
- 🔧 **Smart initialization** - Automatically sets up git repository and updates package.json
- 🎨 **Beautiful output** - Colored terminal output with progress indicators

## What it does

1. **Clones** the selected template repository
2. **Removes** git history from the template
3. **Updates** project name in package.json (if --name is provided)
4. **Initializes** a fresh git repository

## License

MIT
