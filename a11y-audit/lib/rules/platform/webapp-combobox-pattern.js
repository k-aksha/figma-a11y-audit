/**
 * webapp-combobox-pattern.js
 * WAI-ARIA: Combobox/autocomplete must have input field, dropdown indicator, and label.
 */

const { isFormInput } = require('../../node-inspector');

module.exports = {
  id: 'webapp-combobox-pattern',
  name: 'Combobox / Autocomplete Pattern',
  wcag: ['1.3.1', '3.3.2'],
  level: 'AA',
  category: 'forms',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isCombobox = name.includes('combobox') || name.includes('autocomplete') ||
      name.includes('typeahead') || name.includes('select') ||
      name.includes('dropdown');

    if (!isCombobox) return issues;

    const children = node.children || { count: 0, hasText: false, hasVector: false };

    // Check for dropdown indicator (chevron/arrow icon)
    if (!children.hasVector) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Combobox "${node.name}" has no dropdown indicator icon. Users need a visual cue that this input has a dropdown list.`,
        wcagRef: '1.3.1',
        suggestion: 'Add a chevron/arrow icon to indicate that this field opens a dropdown. This helps all users understand the interaction pattern.',
        data: { platform: 'web-app' },
      });
    }

    // Check for label (same logic as form-fields)
    const hasInternalLabel = children.hasText && children.textContent && children.textContent.some(t => {
      const lower = (t || '').toLowerCase();
      return !lower.includes('placeholder') && !lower.includes('type here') &&
        !lower.includes('search...') && t.trim().length > 0 && t.trim().length < 50;
    });

    const hasExternalLabel = (node.siblings || []).some(sib => {
      const sibName = (sib.name || '').toLowerCase();
      const isLabel = sibName.includes('label') || sibName.includes('title') || sibName.includes('field name');
      const isAbove = sib.y < node.y && Math.abs(sib.y - node.y) < 40;
      return sib.type === 'TEXT' && (isLabel || isAbove);
    });

    if (!hasInternalLabel && !hasExternalLabel) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Combobox "${node.name}" has no visible label. Screen readers need a label to announce the field's purpose.`,
        wcagRef: '3.3.2',
        suggestion: 'Add a visible text label above or to the left of the combobox.',
        data: { hasInternalLabel, hasExternalLabel, platform: 'web-app' },
      });
    }

    return issues;
  },
};
