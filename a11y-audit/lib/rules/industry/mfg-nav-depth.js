/**
 * mfg-nav-depth.js
 * Manufacturing: Navigation limited to 2 levels for time-critical environments.
 */

const { isInteractiveNode } = require('../../node-inspector');

module.exports = {
  id: 'mfg-nav-depth',
  name: 'Manufacturing Navigation Depth',
  wcag: ['2.4.5'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isNav = name.includes('nav') || name.includes('menu') ||
      name.includes('sidebar') || name.includes('drawer');
    if (!isNav) return issues;

    const config = context.config || {};
    const maxDepth = config.maxNavDepth || 2;

    const allNodes = context.allNodes || {};
    let maxNestingFound = 0;

    for (const [, n] of Object.entries(allNodes)) {
      if (!isInteractiveNode(n)) continue;
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const relativeDepth = n.depth - node.depth;
      if (relativeDepth > maxNestingFound) {
        maxNestingFound = relativeDepth;
      }
    }

    if (maxNestingFound > maxDepth) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Navigation "${node.name}" has ${maxNestingFound} levels of nesting. Industrial interfaces should have max ${maxDepth} levels for quick access.`,
        wcagRef: '2.4.5',
        suggestion: `Flatten navigation to ${maxDepth} levels max. In time-critical manufacturing environments, deep navigation delays response to alarms and process changes.`,
        data: { maxNestingFound, maxDepth, industry: 'manufacturing' },
      });
    }

    return issues;
  },
};
