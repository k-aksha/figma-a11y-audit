# Contributing

Thanks for considering a contribution to the Figma Accessibility Audit Agent. This project has zero external dependencies by design — please keep it that way unless there's a strong reason not to.

## Project layout

```
a11y-audit/
  audit.js                 CLI entry point — orchestrates the full pipeline
  lib/
    figma-ds.js             Figma REST + MCP transport layer
    figma-reader.js         File overview (structure, variables, styles, components)
    node-inspector.js       Deep node enrichment (fills, contrast bg, fonts, variants...)
    contrast.js             WCAG luminance/contrast math (pure functions)
    rules/                  Rule modules — see "Adding a rule" below
      base/                 Core WCAG rules applied to every audit
      platform/             Platform-specific rules (android, ios, web, web-app)
      industry/             Industry-specific rules (healthcare, finance, ...)
    profiles/                Platform/industry profile JSON (rule selection + thresholds)
    annotator.js            Posts/cleans Figma comments
    reporter.js             Markdown report generation
  docs/rules/                Auto-generated rule reference (do not hand-edit)
  scripts/generate-docs.js   Regenerates docs/rules/ from rule metadata
```

## Adding a rule

> Only checks that are broadly useful belong here. Org- or project-specific rules that wouldn't make sense for every user of this tool should go in a `--rules-dir` directory instead (see the README's [Custom rules](README.md#custom-rules) section) — that way they're not lost or diverged from upstream on the next update.

1. Create a new file under `a11y-audit/lib/rules/base/`, `rules/platform/`, or `rules/industry/`.
2. Export an object with:
   ```js
   module.exports = {
     id: 'my-rule-id',            // unique, kebab-case
     name: 'Human Readable Name',
     wcag: ['1.4.3'],             // WCAG 2.2 success criteria referenced
     level: 'AA',                 // 'AA' or 'AAA'
     category: 'color',           // grouping used in reports
     nodeTypes: ['TEXT'],         // Figma node types to run against ([] = all)
     check(node, context) {
       // return an array of issue objects, or [] if none found
       return [];
     },
   };
   ```
3. Each issue returned from `check()` should include: `nodeId`, `nodeName`, `severity` (`error`/`warning`/`info`), `message`, `wcagRef`, `suggestion`, and optionally `data` for supporting values.
4. If the rule is platform- or industry-specific, add its `id` to the relevant profile JSON under `a11y-audit/lib/profiles/platform/*.json` or `industry/*.json` (`platformRules`/`industryRules` array).
5. Regenerate rule docs:
   ```bash
   npm run docs
   ```
6. Verify with a real (or test) Figma file in dry-run mode so you don't spam comments while iterating:
   ```bash
   node a11y-audit/audit.js -f <file-key> --dry-run
   ```

## Adding a platform or industry profile

Add a new JSON file under `a11y-audit/lib/profiles/platform/` or `industry/` following the shape of an existing profile (`name`, `complianceStandards`, `baseRules`/`platformRules`/`industryRules`, `disabledRules`, `thresholds`, `guidelines`). It's picked up automatically — no registry to update.

Again, if the profile is specific to your org rather than generally useful, prefer a `profiles/industry/*.json` (or `platform/*.json`) file inside your own `--rules-dir` directory over a PR here.

## Code style

- No external dependencies. If you find yourself reaching for a package, write the small amount of logic needed instead (see `contrast.js`, `rate-limiter.js` for the level of DIY expected).
- Keep rule `check()` functions pure — no network calls, no mutation of `node`/`context`.
- Match existing formatting (2-space indent, semicolons, single quotes).

## Testing your changes

There's no automated test suite yet — that's a good first contribution if you're looking for one. In the meantime, validate changes by running `--dry-run` against a real Figma file and reviewing the generated report under `a11y-audit/reports/`.

## Pull requests

- Keep PRs focused on one rule/feature/fix at a time.
- Describe what WCAG criterion or real-world design problem the change addresses.
- If you touched rule metadata, include the regenerated `docs/rules/` output in your diff.
