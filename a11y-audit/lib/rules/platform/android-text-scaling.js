/**
 * android-text-scaling.js
 * Android: Text must use scalable sp units. Minimum 12sp (platform minimum),
 * 14sp+ recommended for body text. Must handle 200% system font scaling (Android 14+).
 */

module.exports = {
  id: 'android-text-scaling',
  name: 'Android Text Scaling Support',
  wcag: ['1.4.4'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const config = context.config || {};
    const absoluteMin = config.minMobileFontSize || 12;
    const bodyMin = config.minBodyFontSize || 14;
    const fontSize = node.fontSize || 0;
    if (fontSize === 0) return issues;

    const name = (node.name || '').toLowerCase();
    const isCaption = name.includes('caption') || name.includes('footnote') ||
      name.includes('overline') || name.includes('helper') || name.includes('label');

    if (fontSize < absoluteMin) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Font size ${fontSize}px is below the Android platform minimum of ${absoluteMin}sp.`,
        wcagRef: '1.4.4',
        suggestion: `Increase to at least ${absoluteMin}sp. Text below this size becomes unreadable with Android system font scaling.`,
        data: { fontSize, minimum: absoluteMin, platform: 'android' },
      });
    } else if (!isCaption && fontSize < bodyMin) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Font size ${fontSize}sp is below the recommended body text minimum of ${bodyMin}sp.`,
        wcagRef: '1.4.4',
        suggestion: `Consider ${bodyMin}sp+ for body text. Material Design Caption (12sp) and Overline (11sp) styles are exceptions.`,
        data: { fontSize, recommended: bodyMin, platform: 'android' },
      });
    }

    // Check if parent frame allows text growth (Auto Layout) — critical for 200% scaling
    if (node.parentType === 'FRAME' || node.parentType === 'COMPONENT' || node.parentType === 'INSTANCE') {
      const parentNode = context.allNodes && Object.values(context.allNodes).find(n =>
        n.name === node.parentName && (n.children?.types || []).includes('TEXT')
      );

      if (parentNode && parentNode.layoutMode === null) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'info',
          message: `Text "${node.name}" is inside a fixed-size frame "${node.parentName}" without Auto Layout. Text may be clipped at 200% system font scaling (Android 14+).`,
          wcagRef: '1.4.4',
          suggestion: 'Use Auto Layout on the parent frame so the container grows with text when Android system font scaling is applied.',
          data: { parentName: node.parentName, platform: 'android' },
        });
      }
    }

    return issues;
  },
};
