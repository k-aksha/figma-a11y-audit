/**
 * ios-safe-area.js
 * Apple HIG: Interactive elements must not overlap safe area inset zones.
 *
 * Safe area insets vary by device:
 *   iPhone SE (no notch):        top 20pt, bottom 0pt
 *   iPhone 14 (notch):           top 47pt, bottom 34pt
 *   iPhone 15/16 (Dynamic Island): top 59pt, bottom 34pt
 *   iPhone 16 Pro:               top 62pt, bottom 34pt
 *
 * Default uses 59pt top (most common current device) and 34pt bottom.
 * Apple says: never hardcode safe area values — always read dynamically at runtime.
 */

const { isInteractiveNode } = require('../../node-inspector');

const DEVICE_INSETS = [
  { minW: 375, maxW: 375, minH: 812, maxH: 812, top: 47, bottom: 34, device: 'iPhone 13 mini' },
  { minW: 390, maxW: 393, minH: 844, maxH: 852, top: 59, bottom: 34, device: 'iPhone 15/16' },
  { minW: 402, maxW: 402, minH: 874, maxH: 874, top: 62, bottom: 34, device: 'iPhone 16 Pro' },
  { minW: 414, maxW: 430, minH: 896, maxH: 932, top: 59, bottom: 34, device: 'iPhone 15/16 Plus/Max' },
  { minW: 320, maxW: 375, minH: 568, maxH: 667, top: 20, bottom: 0, device: 'iPhone SE' },
];

const IOS_SCREEN_WIDTHS = { min: 320, max: 430 };
const IOS_SCREEN_HEIGHTS = { min: 568, max: 932 };

module.exports = {
  id: 'ios-safe-area',
  name: 'iOS Safe Area Insets',
  wcag: ['1.3.1'],
  level: 'AA',
  category: 'structure',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    if (!isInteractiveNode(node)) return issues;
    if (node.depth > 3) return issues;

    const config = context.config || {};

    const allNodes = context.allNodes || {};
    let screenFrame = null;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.depth === 0 &&
          n.w >= IOS_SCREEN_WIDTHS.min && n.w <= IOS_SCREEN_WIDTHS.max &&
          n.h >= IOS_SCREEN_HEIGHTS.min && n.h <= IOS_SCREEN_HEIGHTS.max) {
        screenFrame = n;
        break;
      }
    }

    if (!screenFrame) return issues;

    // Detect device from frame dimensions
    let safeTop = config.safeAreaTop || 59;
    let safeBottom = config.safeAreaBottom || 34;
    let detectedDevice = null;

    for (const d of DEVICE_INSETS) {
      if (screenFrame.w >= d.minW && screenFrame.w <= d.maxW &&
          screenFrame.h >= d.minH && screenFrame.h <= d.maxH) {
        safeTop = config.safeAreaTop || d.top;
        safeBottom = config.safeAreaBottom || d.bottom;
        detectedDevice = d.device;
        break;
      }
    }

    if (safeTop === 0 && safeBottom === 0) return issues;

    const relativeY = node.y - screenFrame.y;
    const relativeBottom = relativeY + node.h;
    const screenHeight = screenFrame.h;

    if (relativeY < safeTop) {
      const deviceNote = detectedDevice ? ` (detected: ${detectedDevice})` : '';
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element "${node.name}" overlaps the top safe area (${safeTop}pt)${deviceNote}. It may be obscured by the Dynamic Island or notch.`,
        wcagRef: '1.3.1',
        suggestion: `Move below the ${safeTop}pt safe area. Use Auto Layout with safe area padding.`,
        data: { relativeY: Math.round(relativeY), safeTop, detectedDevice, platform: 'ios' },
      });
    }

    if (safeBottom > 0 && relativeBottom > screenHeight - safeBottom) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'error',
        message: `Interactive element "${node.name}" overlaps the bottom safe area (${safeBottom}pt home indicator zone).`,
        wcagRef: '1.3.1',
        suggestion: `Move above the ${safeBottom}pt bottom safe area. The home indicator gesture area must remain unobstructed.`,
        data: { relativeBottom: Math.round(relativeBottom), screenHeight: Math.round(screenHeight), safeBottom, platform: 'ios' },
      });
    }

    return issues;
  },
};
