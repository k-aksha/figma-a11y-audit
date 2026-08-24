/**
 * education-media-alt.js
 * Education: All educational media must have descriptions (no decorative exemption).
 */

const MEDIA_PATTERNS = [
  'image', 'photo', 'illustration', 'diagram', 'chart', 'graph',
  'figure', 'video', 'thumbnail', 'media', 'picture', 'infographic',
  'screenshot', 'map', 'animation',
];

module.exports = {
  id: 'education-media-alt',
  name: 'Educational Media Descriptions',
  wcag: ['1.1.1', '1.2.1'],
  level: 'AA',
  category: 'images',
  nodeTypes: ['RECTANGLE', 'VECTOR', 'FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isMedia = MEDIA_PATTERNS.some(p => name.includes(p));
    if (!isMedia) return issues;

    const hasDescription = (node.desc || '').trim().length > 0;

    if (!hasDescription) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Educational media "${node.name}" has no description. In educational contexts, ALL media must have descriptions — there is no "decorative" exemption for learning content.`,
        wcagRef: '1.1.1',
        suggestion: 'Add a description explaining what the media conveys and its educational purpose. For diagrams/charts, describe the key data or concept being illustrated.',
        data: { industry: 'education' },
      });
    }

    return issues;
  },
};
