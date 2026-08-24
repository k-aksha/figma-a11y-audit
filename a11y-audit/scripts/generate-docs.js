#!/usr/bin/env node
/**
 * generate-docs.js
 * Generates Markdown documentation for all accessibility audit rules.
 * Reads rule metadata from JS modules and cross-references profile JSONs.
 *
 * Output structure:
 *   docs/rules/README.md                          (index)
 *   docs/rules/base/*.md                           (8 base rules)
 *   docs/rules/platform/android/*.md               (android rules)
 *   docs/rules/platform/ios/*.md                   (ios rules)
 *   docs/rules/platform/web/*.md                   (web-site rules)
 *   docs/rules/platform/web-app/*.md               (web-app rules)
 *   docs/rules/industry/healthcare/*.md            (healthcare rules)
 *   docs/rules/industry/finance/*.md               (finance rules)
 *   docs/rules/industry/manufacturing/*.md         (manufacturing rules)
 *   docs/rules/industry/education/*.md             (education rules)
 *   docs/rules/industry/government/*.md            (government rules)
 *   docs/rules/industry/ecommerce/*.md             (ecommerce rules)
 *
 * Usage: node a11y-audit/scripts/generate-docs.js
 */

const fs = require('fs');
const path = require('path');

const LIB_DIR = path.resolve(__dirname, '..', 'lib');
const RULES_DIR = path.join(LIB_DIR, 'rules');
const PROFILES_DIR = path.join(LIB_DIR, 'profiles');
const DOCS_DIR = path.resolve(__dirname, '..', 'docs', 'rules');

const WCAG_SLUGS = {
  '1.1.1': 'non-text-content',
  '1.2.1': 'audio-only-and-video-only-prerecorded',
  '1.3.1': 'info-and-relationships',
  '1.3.2': 'meaningful-sequence',
  '1.3.3': 'sensory-characteristics',
  '1.4.1': 'use-of-color',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '1.4.6': 'contrast-enhanced',
  '1.4.11': 'non-text-contrast',
  '1.4.12': 'text-spacing',
  '2.4.1': 'bypass-blocks',
  '2.4.2': 'page-titled',
  '2.4.3': 'focus-order',
  '2.4.5': 'multiple-ways',
  '2.4.7': 'focus-visible',
  '2.4.11': 'focus-not-obscured-minimum',
  '2.5.5': 'target-size-enhanced',
  '2.5.8': 'target-size-minimum',
  '3.1.1': 'language-of-page',
  '3.1.2': 'language-of-parts',
  '3.3.1': 'error-identification',
  '3.3.2': 'labels-or-instructions',
  '3.3.3': 'error-suggestion',
  '3.3.4': 'error-prevention-legal-financial-data',
};

// Rule ID prefix → subdirectory under docs/rules/
const SUBDIR_MAP = {
  'android-':    'platform/android',
  'ios-':        'platform/ios',
  'webapp-':     'platform/web-app',
  'web-':        'platform/web',
  'healthcare-': 'industry/healthcare',
  'finance-':    'industry/finance',
  'mfg-':        'industry/manufacturing',
  'education-':  'industry/education',
  'government-': 'industry/government',
  'ecommerce-':  'industry/ecommerce',
};

function getSubdir(rule) {
  if (rule.tier === 'Base') return 'base';
  // Match longest prefix first (webapp- before web-)
  for (const [prefix, dir] of Object.entries(SUBDIR_MAP)) {
    if (rule.id.startsWith(prefix)) return dir;
  }
  return rule.tier.toLowerCase();
}

// -------------------------------------------------------------------------
// Phase 1: Discover rules
// -------------------------------------------------------------------------

