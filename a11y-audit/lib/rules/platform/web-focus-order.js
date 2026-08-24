/**
 * web-focus-order.js
 * WCAG 2.4.3: Focus order of interactive elements should match visual layout order.
 */

const { isInteractiveNode } = require('../../node-inspector');

module.exports = {
  id: 'web-focus-order',
  name: 'Focus Order',
  wcag: ['2.4.3'],
  level: 'AA',
  category: 'focus',
  nodeTypes: ['FRAME', 'SECTION'],

  check(node, context) {
    const issues = [];
    if (node.depth > 2) return issues;
    if (node.layoutMode !== null) return issues;

    const allNodes = context.allNodes || {};
    const interactiveChildren = [];

    for (const [, n] of Object.entries(allNodes)) {
      if (!isInteractiveNode(n)) continue;
      if (n.x >= node.x && n.x <= node.x + node.w &&
          n.y >= node.y && n.y <= node.y + node.h) {
        interactiveChildren.push(n);
      }
    }

    if (interactiveChildren.length < 3) return issues;

    // Sort by visual position (top-to-bottom, left-to-right)
    const visualOrder = [...interactiveChildren].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
      return a.x - b.x;
    });

    // Compare with layer order (depth-first order from Figma)
    const layerOrder = [...interactiveChildren];

    let mismatches = 0;
    for (let i = 0; i < Math.min(layerOrder.length, visualOrder.length); i++) {
      if (layerOrder[i].id !== visualOrder[i].id) mismatches++;
    }

    const mismatchRate = mismatches / layerOrder.length;

    if (mismatchRate > 0.2) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Focus order of interactive elements in "${node.name}" may not match visual layout (${mismatches} of ${layerOrder.length} elements misaligned). Tab navigation will feel unpredictable.`,
        wcagRef: '2.4.3',
        suggestion: 'Convert to Auto Layout for predictable focus order, or reorder layers to match the visual top-to-bottom, left-to-right reading flow.',
        data: { mismatches, total: layerOrder.length, mismatchRate: Math.round(mismatchRate * 100), platform: 'web' },
      });
    }

    return issues;
  },
};
