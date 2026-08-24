/**
 * mfg-touch-targets.js
 * Manufacturing: 60px+ touch targets for gloved operation with 12px spacing.
 */

const { isInteractiveNode } = require('../../node-inspector');

module.exports = {
  id: 'mfg-touch-targets',
  name: 'Manufacturing Touch Targets (Gloved)',
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
    const minSize = config.touchTargetAA || 60;
    const spacing = config.interactiveSpacing || 12;

    if (w < minSize || h < minSize) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element is ${Math.round(w)}×${Math.round(h)}px. Industrial interfaces require ${minSize}×${minSize}px minimum for gloved operation.`,
        wcagRef: '2.5.8',
        suggestion: `Increase to at least ${minSize}×${minSize}px. Operators wearing industrial gloves cannot accurately tap small targets.`,
        data: { width: Math.round(w), height: Math.round(h), minimum: minSize, industry: 'manufacturing' },
      });
    }

    if (node.siblings && node.siblings.length > 0) {
      for (const sib of node.siblings) {
        const sibName = (sib.name || '').toLowerCase();
        const sibIsInteractive = ['button', 'btn', 'input', 'switch', 'toggle', 'control', 'handle']
          .some(p => sibName.includes(p));
        if (!sibIsInteractive) continue;

        const gapX = Math.abs((sib.x + sib.w) <= node.x ? node.x - (sib.x + sib.w) : sib.x - (node.x + w));
        const gapY = Math.abs((sib.y + sib.h) <= node.y ? node.y - (sib.y + sib.h) : sib.y - (node.y + h));
        const gap = Math.min(gapX, gapY);

        if (gap < spacing && gap >= 0) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'error',
            message: `Only ${Math.round(gap)}px gap between "${node.name}" and "${sib.name}". Industrial interfaces require ≥${spacing}px spacing to prevent accidental activation with gloves.`,
            wcagRef: '2.5.8',
            suggestion: `Increase spacing to at least ${spacing}px. Accidental activation in manufacturing can be a safety hazard.`,
            data: { gap: Math.round(gap), siblingName: sib.name, industry: 'manufacturing' },
          });
          break;
        }
      }
    }

    return issues;
  },
};
