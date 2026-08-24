/**
 * touch-targets.js
 * WCAG 2.5.8 (AA), 2.5.5 (AAA) — Minimum target size for interactive elements.
 */

const { isInteractiveNode } = require('../node-inspector');

module.exports = {
  id: 'touch-targets',
  name: 'Touch/Click Target Size',
  wcag: ['2.5.8', '2.5.5'],
  level: 'AA',
  category: 'interaction',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'],

  check(node, context) {
    const issues = [];
    if (!isInteractiveNode(node)) return issues;

    // Skip invisible or disabled
    if (!node.visible || node.opacity < 0.5) return issues;

    const w = node.w || 0;
    const h = node.h || 0;
    const config = context.config || {};
    const aaMinSize = config.touchTargetAA || 24;
    const aaaMinSize = config.touchTargetAAA || 44;
    const level = (config.level || 'AA').toUpperCase();

    // --- AA: Minimum 24×24px (WCAG 2.5.8) ---
    if (w < aaMinSize || h < aaMinSize) {
      const smallerDim = Math.min(w, h);
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element is ${Math.round(w)}×${Math.round(h)}px. Minimum target size is ${aaMinSize}×${aaMinSize}px (WCAG 2.5.8 AA).`,
        wcagRef: '2.5.8',
        suggestion: `Increase the clickable area to at least ${aaMinSize}×${aaMinSize}px. Use padding to expand the hit area if the visual size must stay small.`,
        data: { width: Math.round(w), height: Math.round(h), minimum: aaMinSize },
      });
    }

    // --- AAA: Recommended 44×44px (WCAG 2.5.5) ---
    if (level === 'AAA' && (w >= aaMinSize && h >= aaMinSize) && (w < aaaMinSize || h < aaaMinSize)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Interactive element is ${Math.round(w)}×${Math.round(h)}px. Enhanced target size is ${aaaMinSize}×${aaaMinSize}px (WCAG 2.5.5 AAA).`,
        wcagRef: '2.5.5',
        suggestion: `For optimal accessibility, increase to ${aaaMinSize}×${aaaMinSize}px — especially important on mobile and touch devices.`,
        data: { width: Math.round(w), height: Math.round(h), recommended: aaaMinSize },
      });
    }

    // --- Spacing between adjacent interactive elements ---
    if (node.siblings && node.siblings.length > 0) {
      for (const sib of node.siblings) {
        const sibName = (sib.name || '').toLowerCase();
        const sibIsInteractive = ['button', 'btn', 'input', 'checkbox', 'radio', 'switch', 'toggle', 'link', 'tab']
          .some(p => sibName.includes(p));

        if (!sibIsInteractive) continue;

        // Calculate gap between this node and sibling
        const gapX = Math.abs((sib.x + sib.w) <= node.x
          ? node.x - (sib.x + sib.w)
          : sib.x - (node.x + w));
        const gapY = Math.abs((sib.y + sib.h) <= node.y
          ? node.y - (sib.y + sib.h)
          : sib.y - (node.y + h));

        const gap = Math.min(gapX, gapY);

        if (gap < 8 && gap >= 0) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `Only ${Math.round(gap)}px gap between "${node.name}" and "${sib.name}". Recommend ≥8px between interactive targets.`,
            wcagRef: '2.5.8',
            suggestion: 'Increase spacing between adjacent interactive elements to at least 8px to prevent accidental taps.',
            data: { gap: Math.round(gap), siblingName: sib.name },
          });
          break; // Only report closest sibling
        }
      }
    }

    return issues;
  },
};
