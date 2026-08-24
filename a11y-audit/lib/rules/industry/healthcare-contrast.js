/**
 * healthcare-contrast.js
 * Healthcare: Medical data displays require enhanced 7:1 contrast.
 */

const { contrastRatio, blendAlpha, rgbToHex, suggestFix } = require('../../contrast');

const MEDICAL_PATTERNS = [
  'vital', 'patient', 'lab', 'medical', 'diagnosis', 'prescription',
  'dosage', 'medication', 'blood', 'heart rate', 'bp', 'pulse',
  'temperature', 'oxygen', 'spo2', 'bmi', 'allergy', 'clinical',
];

module.exports = {
  id: 'healthcare-contrast',
  name: 'Healthcare Enhanced Contrast',
  wcag: ['1.4.3', '1.4.6'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars || node.fills.length === 0) return issues;

    const name = (node.name || '').toLowerCase();
    const parentName = (node.parentName || '').toLowerCase();
    const isMedicalContext = MEDICAL_PATTERNS.some(p => name.includes(p) || parentName.includes(p));

    if (!isMedicalContext) return issues;

    const config = context.config || {};
    const requiredRatio = config.healthcareContrastMinimum || 7;

    const fg = node.fills[0];
    const bg = node.bg || { r: 1, g: 1, b: 1 };
    const effectiveFg = fg.a < 1 ? blendAlpha(fg, bg, fg.a) : fg;
    const ratio = contrastRatio(effectiveFg, bg);
    const roundedRatio = Math.round(ratio * 100) / 100;

    if (ratio < requiredRatio) {
      const fix = suggestFix(effectiveFg, bg, requiredRatio);
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Medical data text contrast ${roundedRatio}:1 (${rgbToHex(effectiveFg)} on ${rgbToHex(bg)}). Healthcare standard requires ${requiredRatio}:1 for critical patient data.`,
        wcagRef: '1.4.6',
        suggestion: fix
          ? `${fix.action === 'darken' ? 'Darken' : 'Lighten'} the text to at least ${fix.hex} for ${requiredRatio}:1 contrast.`
          : `Adjust text or background to achieve ${requiredRatio}:1 ratio. Medical data must be highly legible.`,
        data: { ratio: roundedRatio, required: requiredRatio, fgHex: rgbToHex(effectiveFg), bgHex: rgbToHex(bg), industry: 'healthcare' },
      });
    }

    return issues;
  },
};
