/**
 * text-sizing.js
 * WCAG 1.4.4, 1.4.12, 1.3.1 — Text sizing, line height, heading hierarchy.
 */

const { isHeadingNode } = require('../node-inspector');

module.exports = {
  id: 'text-sizing',
  name: 'Text Sizing & Readability',
  wcag: ['1.4.4', '1.4.12', '1.3.1'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const fontSize = node.fontSize;
    if (!fontSize) return issues;

    const config = context.config || {};
    const minBodySize = config.minBodyFontSize || 14;
    const minMobileSize = config.minMobileFontSize || 16;
    const minLineHeightRatio = config.lineHeightRatio || 1.5;

    // --- Minimum font size ---
    if (fontSize < 12) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Font size ${fontSize}px is below the minimum readable size of 12px.`,
        wcagRef: '1.4.4',
        suggestion: `Increase font size to at least ${minBodySize}px for body text.`,
        data: { fontSize, minimum: 12 },
      });
    } else if (fontSize < minBodySize && !isHeadingNode(node)) {
      // Below recommended body size but above absolute minimum
      const name = (node.name || '').toLowerCase();
      const isCaption = name.includes('caption') || name.includes('footnote') || name.includes('helper');
      if (!isCaption) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Font size ${fontSize}px is below the recommended ${minBodySize}px minimum for body text.`,
          wcagRef: '1.4.4',
          suggestion: `Consider increasing to ${minBodySize}px or larger for readability.`,
          data: { fontSize, recommended: minBodySize },
        });
      }
    }

    // --- Line height check (1.4.12) ---
    if (node.lineHeight && fontSize > 0) {
      const ratio = node.lineHeight / fontSize;
      if (ratio < minLineHeightRatio && !isHeadingNode(node)) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          severity: 'warning',
          message: `Line height ${node.lineHeight}px is ${Math.round(ratio * 100) / 100}× font size. WCAG recommends ≥${minLineHeightRatio}× for body text.`,
          wcagRef: '1.4.12',
          suggestion: `Set line height to at least ${Math.ceil(fontSize * minLineHeightRatio)}px (${minLineHeightRatio}× ${fontSize}px).`,
          data: { lineHeight: node.lineHeight, fontSize, ratio: Math.round(ratio * 100) / 100, required: minLineHeightRatio },
        });
      }
    }

    // --- Negative letter spacing (1.4.12) ---
    if (node.letterSpacing && node.letterSpacing < 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Negative letter spacing (${node.letterSpacing}px) may cause readability issues.`,
        wcagRef: '1.4.12',
        suggestion: 'Avoid negative letter spacing. Users must be able to adjust to 0.12em without content loss.',
        data: { letterSpacing: node.letterSpacing },
      });
    }

    // --- Heading hierarchy (1.3.1) — checked at page level ---
    // This rule runs per-node but stores heading data on context for page-level check
    if (isHeadingNode(node) && context._headings) {
      context._headings.push({
        id: node.id,
        name: node.name,
        fontSize: fontSize,
        y: node.y || 0,
        isBold: node.fontWeight === 'bold',
      });
    }

    return issues;
  },
};
