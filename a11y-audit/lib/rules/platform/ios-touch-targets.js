/**
 * ios-touch-targets.js
 * Apple HIG: All interactive touch targets must be at least 44×44pt.
 */

const { isInteractiveNode } = require('../../node-inspector');

module.exports = {
  id: 'ios-touch-targets',
  name: 'iOS Touch Targets (44pt)',
  wcag: ['2.5.8'],
  level: 'AA',
  category: 'interaction',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'],

  check(node, context) {
    const issues = [];
    if (!isInteractiveNode(node)) return issues;
    if (!node.visible || node.opacity < 0.5) return issues;

    const w = node.w || 0;
    const h = node.h || 0;
    const config = context.config || {};
    const minSize = config.touchTargetAA || 44;

    if (w < minSize || h < minSize) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element is ${Math.round(w)}×${Math.round(h)}px. Apple HIG requires ${minSize}×${minSize}pt minimum touch targets.`,
        wcagRef: '2.5.8',
        suggestion: `Increase the tappable area to at least ${minSize}×${minSize}pt. Use padding to expand the hit area if the visual element must stay small.`,
        data: { width: Math.round(w), height: Math.round(h), minimum: minSize, platform: 'ios' },
      });
    }

    return issues;
  },
};
