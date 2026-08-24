/**
 * android-bottom-nav.js
 * Material Design 3: Bottom navigation should have 3-5 items.
 */

module.exports = {
  id: 'android-bottom-nav',
  name: 'Android Bottom Navigation',
  wcag: ['1.3.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isBottomNav = name.includes('bottom nav') || name.includes('bottom bar') ||
      name.includes('navigation bar') || name.includes('bottomnavigation') ||
      name.includes('tab bar');

    if (!isBottomNav) return issues;

    const config = context.config || {};
    const minItems = config.bottomNavMinItems || 3;
    const maxItems = config.bottomNavMaxItems || 5;

    const childCount = node.children ? node.children.length : 0;

    if (childCount < minItems) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Bottom navigation "${node.name}" has ${childCount} item(s). Material Design requires ${minItems}-${maxItems} items.`,
        wcagRef: '1.3.1',
        suggestion: `Bottom navigation should have at least ${minItems} destinations. Consider using a different navigation pattern for fewer items.`,
        data: { childCount, minItems, maxItems, platform: 'android' },
      });
    }

    if (childCount > maxItems) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Bottom navigation "${node.name}" has ${childCount} items. Material Design recommends maximum ${maxItems} items.`,
        wcagRef: '1.3.1',
        suggestion: `Reduce to ${maxItems} or fewer destinations. Use a navigation drawer for more items.`,
        data: { childCount, minItems, maxItems, platform: 'android' },
      });
    }

    return issues;
  },
};
