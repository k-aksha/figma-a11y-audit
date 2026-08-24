/**
 * annotator.js
 * Posts accessibility audit findings as Figma comments pinned to
 * the exact position of each flagged component.
 */

const { figmaGet, figmaPost, figmaDelete } = require('./figma-ds');
const { restLimiter } = require('./rate-limiter');

const SEVERITY_EMOJI = {
  error: '\u{1F534}',
  warning: '\u{1F7E1}',
  info: '\u{1F535}',
};

const AUDIT_TAG = '[A11Y-AUDIT]';

// ---------------------------------------------------------------------------
// Comment formatting
// ---------------------------------------------------------------------------

function formatComment(issues) {
  const lines = [`${AUDIT_TAG} ${issues.length} issue(s)\n`];

  for (const iss of issues) {
    const emoji = SEVERITY_EMOJI[iss.severity] || '';
    lines.push(`${emoji} ${iss.severity.toUpperCase()} | WCAG ${iss.wcagRef} — ${iss.ruleName}`);
    lines.push(iss.message);
    lines.push(`Fix: ${iss.suggestion}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

// ---------------------------------------------------------------------------
// Post annotations as Figma comments at exact component positions
// ---------------------------------------------------------------------------

/**
 * @param {string} fileKey
 * @param {string} token
 * @param {object[]} issues - All issues for one page
 * @param {string} timestamp
 * @param {object} enrichedNodes - nodeId → enriched node map (has x, y, w, h)
 * @param {object[]} frames - [{id, name}] top-level frames for this page
 */
async function annotatePage(fileKey, token, issues, timestamp, enrichedNodes, frames) {
  if (issues.length === 0) return;

  const byNode = {};
  for (const iss of issues) {
    if (!byNode[iss.nodeId]) byNode[iss.nodeId] = [];
    byNode[iss.nodeId].push(iss);
  }

  // Build a lookup of which frame each node belongs to (by matching position)
  const frameBBoxes = {};
  for (const frame of frames) {
    const fn = enrichedNodes[frame.id];
    if (fn) frameBBoxes[frame.id] = { x: fn.x, y: fn.y, w: fn.w, h: fn.h };
  }

  function findParentFrame(node) {
    for (const [frameId, box] of Object.entries(frameBBoxes)) {
      if (
        node.x >= box.x && node.x <= box.x + box.w &&
        node.y >= box.y && node.y <= box.y + box.h
      ) {
        return { frameId, frameBox: box };
      }
    }
    return null;
  }

  const nodeIds = Object.keys(byNode);
  let posted = 0;

  for (const nodeId of nodeIds) {
    await restLimiter.throttle();

    const message = formatComment(byNode[nodeId]);
    const node = enrichedNodes[nodeId];

    let clientMeta;

    if (node) {
      const parent = findParentFrame(node);
      if (parent) {
        clientMeta = {
          node_id: parent.frameId,
          node_offset: {
            x: Math.round(node.x - parent.frameBox.x + node.w),
            y: Math.round(node.y - parent.frameBox.y),
          },
        };
      } else {
        clientMeta = {
          node_id: nodeId,
          node_offset: { x: Math.round(node.w), y: 0 },
        };
      }
    } else {
      clientMeta = { node_id: nodeId, node_offset: { x: 0, y: 0 } };
    }

    try {
      await figmaPost(`/files/${fileKey}/comments`, token, {
        message,
        client_meta: clientMeta,
      });
      posted++;
    } catch (err) {
      console.warn(`    [warn] Comment on ${nodeId} failed: ${err.message}`);
    }
  }

  console.log(`    Posted ${posted} comment(s) across ${nodeIds.length} node(s)`);
}

// ---------------------------------------------------------------------------
// Cleanup — remove previous audit comments
// ---------------------------------------------------------------------------

async function cleanAnnotations(fileKey, token) {
  await restLimiter.throttle();

  let comments;
  try {
    const data = await figmaGet(`/files/${fileKey}/comments`, token);
    comments = data.comments || [];
  } catch (err) {
    console.warn(`  [warn] Could not fetch comments: ${err.message}`);
    return;
  }

  const auditComments = comments.filter(c =>
    c.message && c.message.startsWith(AUDIT_TAG)
  );

  if (auditComments.length === 0) {
    console.log('  No previous audit comments found.');
    return;
  }

  console.log(`  Removing ${auditComments.length} audit comment(s)...`);
  let removed = 0;

  for (const comment of auditComments) {
    await restLimiter.throttle();
    try {
      await figmaDelete(`/files/${fileKey}/comments/${comment.id}`, token);
      removed++;
    } catch (err) {
      console.warn(`  [warn] Could not delete comment ${comment.id}: ${err.message}`);
    }
  }

  console.log(`  Removed ${removed} comment(s).`);
}

module.exports = {
  annotatePage,
  cleanAnnotations,
  AUDIT_TAG,
};
