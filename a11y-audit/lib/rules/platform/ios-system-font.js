/**
 * ios-system-font.js
 * Apple HIG: Custom fonts work with Dynamic Type via UIFontMetrics (iOS 11+).
 * SF Pro is NOT required — but custom fonts must be configured to scale.
 */

const SF_FAMILIES = [
  'sf pro', 'sf pro text', 'sf pro display', 'sf pro rounded',
  'sf mono', 'sf compact', 'sf compact text', 'sf compact rounded',
  'new york', 'system', '.sf',
];

module.exports = {
  id: 'ios-system-font',
  name: 'iOS Font & Dynamic Type Compatibility',
  wcag: ['1.4.12'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.fontName) return issues;

    const family = (node.fontName.family || '').toLowerCase();
    const isSystemFont = SF_FAMILIES.some(sf => family.includes(sf));

    if (!isSystemFont && family.length > 0) {
      const name = (node.name || '').toLowerCase();
      const isBranding = name.includes('logo') || name.includes('brand') || name.includes('hero');

      if (!isBranding) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'info',
          message: `"${node.name}" uses custom font "${node.fontName.family}". Ensure the implementation uses UIFontMetrics so it scales with Dynamic Type.`,
          wcagRef: '1.4.12',
          suggestion: 'Custom fonts are supported with Dynamic Type via UIFontMetrics (iOS 11+). Verify the developer implementation scales this text style correctly.',
          data: { fontFamily: node.fontName.family, isSystemFont, platform: 'ios' },
        });
      }
    }

    return issues;
  },
};
