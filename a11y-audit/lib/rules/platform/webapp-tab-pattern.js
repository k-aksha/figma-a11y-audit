/**
 * webapp-tab-pattern.js
 * WAI-ARIA: Tab components need active state indicator beyond color, max 7 tabs.
 */

module.exports = {
  id: 'webapp-tab-pattern',
  name: 'Tab Pattern',
  wcag: ['1.3.1', '2.4.7'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isTabBar = name.includes('tabs') || name.includes('tab bar') ||
      name.includes('tab list') || name.includes('tablist') ||
      name.includes('tab group');

    if (!isTabBar) return issues;

    const config = context.config || {};
    const maxTabs = config.maxTabCount || 7;
    const childCount = node.children ? node.children.count : 0;

    if (childCount > maxTabs) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Tab bar "${node.name}" has ${childCount} tabs. More than ${maxTabs} tabs reduces usability, especially for keyboard and screen reader users.`,
        wcagRef: '1.3.1',
        suggestion: `Reduce to ${maxTabs} or fewer tabs. Consider using a dropdown, overflow menu, or secondary navigation for additional sections.`,
        data: { childCount, maxTabs, platform: 'web-app' },
      });
    }

    // Check active tab state uses more than color alone
    if (node.variantProps) {
      const stateKey = Object.keys(node.variantProps).find(k =>
        ['state', 'selected', 'active'].includes(k.toLowerCase())
      );

      if (stateKey) {
        const stateVal = (node.variantProps[stateKey] || '').toLowerCase();
        if (stateVal === 'active' || stateVal === 'selected' || stateVal === 'true') {
          const hasUnderline = node.strokes && node.strokes.length > 0;
          const hasBold = node.fontWeight === 'bold';
          const hasIcon = node.children && node.children.hasVector;

          if (!hasUnderline && !hasBold && !hasIcon) {
            issues.push({
              nodeId: node.id,
              nodeName: node.name,
              severity: 'warning',
              message: `Active tab "${node.name}" may rely on color alone to indicate selection. Active state needs more than a color change.`,
              wcagRef: '2.4.7',
              suggestion: 'Add an underline, bold text weight, or icon to distinguish the active tab from inactive tabs beyond color.',
              data: { hasUnderline, hasBold, hasIcon, platform: 'web-app' },
            });
          }
        }
      }
    }

    return issues;
  },
};
