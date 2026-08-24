# Accessibility Audit Rules

> **43 rules**: 8 base, 17 platform, 18 industry

## Base Rules

Core WCAG 2.2 checks applied to every audit.

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Color Contrast](base/color-contrast.md) | 1.4.3, 1.4.6, 1.4.11 | AA | color |
| [Color-Only Information](base/color-only-info.md) | 1.4.1 | AA | color |
| [Content Structure & Reading Order](base/content-structure.md) | 1.3.1, 1.3.2 | AA | structure |
| [Focus Indicators](base/focus-indicators.md) | 2.4.7, 2.4.11 | AA | focus |
| [Form Field Labels & Errors](base/form-fields.md) | 1.3.1, 3.3.2, 3.3.1, 3.3.3 | AA | forms |
| [Image & Icon Accessibility](base/image-icons.md) | 1.1.1 | AA | images |
| [Text Sizing & Readability](base/text-sizing.md) | 1.4.4, 1.4.12, 1.3.1 | AA | typography |
| [Touch/Click Target Size](base/touch-targets.md) | 2.5.8, 2.5.5 | AA | interaction |

## Platform Rules

Platform-specific checks activated via `--platform` flag.

### Android

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Android Bottom Navigation](platform/android/android-bottom-nav.md) | 1.3.1 | AA | structure |
| [Android Interactive Visual Affordance](platform/android/android-elevation.md) | 1.4.11 | AA | interaction |
| [Android Text Scaling Support](platform/android/android-text-scaling.md) | 1.4.4 | AA | typography |
| [Android Touch Targets (48dp)](platform/android/android-touch-targets.md) | 2.5.8 | AA | interaction |

### iOS

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [iOS Dynamic Type Support](platform/ios/ios-dynamic-type.md) | 1.4.4 | AA | typography |
| [iOS Safe Area Insets](platform/ios/ios-safe-area.md) | 1.3.1 | AA | structure |
| [iOS Font & Dynamic Type Compatibility](platform/ios/ios-system-font.md) | 1.4.12 | AA | typography |
| [iOS Touch Targets (44pt)](platform/ios/ios-touch-targets.md) | 2.5.8 | AA | interaction |

### Web (Sites)

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Focus Order](platform/web/web-focus-order.md) | 2.4.3 | AA | focus |
| [Heading Level Hierarchy](platform/web/web-heading-hierarchy.md) | 1.3.1 | AA | structure |
| [Landmark Regions](platform/web/web-landmark-regions.md) | 1.3.1 | AA | structure |
| [Skip Navigation Link](platform/web/web-skip-navigation.md) | 2.4.1 | AA | structure |

### Web (Apps)

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Combobox / Autocomplete Pattern](platform/web-app/webapp-combobox-pattern.md) | 1.3.1, 3.3.2 | AA | forms |
| [Complex Data Tables](platform/web-app/webapp-complex-tables.md) | 1.3.1, 1.4.11 | AA | structure |
| [Dialog/Modal Pattern](platform/web-app/webapp-dialog-pattern.md) | 1.3.1, 2.4.3 | AA | structure |
| [Loading State Accessibility](platform/web-app/webapp-loading-states.md) | 1.3.1 | AA | structure |
| [Tab Pattern](platform/web-app/webapp-tab-pattern.md) | 1.3.1, 2.4.7 | AA | structure |

## Industry Rules

Domain-specific checks activated via `--industry` flag.

### Healthcare

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Healthcare Color-Blind Safe Palettes](industry/healthcare/healthcare-color-safe.md) | 1.4.1 | AA | color |
| [Healthcare Enhanced Contrast](industry/healthcare/healthcare-contrast.md) | 1.4.3, 1.4.6 | AA | color |
| [Healthcare Data Table Readability](industry/healthcare/healthcare-data-tables.md) | 1.3.1, 1.4.4 | AA | typography |
| [Healthcare Form Error Visibility](industry/healthcare/healthcare-form-errors.md) | 3.3.1, 3.3.3, 3.3.4 | AA | forms |

### Finance

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Transaction Confirmation Pattern](industry/finance/finance-confirmation.md) | 3.3.4 | AA | forms |
| [Financial Number Readability](industry/finance/finance-number-readability.md) | 1.4.4, 1.4.12 | AA | typography |
| [Secure Input Indicators](industry/finance/finance-secure-inputs.md) | 3.3.2 | AA | forms |
| [Financial Data Table Accessibility](industry/finance/finance-table-a11y.md) | 1.3.1, 1.4.11 | AA | structure |

### Manufacturing

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Manufacturing Enhanced Contrast](industry/manufacturing/mfg-contrast.md) | 1.4.3, 1.4.6 | AA | color |
| [Manufacturing Navigation Depth](industry/manufacturing/mfg-nav-depth.md) | 2.4.5 | AA | structure |
| [Manufacturing Status Triple Redundancy](industry/manufacturing/mfg-status-redundancy.md) | 1.4.1, 1.3.3 | AA | color |
| [Manufacturing Touch Targets (Gloved)](industry/manufacturing/mfg-touch-targets.md) | 2.5.8 | AA | interaction |

### Education

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Educational Media Descriptions](industry/education/education-media-alt.md) | 1.1.1, 1.2.1 | AA | images |
| [Educational Content Readability](industry/education/education-reading-level.md) | 1.4.4, 1.4.12 | AA | typography |

### Government

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Government Language Clarity](industry/government/government-language.md) | 3.1.1, 3.1.2 | AA | structure |
| [Section 508 Compliance](industry/government/government-section508.md) | 1.1.1, 1.3.1, 2.4.1, 2.4.2 | AA | structure |

### E-commerce

| Rule | WCAG | Level | Category |
|------|------|-------|----------|
| [Checkout Flow Accessibility](industry/ecommerce/ecommerce-checkout-flow.md) | 3.3.2, 3.3.4 | AA | forms |
| [Product Card Accessibility](industry/ecommerce/ecommerce-product-images.md) | 1.1.1 | AA | images |

## Profiles

| Profile | Type | Standards | Rules |
|---------|------|-----------|-------|
| **Android (Material Design 3)** | platform | WCAG 2.2 AA, Material Design 3 Accessibility | 12 |
| **E-commerce** | industry | WCAG 2.2 AA, EAA (European Accessibility Act) | 2 |
| **Education** | industry | WCAG 2.2 AA, Section 508 | 2 |
| **Finance** | industry | WCAG 2.2 AA, Section 508 | 4 |
| **Government** | industry | WCAG 2.2 AA, Section 508, EN 301 549 | 2 |
| **Healthcare** | industry | WCAG 2.2 AA, Section 508, HIPAA Accessibility | 4 |
| **iOS (Human Interface Guidelines)** | platform | WCAG 2.2 AA, Apple HIG Accessibility | 12 |
| **Manufacturing** | industry | WCAG 2.2 AA, ISO 9241-171 | 4 |
| **Web (Applications)** | platform | WCAG 2.2 AA, WAI-ARIA 1.2 | 17 |
| **Web (Websites)** | platform | WCAG 2.2 AA | 12 |

---

*Auto-generated by `scripts/generate-docs.js`*
