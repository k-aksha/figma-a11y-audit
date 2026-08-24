/**
 * reporter.js
 * Generates a markdown accessibility audit report from collected issues.
 * Profile-aware: shows tier breakdown, compliance standards, and guidelines.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate the full markdown report.
 */
function generateReport(opts) {
  const { fileName, fileKey, level, pagesAudited, nodesInspected, issues, timestamp, profile } = opts;

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  const lines = [];

  // --- Header ---
  lines.push('# Accessibility Audit Report');
  lines.push('');
  lines.push(`> **File:** ${fileName || fileKey}`);
  lines.push(`> **Date:** ${timestamp}`);
  lines.push(`> **Level:** WCAG 2.2 ${level.toUpperCase()}`);

  if (profile) {
    lines.push(`> **Profile:** ${profile.name}`);
    lines.push(`> **Standards:** ${profile.complianceStandards.join(', ')}`);
  }

  lines.push(`> **Pages audited:** ${pagesAudited}`);
  lines.push(`> **Nodes inspected:** ${nodesInspected}`);
  lines.push(`> **Issues found:** ${issues.length} (${errors.length} errors, ${warnings.length} warnings, ${infos.length} info)`);
  lines.push('');

  // --- Pass/Fail verdict ---
  if (errors.length === 0) {
    lines.push('**Result: PASS** — No critical accessibility errors found.');
  } else {
    lines.push(`**Result: FAIL** — ${errors.length} critical error(s) must be resolved for ${level.toUpperCase()} compliance.`);
  }
  lines.push('');

  // --- Findings by Source (profile-aware) ---
  if (profile) {
    lines.push('## Findings by Source');
    lines.push('');
    lines.push('| Source | Errors | Warnings | Info | Total |');
    lines.push('|--------|--------|----------|------|-------|');

    const tiers = { base: 'Base (WCAG Core)', platform: `Platform (${profile.metadata.platformLabel || 'N/A'})`, industry: `Industry (${profile.metadata.industryLabel || 'N/A'})` };

    for (const [tier, label] of Object.entries(tiers)) {
      const tierIssues = issues.filter(i => i.tier === tier);
      if (tierIssues.length === 0 && tier !== 'base') continue;
      const e = tierIssues.filter(i => i.severity === 'error').length;
      const w = tierIssues.filter(i => i.severity === 'warning').length;
      const inf = tierIssues.filter(i => i.severity === 'info').length;
      lines.push(`| ${label} | ${e} | ${w} | ${inf} | ${tierIssues.length} |`);
    }
    lines.push('');
  }

  // --- Summary by category ---
  lines.push('## Summary by Category');
  lines.push('');
  lines.push('| Category | Errors | Warnings | Info | Total |');
  lines.push('|----------|--------|----------|------|-------|');

  const categories = {};
  for (const iss of issues) {
    const cat = iss.category || 'general';
    if (!categories[cat]) categories[cat] = { error: 0, warning: 0, info: 0 };
    categories[cat][iss.severity]++;
  }

  for (const [cat, counts] of Object.entries(categories).sort((a, b) => {
    const totalA = a[1].error + a[1].warning + a[1].info;
    const totalB = b[1].error + b[1].warning + b[1].info;
    return totalB - totalA;
  })) {
    const total = counts.error + counts.warning + counts.info;
    lines.push(`| ${capitalize(cat)} | ${counts.error} | ${counts.warning} | ${counts.info} | ${total} |`);
  }
  lines.push('');

  // --- Summary by page ---
  lines.push('## Summary by Page');
  lines.push('');
  lines.push('| Page | Errors | Warnings | Info | Top Issue |');
  lines.push('|------|--------|----------|------|-----------|');

  const pages = {};
  for (const iss of issues) {
    const pg = iss.pageName || 'Unknown';
    if (!pages[pg]) pages[pg] = { error: 0, warning: 0, info: 0, topIssue: '' };
    pages[pg][iss.severity]++;
    if (!pages[pg].topIssue && iss.severity === 'error') {
      pages[pg].topIssue = `${iss.wcagRef} ${iss.ruleName}`;
    }
  }

  for (const [pg, counts] of Object.entries(pages)) {
    lines.push(`| ${pg} | ${counts.error} | ${counts.warning} | ${counts.info} | ${counts.topIssue || '—'} |`);
  }
  lines.push('');

  // --- WCAG criteria coverage ---
  lines.push('## WCAG Criteria Flagged');
  lines.push('');

  const wcagCounts = {};
  for (const iss of issues) {
    const ref = iss.wcagRef || 'N/A';
    if (!wcagCounts[ref]) wcagCounts[ref] = 0;
    wcagCounts[ref]++;
  }

  lines.push('| WCAG SC | Count | Description |');
  lines.push('|---------|-------|-------------|');

  const wcagDescriptions = {
    '1.1.1': 'Non-text Content',
    '1.2.1': 'Audio-only and Video-only',
    '1.3.1': 'Info and Relationships',
    '1.3.2': 'Meaningful Sequence',
    '1.3.3': 'Sensory Characteristics',
    '1.4.1': 'Use of Color',
    '1.4.3': 'Contrast (Minimum)',
    '1.4.4': 'Resize Text',
    '1.4.6': 'Contrast (Enhanced)',
    '1.4.11': 'Non-text Contrast',
    '1.4.12': 'Text Spacing',
    '2.4.1': 'Bypass Blocks',
    '2.4.2': 'Page Titled',
    '2.4.3': 'Focus Order',
    '2.4.5': 'Multiple Ways',
    '2.4.7': 'Focus Visible',
    '2.4.11': 'Focus Not Obscured (Minimum)',
    '2.5.5': 'Target Size (Enhanced)',
    '2.5.8': 'Target Size (Minimum)',
    '3.1.1': 'Language of Page',
    '3.1.2': 'Language of Parts',
    '3.3.1': 'Error Identification',
    '3.3.2': 'Labels or Instructions',
    '3.3.3': 'Error Suggestion',
    '3.3.4': 'Error Prevention',
    '4.1.3': 'Status Messages',
  };

  for (const [ref, count] of Object.entries(wcagCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${ref} | ${count} | ${wcagDescriptions[ref] || ''} |`);
  }
  lines.push('');

  // --- Compliance Checklist (profile-aware) ---
  if (profile && profile.complianceStandards.length > 0) {
    lines.push('## Compliance Checklist');
    lines.push('');
    lines.push('| Standard | Status | Notes |');
    lines.push('|----------|--------|-------|');

    for (const standard of profile.complianceStandards) {
      const status = errors.length === 0 ? 'PASS' : 'REVIEW NEEDED';
      const badge = errors.length === 0 ? '✅' : '⚠️';
      lines.push(`| ${standard} | ${badge} ${status} | ${errors.length} error(s) to resolve |`);
    }
    lines.push('');

    if (profile.metadata.guidelines && profile.metadata.guidelines.length > 0) {
      lines.push('### Guidelines Applied');
      lines.push('');
      for (const guideline of profile.metadata.guidelines) {
        lines.push(`- ${guideline}`);
      }
      lines.push('');
    }
  }

  // --- Detailed issues ---
  lines.push('## Detailed Issues');
  lines.push('');

  const issuesByPage = {};
  for (const iss of issues) {
    const pg = iss.pageName || 'Unknown';
    if (!issuesByPage[pg]) issuesByPage[pg] = [];
    issuesByPage[pg].push(iss);
  }

  let issueNum = 1;
  for (const [pg, pageIssues] of Object.entries(issuesByPage)) {
    lines.push(`### ${pg}`);
    lines.push('');

    for (const iss of pageIssues) {
      const badge = iss.severity === 'error' ? '🔴' : iss.severity === 'warning' ? '🟡' : '🔵';
      const tierTag = iss.tier && iss.tier !== 'base' ? ` [${iss.tier.toUpperCase()}]` : '';
      lines.push(`#### #${issueNum} ${badge} [${iss.severity.toUpperCase()}]${tierTag} WCAG ${iss.wcagRef} — ${iss.ruleName}`);
      lines.push(`- **Node:** "${iss.nodeName}" (id: ${iss.nodeId})`);
      lines.push(`- **Details:** ${iss.message}`);
      lines.push(`- **Fix:** ${iss.suggestion}`);

      if (iss.data && Object.keys(iss.data).length > 0) {
        const dataStr = Object.entries(iss.data)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(', ');
        lines.push(`- **Data:** ${dataStr}`);
      }

      lines.push('');
      issueNum++;
    }
  }

  // --- Footer ---
  lines.push('---');
  lines.push('');

  if (profile) {
    lines.push(`*Generated by Accessibility Audit Agent — Profile: ${profile.name}*`);
  } else {
    lines.push('*Generated by Accessibility Audit Agent*');
  }
  lines.push(`*Rules: ${Object.keys(wcagCounts).length} WCAG criteria checked across ${pagesAudited} pages*`);

  return lines.join('\n');
}

/**
 * Write the report to disk.
 */
function writeReport(reportContent, outputDir, fileKey, timestamp) {
  const reportsDir = outputDir || path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const sanitizedTs = timestamp.replace(/[:/]/g, '-');
  const filename = `a11y-${fileKey}-${sanitizedTs}.md`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, reportContent);
  console.log(`\n  Report saved: ${filepath}`);

  return filepath;
}

