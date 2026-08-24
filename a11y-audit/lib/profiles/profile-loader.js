/**
 * profile-loader.js
 * Loads and merges platform + industry profile definitions.
 * Profiles are data-driven JSON that select rules and override thresholds.
 */

const fs = require('fs');
const path = require('path');

const PROFILES_DIR = __dirname;
const PLATFORM_DIR = path.join(PROFILES_DIR, 'platform');
const INDUSTRY_DIR = path.join(PROFILES_DIR, 'industry');

const BASE_RULES = [
  'color-contrast', 'touch-targets', 'text-sizing', 'focus-indicators',
  'form-fields', 'image-icons', 'color-only-info', 'content-structure',
];

const BASE_THRESHOLDS = {
  touchTargetAA: 24,
  touchTargetAAA: 44,
  minBodyFontSize: 14,
  minMobileFontSize: 16,
  lineHeightRatio: 1.5,
  interactiveSpacing: 8,
  focusIndicatorWidth: 2,
  focusIndicatorContrast: 3,
};

function loadJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Find a profile JSON by id across one or more candidate directories.
 * Earlier directories take precedence (built-in checked before custom).
 * @param {string|string[]} dirs
 */
function findProfileFile(dirs, id) {
  for (const dir of [].concat(dirs)) {
    if (!dir) continue;
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/**
 * List profile ids across one or more directories, deduped.
 * @param {string|string[]} dirs
 */
function listAvailableIds(dirs) {
  const ids = new Set();
  for (const dir of [].concat(dirs)) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      ids.add(f.replace('.json', ''));
    }
  }
  return [...ids];
}

/**
 * Load and merge a resolved profile from platform + industry selections.
 *
 * @param {object} opts
 * @param {string|null} opts.platform  - Platform id (android, ios, web-site, web-app)
 * @param {string|null} opts.industry  - Industry id (healthcare, finance, manufacturing, ...)
 * @param {string|null} opts.profile   - Combined shorthand (e.g. "android-healthcare")
 * @param {object}      opts.userThresholds - User-specified customThresholds from config
 * @param {string|null} opts.customRulesDir - User rules directory; profiles/platform and
 *   profiles/industry under it are searched alongside the built-in profiles (see README "Custom rules").
 * @returns {object|null} Resolved profile or null (base-only mode)
 */
function loadProfile(opts = {}) {
  let { platform, industry, profile, userThresholds, customRulesDir } = opts;

  const platformDirs = [PLATFORM_DIR, customRulesDir && path.join(customRulesDir, 'profiles', 'platform')];
  const industryDirs = [INDUSTRY_DIR, customRulesDir && path.join(customRulesDir, 'profiles', 'industry')];

  if (profile && !platform && !industry) {
    const parts = profile.split('-');
    const platformIds = listAvailableIds(platformDirs);
    const industryIds = listAvailableIds(industryDirs);

    // Try to split "android-healthcare" into platform + industry
    for (let i = 1; i <= parts.length; i++) {
      const candidatePlatform = parts.slice(0, i).join('-');
      const candidateIndustry = parts.slice(i).join('-');
      if (platformIds.includes(candidatePlatform) && industryIds.includes(candidateIndustry)) {
        platform = candidatePlatform;
        industry = candidateIndustry;
        break;
      }
    }

    if (!platform && !industry) {
      // Try as platform-only or industry-only
      if (platformIds.includes(profile)) platform = profile;
      else if (industryIds.includes(profile)) industry = profile;
      else {
        console.error(`  Error: Unknown profile "${profile}".`);
        console.error(`  Available platforms: ${platformIds.join(', ')}`);
        console.error(`  Available industries: ${industryIds.join(', ')}`);
        process.exit(1);
      }
    }
  }

  if (!platform && !industry) return null;

  let platformProfile = null;
  let industryProfile = null;

  if (platform) {
    const file = findProfileFile(platformDirs, platform);
    if (!file) {
      console.error(`  Error: Unknown platform "${platform}". Available: ${listAvailableIds(platformDirs).join(', ')}`);
      process.exit(1);
    }
    platformProfile = loadJsonFile(file);
  }

  if (industry) {
    const file = findProfileFile(industryDirs, industry);
    if (!file) {
      console.error(`  Error: Unknown industry "${industry}". Available: ${listAvailableIds(industryDirs).join(', ')}`);
      process.exit(1);
    }
    industryProfile = loadJsonFile(file);
  }

  const nameParts = [];
  if (platformProfile) nameParts.push(platformProfile.name);
  if (industryProfile) nameParts.push(industryProfile.name);

  const complianceStandards = [
    ...new Set([
      'WCAG 2.2 AA',
      ...(platformProfile?.complianceStandards || []),
      ...(industryProfile?.complianceStandards || []),
    ]),
  ];

  const thresholds = resolveThresholds(
    BASE_THRESHOLDS,
    platformProfile?.thresholds || {},
    industryProfile?.thresholds || {},
    userThresholds || {},
  );

  return {
    name: nameParts.join(' / ') || 'Custom',
    platform: platform || null,
    industry: industry || null,
    complianceStandards,
    baseRules: platformProfile?.baseRules || BASE_RULES,
    platformRules: platformProfile?.platformRules || [],
    industryRules: industryProfile?.industryRules || [],
    disabledRules: [
      ...(platformProfile?.disabledRules || []),
      ...(industryProfile?.disabledRules || []),
    ],
    thresholds,
    metadata: {
      platformLabel: platformProfile?.name || null,
      industryLabel: industryProfile?.name || null,
      guidelines: [
        ...(platformProfile?.guidelines || []),
        ...(industryProfile?.guidelines || []),
      ],
    },
  };
}

/**
 * Cascade: base < platform < industry < user
 */
function resolveThresholds(base, platform, industry, user) {
  return Object.assign({}, base, platform, industry, user);
}

/**
 * Print all available profiles to stdout.
 * @param {string|null} customRulesDir - see loadProfile()
 */
function listProfiles(customRulesDir = null) {
  const platformDirs = [PLATFORM_DIR, customRulesDir && path.join(customRulesDir, 'profiles', 'platform')];
  const industryDirs = [INDUSTRY_DIR, customRulesDir && path.join(customRulesDir, 'profiles', 'industry')];

  console.log('\n  Available Profiles');
  console.log('  ==================\n');

  console.log('  PLATFORMS:');
  const platformIds = listAvailableIds(platformDirs);
  for (const id of platformIds) {
    const p = loadJsonFile(findProfileFile(platformDirs, id));
    console.log(`    --platform ${id.padEnd(12)} ${p.name}`);
    console.log(`    ${''.padEnd(26)} Standards: ${p.complianceStandards.join(', ')}`);
  }

  console.log('\n  INDUSTRIES:');
  const industryIds = listAvailableIds(industryDirs);
  for (const id of industryIds) {
    const p = loadJsonFile(findProfileFile(industryDirs, id));
    console.log(`    --industry ${id.padEnd(15)} ${p.name}`);
    console.log(`    ${''.padEnd(29)} Standards: ${p.complianceStandards.join(', ')}`);
  }

  console.log('\n  COMBINED (shorthand):');
  for (const pid of platformIds) {
    for (const iid of industryIds) {
      console.log(`    --profile ${pid}-${iid}`);
    }
  }

  if (customRulesDir) {
    console.log(`\n  Custom rules dir: ${customRulesDir}`);
  }

  console.log('');
}

module.exports = {
  loadProfile,
  resolveThresholds,
  listProfiles,
  BASE_RULES,
  BASE_THRESHOLDS,
};
