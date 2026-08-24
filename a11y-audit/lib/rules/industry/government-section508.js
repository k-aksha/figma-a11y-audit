/**
 * government-section508.js
 * Government: Section 508 composite compliance check.
 */

const { isHeadingNode } = require('../../node-inspector');

module.exports = {
  id: 'government-section508',
  name: 'Section 508 Compliance',
  wcag: ['1.1.1', '1.3.1', '2.4.1', '2.4.2'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'SECTION'],

  check(node, context) {
    const issues = [];
    if (node.depth > 1) return issues;

    const allNodes = context.allNodes || {};
    let hasPageTitle = false;
    let imagesWithoutDesc = 0;
    let formsWithoutLabels = 0;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      // Check for page title (first heading)
      if (isHeadingNode(n) && !hasPageTitle) {
        hasPageTitle = true;
      }

      // Check images have descriptions
      const nName = (n.name || '').toLowerCase();
      if ((n.type === 'RECTANGLE' || n.type === 'VECTOR') &&
        (nName.includes('image') || nName.includes('photo') || nName.includes('logo'))) {
        if (!(n.desc || '').trim()) {
          imagesWithoutDesc++;
        }
      }
    }

    if (!hasPageTitle) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Page "${node.name}" has no identifiable page title/heading. Section 508 requires every page to have a descriptive title.`,
        wcagRef: '2.4.2',
        suggestion: 'Add a visible heading as the first content element. This maps to the HTML <title> and <h1> elements.',
        data: { industry: 'government' },
      });
    }

    if (imagesWithoutDesc > 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `${imagesWithoutDesc} image(s) in "${node.name}" lack descriptions. Section 508 requires all non-decorative images to have text alternatives.`,
        wcagRef: '1.1.1',
        suggestion: 'Add descriptions to all images. For government content, err on the side of describing images rather than marking them as decorative.',
        data: { imagesWithoutDesc, industry: 'government' },
      });
    }

    return issues;
  },
};