/**
 * Print a compact summary to stdout.
 */
function printSummary(issues, profile) {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  console.log('\n  ┌─────────────────────────────────────┐');
  console.log('  │     ACCESSIBILITY AUDIT SUMMARY      │');
  console.log('  ├─────────────────────────────────────┤');

  if (profile) {
    const profileName = profile.name.length > 33 ? profile.name.substring(0, 30) + '...' : profile.name;
    console.log(`  │  Profile: ${profileName.padEnd(24)} │`);
    console.log('  ├─────────────────────────────────────┤');
  }

  console.log(`  │  Errors:   ${String(errors).padStart(4)}                      │`);
  console.log(`  │  Warnings: ${String(warnings).padStart(4)}                      │`);
  console.log(`  │  Info:     ${String(infos).padStart(4)}                      │`);
  console.log(`  │  Total:    ${String(issues.length).padStart(4)}                      │`);
  console.log('  ├─────────────────────────────────────┤');

  if (profile) {
    const baseCt = issues.filter(i => i.tier === 'base').length;
    const platCt = issues.filter(i => i.tier === 'platform').length;
    const indCt = issues.filter(i => i.tier === 'industry').length;
    console.log(`  │  Base:     ${String(baseCt).padStart(4)}                      │`);
    if (platCt > 0) console.log(`  │  Platform: ${String(platCt).padStart(4)}                      │`);
    if (indCt > 0) console.log(`  │  Industry: ${String(indCt).padStart(4)}                      │`);
    console.log('  ├─────────────────────────────────────┤');
  }

  if (errors === 0) {
    console.log('  │  Result:   PASS ✓                   │');
  } else {
    console.log('  │  Result:   FAIL ✗                   │');
  }

  console.log('  └─────────────────────────────────────┘\n');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  generateReport,
  writeReport,
  printSummary,
};
