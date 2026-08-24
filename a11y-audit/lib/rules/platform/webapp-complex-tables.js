/**
 * webapp-complex-tables.js
 * WCAG 1.3.1, 1.4.11: Data tables need distinct headers, row dividers, and min cell text.
 */

module.exports = {
  id: 'webapp-complex-tables',
  name: 'Complex Data Tables',
  wcag: ['1.3.1', '1.4.11'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isTable = name.includes('table') || name.includes('data grid') ||
      name.includes('datagrid') || name.includes('data table') ||
      name.includes('datatable') || name.includes('spreadsheet');

    if (!isTable) return issues;

    const children = node.children || { count: 0, hasText: false, textContent: [] };

    if (children.count < 2) return issues;

    // Check for header row (look for bold text or distinct naming)
    const allNodes = context.allNodes || {};
    let hasHeaderRow = false;
    let minCellFontSize = Infinity;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const nName = (n.name || '').toLowerCase();
      if (nName.includes('header') || nName.includes('th') || nName.includes('column head')) {
        hasHeaderRow = true;
      }

      if (n.type === 'TEXT' && n.fontSize) {
        minCellFontSize = Math.min(minCellFontSize, n.fontSize);
      }
    }

    if (!hasHeaderRow) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Data table "${node.name}" has no identifiable header row. Screen readers need table headers to announce column context.`,
        wcagRef: '1.3.1',
        suggestion: 'Add a visually distinct header row with bold text or a different background. Name it with "header" or "th" for developer clarity.',
        data: { platform: 'web-app' },
      });
    }

    if (minCellFontSize < 12 && minCellFontSize !== Infinity) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Data table "${node.name}" has cell text as small as ${minCellFontSize}px. Small text in tables reduces scannability.`,
        wcagRef: '1.4.11',
        suggestion: 'Use at least 12px font size for table cell content, 14px recommended for dense data tables.',
        data: { minCellFontSize, platform: 'web-app' },
      });
    }

    return issues;
  },
};
