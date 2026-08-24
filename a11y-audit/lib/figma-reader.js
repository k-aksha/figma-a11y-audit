/**
 * figma-reader.js
 * Reads Figma file structure and detailed node trees via REST API.
 */

const figmaDs = require('./figma-ds');

// ---------------------------------------------------------------------------
// REST API layer — fast, parallel extraction
// ---------------------------------------------------------------------------

/**
 * Pull file structure, variables, styles, and components in parallel.
 * Gracefully handles partial failures (e.g., Variables API on free plan).
 */
async function fetchFileOverview(fileKey, token) {
  console.log('\n  Phase 1: Fetching file overview via REST API...');

  const [fileStructure, variables, styles, components] = await Promise.all([
    figmaDs.extractFileStructure(fileKey, token).catch(err => {
      console.warn(`  [warn] File structure: ${err.message}`);
      return { name: '', pages: [] };
    }),
    figmaDs.extractVariables(fileKey, token).catch(err => {
      console.warn(`  [warn] Variables: ${err.message}`);
      return [];
    }),
    figmaDs.extractStyles(fileKey, token).catch(err => {
      console.warn(`  [warn] Styles: ${err.message}`);
      return { all: [], grouped: {} };
    }),
    figmaDs.extractComponents(fileKey, token).catch(err => {
      console.warn(`  [warn] Components: ${err.message}`);
      return [];
    }),
  ]);

  return { fileStructure, variables, styles, components };
}

// ---------------------------------------------------------------------------
// Deep node tree via REST API (deeper depth)
// ---------------------------------------------------------------------------

/**
 * Fetch a specific node's full subtree from the REST API.
 * Returns raw Figma node JSON with children.
 */
async function fetchNodeTree(fileKey, token, nodeId) {
  const endpoint = `/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;
  const data = await figmaDs.figmaGet(endpoint, token);
  const nodes = data.nodes || {};
  return nodes[nodeId]?.document || null;
}

// ---------------------------------------------------------------------------
// Node tree flattening — recursively collect all nodes
// ---------------------------------------------------------------------------

/**
 * Flatten a Figma node tree into a flat array with parent references.
 * Filters to auditable node types.
 */
function flattenNodeTree(node, parentId = null, depth = 0) {
  if (!node) return [];

  const flat = [{
    id: node.id,
    type: node.type,
    name: node.name || '',
    parentId,
    depth,
    x: node.absoluteBoundingBox?.x ?? node.x ?? 0,
    y: node.absoluteBoundingBox?.y ?? node.y ?? 0,
    width: node.absoluteBoundingBox?.width ?? node.size?.x ?? 0,
    height: node.absoluteBoundingBox?.height ?? node.size?.y ?? 0,
  }];

  const children = node.children || [];
  for (const child of children) {
    flat.push(...flattenNodeTree(child, node.id, depth + 1));
  }

  return flat;
}

/**
 * Filter flat node list to only auditable types.
 */
function filterAuditableNodes(flatNodes) {
  const auditableTypes = new Set([
    'TEXT', 'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
    'RECTANGLE', 'ELLIPSE', 'VECTOR', 'GROUP', 'SECTION',
  ]);

  return flatNodes.filter(n => auditableTypes.has(n.type));
}

// ---------------------------------------------------------------------------
// Page discovery — which pages to audit
// ---------------------------------------------------------------------------

/**
 * Resolve which pages to audit based on CLI filter.
 * @param {object} fileStructure - From extractFileStructure
 * @param {string[]|null} pageFilter - Page names to include (null = all)
 * @returns {Array<{name, id, frames}>}
 */
function resolvePages(fileStructure, pageFilter) {
  const allPages = fileStructure.pages || [];

  if (!pageFilter || pageFilter.length === 0) {
    // Skip separator/section-header pages
    return allPages.filter(p =>
      !p.name.startsWith('─') &&
      !['Cover', 'Primitives', 'Compound', 'Patterns', 'Layouts'].includes(p.name)
    );
  }

  return allPages.filter(p =>
    pageFilter.some(f => p.name.toLowerCase().includes(f.toLowerCase()))
  );
}

// ---------------------------------------------------------------------------
// Variable color extraction — build a color-name-to-value map
// ---------------------------------------------------------------------------

/**
 * Build a flat map of variable names to their hex values (per mode).
 * Useful for checking if design tokens meet contrast requirements.
 */
function buildColorMap(variables) {
  const colorMap = {};

  for (const collection of variables) {
    for (const v of collection.variables || []) {
      if (v.type !== 'COLOR') continue;
      colorMap[v.name] = { ...v.values, collection: collection.name };
    }
  }

  return colorMap;
}

// ---------------------------------------------------------------------------
// Component catalog helpers
// ---------------------------------------------------------------------------

/**
 * Build a lookup from component name → component metadata.
 */
function buildComponentLookup(components) {
  const lookup = {};
  for (const c of components) {
    lookup[c.name] = c;
    // Also index by the last segment (e.g., "Button" from "Primitives / Button")
    const lastSegment = c.name.split('/').pop().trim();
    if (!lookup[lastSegment]) {
      lookup[lastSegment] = c;
    }
  }
  return lookup;
}

module.exports = {
  fetchFileOverview,
  fetchNodeTree,
  flattenNodeTree,
  filterAuditableNodes,
  resolvePages,
  buildColorMap,
  buildComponentLookup,
};
