/**
 * android-elevation.js
 * Material Design 3: Interactive elements need visual affordance —
 * fill contrast, tonal elevation, border, or shadow (WCAG 1.4.11).
 *
 * M3 shifted from shadow-based elevation to tonal elevation (color overlays).
 * Shadows are optional. The real requirement is 3:1 non-text contrast
 * against adjacent colors so users can identify the component boundary.
 */

const { isInteractiveNode } = require('../../node-inspector');
const { contrastRatio } = require('../../contrast');

const INTERACTIVE_PATTERNS = ['button', 'btn', 'card', 'fab', 'floating', 'chip', 'menu', 'toggle', 'switch', 'tab'];

module.exports = {
  id: 'android-elevation',
  name: 'Android Interactive Visual Affordance',
  wcag: ['1.4.11'],
  level: 'AA',
  category: 'interaction',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isInteractiveNode(node)) return issues;

    const name = (node.name || '').toLowerCase();
    const needsCheck = INTERACTIVE_PATTERNS.some(p => name.includes(p));
    if (!needsCheck) return issues;

    const hasDropShadow = (node.effects || []).some(e =>
      e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
    );
    const hasBorder = node.strokes && node.strokes.length > 0 && node.strokeWeight > 0;
    const hasFill = node.fills && node.fills.length > 0 && node.fills[0].a > 0;

    // Check fill contrast against background (M3 tonal elevation)
    let fillMeetsBoundaryContrast = false;
    if (hasFill && node.bg) {
      const fg = node.fills[0];
      const bg = node.bg;
      const ratio = contrastRatio(fg, bg);
      fillMeetsBoundaryContrast = ratio >= 3;
    }

    const hasVisualAffordance = hasDropShadow || hasBorder || fillMeetsBoundaryContrast;

    if (!hasVisualAffordance) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Interactive element "${node.name}" may lack sufficient visual affordance. No detectable fill contrast (3:1), border, or shadow against its background.`,
        wcagRef: '1.4.11',
        suggestion: 'Ensure 3:1 contrast ratio between the component boundary and adjacent colors. Material Design 3 uses tonal elevation (fill color contrast), borders, or shadows.',
        data: { hasDropShadow, hasBorder, hasFill, fillMeetsBoundaryContrast, platform: 'android' },
      });
    }

    return issues;
  },
};
