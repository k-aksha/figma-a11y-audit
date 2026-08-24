/**
 * webapp-loading-states.js
 * WCAG 1.3.1: Loading/spinner components must have accompanying text.
 */

module.exports = {
  id: 'webapp-loading-states',
  name: 'Loading State Accessibility',
  wcag: ['1.3.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isLoading = name.includes('loading') || name.includes('spinner') ||
      name.includes('progress') || name.includes('skeleton') ||
      name.includes('loader');

    if (!isLoading) return issues;

    const children = node.children || { count: 0, hasText: false, hasVector: false };

    // Spinner-only: has icon/vector but no text
    if (!children.hasText && (children.hasVector || children.count > 0)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Loading component "${node.name}" has no text label. Screen readers cannot interpret a visual spinner alone.`,
        wcagRef: '1.3.1',
        suggestion: 'Add visible text like "Loading..." or "Please wait" alongside the spinner. This text becomes the aria-label for the loading indicator.',
        data: { hasText: false, hasVector: children.hasVector, platform: 'web-app' },
      });
    }

    return issues;
  },
};
