/**
 * ios-dynamic-type.js
 * Apple HIG: Text should align with the iOS type scale and support Dynamic Type.
 */

module.exports = {
  id: 'ios-dynamic-type',
  name: 'iOS Dynamic Type Support',
  wcag: ['1.4.4'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const fontSize = node.fontSize || 0;
    if (fontSize === 0) return issues;

    const config = context.config || {};
    const minFont = config.minMobileFontSize || 17;

    // iOS standard type scale: Caption2(11), Caption1(12), Footnote(13), Subheadline(15), Callout(16), Body/Headline(17), Title3(20), Title2(22), Title1(28), LargeTitle(34)
    const iosTypeScale = [11, 12, 13, 15, 16, 17, 20, 22, 28, 34];

    if (fontSize < minFont) {
      const name = (node.name || '').toLowerCase();
      const isCaption = name.includes('caption') || name.includes('footnote') || name.includes('overline');
      if (!isCaption) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Font size ${fontSize}pt is below the iOS Body text size of ${minFont}pt.`,
          wcagRef: '1.4.4',
          suggestion: `Use at least ${minFont}pt for body text. iOS Dynamic Type Body style starts at 17pt.`,
          data: { fontSize, minimum: minFont, platform: 'ios' },
        });
      }
    }

    // Check if size matches iOS type scale
    if (!iosTypeScale.includes(fontSize) && fontSize >= 11 && fontSize <= 34) {
      const closest = iosTypeScale.reduce((prev, curr) =>
        Math.abs(curr - fontSize) < Math.abs(prev - fontSize) ? curr : prev
      );
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Font size ${fontSize}pt does not match any iOS Dynamic Type size. Closest match: ${closest}pt.`,
        wcagRef: '1.4.4',
        suggestion: `Consider using ${closest}pt to align with iOS Dynamic Type scale (${iosTypeScale.join(', ')}pt).`,
        data: { fontSize, closest, iosTypeScale, platform: 'ios' },
      });
    }

    // Check parent Auto Layout for text growth
    if (node.parentType === 'FRAME' || node.parentType === 'COMPONENT' || node.parentType === 'INSTANCE') {
      const parentNode = context.allNodes && Object.values(context.allNodes).find(n =>
        n.name === node.parentName && (n.children?.types || []).includes('TEXT')
      );

      if (parentNode && parentNode.layoutMode === null) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'info',
          message: `Text inside fixed frame "${node.parentName}" may be clipped when Dynamic Type is active.`,
          wcagRef: '1.4.4',
          suggestion: 'Use Auto Layout on the parent container to accommodate Dynamic Type text growth.',
          data: { parentName: node.parentName, platform: 'ios' },
        });
      }
    }

    return issues;
  },
};
