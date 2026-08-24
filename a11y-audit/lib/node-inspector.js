/**
 * node-inspector.js
 * Deep node inspection via Figma REST API.
 * Fetches full subtrees and builds enriched property maps for the rule engine.
 */

const { figmaGet } = require('./figma-ds');
const { restLimiter } = require('./rate-limiter');

const BATCH_SIZE = 10;

const AUDITABLE_TYPES = new Set([
  'TEXT', 'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
  'RECTANGLE', 'ELLIPSE', 'VECTOR', 'GROUP', 'SECTION',
]);

// ---------------------------------------------------------------------------
// Tree walking — REST response → enriched node map
// ---------------------------------------------------------------------------

function walkTree(figmaNode, parentNode, results, depth) {
  if (!figmaNode) return;

  figmaNode._parent = parentNode;

  if (AUDITABLE_TYPES.has(figmaNode.type)) {
    results[figmaNode.id] = buildEnrichedNode(figmaNode, parentNode, depth);
  }

  if (figmaNode.children) {
    for (const child of figmaNode.children) {
      walkTree(child, figmaNode, results, depth + 1);
    }
  }
}

function buildEnrichedNode(node, parent, depth) {
  const bbox = node.absoluteBoundingBox || {};
  const style = node.style || {};
  const isText = node.type === 'TEXT';

  return {
    id: node.id,
    type: node.type,
    name: node.name || '',
    w: bbox.width || 0,
    h: bbox.height || 0,
    x: bbox.x || 0,
    y: bbox.y || 0,
    depth,
    opacity: node.opacity ?? 1,
    visible: node.visible !== false,
    desc: node.description || '',
    fills: extractSolidFills(node.fills),
    strokes: extractSolidFills(node.strokes),
    strokeWeight: node.strokeWeight || 0,
    bg: findParentBackground(parent),
    fontSize: isText ? (style.fontSize || null) : null,
    fontName: isText && style.fontFamily
      ? { family: style.fontFamily, style: style.fontPostScriptName || '' }
      : null,
    fontWeight: isText ? ((style.fontWeight || 0) >= 700 ? 'bold' : 'normal') : null,
    lineHeight: isText ? (style.lineHeightPx || null) : null,
    letterSpacing: isText ? (style.letterSpacing ?? null) : null,
    chars: isText ? (node.characters || '') : null,
    textDecoration: isText ? (style.textDecoration || 'NONE') : null,
    layoutMode: node.layoutMode || null,
    itemSpacing: node.itemSpacing ?? null,
    paddingTop: node.paddingTop ?? null,
    paddingBottom: node.paddingBottom ?? null,
    paddingLeft: node.paddingLeft ?? null,
    paddingRight: node.paddingRight ?? null,
    cornerRadius: node.cornerRadius ?? null,
    children: buildChildInfo(node),
    siblings: buildSiblingInfo(node, parent),
    parentName: parent?.name || '',
    parentType: parent?.type || '',
    effects: extractEffects(node.effects),
    componentProps: extractComponentProps(node),
    variantProps: extractVariantProps(node, parent),
  };
}

// ---------------------------------------------------------------------------
// Property extractors
// ---------------------------------------------------------------------------

function extractSolidFills(fills) {
  if (!fills || !Array.isArray(fills)) return [];
  return fills
    .filter(f => f.type === 'SOLID' && f.visible !== false)
    .map(f => ({
      r: f.color.r,
      g: f.color.g,
      b: f.color.b,
      a: f.opacity ?? 1,
    }));
}

function findParentBackground(node) {
  let current = node;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if (current.fills && Array.isArray(current.fills)) {
      for (const f of current.fills) {
        if (f.type === 'SOLID' && f.visible !== false) {
          return { r: f.color.r, g: f.color.g, b: f.color.b, a: f.opacity ?? 1 };
        }
      }
    }
    current = current._parent;
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

function buildChildInfo(node) {
  const info = { count: 0, types: [], hasText: false, hasVector: false, textContent: [] };
  if (!node.children) return info;

  info.count = node.children.length;
  for (const child of node.children) {
    info.types.push(child.type);
    if (child.type === 'TEXT') {
      info.hasText = true;
      if (child.characters) info.textContent.push(child.characters);
    }
    if (child.type === 'VECTOR' || child.type === 'BOOLEAN_OPERATION') {
      info.hasVector = true;
    }
  }
  return info;
}

function buildSiblingInfo(node, parent) {
  if (!parent || !parent.children) return [];
  return parent.children
    .filter(c => c.id !== node.id)
    .map(c => {
      const b = c.absoluteBoundingBox || {};
      return {
        id: c.id,
        type: c.type,
        name: c.name || '',
        x: b.x || 0,
        y: b.y || 0,
        w: b.width || 0,
        h: b.height || 0,
      };
    });
}

function extractEffects(effects) {
  if (!effects || !Array.isArray(effects)) return [];
  return effects
    .filter(e => e.visible !== false)
    .map(e => ({
      type: e.type,
      radius: e.radius || 0,
      offset: e.offset || { x: 0, y: 0 },
      color: e.color ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a } : null,
    }));
}

