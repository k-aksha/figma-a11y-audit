/**
 * web-skip-navigation.js
 * WCAG 2.4.1: Pages should have a skip-to-content link near the top.
 */

module.exports = {
  id: 'web-skip-navigation',
  name: 'Skip Navigation Link',
  wcag: ['2.4.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'SECTION'],

  check(node, context) {
    const issues = [];
    if (node.depth > 1) return issues;

    // Only check top-level page frames
    const children = node.children || { count: 0, textContent: [] };
    if (children.count < 3) return issues;

    const allNodes = context.allNodes || {};
    let hasSkipLink = false;

    for (const [, n] of Object.entries(allNodes)) {
      const name = (n.name || '').toLowerCase();
      const chars = (n.chars || '').toLowerCase();
      const isNearTop = n.y >= node.y && n.y < node.y + 100;

      if (isNearTop && (
        name.includes('skip') ||
        chars.includes('skip to') ||
        chars.includes('skip nav') ||
        chars.includes('jump to content')
      )) {
        hasSkipLink = true;
        break;
      }
    }

    if (!hasSkipLink) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Page "${node.name}" has no skip navigation link. Keyboard users need a way to bypass repeated navigation.`,
        wcagRef: '2.4.1',
        suggestion: 'Add a "Skip to main content" link as the first focusable element. It can be visually hidden until focused.',
        data: { platform: 'web' },
      });
    }

    return issues;
  },
};
