/**
 * figma-ds.js
 * Figma API helpers — supports two modes:
 *   1. Direct REST API with Personal Access Token (--token / FIGMA_ACCESS_TOKEN)
 *   2. MCP proxy via Figma OAuth MCP server (--mcp / auto-detected)
 *
 * The MCP mode routes all requests through a local MCP server that handles
 * OAuth authentication. No token needed.
 */

// ---------------------------------------------------------------------------
// Transport mode — set once at startup via configureTransport()
// ---------------------------------------------------------------------------

let _transport = null; // { mode: 'rest', token } | { mode: 'mcp', endpoint, command }

/**
 * Configure the Figma API transport.
 *
 * @param {object} opts
 * @param {string|null} opts.token   - Figma PAT (enables REST mode)
 * @param {string|null} opts.mcp     - MCP server command or 'auto' (enables MCP mode)
 * @param {string|null} opts.mcpEndpoint - MCP server endpoint URL (optional)
 */
function configureTransport(opts = {}) {
  if (opts.token) {
    _transport = { mode: 'rest', token: opts.token };
    return;
  }

  if (opts.mcp) {
    _transport = {
      mode: 'mcp',
      endpoint: opts.mcpEndpoint || 'http://localhost:3845',
      command: opts.mcp === 'auto' ? null : opts.mcp,
    };
    return;
  }

  // Fallback: check env
  if (process.env.FIGMA_ACCESS_TOKEN) {
    _transport = { mode: 'rest', token: process.env.FIGMA_ACCESS_TOKEN };
    return;
  }

  _transport = null;
}

function getTransport() {
  return _transport;
}

// ---------------------------------------------------------------------------
// REST API transport — direct Figma API calls with PAT
// ---------------------------------------------------------------------------

