/**
 * mfg-contrast.js
 * Manufacturing: 7:1 contrast for variable lighting; alarm text >= 24px.
 */

const { contrastRatio, blendAlpha, rgbToHex, suggestFix } = require('../../contrast');

const ALARM_PATTERNS = ['alarm', 'alert', 'warning', 'critical', 'emergency', 'fault', 'error', 'danger', 'stop'];

module.exports = {
  id: 'mfg-contrast',
  name: 'Manufacturing Enhanced Contrast',
  wcag: ['1.4.3', '1.4.6'],
  level: 'AA',
  category: 'color',
  nodeTypes: ['TEXT'],

  check(node, context) {
    const issues = [];
    if (node.type !== 'TEXT' || !node.chars || node.fills.length === 0) return issues;

    const config = context.config || {};
    const requiredRatio = config.mfgContrastMinimum || 7;
    const alarmMinFont = config.alarmMinFontSize || 24;

    const fg = node.fills[0];
    const bg = node.bg || { r: 1, g: 1, b: 1 };
    const effectiveFg = fg.a < 1 ? blendAlpha(fg, bg, fg.a) : fg;
    const ratio = contrastRatio(effectiveFg, bg);
    const roundedRatio = Math.round(ratio * 100) / 100;

    // All text needs 7:1 in industrial environments
    if (ratio < requiredRatio) {
      const fix = suggestFix(effectiveFg, bg, requiredRatio);
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Text contrast ${roundedRatio}:1. Industrial environments with variable lighting require ${requiredRatio}:1 for all text.`,
        wcagRef: '1.4.6',
        suggestion: fix
          ? `${fix.action === 'darken' ? 'Darken' : 'Lighten'} text to at least ${fix.hex}.`
          : `Adjust colors to achieve ${requiredRatio}:1 ratio. Factory floor lighting ranges from bright overhead to dim.`,
        data: { ratio: roundedRatio, required: requiredRatio, fgHex: rgbToHex(effectiveFg), bgHex: rgbToHex(bg), industry: 'manufacturing' },
      });
    }

    // Alarm/critical text needs extra large font
    const name = (node.name || '').toLowerCase();
    const parentName = (node.parentName || '').toLowerCase();
    const chars = (node.chars || '').toLowerCase();
    const isAlarm = ALARM_PATTERNS.some(p => name.includes(p) || parentName.includes(p) || chars.includes(p));

    if (isAlarm && node.fontSize && node.fontSize < alarmMinFont) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Alarm/alert text "${node.name}" is ${node.fontSize}px. Critical status text must be at least ${alarmMinFont}px for visibility from operating distance.`,
        wcagRef: '1.4.4',
        suggestion: `Increase to at least ${alarmMinFont}px. Alarm text must be readable from several feet away.`,
        data: { fontSize: node.fontSize, minimum: alarmMinFont, isAlarm, industry: 'manufacturing' },
      });
    }

    return issues;
  },
};
