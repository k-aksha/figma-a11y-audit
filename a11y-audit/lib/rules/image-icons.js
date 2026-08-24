/**
 * image-icons.js
 * WCAG 1.1.1 — Icon-only buttons and images need accessible labels.
 */

const { isInteractiveNode } = require('../node-inspector');

module.exports = {
  id: 'image-icons',
  name: 'Image & Icon Accessibility',
  wcag: ['1.1.1'],
  level: 'AA',
  category: 'images',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE', 'VECTOR', 'RECTANGLE'],

  check(node, context) {
    const issues = [];

    // --- Icon-only buttons (1.1.1) ---
    if (isInteractiveNode(node)) {
      const children = node.children || { count: 0, hasText: false, hasVector: false };

      // Has vector/icon content but no text child
      if (children.hasVector && !children.hasText && children.count <= 3) {
        const hasDescription = (node.desc || '').trim().length > 0;
        const nameIsDescriptive = isDescriptiveName(node.name);

        // Check if a tooltip sibling exists
        const hasTooltip = (node.siblings || []).some(s =>
          (s.name || '').toLowerCase().includes('tooltip')
        );

        if (!hasDescription && !nameIsDescriptive && !hasTooltip) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'error',
            message: `Icon-only button "${node.name}" has no accessible label. Screen readers will not convey its purpose.`,
            wcagRef: '1.1.1',
            suggestion: 'Add a component description (aria-label equivalent), wrap with a Tooltip, or add visually hidden text. The layer name should describe the action (e.g., "Close", "Search", "Menu").',
            data: { hasDescription, nameIsDescriptive, hasTooltip, childCount: children.count },
          });
        } else if (!hasDescription && nameIsDescriptive && !hasTooltip) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'info',
            message: `Icon button "${node.name}" relies on layer name for accessibility. Consider adding a Tooltip for sighted users too.`,
            wcagRef: '1.1.1',
            suggestion: 'Add a Tooltip component to show the action label on hover — this helps all users, not just screen reader users.',
            data: { hasDescription, nameIsDescriptive },
          });
        }
      }
    }

    // --- Decorative vs informative images ---
    if (node.type === 'RECTANGLE' || node.type === 'VECTOR') {
      const name = (node.name || '').toLowerCase();
      const isLikelyImage = name.includes('image') || name.includes('photo') ||
        name.includes('illustration') || name.includes('avatar') ||
        name.includes('logo') || name.includes('thumbnail');

      if (isLikelyImage) {
        const hasDescription = (node.desc || '').trim().length > 0;
        const isDecorativeMarked = name.includes('decorative') || (node.desc || '').toLowerCase().includes('decorative');

        if (!hasDescription && !isDecorativeMarked) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `Image "${node.name}" has no alt text description. Determine if it's decorative or informative.`,
            wcagRef: '1.1.1',
            suggestion: 'If informative: add a description explaining what the image conveys. If decorative: mark the layer name with "decorative" or set alt="" in implementation.',
            data: { isLikelyImage },
          });
        }
      }
    }

    return issues;
  },
};

function isDescriptiveName(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  // Generic/non-descriptive names
  const generic = ['icon', 'vector', 'frame', 'group', 'rectangle', 'ellipse',
    'image', 'img', 'svg', 'shape', 'component', 'instance', 'button',
    'btn', 'ico', 'ic_', 'ic-'];
  if (generic.some(g => lower === g || lower.startsWith(g + ' '))) return false;
  // Must be > 2 chars and contain at least one letter
  if (lower.length < 3 || !/[a-z]/.test(lower)) return false;
  return true;
}
