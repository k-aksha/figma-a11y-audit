/**
 * healthcare-form-errors.js
 * Healthcare: Medical form errors must be highly visible with descriptive messages.
 */

const { isFormInput } = require('../../node-inspector');

module.exports = {
  id: 'healthcare-form-errors',
  name: 'Healthcare Form Error Visibility',
  wcag: ['3.3.1', '3.3.3', '3.3.4'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isFormInput(node)) return issues;

    const config = context.config || {};
    const minErrorFontSize = config.errorMessageMinFontSize || 14;

    // Check error variant
    if (!node.variantProps) return issues;

    const stateKey = Object.keys(node.variantProps).find(k =>
      ['state', 'status', 'validation'].includes(k.toLowerCase())
    );
    if (!stateKey) return issues;

    const stateVal = (node.variantProps[stateKey] || '').toLowerCase();
    if (stateVal !== 'error' && stateVal !== 'invalid' && stateVal !== 'danger') return issues;

    // Check error text exists and is descriptive
    const children = node.children || { hasText: false, textContent: [] };

    const errorTexts = (children.textContent || []).filter(t => {
      const lower = (t || '').toLowerCase();
      return lower.includes('error') || lower.includes('required') ||
        lower.includes('invalid') || lower.includes('must') ||
        lower.includes('please') || lower.includes('cannot') ||
        t.trim().length > 10;
    });

    if (errorTexts.length === 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Medical form error state for "${node.name}" has no descriptive error message. In healthcare, unclear errors can lead to incorrect data entry.`,
        wcagRef: '3.3.1',
        suggestion: 'Add a specific error message (e.g., "Date of birth is required", "Dosage must be between 1-500mg") — not just "Error" or a red border.',
        data: { stateVal, industry: 'healthcare' },
      });
    }

    // Check error text font size
    const allNodes = context.allNodes || {};
    for (const [, n] of Object.entries(allNodes)) {
      if (n.type !== 'TEXT') continue;
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const text = (n.chars || '').toLowerCase();
      const isErrorText = text.includes('error') || text.includes('required') || text.includes('invalid');

      if (isErrorText && n.fontSize && n.fontSize < minErrorFontSize) {
        issues.push({
          nodeId: n.id,
          nodeName: n.name,
          severity: 'warning',
          message: `Error message text is ${n.fontSize}px. Healthcare forms require error messages at least ${minErrorFontSize}px for visibility.`,
          wcagRef: '3.3.3',
          suggestion: `Increase error message font size to at least ${minErrorFontSize}px.`,
          data: { fontSize: n.fontSize, minimum: minErrorFontSize, industry: 'healthcare' },
        });
      }
    }

    return issues;
  },
};
