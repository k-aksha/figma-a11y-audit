#!/usr/bin/env node
/**
 * audit.js
 * CLI entry point for the Figma Accessibility Audit Agent.
 *
 * Orchestrates: file reading → node inspection → rule evaluation →
 *               comment annotation → report generation
 *
 * Usage:
 *   node a11y-audit/audit.js --file-key ECF7wZOztOcfzVrIKtfeJ7
 *   node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 -l aaa --dry-run
 *   node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --clean
 *   node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --platform android --industry healthcare
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root (zero dependencies)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const { configureTransport, getTransport } = require('./lib/figma-ds');
const figmaReader = require('./lib/figma-reader');
const nodeInspector = require('./lib/node-inspector');
const { loadRules, runAllRules } = require('./lib/rules/index');
const annotator = require('./lib/annotator');
const reporter = require('./lib/reporter');
const { sleep } = require('./lib/rate-limiter');
const { loadProfile, listProfiles } = require('./lib/profiles/profile-loader');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    fileKey: null,
    token: process.env.FIGMA_ACCESS_TOKEN || null,
    pages: null,
    level: 'aa',
    dryRun: false,
    clean: false,
    config: null,
    mcp: null,
    mcpEndpoint: null,
    platform: null,
    industry: null,
    profile: null,
    listProfiles: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file-key': case '-f':
        parsed.fileKey = args[++i]; break;
      case '--token': case '-t':
        parsed.token = args[++i]; break;
      case '--pages': case '-p':
        parsed.pages = args[++i].split(',').map(s => s.trim()); break;
      case '--level': case '-l':
        parsed.level = args[++i].toLowerCase(); break;
      case '--dry-run':
        parsed.dryRun = true; break;
      case '--clean':
        parsed.clean = true; break;
      case '--config': case '-c':
        parsed.config = args[++i]; break;
      case '--platform': case '-P':
        parsed.platform = args[++i].toLowerCase(); break;
      case '--industry': case '-I':
        parsed.industry = args[++i].toLowerCase(); break;
      case '--profile':
        parsed.profile = args[++i].toLowerCase(); break;
      case '--mcp':
        parsed.mcp = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : 'auto'; break;
      case '--mcp-endpoint':
        parsed.mcpEndpoint = args[++i]; break;
      case '--list-profiles':
        parsed.listProfiles = true; break;
      case '--help': case '-h':
        parsed.help = true; break;
    }
  }

  if (parsed.config) {
    try {
      const configPath = path.resolve(parsed.config);
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.fileKey && !parsed.fileKey) parsed.fileKey = cfg.fileKey;
      if (cfg.accessToken && !parsed.token) parsed.token = cfg.accessToken;
      if (cfg.level && parsed.level === 'aa') parsed.level = cfg.level;
      if (cfg.pages && !parsed.pages) parsed.pages = cfg.pages;
      if (cfg.platform && !parsed.platform) parsed.platform = cfg.platform;
      if (cfg.industry && !parsed.industry) parsed.industry = cfg.industry;
      // Store user custom thresholds for profile merge
      if (cfg.rules && cfg.rules.customThresholds) {
        parsed._userThresholds = cfg.rules.customThresholds;
      }
    } catch (err) {
      console.error(`  Error loading config: ${err.message}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
  Figma Accessibility Audit Agent
  ================================

  Analyzes Figma designs against WCAG 2.2 AA/AAA standards and
  posts findings as comments on flagged nodes.

  Supports platform-specific and industry-specific accessibility
  profiles for tailored audits.

  Usage:
    node a11y-audit/audit.js --file-key <key> [options]

  Options:
    --file-key, -f <key>    Figma file key (required)
    --token, -t <token>     Figma Personal Access Token
                            (or set FIGMA_ACCESS_TOKEN env var)
    --mcp [command]         Use MCP OAuth server for Figma auth
                            (auto-detects if no command given)
    --mcp-endpoint <url>    MCP server URL (default: http://localhost:3845)
    --pages, -p <names>     Comma-separated page names to audit
                            (default: all content pages)
    --level, -l aa|aaa      WCAG conformance level (default: aa)
    --dry-run               Generate report only, don't post comments
    --clean                 Remove all previous audit comments
    --config, -c <file>     Load config from JSON file
    --help, -h              Show this help

  Profile Options:
    --platform, -P <name>   Platform profile: android, ios, web-site, web-app
    --industry, -I <name>   Industry profile: healthcare, finance, manufacturing,
                            education, government, ecommerce
    --profile <name>        Combined shorthand (e.g., android-healthcare)
    --list-profiles         List all available profiles and exit

  Authentication:
    Provide ONE of the following:
    1. --token (or FIGMA_ACCESS_TOKEN env var) for Personal Access Token
    2. --mcp for OAuth via a Figma MCP server (no token needed)

  Examples:
    # With Personal Access Token
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 -l aaa --dry-run

    # With MCP OAuth (auto-detect running server)
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --mcp
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --mcp --mcp-endpoint http://localhost:4000

    # With platform/industry profiles
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --platform android
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --platform ios --industry healthcare
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --profile web-app-finance
    node a11y-audit/audit.js -f ECF7wZOztOcfzVrIKtfeJ7 --mcp --industry manufacturing --dry-run
    node a11y-audit/audit.js --list-profiles
  `);
}

// ---------------------------------------------------------------------------
// Main audit pipeline
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.listProfiles) {
    listProfiles();
    process.exit(0);
  }

  if (!opts.fileKey) {
    console.error('  Error: --file-key is required. Use --help for usage.');
    process.exit(1);
  }

  // --- Configure Figma API transport (REST with PAT or MCP with OAuth) ---
  configureTransport({
    token: opts.token,
    mcp: opts.mcp,
    mcpEndpoint: opts.mcpEndpoint,
  });

  const transport = getTransport();
  if (!transport) {
    console.error('  Error: No Figma authentication configured.');
    console.error('  Use one of:');
    console.error('    --token <pat>            Personal Access Token');
    console.error('    FIGMA_ACCESS_TOKEN env   Personal Access Token via env var');
    console.error('    --mcp                    OAuth via Figma MCP server');
    process.exit(1);
  }

  // --- Resolve profile ---
  const profile = loadProfile({
    platform: opts.platform,
    industry: opts.industry,
    profile: opts.profile,
    userThresholds: opts._userThresholds || {},
  });

  const timestamp = new Date().toISOString().split('T')[0];

  const authLabel = transport.mode === 'mcp' ? 'MCP OAuth' : 'Personal Access Token';

  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   FIGMA ACCESSIBILITY AUDIT AGENT    ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log(`\n  File: ${opts.fileKey}`);
  console.log(`  Auth: ${authLabel}`);
  console.log(`  Level: WCAG 2.2 ${opts.level.toUpperCase()}`);

  if (profile) {
    console.log(`  Profile: ${profile.name}`);
    console.log(`  Standards: ${profile.complianceStandards.join(', ')}`);
  } else {
    console.log('  Profile: Base (WCAG core only)');
  }

  console.log(`  Mode: ${opts.dryRun ? 'DRY RUN (report only)' : opts.clean ? 'CLEANUP' : 'FULL AUDIT'}`);

  // --- Phase 0: Cleanup if requested ---
  if (opts.clean) {
    console.log('\n  Cleaning previous audit comments...');
    await annotator.cleanAnnotations(opts.fileKey, opts.token);
    console.log('  Cleanup complete.');
    process.exit(0);
  }

  // --- Phase 1: Fetch file overview ---
  const overview = await figmaReader.fetchFileOverview(opts.fileKey, opts.token);
  const { fileStructure, variables, components } = overview;

  console.log(`\n  File: ${fileStructure.name || opts.fileKey}`);
  console.log(`  Pages: ${fileStructure.pages?.length || 0}`);
  console.log(`  Components: ${components.length}`);

  // --- Phase 2: Resolve pages to audit ---
  const pages = figmaReader.resolvePages(fileStructure, opts.pages);
  console.log(`  Auditing ${pages.length} page(s): ${pages.map(p => p.name).join(', ')}`);

  if (pages.length === 0) {
    console.log('\n  No pages to audit. Exiting.');
    process.exit(0);
  }

  // --- Phase 3: Load rules (profile-aware) ---
  loadRules(profile);
  const colorMap = figmaReader.buildColorMap(variables);
  const componentLookup = figmaReader.buildComponentLookup(components);

  // --- Phase 4: Page-by-page inspection and rule evaluation ---
  const allIssues = [];
  let totalNodesInspected = 0;

  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    console.log(`\n  [${p + 1}/${pages.length}] Scanning: ${page.name}...`);

    const nodeIds = (page.frames || []).map(f => f.id);

    if (nodeIds.length === 0) {
      console.log('    No frames found, skipping.');
      continue;
    }

    const enrichedNodes = await nodeInspector.inspectNodes(
      opts.fileKey, opts.token, nodeIds
    );

    const nodeCount = Object.keys(enrichedNodes).length;
    totalNodesInspected += nodeCount;

    const context = {
      fileStructure,
      variables,
      colorMap,
      componentLookup,
      allNodes: enrichedNodes,
      pageName: page.name,
      config: profile ? { level: opts.level, ...profile.thresholds } : { level: opts.level },
      profile,
      _headings: [],
    };

    let pageIssueCount = 0;
    for (const [, node] of Object.entries(enrichedNodes)) {
      const nodeIssues = runAllRules(node, context, opts.level);
      for (const issue of nodeIssues) {
        issue.pageName = page.name;
        allIssues.push(issue);
        pageIssueCount++;
      }
    }

    const errors = allIssues.filter(i => i.pageName === page.name && i.severity === 'error').length;
    const warnings = allIssues.filter(i => i.pageName === page.name && i.severity === 'warning').length;
    const infos = allIssues.filter(i => i.pageName === page.name && i.severity === 'info').length;

    console.log(`    ${nodeCount} nodes inspected, ${pageIssueCount} issues (${errors} errors, ${warnings} warnings, ${infos} info)`);

    // --- Phase 5: Post comments (unless dry-run) ---
    if (!opts.dryRun && pageIssueCount > 0) {
      const pageIssues = allIssues.filter(i => i.pageName === page.name);
      console.log(`    Posting comments...`);
      await annotator.annotatePage(opts.fileKey, opts.token, pageIssues, timestamp, enrichedNodes, page.frames || []);
    }

    if (p < pages.length - 1) await sleep(1000);
  }

  // --- Phase 6: Generate report ---
  console.log('\n  Generating report...');

  const reportContent = reporter.generateReport({
    fileName: fileStructure.name || opts.fileKey,
    fileKey: opts.fileKey,
    level: opts.level,
    pagesAudited: pages.length,
    nodesInspected: totalNodesInspected,
    issues: allIssues,
    timestamp,
    profile,
  });

  reporter.writeReport(
    reportContent,
    path.join(__dirname, 'reports'),
    opts.fileKey,
    timestamp
  );

  // --- Summary ---
  reporter.printSummary(allIssues, profile);

  if (opts.dryRun) {
    console.log('  (Dry run — no comments were posted to Figma)');
  }
}

main().catch(err => {
  console.error(`\n  Fatal error: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