function discoverRules() {
  const tiers = [
    { dir: path.join(RULES_DIR, 'base'), tier: 'Base' },
    { dir: path.join(RULES_DIR, 'platform'), tier: 'Platform' },
    { dir: path.join(RULES_DIR, 'industry'), tier: 'Industry' },
  ];

  const rules = [];

  for (const { dir, tier } of tiers) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.js') && f !== 'index.js')
      .sort();

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const mod = require(filePath);
        if (!mod.id || !mod.check) continue;

        const rule = {
          id: mod.id,
          name: mod.name || mod.id,
          wcag: mod.wcag || [],
          level: (mod.level || 'AA').toUpperCase(),
          category: mod.category || 'general',
          nodeTypes: mod.nodeTypes || [],
          tier,
          filePath,
        };
        rule.subdir = getSubdir(rule);

        rules.push(rule);
      } catch (err) {
        console.warn(`  [warn] Failed to load ${file}: ${err.message}`);
      }
    }
  }

  return rules;
}

// -------------------------------------------------------------------------
// Phase 2: Extract JSDoc descriptions
// -------------------------------------------------------------------------

function extractJSDoc(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^\/\*\*\s*\n([\s\S]*?)\n\s*\*\//);
  if (!match) return 'No description available.';

  const lines = match[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .slice(1);

  const text = lines.join('\n').trim();
  return text || 'No description available.';
}

// -------------------------------------------------------------------------
// Phase 3: Load profiles and build reverse map
// -------------------------------------------------------------------------

function loadProfiles() {
  const profiles = [];

  for (const subdir of ['platform', 'industry']) {
    const dir = path.join(PROFILES_DIR, subdir);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        profiles.push({
          id: p.id,
          name: p.name,
          type: subdir,
          rules: [
            ...(p.baseRules || []),
            ...(p.platformRules || []),
            ...(p.industryRules || []),
          ],
          thresholds: p.thresholds || {},
          complianceStandards: p.complianceStandards || [],
          guidelines: p.guidelines || [],
        });
      } catch (err) {
        console.warn(`  [warn] Failed to load profile ${file}: ${err.message}`);
      }
    }
  }

  return profiles;
}

function buildProfileMap(profiles) {
  const map = new Map();

  for (const profile of profiles) {
    for (const ruleId of profile.rules) {
      if (!map.has(ruleId)) map.set(ruleId, []);
      map.get(ruleId).push(profile);
    }
  }

  return map;
}

// -------------------------------------------------------------------------
// Phase 4: Generate individual rule docs
// -------------------------------------------------------------------------

function wcagLink(sc) {
  const slug = WCAG_SLUGS[sc];
  if (slug) return `[${sc}](https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html)`;
  return sc;
}

function generateRuleDoc(rule, description, profiles) {
  const wcagStr = rule.wcag.length > 0
    ? rule.wcag.map(wcagLink).join(', ')
    : 'None';

  const nodeTypesStr = rule.nodeTypes.length > 0
    ? rule.nodeTypes.map(t => `\`${t}\``).join(', ')
    : 'All node types';

  let md = `# ${rule.name}\n\n`;

  md += `| Property | Value |\n`;
  md += `|----------|-------|\n`;
  md += `| **ID** | \`${rule.id}\` |\n`;
  md += `| **Tier** | ${rule.tier} |\n`;
  md += `| **WCAG** | ${wcagStr} |\n`;
  md += `| **Level** | ${rule.level} |\n`;
  md += `| **Category** | ${rule.category} |\n`;
  md += `| **Node Types** | ${nodeTypesStr} |\n`;

  md += `\n## Description\n\n${description}\n`;

  if (profiles.length > 0) {
    md += `\n## Used in Profiles\n\n`;
    for (const p of profiles.sort((a, b) => a.id.localeCompare(b.id))) {
      md += `- **${p.name}** (\`${p.id}\`)\n`;
    }

    const allKeys = new Set();
    for (const p of profiles) {
      Object.keys(p.thresholds).forEach(k => allKeys.add(k));
    }
    const keys = [...allKeys].sort();

    if (keys.length > 0) {
      md += `\n## Profile Thresholds\n\n`;

      if (profiles.length === 1) {
        const p = profiles[0];
        md += `| Threshold | Value |\n`;
        md += `|-----------|-------|\n`;
        for (const k of keys) {
          md += `| ${k} | ${p.thresholds[k]} |\n`;
        }
      } else {
        const headers = profiles.sort((a, b) => a.id.localeCompare(b.id));
        md += `| Threshold | ${headers.map(p => p.id).join(' | ')} |\n`;
        md += `|-----------|${headers.map(() => '---').join('|')}|\n`;
        for (const k of keys) {
          const vals = headers.map(p => p.thresholds[k] !== undefined ? p.thresholds[k] : '-');
          md += `| ${k} | ${vals.join(' | ')} |\n`;
        }
      }
    }
  } else {
    md += `\n## Used in Profiles\n\nThis rule is not currently referenced by any profile.\n`;
  }

  md += `\n---\n\n*Auto-generated by \`scripts/generate-docs.js\`*\n`;

  return md;
}

