/**
 * color-contrast.js
 * WCAG 1.4.3 (AA), 1.4.6 (AAA), 1.4.11 — Color contrast checks.
 */

const { contrastRatio, blendAlpha, isLargeText, meetsAA, meetsAAA, meetsUIComponent, rgbToHex, suggestFix } = require('../contrast');
const { isInteractiveNode } = require('../node-inspector');

module.exports = {
  id: 'color-contrast',
  name: 'Color Contrast',
  wcag: ['1.4.3', '1.4.6', '1.4.11'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['TEXT', 'FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'],

  check(node, context) {
    const issues = [];
    const level = (context.config?.level || 'AA').toUpperCase();

    // --- Text contrast (1.4.3 / 1.4.6) ---
    if (node.type === 'TEXT' && node.fills.length > 0 && node.chars) {
      const fg = node.fills[0];
      const bg = node.bg || { r: 1, g: 1, b: 1 };

      // Blend alpha if semi-transparent
      const effectiveFg = fg.a < 1 ? blendAlpha(fg, bg, fg.a) : fg;
      const ratio = contrastRatio(effectiveFg, bg);
      const roundedRatio = Math.round(ratio * 100) / 100;

      const fontSize = node.fontSize || 16;
      const isBold = node.fontWeight === 'bold';
      const large = isLargeText(fontSize, isBold);

      // Skip disabled elements (opacity < 0.5 suggests disabled state)
      if (node.opacity < 0.5) return issues;

      // Check variant properties for disabled state
      if (node.variantProps) {
        const stateVal = Object.values(node.variantProps).join(' ').toLowerCase();
        if (stateVal.includes('disabled')) return issues;
      }

      // AA check
      if (!meetsAA(ratio, large)) {
        const required = large ? 3 : 4.5;
        const fix = suggestFix(effectiveFg, bg, required);
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'error',
          message: `Contrast ratio ${roundedRatio}:1 (text ${rgbToHex(effectiveFg)} on ${rgbToHex(bg)}). Requires ${required}:1 for ${large ? 'large' : 'normal'} text.`,
          wcagRef: '1.4.3',
          suggestion: fix
            ? `${fix.action === 'darken' ? 'Darken' : 'Lighten'} the text to at least ${fix.hex}.`
            : `Adjust text or background color to achieve ${required}:1 ratio.`,
          data: { ratio: roundedRatio, fgHex: rgbToHex(effectiveFg), bgHex: rgbToHex(bg), required, large, fontSize, isBold },
        });
      }

      // AAA check (only if level=AAA)
      if (level === 'AAA' && meetsAA(ratio, large) && !meetsAAA(ratio, large)) {
        const required = large ? 4.5 : 7;
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Contrast ratio ${roundedRatio}:1 passes AA but fails AAA (requires ${required}:1 for ${large ? 'large' : 'normal'} text).`,
          wcagRef: '1.4.6',
          suggestion: `Increase contrast to ${required}:1 for AAA compliance.`,
          data: { ratio: roundedRatio, fgHex: rgbToHex(effectiveFg), bgHex: rgbToHex(bg), required, large },
        });
      }
    }

    // --- UI component boundary contrast (1.4.11) ---
    if (node.type !== 'TEXT' && isInteractiveNode(node)) {
      const bg = node.bg || { r: 1, g: 1, b: 1 };

      // Check stroke contrast for bordered components
      if (node.strokes.length > 0 && node.strokeWeight > 0) {
        const stroke = node.strokes[0];
        const effectiveStroke = stroke.a < 1 ? blendAlpha(stroke, bg, stroke.a) : stroke;
        const ratio = contrastRatio(effectiveStroke, bg);

        if (!meetsUIComponent(ratio)) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'error',
            message: `UI component border contrast ${Math.round(ratio * 100) / 100}:1 (stroke ${rgbToHex(effectiveStroke)} on ${rgbToHex(bg)}). Requires 3:1.`,
            wcagRef: '1.4.11',
            suggestion: 'Darken the border/stroke or lighten the background to achieve 3:1 ratio.',
            data: { ratio: Math.round(ratio * 100) / 100, strokeHex: rgbToHex(effectiveStroke), bgHex: rgbToHex(bg) },
          });
        }
      }

      // Check fill contrast for filled interactive elements (e.g., filled buttons)
      if (node.fills.length > 0) {
        const fill = node.fills[0];
        const effectiveFill = fill.a < 1 ? blendAlpha(fill, bg, fill.a) : fill;
        const ratio = contrastRatio(effectiveFill, bg);

        if (!meetsUIComponent(ratio) && node.strokes.length === 0) {
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            severity: 'warning',
            message: `UI component has no border and fill contrast is ${Math.round(ratio * 100) / 100}:1 against background. Requires 3:1 boundary contrast.`,
            wcagRef: '1.4.11',
            suggestion: 'Add a visible border or ensure the fill color provides 3:1 contrast against the background.',
            data: { ratio: Math.round(ratio * 100) / 100, fillHex: rgbToHex(effectiveFill), bgHex: rgbToHex(bg) },
          });
        }
      }
    }

    return issues;
  },
};
