/**
 * finance-secure-inputs.js
 * Finance: Sensitive input fields should have visual security indicators.
 */

const { isFormInput } = require('../../node-inspector');

const SECURE_PATTERNS = ['password', 'pin', 'account', 'ssn', 'card number',
  'cvv', 'cvc', 'routing', 'sort code', 'iban', 'swift', 'security code'];

module.exports = {
  id: 'finance-secure-inputs',
  name: 'Secure Input Indicators',
  wcag: ['3.3.2'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isFormInput(node)) return issues;

    const name = (node.name || '').toLowerCase();
    const isSecure = SECURE_PATTERNS.some(p => name.includes(p));
    if (!isSecure) return issues;

    const children = node.children || { hasText: false, hasVector: false, textContent: [] };

    // Check for security indicator (lock icon, shield icon, or "secure" text)
    const hasSecurityIcon = children.hasVector;
    const hasSecurityText = children.hasText && (children.textContent || []).some(t => {
      const lower = (t || '').toLowerCase();
      return lower.includes('secure') || lower.includes('encrypted') || lower.includes('protected');
    });

    // Check siblings for security indicators
    const hasSecuritySibling = (node.siblings || []).some(sib => {
      const sibName = (sib.name || '').toLowerCase();
      return sibName.includes('lock') || sibName.includes('shield') ||
        sibName.includes('secure') || sibName.includes('encrypted');
    });

    if (!hasSecurityIcon && !hasSecurityText && !hasSecuritySibling) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Sensitive input "${node.name}" has no visual security indicator. Users need reassurance when entering financial data.`,
        wcagRef: '3.3.2',
        suggestion: 'Add a lock icon, shield icon, or "Secure" text label near sensitive financial inputs to build user trust and indicate data protection.',
        data: { hasSecurityIcon, hasSecurityText, hasSecuritySibling, industry: 'finance' },
      });
    }

    return issues;
  },
};
