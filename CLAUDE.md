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

## Extending the auditor

If asked to add a new rule, platform, or industry profile, follow [CONTRIBUTING.md](CONTRIBUTING.md) — rules are auto-discovered from `a11y-audit/lib/rules/`, so a new file with the right shape is picked up with no registry changes. Regenerate docs after adding/changing rule metadata:
```bash
npm run docs
```

## Guardrails

- Never commit `.env` or print its contents — it holds the user's Figma token.
- Don't run `--clean` or a non-dry-run audit against a file without the user's go-ahead first.
- This tool has zero dependencies on purpose — don't suggest adding npm packages unless the user asks for a larger refactor.
