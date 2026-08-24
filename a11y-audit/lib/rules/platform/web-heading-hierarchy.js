/**
 * web-heading-hierarchy.js
 * WCAG 1.3.1: Heading levels must not skip (e.g., H1 to H3 without H2).
 */

const { isHeadingNode } = require('../../node-inspector');

module.exports = {
  id: 'web-heading-hierarchy',
  name: 'Heading Level Hierarchy',
  wcag: ['1.3.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'SECTION'],

  check(node, context) {
    const issues = [];
    if (node.depth > 1) return issues;

    const headings = context._headings || [];
    if (headings.length < 2) return issues;

    // Sort by vertical position
    const sorted = [...headings].sort((a, b) => a.y - b.y);

    // Infer heading levels from font size (largest = H1)
    const uniqueSizes = [...new Set(sorted.map(h => h.fontSize))].sort((a, b) => b - a);
    const sizeToLevel = {};
    uniqueSizes.forEach((size, i) => { sizeToLevel[size] = i + 1; });

    let prevLevel = 0;
    const config = context.config || {};
    const maxSkip = config.maxHeadingSkip || 1;

    for (const heading of sorted) {
      const level = sizeToLevel[heading.fontSize] || 1;
      if (prevLevel > 0 && level > prevLevel + maxSkip) {
        issues.push({
          nodeId: heading.id,
          nodeName: heading.name,
          severity: 'error',
          message: `Heading "${heading.name}" appears to skip from level H${prevLevel} to H${level}. Headings must not skip levels.`,
          wcagRef: '1.3.1',
          suggestion: `Add intermediate heading levels or adjust font sizes so the visual hierarchy matches a logical H1→H2→H3 progression.`,
          data: { prevLevel, currentLevel: level, fontSize: heading.fontSize, platform: 'web' },
        });
      }
      prevLevel = level;
    }

    return issues;
  },
};
