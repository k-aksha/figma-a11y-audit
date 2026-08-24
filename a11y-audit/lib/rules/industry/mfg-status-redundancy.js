/**
 * mfg-status-redundancy.js
 * Manufacturing: Status indicators require triple redundancy — color + icon + text.
 */

const STATUS_PATTERNS = [
  'status', 'indicator', 'alarm', 'alert', 'warning', 'fault',
  'running', 'stopped', 'idle', 'error', 'active', 'offline',
  'online', 'connected', 'disconnected', 'operational',
];

module.exports = {
  id: 'mfg-status-redundancy',
  name: 'Manufacturing Status Triple Redundancy',
  wcag: ['1.4.1', '1.3.3'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();
    const parentName = (node.parentName || '').toLowerCase();

    const isStatus = STATUS_PATTERNS.some(p => name.includes(p) || parentName.includes(p));
    if (!isStatus) return issues;

    const children = node.children || { hasText: false, hasVector: false, count: 0 };
    const config = context.config || {};
    const minIndicatorSize = config.statusIndicatorMinSize || 24;

    const hasColor = node.fills && node.fills.length > 0;
    const hasIcon = children.hasVector;
    const hasText = children.hasText;

    const missing = [];
    if (!hasColor) missing.push('color');
    if (!hasIcon) missing.push('icon');
    if (!hasText) missing.push('text');

    if (missing.length > 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: missing.length >= 2 ? 'error' : 'warning',
        message: `Industrial status indicator "${node.name}" is missing: ${missing.join(', ')}. Manufacturing requires triple redundancy (color + icon + text).`,
        wcagRef: '1.4.1',
        suggestion: 'Add all three: a colored fill/background, a meaningful icon (checkmark/X/warning triangle), AND a text label ("Running", "Fault", "Stopped"). In noisy environments, operators may not focus long enough to interpret a single cue.',
        data: { hasColor, hasIcon, hasText, missing, industry: 'manufacturing' },
      });
    }

    // Check minimum indicator size
    if ((node.w < minIndicatorSize || node.h < minIndicatorSize) && node.w > 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Status indicator "${node.name}" is ${Math.round(node.w)}×${Math.round(node.h)}px. Industrial indicators should be at least ${minIndicatorSize}×${minIndicatorSize}px for visibility.`,
        wcagRef: '1.4.1',
        suggestion: `Increase to at least ${minIndicatorSize}×${minIndicatorSize}px. Status must be visible from operating distance.`,
        data: { width: Math.round(node.w), height: Math.round(node.h), minimum: minIndicatorSize, industry: 'manufacturing' },
      });
    }

    return issues;
  },
};
