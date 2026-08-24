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

function findProfileFile(dir, id) {
  const filePath = path.join(dir, `${id}.json`);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

function listAvailableIds(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Load and merge a resolved profile from platform + industry selections.
 *
 * @param {object} opts
 * @param {string|null} opts.platform  - Platform id (android, ios, web-site, web-app)
 * @param {string|null} opts.industry  - Industry id (healthcare, finance, manufacturing, ...)
 * @param {string|null} opts.profile   - Combined shorthand (e.g. "android-healthcare")
 * @param {object}      opts.userThresholds - User-specified customThresholds from config
 * @returns {object|null} Resolved profile or null (base-only mode)
 */
function loadProfile(opts = {}) {
  let { platform, industry, profile, userThresholds } = opts;

  if (profile && !platform && !industry) {
    const parts = profile.split('-');
    const platformIds = listAvailableIds(PLATFORM_DIR);
    const industryIds = listAvailableIds(INDUSTRY_DIR);

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
    const file = findProfileFile(PLATFORM_DIR, platform);
    if (!file) {
      console.error(`  Error: Unknown platform "${platform}". Available: ${listAvailableIds(PLATFORM_DIR).join(', ')}`);
      process.exit(1);
    }
    platformProfile = loadJsonFile(file);
  }

  if (industry) {
    const file = findProfileFile(INDUSTRY_DIR, industry);
    if (!file) {
      console.error(`  Error: Unknown industry "${industry}". Available: ${listAvailableIds(INDUSTRY_DIR).join(', ')}`);
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
 */
function listProfiles() {
  console.log('\n  Available Profiles');
  console.log('  ==================\n');

  console.log('  PLATFORMS:');
  const platformIds = listAvailableIds(PLATFORM_DIR);
  for (const id of platformIds) {
    const p = loadJsonFile(path.join(PLATFORM_DIR, `${id}.json`));
    console.log(`    --platform ${id.padEnd(12)} ${p.name}`);
    console.log(`    ${''.padEnd(26)} Standards: ${p.complianceStandards.join(', ')}`);
  }

  console.log('\n  INDUSTRIES:');
  const industryIds = listAvailableIds(INDUSTRY_DIR);
  for (const id of industryIds) {
    const p = loadJsonFile(path.join(INDUSTRY_DIR, `${id}.json`));
    console.log(`    --industry ${id.padEnd(15)} ${p.name}`);
    console.log(`    ${''.padEnd(29)} Standards: ${p.complianceStandards.join(', ')}`);
  }

  console.log('\n  COMBINED (shorthand):');
  for (const pid of platformIds) {
    for (const iid of industryIds) {
      console.log(`    --profile ${pid}-${iid}`);
    }
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
