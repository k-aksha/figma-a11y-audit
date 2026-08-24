/**
 * rules/index.js
 * Auto-discovering rule registry with profile-based filtering.
 * Scans rules/, rules/platform/, and rules/industry/ for rule modules.
 */

const fs = require('fs');
const path = require('path');

let _rules = null;
let _activeProfile = null;

/**
 * Load rule modules from a directory.
 * Each module must export: { id, name, wcag, level, category, nodeTypes, check }
 */
function loadRulesFromDir(dirPath, tier) {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter(f =>
    f.endsWith('.js') && f !== 'index.js'
  );

  const rules = [];

  for (const file of files) {
    try {
      const rule = require(path.join(dirPath, file));

      if (!rule.id || !rule.check) {
        console.warn(`  [warn] Rule ${file} missing required exports (id, check). Skipping.`);
        continue;
      }

      rules.push({
        id: rule.id,
        name: rule.name || rule.id,
        wcag: rule.wcag || [],
        level: (rule.level || 'AA').toUpperCase(),
        category: rule.category || 'general',
        nodeTypes: rule.nodeTypes || [],
        check: rule.check,
        tier,
        _file: file,
      });
    } catch (err) {
      console.warn(`  [warn] Failed to load rule ${file}: ${err.message}`);
    }
  }

  return rules;
}

/**
 * Load all rules, optionally filtered by a resolved profile.
 *
 * @param {object|null} profile - Resolved profile from profile-loader (null = base only)
 */
function loadRules(profile = null) {
  if (_rules) return _rules;

  _activeProfile = profile;

  const rulesDir = __dirname;
  const platformDir = path.join(rulesDir, 'platform');
  const industryDir = path.join(rulesDir, 'industry');

  // Always load base rules
  const baseRules = loadRulesFromDir(rulesDir, 'base');

  // Load platform and industry rules only when a profile is active
  let platformRules = [];
  let industryRules = [];

  if (profile) {
    platformRules = loadRulesFromDir(platformDir, 'platform');
    industryRules = loadRulesFromDir(industryDir, 'industry');
  }

  const allLoaded = [...baseRules, ...platformRules, ...industryRules];

  if (profile) {
    const allowedIds = new Set([
      ...(profile.baseRules || []),
      ...(profile.platformRules || []),
      ...(profile.industryRules || []),
    ]);
    const disabledIds = new Set(profile.disabledRules || []);

    _rules = allLoaded.filter(r =>
      allowedIds.has(r.id) && !disabledIds.has(r.id)
    );
  } else {
    // No profile — only base rules (backward compatible)
    _rules = baseRules;
  }

  const baseCt = _rules.filter(r => r.tier === 'base').length;
  const platCt = _rules.filter(r => r.tier === 'platform').length;
  const indCt = _rules.filter(r => r.tier === 'industry').length;

  const parts = [`${baseCt} base`];
  if (platCt > 0) parts.push(`${platCt} platform`);
  if (indCt > 0) parts.push(`${indCt} industry`);

  console.log(`  Loaded ${_rules.length} accessibility rule(s): ${parts.join(', ')}`);
  console.log(`  Rules: ${_rules.map(r => r.id).join(', ')}`);

  return _rules;
}

/**
 * Get rules filtered by conformance level.
 * 'AA' returns AA-level rules only. 'AAA' returns both AA and AAA.
 */
function getRules(level = 'AA') {
  const rules = loadRules();
  const upperLevel = level.toUpperCase();

  if (upperLevel === 'AAA') return rules;
  return rules.filter(r => r.level === 'AA');
}

/**
 * Get rules filtered by category.
 */
function getRulesByCategory(category) {
  return loadRules().filter(r => r.category === category);
}

/**
 * Get the currently active profile (for reporter).
 */
function getActiveProfile() {
  return _activeProfile;
}

/**
 * Run all applicable rules against a single enriched node.
 *
 * @param {object} node - Enriched node from node-inspector
 * @param {object} context - { fileStructure, variables, allNodes, pageName, colorMap, config, profile }
 * @param {string} level - 'AA' or 'AAA'
 * @returns {object[]} Array of issues
 */
function runAllRules(node, context, level = 'AA') {
  const rules = getRules(level);
  const issues = [];

  for (const rule of rules) {
    if (rule.nodeTypes.length > 0 && !rule.nodeTypes.includes(node.type)) continue;

    try {
      const ruleIssues = rule.check(node, context);
      if (ruleIssues && ruleIssues.length > 0) {
        for (const issue of ruleIssues) {
          issues.push({
            ...issue,
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            tier: rule.tier,
            wcagRef: issue.wcagRef || rule.wcag[0] || '',
            pageName: context.pageName || '',
          });
        }
      }
    } catch (err) {
      console.warn(`  [warn] Rule ${rule.id} threw on node ${node.id}: ${err.message}`);
    }
  }

  return issues;
}

module.exports = {
  loadRules,
  getRules,
  getRulesByCategory,
  getActiveProfile,
  runAllRules,
};
