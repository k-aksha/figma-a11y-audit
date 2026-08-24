# Project instructions for Claude Code

This repo is the **Figma Accessibility Audit Agent** — a zero-dependency Node CLI that audits a Figma file against WCAG 2.2 AA/AAA, then posts findings as comments pinned to the flagged nodes and writes a markdown report. Entry point: `a11y-audit/audit.js`. See [README.md](README.md) for full flag reference and [a11y-audit/docs/rules/README.md](a11y-audit/docs/rules/README.md) for the rule catalog.

Use this file to run audits consistently when a user asks you to check a Figma file for accessibility issues.

## Getting the file key

Users will usually give you a Figma URL, not a bare key. Extract the key yourself — it's the segment after `/file/` or `/design/`:
`figma.com/design/ECF7wZOztOcfzVrIKtfeJ7/MyFile` → key is `ECF7wZOztOcfzVrIKtfeJ7`. Don't ask the user to extract it manually.

## Choosing auth: MCP vs token

Prefer whichever is already available — don't make the user set something up if they don't need to:

1. If a Figma MCP server is already connected in this session, use `--mcp` (no token needed).
2. Otherwise, check for `FIGMA_ACCESS_TOKEN` in `.env` / the environment — if present, no flag is needed, the CLI picks it up automatically.
3. Only if neither is available, ask the user for a Personal Access Token (`--token`) or to connect Figma MCP.

## Default workflow

1. **Always start with `--dry-run`** unless the user has explicitly asked you to post comments to the file. Posting comments is a visible, shared-state action other collaborators will see on the file — treat it like you'd treat pushing to a shared branch. Confirm with the user before running without `--dry-run`.
   ```bash
   node a11y-audit/audit.js -f <file-key> --dry-run
   ```
2. Apply platform/industry profiles when the user describes the product (e.g. "it's an Android banking app" → `--platform android --industry finance`, or the shorthand `--profile android-finance`). Run `--list-profiles` if you're unsure what's available rather than guessing an id.
3. Read the generated report from `a11y-audit/reports/a11y-<fileKey>-<date>.md` and summarize it for the user: pass/fail verdict, error count, and the highest-impact issues first (errors before warnings before info).
4. If the user wants the findings actually posted to Figma as comments, re-run without `--dry-run` — after confirming.
5. `--clean` deletes previously posted `[A11Y-AUDIT]` comments from the file. This is a destructive, visible action — confirm with the user before running it, and never run it "just in case."

## Helping fix issues

After an audit, the user will often want help resolving flagged issues (e.g. adjusting a color token to meet a contrast ratio, resizing a touch target). Use the `suggestion` and `data` fields in each finding — they already contain the concrete fix (e.g. a specific hex value that meets the required ratio). Cross-reference `a11y-audit/lib/contrast.js` if you need to verify a proposed color change actually meets AA/AAA before telling the user it does.

## Self-scoring feedback loop

Every non-`--no-history` run compares this audit's findings to the last audit of the same file and updates a per-rule reliability score (0-100, worst → good) based on how often that rule's findings actually get fixed — see [README § Self-scoring feedback loop](README.md#self-scoring-feedback-loop). When summarizing a report to the user, always check the "Self-Scoring Feedback Loop" section and per-issue "Track record" lines, and call out anything with a **Don't** verdict — that's the tool telling you (and them) a rule's findings on this file keep going unresolved and deserve a manual look, not blind trust.

- **This is advisory only.** Never edit `disabledRules`/`rules.disable`/a custom profile to silently mute a rule because its score is low — surface the recommendation and let the user decide.
- Use `--no-history` when you're iterating rapidly against a file the user hasn't actually changed yet (e.g. re-running dry-run while debugging a rule or profile choice) — otherwise you'll tank that file's scores with runs that were never expected to show improvement.
- Use `--reset-history` only if the user says something like "start fresh" / "this file went through a big redesign, forget the old scores" — it's a one-shot action that exits immediately, same as `--clean`. Confirm before running it, same as any other action that discards state.

## Extending the auditor

## Extending the auditor

Two different asks call for two different places:

- **"Add a rule/profile to this project"** → follow [CONTRIBUTING.md](CONTRIBUTING.md) and edit `a11y-audit/lib/rules/base|platform|industry/` directly. Rules are auto-discovered — a new file with the right shape is picked up with no registry changes. Regenerate docs after adding/changing rule metadata:
  ```bash
  npm run docs
  ```
- **"I want my own rule/industry, without forking this repo"** → use a `--rules-dir` directory instead (see [README § Custom rules](README.md#custom-rules)). This is the right default whenever the rule is specific to the user's org/product rather than broadly useful, since it survives copying `a11y-audit/` into another project or pulling upstream updates. Check if `--rules-dir`/`customRulesDir` is already configured before assuming there is none.

## Guardrails

- Never commit `.env` or print its contents — it holds the user's Figma token.
- Don't run `--clean`, `--reset-history`, or a non-dry-run audit against a file without the user's go-ahead first.
- This tool has zero dependencies on purpose — don't suggest adding npm packages unless the user asks for a larger refactor.
