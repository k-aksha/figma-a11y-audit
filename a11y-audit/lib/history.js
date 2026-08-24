/**
 * history.js
 * Self-scoring feedback loop.
 *
 * Each audit run is compared against the previous run for the same Figma
 * file: an issue that was flagged last time and is gone now counts as
 * "resolved"; one that's still flagged counts as "persisted". Rolling those
 * outcomes up per rule produces a 0-100 reliability score (worst → good) —
 * a rule whose findings usually get fixed is trustworthy ("Do" keep
 * enforcing it); a rule whose findings keep recurring unresolved across many
 * runs is a candidate for review ("Don't" trust it blindly — it may be
 * noisy, miscalibrated, or simply not a priority for this team).
 *
 * This is deliberately advisory only: it never changes what rules run. It
 * reports a track record and lets the human (or Claude) decide.
 *
 * Caveat: findings are matched by (nodeId, ruleId). If a flagged node is
 * deleted and recreated (e.g. duplicated) rather than edited in place,
 * Figma assigns it a new id, so the old finding will look "new" instead of
 * "resolved" even though the underlying element was fixed.
 *
 * History is stored per file under a11y-audit/history/<fileKey>.json,
 * gitignored like reports/ — local, not shared, not committed.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_HISTORY_DIR = path.join(__dirname, '..', 'history');

// Minimum number of resolve-or-persist observations before a rule's score
// is trusted enough to render a "do"/"dont" verdict rather than "insufficient-data".
const MIN_OBSERVATIONS_FOR_VERDICT = 3;

function issueKey(issue) {
  return `${issue.nodeId}::${issue.ruleId}`;
}

function ruleIdFromKey(key) {
  return key.split('::')[1];
}

function historyFilePath(fileKey, historyDir) {
  return path.join(historyDir || DEFAULT_HISTORY_DIR, `${fileKey}.json`);
}

function loadHistory(fileKey, historyDir) {
  const filePath = historyFilePath(fileKey, historyDir);
  if (!fs.existsSync(filePath)) {
    return { fileKey, lastRun: null, ruleStats: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { fileKey, lastRun: null, ruleStats: {} };
  }
}

function saveHistory(fileKey, historyDir, history) {
  const dir = historyDir || DEFAULT_HISTORY_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(historyFilePath(fileKey, historyDir), JSON.stringify(history, null, 2));
}

function resetHistory(fileKey, historyDir) {
  const filePath = historyFilePath(fileKey, historyDir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function scoreLabel(score) {
  if (score === null) return 'New';
  if (score >= 86) return 'Excellent';
  if (score >= 61) return 'Good';
  if (score >= 31) return 'Fair';
  return 'Poor';
}

function verdict(score, totalObservations) {
  if (score === null || totalObservations < MIN_OBSERVATIONS_FOR_VERDICT) return 'insufficient-data';
  if (score >= 70) return 'do';
  if (score <= 30) return 'dont';
  return 'neutral';
}

/**
 * Compare this run's findings to the previous run for the same file, update
 * each rule's cumulative reliability stats, and persist the new baseline.
 *
 * @param {string} fileKey
 * @param {object[]} issues - This run's full issue list (each needs nodeId, ruleId)
 * @param {object} opts
 * @param {string} [opts.timestamp]
 * @param {string|null} [opts.historyDir]
 * @returns {{ isFirstRun: boolean, ruleScores: object, diffSummary: {fixed:number, recurring:number, new:number} }}
 */
function recordRun(fileKey, issues, opts = {}) {
  const { timestamp, historyDir } = opts;
  const history = loadHistory(fileKey, historyDir);
  const isFirstRun = history.lastRun === null;

  const currKeys = new Set(issues.map(issueKey));
  const prevKeys = new Set(history.lastRun?.issueKeys || []);

  const diffSummary = { fixed: 0, recurring: 0, new: 0 };

  function ensureStats(ruleId) {
    if (!history.ruleStats[ruleId]) {
      history.ruleStats[ruleId] = {
        runsSeen: 0,
        resolvedCount: 0,
        persistedCount: 0,
        lastScore: null,
        trend: 'flat',
        lastUpdated: null,
      };
    }
    return history.ruleStats[ruleId];
  }

  // Score based on what happened to last run's open instances.
  for (const key of prevKeys) {
    const stats = ensureStats(ruleIdFromKey(key));
    if (currKeys.has(key)) {
      stats.persistedCount++;
      diffSummary.recurring++;
    } else {
      stats.resolvedCount++;
      diffSummary.fixed++;
    }
  }

  for (const key of currKeys) {
    if (!prevKeys.has(key)) diffSummary.new++;
  }

  // Update runsSeen/score for every rule with any presence in this comparison.
  const touchedRuleIds = new Set([...prevKeys, ...currKeys].map(ruleIdFromKey));
  for (const ruleId of touchedRuleIds) {
    const stats = ensureStats(ruleId);
    stats.runsSeen++;

    const total = stats.resolvedCount + stats.persistedCount;
    const newScore = total > 0 ? Math.round((stats.resolvedCount / total) * 100) : null;

    stats.trend = newScore === null
      ? 'flat'
      : stats.lastScore === null
        ? 'new'
        : newScore > stats.lastScore ? 'up' : newScore < stats.lastScore ? 'down' : 'flat';

    stats.lastScore = newScore;
    stats.lastUpdated = timestamp || null;
  }

  history.lastRun = { timestamp: timestamp || null, issueKeys: [...currKeys] };
  saveHistory(fileKey, historyDir, history);

  const ruleScores = {};
  for (const [ruleId, stats] of Object.entries(history.ruleStats)) {
    const totalObservations = stats.resolvedCount + stats.persistedCount;
    ruleScores[ruleId] = {
      score: stats.lastScore,
      label: scoreLabel(stats.lastScore),
      verdict: verdict(stats.lastScore, totalObservations),
      trend: stats.trend,
      runsSeen: stats.runsSeen,
      resolvedCount: stats.resolvedCount,
      persistedCount: stats.persistedCount,
    };
  }

  return { isFirstRun, ruleScores, diffSummary };
}

module.exports = {
  recordRun,
  resetHistory,
  loadHistory,
  issueKey,
  scoreLabel,
  DEFAULT_HISTORY_DIR,
  MIN_OBSERVATIONS_FOR_VERDICT,
};
