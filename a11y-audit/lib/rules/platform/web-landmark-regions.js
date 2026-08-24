/**
 * web-landmark-regions.js
 * WCAG 1.3.1: Pages must contain identifiable landmark regions (header, nav, main, footer).
 */

module.exports = {
  id: 'web-landmark-regions',
  name: 'Landmark Regions',
  wcag: ['1.3.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'SECTION'],

  check(node, context) {
    const issues = [];
    if (node.depth > 1) return issues;

    const children = node.children || { count: 0 };
    if (children.count < 3) return issues;

    const allNodes = context.allNodes || {};
    const childNames = [];

    for (const [, n] of Object.entries(allNodes)) {
      if (n.depth === 1 || n.depth === 2) {
        childNames.push((n.name || '').toLowerCase());
      }
    }

    const landmarks = {
      header: childNames.some(n => n.includes('header') || n.includes('topbar') || n.includes('top bar') || n.includes('app bar')),
      nav: childNames.some(n => n.includes('nav') || n.includes('sidebar') || n.includes('menu') || n.includes('side bar')),
      main: childNames.some(n => n.includes('main') || n.includes('content') || n.includes('body')),
      footer: childNames.some(n => n.includes('footer') || n.includes('bottom bar')),
    };

    const missing = Object.entries(landmarks).filter(([, found]) => !found).map(([name]) => name);

    if (missing.length > 0) {
      const required = ['header', 'nav', 'main'];
      const missingRequired = missing.filter(m => required.includes(m));

      if (missingRequired.length > 0) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'error',
          message: `Page "${node.name}" is missing required landmark regions: ${missingRequired.join(', ')}. Screen readers rely on landmarks for navigation.`,
          wcagRef: '1.3.1',
          suggestion: `Name top-level frames using landmark-friendly names (e.g., "Header", "Navigation", "Main Content", "Footer") so developers can map them to HTML landmark roles.`,
          data: { missing, landmarks, platform: 'web' },
        });
      }

      if (missing.includes('footer')) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'info',
          message: `Page "${node.name}" has no identifiable footer region.`,
          wcagRef: '1.3.1',
          suggestion: 'Consider adding a "Footer" frame for consistent page structure.',
          data: { platform: 'web' },
        });
      }
    }

    return issues;
  },
};
