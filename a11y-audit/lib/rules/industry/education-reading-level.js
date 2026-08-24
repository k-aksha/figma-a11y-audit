/**
 * education-reading-level.js
 * Education: Content needs generous line height, limited line length, and paragraph spacing.
 */

module.exports = {
  id: 'education-reading-level',
  name: 'Educational Content Readability',
  wcag: ['1.4.4', '1.4.12'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const fontSize = node.fontSize;
    if (!fontSize) return issues;

    const config = context.config || {};
    const minLineHeightRatio = config.lineHeightRatio || 1.6;
    const maxCharsPerLine = config.maxTextBlockWidth || 80;

    // Line height check
    if (node.lineHeight && fontSize > 0) {
      const ratio = node.lineHeight / fontSize;
      if (ratio < minLineHeightRatio) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Line height ${node.lineHeight}px is ${Math.round(ratio * 100) / 100}× font size. Educational content requires ≥${minLineHeightRatio}× for comfortable reading.`,
          wcagRef: '1.4.12',
          suggestion: `Set line height to at least ${Math.ceil(fontSize * minLineHeightRatio)}px (${minLineHeightRatio}× ${fontSize}px). Generous line spacing aids reading comprehension for students.`,
          data: { lineHeight: node.lineHeight, fontSize, ratio: Math.round(ratio * 100) / 100, required: minLineHeightRatio, industry: 'education' },
        });
      }
    }

    // Estimate characters per line from container width
    if (node.w > 0 && fontSize > 0 && node.chars.length > 50) {
      const avgCharWidth = fontSize * 0.5;
      const estimatedCharsPerLine = Math.round(node.w / avgCharWidth);

      if (estimatedCharsPerLine > maxCharsPerLine) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Text container is ~${estimatedCharsPerLine} characters wide. Educational content should be ≤${maxCharsPerLine} characters per line for readability.`,
          wcagRef: '1.4.4',
          suggestion: `Reduce text container width or increase font size. The optimal reading line length for educational content is 50-80 characters.`,
          data: { estimatedCharsPerLine, maxCharsPerLine, containerWidth: Math.round(node.w), fontSize, industry: 'education' },
        });
      }
    }

    return issues;
  },
};
