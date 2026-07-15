# Backpine CLI

A powerful CLI tool for creating projects from curated templates. Get started quickly with modern, production-ready project templates.

## Installation

```bash
<<<<<<< HEAD
npm install -g qorrol
=======
npm install -g backpine
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
```

Or use without installing:

```bash
<<<<<<< HEAD
npx qorrol@latest
=======
npx backpine@latest
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
```

## Usage

### Create a new project

```bash
# Create project in current directory
<<<<<<< HEAD
qorrol create saas-kit
# or
npx qorrol@latest create saas-kit

# Create project in a new directory
qorrol create saas-kit --name my-awesome-app
# or
npx qorrol@latest create saas-kit --name my-awesome-app
=======
backpine create saas-kit
# or
npx backpine@latest create saas-kit

# Create project in a new directory
backpine create saas-kit --name my-awesome-app
# or
npx backpine@latest create saas-kit --name my-awesome-app
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
```

### List available templates

```bash
<<<<<<< HEAD
qorrol list
=======
backpine list
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
```

### Get help

```bash
<<<<<<< HEAD
qorrol --help
qorrol create --help
=======
backpine --help
backpine create --help
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
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

<<<<<<< HEAD
MIT
=======
MIT
>>>>>>> 43bdd237f96a5ae42ef606180cc11172efdd7184
