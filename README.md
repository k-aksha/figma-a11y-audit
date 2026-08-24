# Figma Accessibility Audit Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Dependencies](https://img.shields.io/badge/dependencies-zero-blue.svg)](package.json)

Analyzes Figma designs against WCAG 2.2 AA/AAA standards and posts findings as comments directly on flagged nodes. Supports platform-specific (Android, iOS, Web) and industry-specific (Healthcare, Finance, Manufacturing, etc.) accessibility profiles.

- **43 rules** across base WCAG, platform, and industry tiers
- **Zero dependencies** — pure Node.js, nothing to `npm install`
- **Two auth modes** — a Figma Personal Access Token, or OAuth via a Figma MCP server
- **Actionable output** — Figma comments pinned to the exact flagged node, plus a markdown report with concrete fix suggestions (e.g. the exact hex value that meets contrast requirements)
- **Works out of the box with [Claude Code](https://claude.com/claude-code)** — see [Using with Claude Code](#using-with-claude-code)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Using a config file](#using-a-config-file)
- [Output](#output)
- [Audit rules](#audit-rules)
- [Running from another project](#running-from-another-project)
- [Using with Claude Code](#using-with-claude-code)
- [Generating rule documentation](#generating-rule-documentation)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- Node.js >= 18.0.0
- A Figma Personal Access Token **or** a running Figma MCP OAuth server

## Setup

1. Clone the repository and navigate into it:

```bash
cd "Accessability Auditor For Figma"
```

2. Create a `.env` file in the project root with your Figma token:

```
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

You can generate a Personal Access Token from **Figma → Settings → Account → Personal access tokens**.

No `npm install` is needed — the project has zero external dependencies.

## Usage

### Basic audit

```bash
node a11y-audit/audit.js --file-key <YOUR_FIGMA_FILE_KEY>
```

The file key is the string in your Figma URL between `/design/` and the file name — e.g., for `figma.com/design/ECF7wZOztOcfzVrIKtfeJ7/MyFile`, the key is `ECF7wZOztOcfzVrIKtfeJ7`.

### npm scripts

```bash
npm run audit -- --file-key <key>         # full audit (posts comments to Figma)
npm run audit:dry -- --file-key <key>     # report only, no comments posted
```

### Common options

| Flag | Short | Description |
|------|-------|-------------|
| `--file-key <key>` | `-f` | Figma file key (required) |
| `--token <token>` | `-t` | Figma PAT (overrides `.env`) |
| `--pages <names>` | `-p` | Comma-separated page names to audit (default: all) |
| `--level aa\|aaa` | `-l` | WCAG conformance level (default: `aa`) |
| `--dry-run` | | Generate report only, don't post comments |
| `--clean` | | Remove all previous audit comments from the file |
| `--config <file>` | `-c` | Load options from a JSON config file |
| `--platform <name>` | `-P` | Platform profile: `android`, `ios`, `web-site`, `web-app` |
| `--industry <name>` | `-I` | Industry profile: `healthcare`, `finance`, `manufacturing`, `education`, `government`, `ecommerce` |
| `--profile <name>` | | Combined shorthand (e.g., `android-healthcare`) |
| `--list-profiles` | | List all available profiles and exit |
| `--mcp [command]` | | Use MCP OAuth server instead of a PAT |
| `--mcp-endpoint <url>` | | MCP server URL (default: `http://localhost:3845`) |
| `--help` | `-h` | Show help |

### Examples

```bash
# Audit at AAA level, report only
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 -l aaa --dry-run

# Audit specific pages
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 -p "Home,Settings"

# Audit an Android healthcare app
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --platform android --industry healthcare

# Same thing using combined profile shorthand
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --profile android-healthcare

# Clean up previous audit comments
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --clean

# Use MCP OAuth instead of a token
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --mcp

# List all available profiles
node a11y-audit/audit.js --list-profiles
```

## Using a config file

Instead of passing flags, you can use a JSON config file. Copy the example and fill in your values:

```bash
cp a11y-audit/audit-config.example.json audit-config.json
```

```json
{
  "fileKey": "ECF7wZOztOcfzVrIKtfeJ7",
  "accessToken": "",
  "level": "aa",
  "pages": [],
  "platform": "",
  "industry": "",
  "rules": {
    "disable": [],
    "customThresholds": {
      "minBodyFontSize": 14,
      "minMobileFontSize": 16,
      "touchTargetAA": 24,
      "touchTargetAAA": 44,
      "lineHeightRatio": 1.5
    }
  }
}
```

Then run:

```bash
node a11y-audit/audit.js --config audit-config.json
```

CLI flags override config file values.

## Output

The auditor produces two kinds of output:

1. **Figma comments** — posted directly on flagged nodes in the Figma file (unless `--dry-run` is used).
2. **Markdown report** — saved to `a11y-audit/reports/` with the filename pattern `a11y-<fileKey>-<date>.md`.

## Audit rules

The auditor checks **43 rules** across three categories:

- **8 base rules** — core WCAG 2.2 checks (contrast, touch targets, focus indicators, etc.) applied to every audit
- **17 platform rules** — activated via `--platform` (Android Material Design 3, iOS HIG, Web sites, Web apps)
- **18 industry rules** — activated via `--industry` (Healthcare, Finance, Manufacturing, Education, Government, E-commerce)

See [docs/rules/README.md](a11y-audit/docs/rules/README.md) for the full rule reference with WCAG criteria and severity levels.

## Running from another project

You can copy the `a11y-audit` folder into any project and run it from there. No additional setup is needed since the tool has zero dependencies.

### 1. Copy the folder

```bash
cp -r /path/to/Accessability\ Auditor\ For\ Figma/a11y-audit ./a11y-audit
```

### 2. Set your Figma token

Either create a `.env` file in your project root:

```
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

Or pass it inline:

```bash
node a11y-audit/audit.js -f <file-key> --token <your_token>
```

### 3. Run via CLI

```bash
node a11y-audit/audit.js -f <file-key> --platform web-app --dry-run
```

Or add a script to your project's `package.json`:

```json
{
  "scripts": {
    "a11y": "node a11y-audit/audit.js",
    "a11y:dry": "node a11y-audit/audit.js --dry-run"
  }
}
```

Then run:

```bash
npm run a11y -- -f <file-key>
```

### 4. Run via Claude Code

Open your project in Claude Code and ask it directly:

```
Run an accessibility audit on Figma file ECF7wZOztOcfzVrIKtfeJ7
```

```
Audit my Figma file ECF7wZOztOcfzVrIKtfeJ7 (Design Link) with the android platform and healthcare industry profile in dry-run mode
```

```
Clean up all audit comments from Figma file ECF7wZOztOcfzVrIKtfeJ7 (Design Link)
```

Claude will execute the command, interpret the results, and help you fix any issues found.

## Using with Claude Code

This repo includes a [CLAUDE.md](CLAUDE.md) that Claude Code reads automatically. It tells Claude how to:

- Extract a file key from a pasted Figma URL
- Pick auth automatically (an already-connected Figma MCP server, then `FIGMA_ACCESS_TOKEN`, then ask you)
- Always run `--dry-run` first and confirm before posting comments or running `--clean`
- Choose the right `--platform`/`--industry` profile from how you describe the product
- Use each finding's suggested fix (e.g. a specific hex value) to help you resolve issues

Just open this project in Claude Code and ask, e.g.:

```
Audit my Figma file https://figma.com/design/ECF7wZOztOcfzVrIKtfeJ7/MyFile for accessibility issues.
It's an Android healthcare app.
```

Claude will run the audit, summarize the report, and help you fix what it finds. See [Running from another project](#running-from-another-project) if you want this same behavior inside a different codebase — copy both `a11y-audit/` and `CLAUDE.md`.

## Generating rule documentation

Rule docs are auto-generated from rule metadata:

```bash
node a11y-audit/scripts/generate-docs.js
```

This regenerates all files under `a11y-audit/docs/rules/`.

## Contributing

Contributions are welcome — new rules, platform/industry profiles, and bug fixes alike. See [CONTRIBUTING.md](CONTRIBUTING.md) for the project layout, how to add a rule, and the PR process.

## License

[MIT](LICENSE) © akramsha
