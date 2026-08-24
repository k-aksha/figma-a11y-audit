# Figma Accessibility Audit Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Dependencies](https://img.shields.io/badge/dependencies-zero-blue.svg)](package.json)

Analyzes Figma designs against WCAG 2.2 AA/AAA standards and posts findings as comments directly on flagged component. Supports platform-specific (Android, iOS, Web) and industry-specific (Healthcare, Finance, Manufacturing, etc.) accessibility profiles.

- **43 rules** across base WCAG, platform, and industry tiers
- **Zero dependencies** — pure Node.js, nothing to `npm install`
- **Two auth modes** — a Figma Personal Access Token, or OAuth via a Figma MCP server
- **Actionable output** — Figma comments pinned to the exact flagged component, plus a markdown report with concrete fix suggestions (e.g. the exact hex value that meets contrast requirements)
- **Works out of the box with [Claude Code](https://claude.com/claude-code)** — see [Using with Claude Code](#using-with-claude-code)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [Using a config file](#using-a-config-file)
- [Output](#output)
- [Audit rules](#audit-rules)
- [Custom rules](#custom-rules)
- [Self-scoring feedback loop](#self-scoring-feedback-loop)
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

The file key is the string in your Figma URL between `/design/` and the file name — e.g., for `figma.com/design/ECF7wZOztOcfzVrIKtfeJ7/MyFile`, the key is `ECF7wZOztOcfzVrIKtfeJ7`. That key is just an example placeholder used throughout this README — every `ECF7wZOztOcfzVrIKtfeJ7` below should be replaced with your own file's key.

### npm scripts

```bash
npm run audit -- --file-key <key>         # full audit (posts comments to Figma)
npm run audit:dry -- --file-key <key>     # report only, no comments posted
```

### Common options

| Flag                   | Short | Description                                                                                        |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| `--file-key <key>`     | `-f`  | Figma file key (required)                                                                          |
| `--token <token>`      | `-t`  | Figma PAT (overrides `.env`)                                                                       |
| `--pages <names>`      | `-p`  | Comma-separated page names to audit (default: all)                                                 |
| `--level aa\|aaa`      | `-l`  | WCAG conformance level (default: `aa`)                                                             |
| `--dry-run`            |       | Generate report only, don't post comments                                                          |
| `--clean`              |       | Remove all previous audit comments from the file                                                   |
| `--config <file>`      | `-c`  | Load options from a JSON config file                                                               |
| `--platform <name>`    | `-P`  | Platform profile: `android`, `ios`, `web-site`, `web-app`                                          |
| `--industry <name>`    | `-I`  | Industry profile: `healthcare`, `finance`, `manufacturing`, `education`, `government`, `ecommerce` |
| `--profile <name>`     |       | Combined shorthand (e.g., `android-healthcare`)                                                    |
| `--list-profiles`      |       | List all available profiles and exit                                                               |
| `--rules-dir <path>`   |       | Load your own rules/profiles from an external directory (see [Custom rules](#custom-rules))       |
| `--no-history`         |       | Skip the self-scoring feedback loop for this run (see [below](#self-scoring-feedback-loop))        |
| `--reset-history`      |       | Wipe this file's self-scoring history and exit                                                     |
| `--history-dir <path>` |       | Where run history is stored (default: `a11y-audit/history/`)                                       |
| `--mcp [command]`      |       | Use MCP OAuth server instead of a PAT                                                              |
| `--mcp-endpoint <url>` |       | MCP server URL (default: `http://localhost:3845`)                                                  |
| `--help`               | `-h`  | Show help                                                                                          |

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

# Iterate quickly without polluting this file's self-scoring history
node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --dry-run --no-history

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
  "customRulesDir": "",
  "historyDir": "",
  "noHistory": false,
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

The auditor produces two kinds of output, plus a local history file that powers the [self-scoring feedback loop](#self-scoring-feedback-loop):

1. **Figma comments** — posted directly on flagged component in the Figma file (unless `--dry-run` is used).
2. **Markdown report** — saved to `a11y-audit/reports/` with the filename pattern `a11y-<fileKey>-<date>.md`.
3. **Run history** — saved to `a11y-audit/history/<fileKey>.json`, used to compare this run against the next one. Local only, gitignored.

## Audit rules

The auditor checks **43 rules** across three categories:

- **8 base rules** — core WCAG 2.2 checks (contrast, touch targets, focus indicators, etc.) applied to every audit
- **17 platform rules** — activated via `--platform` (Android Material Design 3, iOS HIG, Web sites, Web apps)
- **18 industry rules** — activated via `--industry` (Healthcare, Finance, Manufacturing, Education, Government, E-commerce)

See [docs/rules/README.md](a11y-audit/docs/rules/README.md) for the full rule reference with WCAG criteria and severity levels.

## Custom rules

You don't need to fork this repo to add your own checks — point `--rules-dir` at a directory you maintain, and it's merged in alongside the built-in rules every run. This is the recommended way to add organization-specific base rules or an entirely new industry/platform, since the directory lives outside `a11y-audit/` and survives upgrades or re-copies of the tool.

```bash
node a11y-audit/audit.js -f <file-key> --rules-dir ./my-a11y-rules --industry my-industry
```

Or in a config file:

```json
{ "customRulesDir": "./my-a11y-rules" }
```

Expected layout — every part is optional, add only what you need:

```
my-a11y-rules/
  base/                     # custom rule modules — always active, like the built-in base rules
    my-base-rule.js
  industry/                 # custom rule modules — active only when referenced by an industryRules list
    my-industry-rule.js
  platform/                 # custom rule modules — active only when referenced by a platformRules list
    my-platform-rule.js
  profiles/
    industry/
      my-industry.json      # define a brand-new --industry id, or extend a built-in one's rule list
    platform/
      my-platform.json      # define a brand-new --platform id
```

Rule modules follow the same shape as the built-in ones (`id`, `name`, `wcag`, `level`, `category`, `nodeTypes`, `check(node, context)`) — see [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-rule) for the full contract. Profile JSON files follow the same shape as `a11y-audit/lib/profiles/industry/*.json` / `platform/*.json`.

- **Base rules** you drop in `my-a11y-rules/base/` run on every audit, with or without `--platform`/`--industry`.
- **Industry/platform rules** only activate once their `id` appears in a profile's `industryRules`/`platformRules` array — either your own custom profile JSON, or (if you're willing to edit it) a built-in one.
- `--rules-dir` also makes `--list-profiles` show your custom platforms/industries, and the combined `<platform>-<industry>` shorthand works across built-in and custom ids interchangeably (e.g. `--profile android-my-industry`).
- If a custom rule reuses a built-in rule's `id`, your custom version overrides it.

## Self-scoring feedback loop

Every audit is compared against the previous audit of the same file. If a node that was flagged is no longer flagged, that finding counts as **resolved**; if it's still flagged, it counts as **persisted**. Rolled up per rule, that produces a 0-100 reliability score, worst to good:

| Score | Label |
|-------|-------|
| 0–30 | Poor |
| 31–60 | Fair |
| 61–85 | Good |
| 86–100 | Excellent |

A rule with a high score is reliably catching things that get fixed — trust it. A rule with a low score keeps flagging things that never get resolved — that's worth a manual look, since it may be miscalibrated, noisy, or just not a priority for this team. Once a rule has at least 3 fix-or-persist observations, it gets a **Do** (score ≥ 70) or **Don't** (score ≤ 30) verdict; below that it's marked "insufficient data" rather than guessing from a small sample.

This shows up in three places after every run:
- A **Self-Scoring Feedback Loop** section near the top of the markdown report, sorted worst → best, with a "consider reviewing" callout for any rule that got a Don't verdict.
- A **Track record** line on each individual finding in "Detailed Issues", so you can see a specific issue's rule history right where it's reported.
- A short summary printed to the console after every run.

**This is advisory only** — it never changes which rules run or silently disables anything. If a rule earns a Don't verdict, the report tells you exactly how to act on it: add it to `rules.disable` in your config, or override it in a [custom rules](#custom-rules) directory.

History is stored locally per file at `a11y-audit/history/<fileKey>.json` (gitignored, like `reports/` — never committed, never shared). Useful flags:

```bash
# Skip reading/recording history for this run — use for repeated test runs
# against a file you haven't actually changed, so they don't skew a score
node a11y-audit/audit.js -f <file-key> --dry-run --no-history

# Start a file's scoring over from scratch (e.g. after a big intentional redesign)
node a11y-audit/audit.js -f <file-key> --reset-history

# Store history somewhere other than the default a11y-audit/history/
node a11y-audit/audit.js -f <file-key> --history-dir ./my-history
```

**Caveats:**
- Findings are matched by node id + rule id. If a flagged node is deleted and recreated (e.g. duplicated) rather than edited in place, Figma assigns it a new id, so the old finding will look "new" again instead of "resolved."
- Re-running a dry-run audit repeatedly against a file you haven't touched will make every open rule look artificially unreliable (nothing gets fixed between runs because nothing changed) — use `--no-history` for that kind of iteration.
- A low score doesn't prove a rule is wrong — it just means its findings aren't getting acted on. That could be a false positive, or a real issue the team hasn't prioritized yet. Either way, it's a signal to look, not a verdict to blindly trust.

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

Open your project in Claude Code and ask it directly (`ECF7wZOztOcfzVrIKtfeJ7` below is a placeholder — swap in your own file key or paste the full Figma URL):

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
