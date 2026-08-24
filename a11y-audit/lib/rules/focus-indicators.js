/**
 * focus-indicators.js
 * WCAG 2.4.7 (AA), 2.4.11 (AA WCAG 2.2) — Focus state visibility.
 */

const { isInteractiveNode } = require('../node-inspector');

module.exports = {
  id: 'focus-indicators',
  name: 'Focus Indicators',
  wcag: ['2.4.7', '2.4.11'],
  level: 'AA',
  category: 'focus',
  nodeTypes: ['COMPONENT', 'COMPONENT_SET', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isInteractiveNode(node)) return issues;

    const name = (node.name || '').toLowerCase();

    // Only check component-level nodes (not every instance)
    if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') {
      // Check if component has a Focus variant
      if (node.componentProps) {
        const propKeys = Object.keys(node.componentProps);
        const stateProps = propKeys.filter(k => {
          const lower = k.toLowerCase();
          return lower === 'state' || lower === 'status' || lower === 'interaction';
        });

        for (const prop of stateProps) {
          const val = node.componentProps[prop];
          if (val && typeof val.value === 'string') {
            // This is an instance with a specific state — not the component set
            continue;
          }
        }
      }

      // For component sets, check if any variant includes "focus" in its name
      if (node.children && node.children.types) {
        // We can't deeply inspect variant names from here,
        // so we flag components that LOOK interactive but don't have focus in their name
      }
    }

    // Check instances — if this is a "default" or "hover" variant, check if
    // a sibling "focus" variant exists
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
      if (node.variantProps) {
        const stateKey = Object.keys(node.variantProps).find(k =>
          ['state', 'status', 'interaction'].includes(k.toLowerCase())
        );

        if (stateKey) {
          const stateVal = (node.variantProps[stateKey] || '').toLowerCase();

          // We're looking at the default variant — check siblings for focus
          if (stateVal === 'default' || stateVal === 'rest' || stateVal === 'idle') {
            const siblingStates = (node.siblings || [])
              .map(s => (s.name || '').toLowerCase())
              .join(' ');

            const hasFocus = siblingStates.includes('focus') || siblingStates.includes('focused');

            if (!hasFocus) {
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                severity: 'error',
                message: `Interactive component "${node.name}" has no Focus state variant. Keyboard users need a visible focus indicator.`,
                wcagRef: '2.4.7',
                suggestion: 'Add a "Focus" or "Focused" variant with a visible focus ring (≥2px stroke, ≥3:1 contrast against background).',
                data: { variantProp: stateKey, currentState: stateVal },
              });
            }
          }

          // If this IS the focus variant, check that it has a visible ring
          if (stateVal === 'focus' || stateVal === 'focused') {
            const hasStroke = node.strokes && node.strokes.length > 0 && node.strokeWeight >= 2;
            const hasEffect = false; // Would need effects inspection

            if (!hasStroke && !hasEffect) {
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                severity: 'warning',
                message: `Focus variant "${node.name}" has no visible stroke/ring (≥2px). The focus indicator may not be perceivable.`,
                wcagRef: '2.4.11',
                suggestion: 'Add a focus ring with ≥2px stroke width and ≥3:1 contrast against the background.',
                data: { strokeWeight: node.strokeWeight, strokeCount: (node.strokes || []).length },
              });
            }
          }
        }
      }
    }

    return issues;
  },
};
