/**
 * form-fields.js
 * WCAG 1.3.1, 3.3.2, 3.3.1, 3.3.3 — Form input labels and error messages.
 */

const { isFormInput } = require('../../node-inspector');

module.exports = {
  id: 'form-fields',
  name: 'Form Field Labels & Errors',
  wcag: ['1.3.1', '3.3.2', '3.3.1', '3.3.3'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isFormInput(node)) return issues;

    const name = (node.name || '').toLowerCase();

    // --- Check for visible label (3.3.2) ---
    const hasInternalLabel = node.children.hasText && node.children.textContent.some(t => {
      const lower = (t || '').toLowerCase();
      return !lower.includes('placeholder') && !lower.includes('type here') &&
        !lower.includes('enter ') && !lower.includes('search') &&
        t.trim().length > 0 && t.trim().length < 50;
    });

    // Check siblings for a label
    const hasExternalLabel = (node.siblings || []).some(sib => {
      const sibName = (sib.name || '').toLowerCase();
      const isLabel = sibName.includes('label') || sibName.includes('title') || sibName.includes('field name');
      const isAbove = sib.y < node.y && Math.abs(sib.y - node.y) < 40;
      const isLeft = sib.x < node.x && Math.abs(sib.x - node.x) < 200 && Math.abs(sib.y - node.y) < 10;
      return sib.type === 'TEXT' && (isLabel || isAbove || isLeft);
    });

    if (!hasInternalLabel && !hasExternalLabel) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Form input "${node.name}" has no visible label. Every input needs a label for screen reader users.`,
        wcagRef: '3.3.2',
        suggestion: 'Add a visible text label above or to the left of the input field. Do not rely on placeholder text alone.',
        data: { hasInternalLabel, hasExternalLabel },
      });
    }

    // --- Check error variant for error message (3.3.1) ---
    if (node.variantProps) {
      const stateKey = Object.keys(node.variantProps).find(k =>
        ['state', 'status', 'validation'].includes(k.toLowerCase())
      );

      if (stateKey) {
        const stateVal = (node.variantProps[stateKey] || '').toLowerCase();

        if (stateVal === 'error' || stateVal === 'invalid' || stateVal === 'danger') {
          // This IS the error variant — check it has error text
          const hasErrorText = node.children.hasText && node.children.textContent.some(t => {
            const lower = (t || '').toLowerCase();
            return lower.includes('error') || lower.includes('required') ||
              lower.includes('invalid') || lower.includes('must') ||
              lower.includes('please') || lower.includes('cannot') ||
              t.trim().length > 5;
          });

          if (!hasErrorText) {
            issues.push({
              nodeId: node.id,
              nodeName: node.name,
              severity: 'error',
              message: `Error state for "${node.name}" has no descriptive error message text. Users need to understand what went wrong.`,
              wcagRef: '3.3.1',
              suggestion: 'Add a visible error message below the input that describes the problem and suggests a fix (e.g., "Email address is required").',
              data: { stateKey, stateVal },
            });
          }
        }
      }
    }

    // --- Check placeholder-only inputs (3.3.2) ---
    if (node.children.hasText) {
      const allPlaceholders = node.children.textContent.every(t => {
        const lower = (t || '').toLowerCase();
        return lower.includes('placeholder') || lower.includes('type here') ||
          lower.includes('enter ') || lower.includes('search..') ||
          lower.includes('e.g.') || lower.startsWith('...');
      });

      if (allPlaceholders && !hasExternalLabel) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `"${node.name}" appears to use placeholder text as its only label. Placeholders disappear on focus.`,
          wcagRef: '3.3.2',
          suggestion: 'Add a persistent visible label. Placeholder text is supplementary — it disappears when the user starts typing.',
          data: {},
        });
      }
    }

    return issues;
  },
};
