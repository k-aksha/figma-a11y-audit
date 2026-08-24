/**
 * color-only-info.js
 * WCAG 1.4.1 — Information must not be conveyed by color alone.
 */

module.exports = {
  id: 'color-only-info',
  name: 'Color-Only Information',
  wcag: ['1.4.1'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    // --- Check status/state components for dual coding ---
    const statusPatterns = ['error', 'success', 'warning', 'danger', 'alert', 'info', 'validation', 'status', 'badge'];
    const isStatusComponent = statusPatterns.some(p => name.includes(p));

    if (!isStatusComponent) {
      // Also check variant properties
      if (node.variantProps) {
        const variantStr = Object.entries(node.variantProps)
          .map(([k, v]) => `${k}:${v}`)
          .join(' ')
          .toLowerCase();
        if (!statusPatterns.some(p => variantStr.includes(p))) return issues;
      } else {
        return issues;
      }
    }

    // Check if the component has more than just color to convey status
    const children = node.children || { count: 0, hasText: false, hasVector: false, textContent: [] };

    const hasIcon = children.hasVector;
    const hasStatusText = children.hasText && children.textContent.some(t => {
      const lower = (t || '').toLowerCase();
      return statusPatterns.some(p => lower.includes(p)) ||
        lower.includes('required') || lower.includes('invalid') || lower.includes('valid');
    });

    if (!hasIcon && !hasStatusText) {
      // Component appears to rely on color alone
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `"${node.name}" appears to convey status through color alone. No icon or status text label detected.`,
        wcagRef: '1.4.1',
        suggestion: 'Add an icon (checkmark, warning triangle, X) or explicit text label alongside color to convey status. Color-blind users cannot distinguish red/green status differences.',
        data: { hasIcon, hasStatusText, childCount: children.count },
      });
    }

    // --- Check link text differentiation ---
    if (node.type === 'TEXT' || name.includes('link')) {
      if (node.type === 'TEXT' && node.textDecoration === 'NONE') {
        const parentName = (node.parentName || '').toLowerCase();
        if (name.includes('link') || parentName.includes('link')) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `Link "${node.name}" has no underline. Links within text must be distinguishable by more than color.`,
            wcagRef: '1.4.1',
            suggestion: 'Add an underline or other non-color indicator (bold weight, icon) to distinguish links from surrounding text.',
            data: { textDecoration: node.textDecoration },
          });
        }
      }
    }

    return issues;
  },
};
