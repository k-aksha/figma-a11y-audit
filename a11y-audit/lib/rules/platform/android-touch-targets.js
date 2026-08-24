/**
 * android-touch-targets.js
 * Material Design 3: All interactive touch targets must be at least 48dp.
 */

const { isInteractiveNode } = require('../../node-inspector');

module.exports = {
  id: 'android-touch-targets',
  name: 'Android Touch Targets (48dp)',
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
    const minSize = config.touchTargetAA || 48;

    if (w < minSize || h < minSize) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element is ${Math.round(w)}×${Math.round(h)}px. Material Design requires ${minSize}×${minSize}dp minimum touch targets.`,
        wcagRef: '2.5.8',
        suggestion: `Increase the touch area to at least ${minSize}×${minSize}dp. Use padding to expand the hit area if the visual element must stay small.`,
        data: { width: Math.round(w), height: Math.round(h), minimum: minSize, platform: 'android' },
      });
    }

    // Spacing check
    const spacing = config.interactiveSpacing || 8;
    if (node.siblings && node.siblings.length > 0) {
      for (const sib of node.siblings) {
        const sibName = (sib.name || '').toLowerCase();
        const sibIsInteractive = ['button', 'btn', 'input', 'checkbox', 'radio', 'switch', 'toggle', 'link', 'tab', 'chip', 'fab']
          .some(p => sibName.includes(p));
        if (!sibIsInteractive) continue;

        const gapX = Math.abs((sib.x + sib.w) <= node.x ? node.x - (sib.x + sib.w) : sib.x - (node.x + w));
        const gapY = Math.abs((sib.y + sib.h) <= node.y ? node.y - (sib.y + sib.h) : sib.y - (node.y + h));
        const gap = Math.min(gapX, gapY);

        if (gap < spacing && gap >= 0) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `Only ${Math.round(gap)}dp gap between "${node.name}" and "${sib.name}". Material Design recommends ≥${spacing}dp between touch targets.`,
            wcagRef: '2.5.8',
            suggestion: `Increase spacing to at least ${spacing}dp between adjacent interactive elements.`,
            data: { gap: Math.round(gap), siblingName: sib.name, platform: 'android' },
          });
          break;
        }
      }
    }

    return issues;
  },
};
