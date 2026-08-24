/**
 * government-language.js
 * Government: Language identification and jargon avoidance.
 */

module.exports = {
  id: 'government-language',
  name: 'Government Language Clarity',
  wcag: ['3.1.1', '3.1.2'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars) return issues;

    const chars = node.chars;

    // Check for potential jargon/acronyms (words > 15 chars or all-caps acronyms)
    const words = chars.split(/\s+/);
    const longWords = words.filter(w => w.length > 15 && /[a-zA-Z]/.test(w));
    const acronyms = words.filter(w => w.length >= 3 && w.length <= 8 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));

    if (longWords.length > 0) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Text contains long word(s): "${longWords.slice(0, 3).join('", "')}". Government content should use plain language.`,
        wcagRef: '3.1.2',
        suggestion: 'Use plain language alternatives or provide a glossary. Government communications must be understandable by a broad public audience.',
        data: { longWords: longWords.slice(0, 5), industry: 'government' },
      });
    }

    if (acronyms.length >= 3) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Text contains ${acronyms.length} acronyms: ${acronyms.slice(0, 5).join(', ')}. Acronyms should be expanded on first use.`,
        wcagRef: '3.1.2',
        suggestion: 'Expand acronyms on first use (e.g., "Social Security Number (SSN)"). Not all citizens will know agency-specific abbreviations.',
        data: { acronyms: acronyms.slice(0, 5), count: acronyms.length, industry: 'government' },
      });
    }

    return issues;
  },
};