function extractComponentProps(node) {
  if (!node.componentProperties) return null;
  const props = {};
  for (const [key, val] of Object.entries(node.componentProperties)) {
    props[key] = { type: val.type, value: val.value };
  }
  return Object.keys(props).length > 0 ? props : null;
}

function extractVariantProps(node, parent) {
  if (node.type === 'INSTANCE' && node.componentProperties) {
    const variants = {};
    for (const [key, val] of Object.entries(node.componentProperties)) {
      if (val.type === 'VARIANT') variants[key] = val.value;
    }
    if (Object.keys(variants).length > 0) return variants;
  }

  if (node.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET') {
    return parseVariantName(node.name);
  }

  return null;
}

function parseVariantName(name) {
  if (!name || !name.includes('=')) return null;
  const props = {};
  for (const pair of name.split(',')) {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value) props[key] = value;
  }
  return Object.keys(props).length > 0 ? props : null;
}

// ---------------------------------------------------------------------------
// Main inspection via REST API
// ---------------------------------------------------------------------------

async function inspectNodes(fileKey, token, frameNodeIds) {
  const allResults = {};
  const batches = [];

  for (let i = 0; i < frameNodeIds.length; i += BATCH_SIZE) {
    batches.push(frameNodeIds.slice(i, i + BATCH_SIZE));
  }

  console.log(`  Inspecting ${frameNodeIds.length} frame(s) in ${batches.length} batch(es)...`);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    await restLimiter.throttle();

    console.log(`    Batch ${b + 1}/${batches.length} (${batch.length} frames)...`);

    const idsParam = batch.map(id => encodeURIComponent(id)).join(',');

    try {
      const data = await figmaGet(`/files/${fileKey}/nodes?ids=${idsParam}`, token);

      for (const [nodeId, nodeData] of Object.entries(data.nodes || {})) {
        const doc = nodeData.document;
        if (!doc) continue;
        walkTree(doc, null, allResults, 0);
      }
    } catch (err) {
      console.warn(`    [warn] Batch ${b + 1} failed: ${err.message}`);
    }
  }

  console.log(`  Inspection complete: ${Object.keys(allResults).length} nodes enriched.`);
  return allResults;
}

// ---------------------------------------------------------------------------
// Semantic node type detection
// ---------------------------------------------------------------------------

const INTERACTIVE_PATTERNS = [
  'button', 'btn', 'input', 'checkbox', 'radio', 'switch', 'toggle',
  'link', 'tab', 'select', 'dropdown', 'menu item', 'menuitem',
  'slider', 'handle', 'combobox', 'chip', 'tag', 'close',
];

function isInteractiveNode(node) {
  const name = (node.name || '').toLowerCase();
  const parentName = (node.parentName || '').toLowerCase();
  const desc = (node.desc || '').toLowerCase();

  for (const pattern of INTERACTIVE_PATTERNS) {
    if (name.includes(pattern) || parentName.includes(pattern)) return true;
  }

  if (node.variantProps) {
    const keys = Object.keys(node.variantProps).map(k => k.toLowerCase());
    if (keys.some(k => k === 'state' || k === 'status' || k === 'interaction')) return true;
  }

  if (desc.includes('interactive') || desc.includes('clickable') || desc.includes('tappable')) return true;

  return false;
}

function isHeadingNode(node) {
  if (node.type !== 'TEXT') return false;
  const name = (node.name || '').toLowerCase();
  const fontSize = node.fontSize || 0;
  const isBold = node.fontWeight === 'bold';

  if (/^h[1-6]$/i.test(name) || name.includes('heading') || name.includes('title')) return true;
  if (isBold && fontSize >= 20) return true;

  return false;
}

function isFormInput(node) {
  const name = (node.name || '').toLowerCase();
  return ['input', 'text field', 'textarea', 'select', 'dropdown', 'combobox', 'search'].some(p => name.includes(p));
}

module.exports = {
  inspectNodes,
  isInteractiveNode,
  isHeadingNode,
  isFormInput,
  BATCH_SIZE,
};
