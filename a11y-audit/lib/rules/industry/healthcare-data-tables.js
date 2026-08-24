/**
 * healthcare-data-tables.js
 * Healthcare: Medical data tables need larger font sizes and clear row delineation.
 */

const MEDICAL_TABLE_PATTERNS = [
  'vital', 'lab', 'result', 'medication', 'patient', 'medical',
  'diagnosis', 'prescription', 'allergy', 'clinical', 'history',
];

module.exports = {
  id: 'healthcare-data-tables',
  name: 'Healthcare Data Table Readability',
  wcag: ['1.3.1', '1.4.4'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isTable = name.includes('table') || name.includes('grid') ||
      name.includes('list') || name.includes('results');
    const isMedical = MEDICAL_TABLE_PATTERNS.some(p => name.includes(p));

    if (!isTable && !isMedical) return issues;

    const config = context.config || {};
    const minFontSize = config.dataTableMinFontSize || 14;

    const allNodes = context.allNodes || {};
    let minCellFont = Infinity;
    let textCount = 0;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.type !== 'TEXT' || !n.fontSize) continue;
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      textCount++;
      minCellFont = Math.min(minCellFont, n.fontSize);
    }

    if (textCount === 0) return issues;

    if (minCellFont < minFontSize && minCellFont !== Infinity) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Medical data table "${node.name}" has text as small as ${minCellFont}px. Healthcare data tables require minimum ${minFontSize}px for patient safety.`,
        wcagRef: '1.4.4',
        suggestion: `Increase all cell text to at least ${minFontSize}px. Medical data misreads due to small text can have clinical consequences.`,
        data: { minCellFont, minimum: minFontSize, textCount, industry: 'healthcare' },
      });
    }

    // Check row spacing
    if (node.layoutMode !== null && node.itemSpacing !== null && node.itemSpacing < 4) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Medical data table "${node.name}" has only ${node.itemSpacing}px row spacing. Dense medical data needs more visual separation.`,
        wcagRef: '1.3.1',
        suggestion: 'Use at least 4px row spacing or add visual dividers between rows for clear data scanning.',
        data: { itemSpacing: node.itemSpacing, industry: 'healthcare' },
      });
    }

    return issues;
  },
};
