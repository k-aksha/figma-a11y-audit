/**
 * content-structure.js
 * WCAG 1.3.1, 1.3.2 — Content structure, reading order, landmarks.
 */

module.exports = {
  id: 'content-structure',
  name: 'Content Structure & Reading Order',
  wcag: ['1.3.1', '1.3.2'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'SECTION', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    // Only run structural checks on top-level layout frames (not deeply nested)
    if (node.depth > 2) return issues;

    // --- Landmark identification (1.3.1) ---
    // Check if page-level frames have identifiable landmark regions
    if (node.depth <= 1 && node.children && node.children.count > 3) {
      const childNames = (node.siblings || []).map(s => (s.name || '').toLowerCase());
      const allNames = [name, ...childNames];

      const hasNav = allNames.some(n => n.includes('nav') || n.includes('sidebar') || n.includes('menu'));
      const hasMain = allNames.some(n => n.includes('main') || n.includes('content') || n.includes('body'));
      const hasHeader = allNames.some(n => n.includes('header') || n.includes('topbar') || n.includes('top bar'));

      if (!hasNav && !hasMain && !hasHeader && node.children.count > 5) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'info',
          message: `Layout frame "${node.name}" has ${node.children.count} children but no identifiable landmark regions (nav, main, header).`,
          wcagRef: '1.3.1',
          suggestion: 'Name top-level sections using landmark-friendly names (e.g., "Navigation", "Main Content", "Header", "Footer") so developers can map them to HTML landmark roles.',
          data: { childCount: node.children.count },
        });
      }
    }

    // --- Reading order vs visual order (1.3.2) ---
    if (node.siblings && node.siblings.length > 1 && node.layoutMode === null) {
      // Non-auto-layout frame — check if child positions match layer order
      const siblings = [...node.siblings].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Top to bottom
        return a.x - b.x; // Left to right for same row
      });

      const originalOrder = node.siblings.map(s => s.id);
      const visualOrder = siblings.map(s => s.id);

      let mismatches = 0;
      for (let i = 0; i < Math.min(originalOrder.length, visualOrder.length); i++) {
        if (originalOrder[i] !== visualOrder[i]) mismatches++;
      }

      if (mismatches > originalOrder.length * 0.3 && originalOrder.length > 3) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `"${node.name}" uses absolute positioning and layer order may not match visual reading order (${mismatches} of ${originalOrder.length} items misaligned).`,
          wcagRef: '1.3.2',
          suggestion: 'Convert to Auto Layout to ensure the DOM order matches the visual layout. If absolute positioning is required, ensure layer order follows top-to-bottom, left-to-right reading flow.',
          data: { mismatches, totalSiblings: originalOrder.length },
        });
      }
    }

    // --- Auto Layout recommendation ---
    if (node.layoutMode === null && node.children && node.children.count > 2 && node.depth <= 2) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `"${node.name}" does not use Auto Layout. This can cause reading order issues and makes responsive behavior harder.`,
        wcagRef: '1.3.2',
        suggestion: 'Use Auto Layout for predictable reading order, easier responsive behavior, and proper RTL language support.',
        data: { childCount: node.children.count },
      });
    }

    return issues;
  },
};
