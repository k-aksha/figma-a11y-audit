/**
 * healthcare-color-safe.js
 * Healthcare: Status indicators must use color-blind safe palettes; no red/green pairs.
 */

const STATUS_PATTERNS = [
  'status', 'badge', 'indicator', 'alert', 'vital', 'severity',
  'triage', 'priority', 'critical', 'normal', 'abnormal',
];

module.exports = {
  id: 'healthcare-color-safe',
  name: 'Healthcare Color-Blind Safe Palettes',
  wcag: ['1.4.1'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();
    const parentName = (node.parentName || '').toLowerCase();

    const isStatus = STATUS_PATTERNS.some(p => name.includes(p) || parentName.includes(p));
    if (!isStatus) return issues;

    const children = node.children || { hasText: false, hasVector: false };

    // Check that status uses icon + text, not color alone
    if (!children.hasVector && !children.hasText) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Medical status indicator "${node.name}" has no icon or text label. In healthcare, color-only status is dangerous for color-blind clinicians.`,
        wcagRef: '1.4.1',
        suggestion: 'Add an icon (checkmark, warning triangle, X) AND a text label alongside the color. Medical status must use triple coding: color + icon + text.',
        data: { hasIcon: false, hasText: false, industry: 'healthcare' },
      });
    }

    // Check for red/green confusion risk
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      const isRed = fill.r > 0.6 && fill.g < 0.4 && fill.b < 0.4;
      const isGreen = fill.g > 0.5 && fill.r < 0.5 && fill.b < 0.4;

      if (isRed || isGreen) {
        // Check if sibling status uses the opposite color
        const siblings = node.siblings || [];
        for (const sib of siblings) {
          const sibName = (sib.name || '').toLowerCase();
          if (!STATUS_PATTERNS.some(p => sibName.includes(p))) continue;

          const sibNode = context.allNodes && context.allNodes[sib.id];
          if (!sibNode || !sibNode.fills || sibNode.fills.length === 0) continue;

          const sibFill = sibNode.fills[0];
          const sibIsRed = sibFill.r > 0.6 && sibFill.g < 0.4 && sibFill.b < 0.4;
          const sibIsGreen = sibFill.g > 0.5 && sibFill.r < 0.5 && sibFill.b < 0.4;

          if ((isRed && sibIsGreen) || (isGreen && sibIsRed)) {
            issues.push({
              nodeId: node.id,
              nodeName: node.name,
              severity: 'error',
              message: `Red/green color pair detected between "${node.name}" and "${sib.name}". This pair is indistinguishable for protanopia/deuteranopia (~8% of males).`,
              wcagRef: '1.4.1',
              suggestion: 'Replace with a color-blind safe palette: blue/orange, blue/red, or purple/yellow. In medical contexts, misreading vitals status can be life-threatening.',
              data: { isRed, isGreen, siblingName: sib.name, industry: 'healthcare' },
            });
            break;
          }
        }
      }
    }

    return issues;
  },
};