async function restGet(endpoint, token) {
  const res = await fetch(`https://api.figma.com/v1${endpoint}`, {
    headers: {
      'X-Figma-Token': token,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    handleRestError(res);
  }

  return res.json();
}

async function restPost(endpoint, token, body) {
  const res = await fetch(`https://api.figma.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API POST error ${res.status}: ${text}`);
  }

  return res.json();
}

async function restDelete(endpoint, token) {
  const res = await fetch(`https://api.figma.com/v1${endpoint}`, {
    method: 'DELETE',
    headers: { 'X-Figma-Token': token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API DELETE error ${res.status}: ${text}`);
  }

  return res.json().catch(() => ({}));
}

async function handleRestError(res) {
  const status = res.status;
  if (status === 403) {
    throw new Error(
      'Figma API: Access denied (403). Check that your Personal Access Token is valid\n' +
      '  and has read access to the file. Generate one at:\n' +
      '  https://www.figma.com/developers/api#access-tokens'
    );
  }
  if (status === 404) {
    throw new Error(
      'Figma API: File not found (404). Check the file key in your config.\n' +
      '  The key is the part after /file/ or /design/ in the Figma URL.'
    );
  }
  const body = await res.text();
  throw new Error(`Figma API error ${status}: ${body}`);
}

// ---------------------------------------------------------------------------
// MCP transport — route Figma API calls through MCP server
// ---------------------------------------------------------------------------

async function mcpCall(method, endpoint, body) {
  const mcpEndpoint = _transport.endpoint;

  const toolInput = {
    method: method || 'GET',
    endpoint: endpoint,
  };
  if (body) toolInput.body = body;

  const res = await fetch(`${mcpEndpoint}/mcp/v1/tools/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      tool: 'use_figma',
      input: toolInput,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP Figma call failed (${res.status}): ${text}`);
  }

  const result = await res.json();

  // MCP tool results come wrapped — extract the actual data
  if (result.content && Array.isArray(result.content)) {
    const textContent = result.content.find(c => c.type === 'text');
    if (textContent) {
      try {
        return JSON.parse(textContent.text);
      } catch {
        return textContent.text;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Unified API — automatically routes through REST or MCP
// ---------------------------------------------------------------------------

async function figmaGet(endpoint, token) {
  if (_transport?.mode === 'mcp') {
    return mcpCall('GET', endpoint);
  }
  const t = token || _transport?.token;
  if (!t) throw new Error('No Figma access token. Use --token, set FIGMA_ACCESS_TOKEN env var, or use --mcp for OAuth.');
  return restGet(endpoint, t);
}

async function figmaPost(endpoint, token, body) {
  if (_transport?.mode === 'mcp') {
    return mcpCall('POST', endpoint, body);
  }
  const t = token || _transport?.token;
  if (!t) throw new Error('No Figma access token.');
  return restPost(endpoint, t, body);
}

async function figmaDelete(endpoint, token) {
  if (_transport?.mode === 'mcp') {
    return mcpCall('DELETE', endpoint);
  }
  const t = token || _transport?.token;
  if (!t) throw new Error('No Figma access token.');
  return restDelete(endpoint, t);
}

/**
 * Extract the file key from a Figma URL.
 * Supports: figma.com/file/KEY/..., figma.com/design/KEY/...
 */
function extractFileKey(figmaUrl) {
  if (!figmaUrl) return null;
  const match = figmaUrl.match(/\/(file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : figmaUrl;
}

// ---------------------------------------------------------------------------
// Variable extraction
// ---------------------------------------------------------------------------

async function extractVariables(fileKey, token) {
  console.log('  Fetching Figma Variables...');

  const data = await figmaGet(`/files/${fileKey}/variables/local`, token);
  const meta = data.meta || {};
  const collections = meta.variableCollections || {};
  const variables = meta.variables || {};

  const result = [];

  for (const [collId, coll] of Object.entries(collections)) {
    const collectionEntry = {
      name: coll.name,
      modes: coll.modes.map(m => m.name),
      variables: [],
    };

    for (const [varId, v] of Object.entries(variables)) {
      if (v.variableCollectionId !== collId) continue;

      const varEntry = {
        name: v.name,
        type: v.resolvedType,
        values: {},
      };

      for (const [modeId, value] of Object.entries(v.valuesByMode || {})) {
        const mode = coll.modes.find(m => m.modeId === modeId);
        const modeName = mode ? mode.name : modeId;

        if (v.resolvedType === 'COLOR' && typeof value === 'object' && 'r' in value) {
          varEntry.values[modeName] = figmaRGBToHex(value);
        } else if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
          const refVar = variables[value.id];
          varEntry.values[modeName] = refVar ? `{${refVar.name}}` : `alias:${value.id}`;
        } else {
          varEntry.values[modeName] = value;
        }
      }

      collectionEntry.variables.push(varEntry);
    }

    result.push(collectionEntry);
  }

  const count = result.reduce((sum, c) => sum + c.variables.length, 0);
  console.log(`  Found ${result.length} collection(s), ${count} variable(s).`);
  return result;
}

// ---------------------------------------------------------------------------
// Style extraction
// ---------------------------------------------------------------------------

async function extractStyles(fileKey, token) {
  console.log('  Fetching Figma Styles...');

  const data = await figmaGet(`/files/${fileKey}/styles`, token);
  const styles = (data.meta?.styles || []).map(s => ({
    key: s.key,
    name: s.name,
    type: s.style_type,
    description: s.description || '',
  }));

  const grouped = {
    fill: styles.filter(s => s.type === 'FILL'),
    text: styles.filter(s => s.type === 'TEXT'),
    effect: styles.filter(s => s.type === 'EFFECT'),
    grid: styles.filter(s => s.type === 'GRID'),
  };

  console.log(`  Found styles — fill: ${grouped.fill.length}, text: ${grouped.text.length}, effect: ${grouped.effect.length}, grid: ${grouped.grid.length}`);
  return { all: styles, grouped };
}

// ---------------------------------------------------------------------------
// Component extraction
// ---------------------------------------------------------------------------

async function extractComponents(fileKey, token) {
  console.log('  Fetching Figma Components...');

  const data = await figmaGet(`/files/${fileKey}/components`, token);
  const components = (data.meta?.components || []).map(c => ({
    key: c.key,
    name: c.name,
    description: c.description || '',
    containingFrame: c.containing_frame?.name || '',
    pageName: c.containing_frame?.pageName || '',
  }));

  console.log(`  Found ${components.length} component(s).`);
  return components;
}

// ---------------------------------------------------------------------------
// File structure extraction
// ---------------------------------------------------------------------------

async function extractFileStructure(fileKey, token) {
  console.log('  Fetching Figma file structure...');

  const data = await figmaGet(`/files/${fileKey}?depth=2`, token);
  const pages = (data.document?.children || []).map(page => ({
    name: page.name,
    id: page.id,
    frames: (page.children || [])
      .filter(c => c.type === 'FRAME' || c.type === 'SECTION')
      .map(f => ({ name: f.name, id: f.id, type: f.type })),
  }));

  console.log(`  Found ${pages.length} page(s), ${pages.reduce((s, p) => s + p.frames.length, 0)} top-level frame(s).`);
  return { name: data.name, pages };
}

// ---------------------------------------------------------------------------
// Color conversion
// ---------------------------------------------------------------------------

function figmaRGBToHex({ r, g, b, a }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a !== undefined && a < 1) {
    return `${hex}${toHex(a)}`;
  }
  return hex;
}

module.exports = {
  configureTransport,
  getTransport,
  figmaGet,
  figmaPost,
  figmaDelete,
  extractFileKey,
  extractVariables,
  extractStyles,
  extractComponents,
  extractFileStructure,
};
