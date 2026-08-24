/**
 * ecommerce-checkout-flow.js
 * E-commerce: Checkout flows need step indicators, labeled inputs, and order summary.
 */

module.exports = {
  id: 'ecommerce-checkout-flow',
  name: 'Checkout Flow Accessibility',
  wcag: ['3.3.2', '3.3.4'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isCheckout = name.includes('checkout') || name.includes('payment') ||
      name.includes('cart') || name.includes('order') ||
      name.includes('shipping') || name.includes('billing');
    if (!isCheckout) return issues;

    const children = node.children || { count: 0, hasText: false };
    if (children.count < 3) return issues;

    const allNodes = context.allNodes || {};
    let hasStepIndicator = false;
    let hasOrderSummary = false;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const nName = (n.name || '').toLowerCase();
      const nChars = (n.chars || '').toLowerCase();

      if (nName.includes('step') || nName.includes('progress') || nName.includes('breadcrumb') ||
        nChars.includes('step ') || /^\d+\s*(of|\/)\s*\d+$/.test(nChars.trim())) {
        hasStepIndicator = true;
      }

      if (nName.includes('summary') || nName.includes('total') || nName.includes('order review') ||
        nChars.includes('subtotal') || nChars.includes('total')) {
        hasOrderSummary = true;
      }
    }

    if (!hasStepIndicator) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Checkout flow "${node.name}" has no step indicator. Users need to know their progress through the checkout process.`,
        wcagRef: '3.3.2',
        suggestion: 'Add a step indicator (e.g., "Step 2 of 4", breadcrumb trail, or numbered progress bar) to show checkout progress.',
        data: { industry: 'ecommerce' },
      });
    }

    if (!hasOrderSummary) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Checkout flow "${node.name}" has no visible order summary. Users need to review their order before payment.`,
        wcagRef: '3.3.4',
        suggestion: 'Add an order summary showing items, quantities, and total amount. This should be visible throughout the checkout process.',
        data: { industry: 'ecommerce' },
      });
    }

    return issues;
  },
};
