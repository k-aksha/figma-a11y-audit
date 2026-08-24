/**
 * finance-table-a11y.js
 * Finance: Financial data tables need clear headers and row separation.
 */

module.exports = {
  id: 'finance-table-a11y',
  name: 'Financial Data Table Accessibility',
  wcag: ['1.3.1', '1.4.11'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isTable = name.includes('table') || name.includes('grid') ||
      name.includes('transaction') || name.includes('statement') ||
      name.includes('portfolio') || name.includes('holdings') ||
      name.includes('ledger') || name.includes('balance');

    if (!isTable) return issues;

    const children = node.children || { count: 0 };
    if (children.count < 2) return issues;

    const allNodes = context.allNodes || {};
    let hasHeaderRow = false;
    let hasBoldHeader = false;
    let hasRowDividers = false;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const nName = (n.name || '').toLowerCase();

      if (nName.includes('header') || nName.includes('th') || nName.includes('column')) {
        hasHeaderRow = true;
        if (n.fontWeight === 'bold' || n.type === 'TEXT' && n.fontSize && n.fontSize > 14) {
          hasBoldHeader = true;
        }
      }

      if (nName.includes('divider') || nName.includes('separator') || nName.includes('rule')) {
        hasRowDividers = true;
      }

      if (n.strokes && n.strokes.length > 0 && n.type === 'RECTANGLE') {
        hasRowDividers = true;
      }
    }

    if (!hasHeaderRow) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Financial table "${node.name}" has no identifiable header row. Column headers are critical for understanding financial data.`,
        wcagRef: '1.3.1',
        suggestion: 'Add a distinct header row with bold text and/or a different background color.',
        data: { industry: 'finance' },
      });
    } else if (!hasBoldHeader) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Financial table "${node.name}" headers are not visually distinct. Use bold weight or larger text for headers.`,
        wcagRef: '1.4.11',
        suggestion: 'Make header text bold and/or use a contrasting background to distinguish headers from data rows.',
        data: { industry: 'finance' },
      });
    }

    if (!hasRowDividers) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Financial table "${node.name}" has no row dividers. Dense financial data benefits from visual row separation.`,
        wcagRef: '1.4.11',
        suggestion: 'Add horizontal dividers or alternating row backgrounds (zebra striping) for easier row tracking.',
        data: { industry: 'finance' },
      });
    }

    return issues;
  },
};
