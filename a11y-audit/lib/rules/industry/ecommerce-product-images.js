/**
 * ecommerce-product-images.js
 * E-commerce: Product cards need image descriptions, readable prices, and text product names.
 */

module.exports = {
  id: 'ecommerce-product-images',
  name: 'Product Card Accessibility',
  wcag: ['1.1.1'],
  level: 'AA',
  category: 'images',
  nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],

  check(node, context) {
    const issues = [];
    const name = (node.name || '').toLowerCase();

    const isProduct = name.includes('product') || name.includes('card') ||
      name.includes('listing') || name.includes('item') ||
      name.includes('catalog');
    if (!isProduct) return issues;

    const children = node.children || { count: 0, hasText: false };
    if (children.count < 2) return issues;

    const config = context.config || {};
    const priceMinFont = config.priceMinFontSize || 16;

    const allNodes = context.allNodes || {};
    let hasImage = false;
    let hasImageDesc = false;
    let hasPrice = false;
    let priceFontSize = 0;
    let hasProductName = false;

    for (const [, n] of Object.entries(allNodes)) {
      if (n.x < node.x || n.x > node.x + node.w) continue;
      if (n.y < node.y || n.y > node.y + node.h) continue;

      const nName = (n.name || '').toLowerCase();

      if (n.type === 'RECTANGLE' || nName.includes('image') || nName.includes('photo') || nName.includes('thumbnail')) {
        hasImage = true;
        if ((n.desc || '').trim().length > 0) hasImageDesc = true;
      }

      if (n.type === 'TEXT' && n.chars) {
        if (/[$€£¥₹]|price|cost/i.test(n.chars) || /[$€£¥₹]\s*[\d,]+/.test(n.chars)) {
          hasPrice = true;
          priceFontSize = n.fontSize || 0;
        }

        if (nName.includes('name') || nName.includes('title') || nName.includes('product name')) {
          hasProductName = true;
        }
      }
    }

    if (hasImage && !hasImageDesc) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Product card "${node.name}" has an image without a description. Screen reader users need product image descriptions.`,
        wcagRef: '1.1.1',
        suggestion: 'Add a description to the product image (e.g., "Red running shoes, side view"). This helps screen reader users understand the product.',
        data: { industry: 'ecommerce' },
      });
    }

    if (hasPrice && priceFontSize > 0 && priceFontSize < priceMinFont) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'warning',
        message: `Product price in "${node.name}" is ${priceFontSize}px. Prices should be at least ${priceMinFont}px for clear reading.`,
        wcagRef: '1.4.4',
        suggestion: `Increase price font size to at least ${priceMinFont}px. Price is critical decision-making information.`,
        data: { priceFontSize, minimum: priceMinFont, industry: 'ecommerce' },
      });
    }

    if (!hasProductName && children.hasText) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        severity: 'info',
        message: `Product card "${node.name}" has no clearly named product title element. Use a descriptive layer name like "Product Name".`,
        wcagRef: '1.3.1',
        suggestion: 'Name the product title layer "Product Name" or "Title" so developers can map it to a heading element.',
        data: { industry: 'ecommerce' },
      });
    }

    return issues;
  },
};
