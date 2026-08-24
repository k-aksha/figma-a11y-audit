/**
 * finance-number-readability.js
 * Finance: Currency and financial numbers must be highly readable.
 */

const CURRENCY_REGEX = /[$€£¥₹₽₩₺₴₸₪₡₲₱₣₢₤₥₦₧₨₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]|USD|EUR|GBP|JPY|INR|CAD|AUD/;
const NUMBER_REGEX = /\d{1,3}([,.\s]\d{3})+(\.\d{2})?|\d+\.\d{2}/;

module.exports = {
  id: 'finance-number-readability',
  name: 'Financial Number Readability',
  wcag: ['1.4.4', '1.4.12'],
  level: 'AA',
  category: 'typography',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const chars = node.chars;
    const config = context.config || {};
    const currencyMinFont = config.currencyMinFontSize || 16;
    const numberMinFont = config.minNumberFontSize || 14;

    const hasCurrency = CURRENCY_REGEX.test(chars);
    const hasFinancialNumber = NUMBER_REGEX.test(chars);

    if (hasCurrency && node.fontSize && node.fontSize < currencyMinFont) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Currency text "${chars.substring(0, 30)}..." is ${node.fontSize}px. Financial amounts must be at least ${currencyMinFont}px for clear reading.`,
        wcagRef: '1.4.4',
        suggestion: `Increase font size to at least ${currencyMinFont}px for currency amounts. Misread financial figures can cause transaction errors.`,
        data: { fontSize: node.fontSize, minimum: currencyMinFont, hasCurrency: true, industry: 'finance' },
      });
    }

    if (!hasCurrency && hasFinancialNumber && node.fontSize && node.fontSize < numberMinFont) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Financial number "${chars.substring(0, 30)}..." is ${node.fontSize}px. Recommend at least ${numberMinFont}px for numerical data.`,
        wcagRef: '1.4.4',
        suggestion: `Increase to at least ${numberMinFont}px. Use tabular/monospace number spacing for aligned columns.`,
        data: { fontSize: node.fontSize, minimum: numberMinFont, industry: 'finance' },
      });
    }

    // Check for negative letter spacing on financial numbers
    if ((hasCurrency || hasFinancialNumber) && node.letterSpacing && node.letterSpacing < 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Financial text has negative letter spacing (${node.letterSpacing}px). Numbers need clear character separation to avoid misreading.`,
        wcagRef: '1.4.12',
        suggestion: 'Use zero or positive letter spacing for financial numbers. Consider tabular number features for consistent digit widths.',
        data: { letterSpacing: node.letterSpacing, industry: 'finance' },
      });
    }

    return issues;
  },
};