// -------------------------------------------------------------------------
// Phase 5: Generate index README
// -------------------------------------------------------------------------

function generateIndex(rules, profiles) {
  const baseCt = rules.filter(r => r.tier === 'Base').length;
  const platCt = rules.filter(r => r.tier === 'Platform').length;
  const indCt = rules.filter(r => r.tier === 'Industry').length;

  let md = `# Accessibility Audit Rules\n\n`;
  md += `> **${rules.length} rules**: ${baseCt} base, ${platCt} platform, ${indCt} industry\n\n`;

  // --- Base Rules ---
  const baseRules = rules.filter(r => r.tier === 'Base').sort((a, b) => a.id.localeCompare(b.id));
  if (baseRules.length > 0) {
    md += `## Base Rules\n\n`;
    md += `Core WCAG 2.2 checks applied to every audit.\n\n`;
    md += `| Rule | WCAG | Level | Category |\n`;
    md += `|------|------|-------|----------|\n`;
    for (const r of baseRules) {
      const wcagStr = r.wcag.length > 0 ? r.wcag.join(', ') : '-';
      md += `| [${r.name}](base/${r.id}.md) | ${wcagStr} | ${r.level} | ${r.category} |\n`;
    }
    md += `\n`;
  }

  // --- Platform Rules (grouped by platform) ---
  const platformGroups = [
    { label: 'Android', prefix: 'platform/android', filter: r => r.id.startsWith('android-') },
    { label: 'iOS', prefix: 'platform/ios', filter: r => r.id.startsWith('ios-') },
    { label: 'Web (Sites)', prefix: 'platform/web', filter: r => r.id.startsWith('web-') },
    { label: 'Web (Apps)', prefix: 'platform/web-app', filter: r => r.id.startsWith('webapp-') },
  ];

  const platformRules = rules.filter(r => r.tier === 'Platform');
  if (platformRules.length > 0) {
    md += `## Platform Rules\n\n`;
    md += `Platform-specific checks activated via \`--platform\` flag.\n\n`;

    for (const group of platformGroups) {
      const groupRules = platformRules.filter(group.filter).sort((a, b) => a.id.localeCompare(b.id));
      if (groupRules.length === 0) continue;

      md += `### ${group.label}\n\n`;
      md += `| Rule | WCAG | Level | Category |\n`;
      md += `|------|------|-------|----------|\n`;
      for (const r of groupRules) {
        const wcagStr = r.wcag.length > 0 ? r.wcag.join(', ') : '-';
        md += `| [${r.name}](${group.prefix}/${r.id}.md) | ${wcagStr} | ${r.level} | ${r.category} |\n`;
      }
      md += `\n`;
    }
  }

  // --- Industry Rules (grouped by industry) ---
  const industryGroups = [
    { label: 'Healthcare', prefix: 'industry/healthcare', filter: r => r.id.startsWith('healthcare-') },
    { label: 'Finance', prefix: 'industry/finance', filter: r => r.id.startsWith('finance-') },
    { label: 'Manufacturing', prefix: 'industry/manufacturing', filter: r => r.id.startsWith('mfg-') },
    { label: 'Education', prefix: 'industry/education', filter: r => r.id.startsWith('education-') },
    { label: 'Government', prefix: 'industry/government', filter: r => r.id.startsWith('government-') },
    { label: 'E-commerce', prefix: 'industry/ecommerce', filter: r => r.id.startsWith('ecommerce-') },
  ];

  const industryRules = rules.filter(r => r.tier === 'Industry');
  if (industryRules.length > 0) {
    md += `## Industry Rules\n\n`;
    md += `Domain-specific checks activated via \`--industry\` flag.\n\n`;

    for (const group of industryGroups) {
      const groupRules = industryRules.filter(group.filter).sort((a, b) => a.id.localeCompare(b.id));
      if (groupRules.length === 0) continue;

      md += `### ${group.label}\n\n`;
      md += `| Rule | WCAG | Level | Category |\n`;
      md += `|------|------|-------|----------|\n`;
      for (const r of groupRules) {
        const wcagStr = r.wcag.length > 0 ? r.wcag.join(', ') : '-';
        md += `| [${r.name}](${group.prefix}/${r.id}.md) | ${wcagStr} | ${r.level} | ${r.category} |\n`;
      }
      md += `\n`;
    }
  }

  // --- Profiles summary ---
  md += `## Profiles\n\n`;
  md += `| Profile | Type | Standards | Rules |\n`;
  md += `|---------|------|-----------|-------|\n`;
  for (const p of profiles.sort((a, b) => a.id.localeCompare(b.id))) {
    md += `| **${p.name}** | ${p.type} | ${p.complianceStandards.join(', ')} | ${p.rules.length} |\n`;
  }
  md += `\n`;

  md += `---\n\n*Auto-generated by \`scripts/generate-docs.js\`*\n`;

  return md;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

function main() {
  console.log('\n  Generating rule documentation...\n');

  const rules = discoverRules();
  const baseCt = rules.filter(r => r.tier === 'Base').length;
  const platCt = rules.filter(r => r.tier === 'Platform').length;
  const indCt = rules.filter(r => r.tier === 'Industry').length;
  console.log(`  Discovered ${rules.length} rules (${baseCt} base, ${platCt} platform, ${indCt} industry)`);

  const descriptions = new Map();
  for (const rule of rules) {
    descriptions.set(rule.id, extractJSDoc(rule.filePath));
  }

  const profiles = loadProfiles();
  console.log(`  Loaded ${profiles.length} profiles`);
  const profileMap = buildProfileMap(profiles);

  // Collect unique subdirs and create them
  const subdirs = new Set(rules.map(r => r.subdir));
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(DOCS_DIR, sub), { recursive: true });
  }

  let written = 0;
  for (const rule of rules) {
    const ruleProfiles = profileMap.get(rule.id) || [];
    const content = generateRuleDoc(rule, descriptions.get(rule.id), ruleProfiles);
    const outPath = path.join(DOCS_DIR, rule.subdir, `${rule.id}.md`);
    fs.writeFileSync(outPath, content);
    console.log(`    wrote ${rule.subdir}/${rule.id}.md`);
    written++;
  }

  const indexContent = generateIndex(rules, profiles);
  fs.writeFileSync(path.join(DOCS_DIR, 'README.md'), indexContent);
  console.log(`    wrote README.md`);
  written++;

  console.log(`\n  Generated ${written} files in docs/rules/\n`);

  // Print directory tree
  console.log('  Directory structure:');
  console.log('  docs/rules/');
  console.log('    README.md');
  for (const sub of [...subdirs].sort()) {
    const count = rules.filter(r => r.subdir === sub).length;
    console.log(`    ${sub}/ (${count} rules)`);
  }
  console.log('');
}

main();
