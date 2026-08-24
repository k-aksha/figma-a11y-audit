/**
 * contrast.js
 * WCAG 2.2 relative luminance and contrast ratio calculations.
 * Pure math — zero dependencies, zero side effects.
 */

// ---------------------------------------------------------------------------
// sRGB → Linear conversion (WCAG 2.2 spec)
// ---------------------------------------------------------------------------

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// ---------------------------------------------------------------------------
// Relative luminance (WCAG 2.2 definition)
// Input: { r, g, b } in 0–1 sRGB range (Figma's native format)
// ---------------------------------------------------------------------------

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

// ---------------------------------------------------------------------------
// Contrast ratio between two colors
// Returns a value ≥ 1 (e.g., 4.5, 21)
// ---------------------------------------------------------------------------

function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Alpha compositing — blend semi-transparent foreground over opaque background
// ---------------------------------------------------------------------------

function blendAlpha(fg, bg, alpha) {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

// ---------------------------------------------------------------------------
// WCAG threshold checks
// ---------------------------------------------------------------------------

function isLargeText(fontSizePx, isBold) {
  if (isBold) return fontSizePx >= 18.66;
  return fontSizePx >= 24;
}

function meetsAA(ratio, large) {
  return large ? ratio >= 3 : ratio >= 4.5;
}

function meetsAAA(ratio, large) {
  return large ? ratio >= 4.5 : ratio >= 7;
}

function meetsUIComponent(ratio) {
  return ratio >= 3;
}

// ---------------------------------------------------------------------------
// Color format conversions
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace(/^#/, '');
  const n = parseInt(h.length <= 4 ? h.slice(0, 1).repeat(2) + h.slice(1, 2).repeat(2) + h.slice(2, 3).repeat(2) : h.slice(0, 6), 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// Suggestion helper — find minimum-change color that meets target ratio
// ---------------------------------------------------------------------------

function suggestFix(fgColor, bgColor, targetRatio) {
  const bgLum = relativeLuminance(bgColor);
  const fgLum = relativeLuminance(fgColor);

  // Try darkening the foreground first (more common fix)
  const neededDarkLum = (bgLum + 0.05) / targetRatio - 0.05;
  if (neededDarkLum >= 0) {
    // Darken proportionally across all channels
    const currentLum = fgLum;
    if (currentLum > 0) {
      const scale = neededDarkLum / currentLum;
      const darker = {
        r: Math.max(0, Math.min(1, fgColor.r * scale)),
        g: Math.max(0, Math.min(1, fgColor.g * scale)),
        b: Math.max(0, Math.min(1, fgColor.b * scale)),
      };
      if (contrastRatio(darker, bgColor) >= targetRatio) {
        return { action: 'darken', color: darker, hex: rgbToHex(darker) };
      }
    }
  }

  // Try lightening the foreground (for dark backgrounds)
  const neededLightLum = targetRatio * (bgLum + 0.05) - 0.05;
  if (neededLightLum <= 1) {
    const currentLum = fgLum;
    if (currentLum > 0 && currentLum < 1) {
      const scale = neededLightLum / currentLum;
      const lighter = {
        r: Math.min(1, fgColor.r * scale),
        g: Math.min(1, fgColor.g * scale),
        b: Math.min(1, fgColor.b * scale),
      };
      if (contrastRatio(lighter, bgColor) >= targetRatio) {
        return { action: 'lighten', color: lighter, hex: rgbToHex(lighter) };
      }
    }
  }

  return null;
}

module.exports = {
  srgbToLinear,
  relativeLuminance,
  contrastRatio,
  blendAlpha,
  isLargeText,
  meetsAA,
  meetsAAA,
  meetsUIComponent,
  hexToRgb,
  rgbToHex,
  suggestFix,
};
