/**
 * webapp-dialog-pattern.js
 * WAI-ARIA: Dialog/modal components must have title, close button, and reasonable sizing.
 */

module.exports = {
  id: 'webapp-dialog-pattern',
  name: 'Dialog/Modal Pattern',
  wcag: ['1.3.1', '2.4.3'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isDialog = name.includes('dialog') || name.includes('modal') ||
      name.includes('drawer') || name.includes('sheet') ||
      name.includes('popup') || name.includes('overlay');

    if (!isDialog) return issues;

    const children = node.children || { count: 0, hasText: false, hasVector: false, textContent: [] };
    const config = context.config || {};

    // Check for title/heading
    const hasTitle = children.hasText && children.textContent.some(t =>
      t && t.trim().length > 0 && t.trim().length < 100
    );

    if (!hasTitle) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Dialog "${node.name}" has no visible title. Screen readers announce the dialog title when it opens.`,
        wcagRef: '1.3.1',
        suggestion: 'Add a visible heading/title at the top of the dialog. This becomes the aria-labelledby reference for the dialog role.',
        data: { platform: 'web-app' },
      });
    }

    // Check for close mechanism
    const siblings = node.siblings || [];
    const allNames = [
      ...(children.textContent || []).map(t => (t || '').toLowerCase()),
      ...siblings.map(s => (s.name || '').toLowerCase()),
    ];
    const hasClose = allNames.some(n =>
      n.includes('close') || n.includes('dismiss') || n.includes('cancel') || n.includes('×')
    ) || children.hasVector;

    if (!hasClose) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Dialog "${node.name}" has no close/dismiss mechanism. Users must be able to close the dialog.`,
        wcagRef: '2.4.3',
        suggestion: 'Add a close button (X icon) in the top-right corner and/or a Cancel button in the action bar.',
        data: { platform: 'web-app' },
      });
    }

    // Check sizing
    const maxWidth = config.dialogMaxWidth || 560;
    if (node.w > maxWidth * 1.5) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Dialog "${node.name}" is ${Math.round(node.w)}px wide. Very wide dialogs reduce readability.`,
        wcagRef: '1.3.1',
        suggestion: `Consider keeping dialog width under ${maxWidth}px for optimal readability.`,
        data: { width: Math.round(node.w), maxWidth, platform: 'web-app' },
      });
    }

    return issues;
  },
};
