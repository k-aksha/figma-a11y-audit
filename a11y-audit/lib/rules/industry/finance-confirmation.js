/**
 * finance-confirmation.js
 * Finance: Transaction confirmations need summary, confirm/cancel buttons, and prominent amounts.
 */

module.exports = {
  id: 'finance-confirmation',
  name: 'Transaction Confirmation Pattern',
  wcag: ['3.3.4'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isConfirmation = name.includes('confirm') || name.includes('review') ||
      name.includes('summary') || name.includes('receipt') ||
      name.includes('payment confirm') || name.includes('transfer confirm');

    if (!isConfirmation) return issues;

    const children = node.children || { count: 0, hasText: false, textContent: [] };
    if (children.count < 2) return issues;

    const allNodes = context.allNodes || {};
    let hasConfirmButton = false;
    let hasCancelButton = false;
    let hasAmountDisplay = false;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const nName = (n.name || '').toLowerCase();
      const nChars = (n.chars || '').toLowerCase();

      if (nName.includes('confirm') || nName.includes('submit') || nName.includes('pay') ||
        nChars.includes('confirm') || nChars.includes('submit') || nChars.includes('pay now')) {
        hasConfirmButton = true;
      }

      if (nName.includes('cancel') || nName.includes('back') || nName.includes('edit') ||
        nChars.includes('cancel') || nChars.includes('go back')) {
        hasCancelButton = true;
      }

      if (n.type === 'TEXT' && n.chars && /[$€£¥₹]\s*[\d,]+/.test(n.chars)) {
        hasAmountDisplay = true;
      }
    }

    if (!hasConfirmButton) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Transaction confirmation "${node.name}" has no identifiable confirm/submit button.`,
        wcagRef: '3.3.4',
        suggestion: 'Add a clearly labeled "Confirm", "Submit", or "Pay Now" button.',
        data: { industry: 'finance' },
      });
    }

    if (!hasCancelButton) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Transaction confirmation "${node.name}" has no cancel/back option. Users must be able to review and abort before committing.`,
        wcagRef: '3.3.4',
        suggestion: 'Add a "Cancel", "Go Back", or "Edit" option so users can review and correct before final submission.',
        data: { industry: 'finance' },
      });
    }

    if (!hasAmountDisplay) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Transaction confirmation "${node.name}" has no visible amount/total. Financial confirmations should prominently display the transaction amount.`,
        wcagRef: '3.3.4',
        suggestion: 'Display the transaction amount prominently (large font, high contrast) so users can verify before confirming.',
        data: { industry: 'finance' },
      });
    }

    return issues;
  },
};
