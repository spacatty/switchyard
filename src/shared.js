'use strict';

// The shared provider list: every custom provider found in a supported harness
// (OpenCode, Z-Code, Pi) plus the ones kept in Switchyard's own library file,
// merged by base URL. Each harness format is translated to and from one neutral
// shape so a provider can be copied into any other harness.
//
// Neutral provider: { id, name, baseURL, api, apiKey, headers, models: [model] }
//   api:    'openai-chat' | 'openai-responses' | 'anthropic'
//   apiKey: OpenCode syntax: a literal, {env:VAR}, {file:path}, or {cmd:command} (Pi's "!command")
// Neutral model: { id, name, context, output, reasoning, vision, pdf, video, toolCall, cost: { input, output, cacheRead, cacheWrite } }

const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeConfig } = require('./config');
const { resolveValue } = require('./discover');
const { zcodeModelRule, RESERVED_IDS: ZCODE_RESERVED } = require('./zcode');
const { BUILTIN_IDS: PI_BUILTIN } = require('./pi');

const HARNESSES = [
  { id: 'opencode', name: 'OpenCode' },
  { id: 'zcode', name: 'Z-Code' },
  { id: 'pi', name: 'Pi' },
];

function libraryPath() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'switchyard', 'providers.json');
}

function readLibrary(file) {
  if (!fs.existsSync(file)) return { path: file, exists: false, doc: { version: 1, providers: [] } };
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(doc.providers)) doc.providers = [];
    return { path: file, exists: true, doc };
  } catch (e) {
    return { path: file, exists: true, doc: null, error: e.message };
  }
}

function writeLibrary(file, doc) {
  // Library entries may hold plain keys, so keep the file owner-only.
  return writeConfig(file, doc, { mode: 0o600 });
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const def = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const slug = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'provider';

// Same provider = same endpoint, regardless of trailing slashes or a pasted /chat/completions.
function urlKey(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|completions|responses|messages|models)$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function uniqueId(seed, taken) {
  const base = slug(seed);
  if (!taken(base)) return base;
  for (let n = 2; ; n++) if (!taken(`${base}-${n}`)) return `${base}-${n}`;
}

// ---------- API keys ----------

function keyFromPi(v) {
  // "none" is the placeholder Pi needs for keyless servers, not a real key.
  if (typeof v !== 'string' || !v || v === 'none') return undefined;
  if (v.startsWith('!')) return `{cmd:${v.slice(1)}}`;
  const env = v.match(/^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))$/);
  if (env) return `{env:${env[1] || env[2]}}`;
  return v.replace(/\$\$/g, '$').replace(/\$!/g, '!');
}

// Converts a neutral key for a harness. Returns { value, note } where note explains a lossy conversion.
function convertKey(key, harness) {
  if (!key) return { value: undefined };
  const cmd = key.match(/^\{cmd:(.*)\}$/s);
  const env = key.match(/^\{env:([^}]+)\}$/);
  const file = key.match(/^\{file:([^}]+)\}$/);
  const resolved = () => resolveValue(key) || undefined;
  if (harness === 'opencode') {
    if (cmd) return { value: undefined, note: 'OpenCode cannot run a command to get the key; set it on the Connection tab' };
    return { value: key };
  }
  if (harness === 'pi') {
    if (cmd) return { value: '!' + cmd[1] };
    if (env) return { value: '$' + env[1].trim() };
    if (file) {
      const v = resolved();
      return v ? { value: v.replace(/\$/g, '$$$$').replace(/^!/, '$!'), note: `key copied from ${file[1].trim()} as plain text` } : { value: undefined, note: `could not read the key file ${file[1].trim()}` };
    }
    return { value: key.replace(/\$/g, '$$$$').replace(/^!/, '$!') };
  }
  // Z-Code only takes a literal key.
  if (cmd) return { value: undefined, note: 'Z-Code needs the key itself; paste it on the Connection tab' };
  if (env || file) {
    const v = resolved();
    return v ? { value: v, note: `key resolved from ${env ? '$' + env[1].trim() : file[1].trim()} and stored as plain text (Z-Code has no variable lookup)` } : { value: undefined, note: `${env ? '$' + env[1].trim() : file[1].trim()} is not set, so no key was copied` };
  }
  return { value: key };
}

// ---------- harness → neutral ----------

const OPENCODE_NPM = { '@ai-sdk/openai-compatible': 'openai-chat', '@openrouter/ai-sdk-provider': 'openai-chat', '@ai-sdk/openai': 'openai-responses', '@ai-sdk/anthropic': 'anthropic' };
const ZCODE_API = { 'openai-chat-completions': 'openai-chat', 'openai-responses': 'openai-responses', 'anthropic-messages': 'anthropic' };
const PI_API = { 'openai-completions': 'openai-chat', 'openai-responses': 'openai-responses', 'anthropic-messages': 'anthropic' };
const flip = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const TO_ZCODE = flip(ZCODE_API);
const TO_PI = flip(PI_API);
const TO_OPENCODE = { 'openai-chat': '@ai-sdk/openai-compatible', 'openai-responses': '@ai-sdk/openai', anthropic: '@ai-sdk/anthropic' };

function fromOpenCode(cfg) {
  const out = [];
  for (const [id, p] of Object.entries(isObj(cfg?.provider) ? cfg.provider : {})) {
    // Only endpoint-based providers can be shared; built-ins like "anthropic" with just a key are skipped.
    if (!isObj(p) || !p.options?.baseURL) continue;
    const api = OPENCODE_NPM[p.npm || '@ai-sdk/openai-compatible'];
    if (!api) continue;
    out.push({
      id,
      name: p.name || id,
      baseURL: p.options.baseURL,
      api,
      apiKey: p.options.apiKey || undefined,
      headers: isObj(p.options.headers) ? p.options.headers : undefined,
      models: Object.entries(p.models || {}).map(([mid, m]) => {
        const mods = m?.modalities?.input || [];
        return def({
          id: mid,
          name: m?.name,
          context: m?.limit?.context,
          output: m?.limit?.output,
          reasoning: m?.reasoning,
          vision: m?.attachment ?? (mods.length ? mods.includes('image') : undefined),
          pdf: mods.length ? mods.includes('pdf') : undefined,
          video: mods.length ? mods.includes('video') : undefined,
          toolCall: m?.tool_call,
          cost: m?.cost ? def({ input: m.cost.input, output: m.cost.output, cacheRead: m.cost.cache_read, cacheWrite: m.cost.cache_write }) : undefined,
        });
      }),
    });
  }
  return out;
}

function fromZcode(doc) {
  const rules = doc?.config?.providerConfigRules?.providerRules || [];
  const models = doc?.config?.modelConfigRules?.manualProviderModelRules || [];
  return rules
    .filter((r) => !r.templateId && r.config?.api?.baseUrl && ZCODE_API[r.config.api.type || 'openai-chat-completions'])
    .map((r) => ({
      id: r.providerId,
      name: r.providerName || r.providerId,
      baseURL: r.config.api.baseUrl,
      api: ZCODE_API[r.config.api.type || 'openai-chat-completions'],
      apiKey: r.config.access?.apiKey || undefined,
      headers: isObj(r.config.api.headers) ? r.config.api.headers : undefined,
      models: models
        .filter((m) => m.providerId === r.providerId)
        .map((m) => {
          const p = m.config?.properties || {};
          const levels = m.config?.optionSpecs?.reasoningLevel?.values || [];
          return def({
            id: m.modelId,
            context: p.contextWindow,
            output: m.config?.optionSpecs?.maxOutputTokens?.max,
            reasoning: levels.some((v) => v !== 'disabled' && v !== 'none'),
            vision: p.inputFormat?.supportsImage,
            pdf: p.inputFormat?.supportsPdf,
            video: p.inputFormat?.supportsVideo,
          });
        }),
    }));
}

function fromPi(doc) {
  const out = [];
  for (const [id, p] of Object.entries(isObj(doc?.providers) ? doc.providers : {})) {
    if (!isObj(p) || !p.baseUrl || !Array.isArray(p.models)) continue;
    const api = PI_API[p.api || p.models[0]?.api];
    if (!api) continue;
    out.push({
      id,
      name: p.name || id,
      baseURL: p.baseUrl,
      api,
      apiKey: keyFromPi(p.apiKey),
      headers: isObj(p.headers) ? p.headers : undefined,
      models: p.models.map((m) =>
        def({
          id: m.id,
          name: m.name,
          context: m.contextWindow,
          output: m.maxTokens,
          reasoning: m.reasoning,
          vision: Array.isArray(m.input) ? m.input.includes('image') : undefined,
          cost: m.cost ? def({ input: m.cost.input, output: m.cost.output, cacheRead: m.cost.cacheRead, cacheWrite: m.cost.cacheWrite }) : undefined,
        })
      ),
    });
  }
  return out;
}

// ---------- merged list ----------

// sources: { library, opencode, zcode, pi } → their parsed provider lists.
function buildShared(sources) {
  const byKey = new Map();
  for (const src of ['library', 'opencode', 'pi', 'zcode']) {
    for (const p of sources[src] || []) {
      const key = urlKey(p.baseURL);
      if (!key) continue;
      let e = byKey.get(key);
      if (!e) {
        e = { key, name: p.name, baseURL: p.baseURL, api: p.api, apiKey: p.apiKey, headers: p.headers, models: [], in: {} };
        byKey.set(key, e);
      }
      e.in[src] = { id: p.id, models: p.models.map((m) => m.id) };
      e.apiKey = e.apiKey || p.apiKey;
      e.headers = e.headers || p.headers;
      // Merge models by ID: the first source to know a field wins.
      for (const m of p.models) {
        const have = e.models.find((x) => x.id === m.id);
        if (!have) e.models.push({ ...m });
        else for (const [k, v] of Object.entries(m)) if (have[k] === undefined) have[k] = v;
      }
    }
  }
  return [...byKey.values()]
    .map((e) => ({ ...e, keyKind: !e.apiKey ? 'none' : /^\{(env|file|cmd):/.test(e.apiKey) ? e.apiKey.slice(1, e.apiKey.indexOf(':')) : 'literal' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- neutral → harness ----------

function openCodeModel(m) {
  const out = { name: m.name || m.id };
  if (m.toolCall !== undefined) out.tool_call = m.toolCall;
  if (m.reasoning !== undefined) out.reasoning = m.reasoning;
  if (m.vision !== undefined || m.pdf) out.attachment = !!(m.vision || m.pdf);
  if (m.context || m.output) out.limit = { context: m.context || 128000, output: m.output || Math.min(8192, m.context || 8192) };
  if (m.cost?.input !== undefined && m.cost?.output !== undefined) out.cost = def({ input: m.cost.input, output: m.cost.output, cache_read: m.cost.cacheRead, cache_write: m.cost.cacheWrite });
  const extra = [m.vision && 'image', m.pdf && 'pdf', m.video && 'video'].filter(Boolean);
  if (extra.length) out.modalities = { input: ['text', ...extra], output: ['text'] };
  return out;
}

function piModel(m) {
  return def({
    id: m.id,
    name: m.name && m.name !== m.id ? m.name : undefined,
    reasoning: m.reasoning || undefined,
    input: m.vision ? ['text', 'image'] : undefined,
    contextWindow: m.context,
    maxTokens: m.output,
    cost: m.cost?.input !== undefined && m.cost?.output !== undefined ? { input: m.cost.input, output: m.cost.output, cacheRead: m.cost.cacheRead ?? 0, cacheWrite: m.cost.cacheWrite ?? 0 } : undefined,
  });
}

// Adds `entry` (a merged provider) to a harness config in place. Reuses the harness's
// existing provider for the same endpoint, adds only models it doesn't have yet, and
// never overwrites a key or headers the harness already has.
function applyTo(harness, doc, entry, modelIds) {
  const models = entry.models.filter((m) => !modelIds || modelIds.includes(m.id));
  const notes = [];
  const key = convertKey(entry.apiKey, harness);
  if (key.note) notes.push(key.note);
  let id;
  let added = 0;

  if (harness === 'opencode') {
    doc.provider = isObj(doc.provider) ? doc.provider : {};
    id = entry.in.opencode?.id || Object.keys(doc.provider).find((k) => urlKey(doc.provider[k]?.options?.baseURL) === entry.key);
    if (!id) {
      id = uniqueId(entry.name, (x) => !!doc.provider[x]);
      doc.provider[id] = { npm: TO_OPENCODE[entry.api], name: entry.name, options: def({ baseURL: entry.baseURL, apiKey: key.value, headers: entry.headers }), models: {} };
    }
    const p = doc.provider[id];
    p.options = p.options || {};
    if (!p.options.apiKey && key.value) p.options.apiKey = key.value;
    if (!p.options.headers && entry.headers) p.options.headers = entry.headers;
    p.models = p.models || {};
    for (const m of models) {
      if (p.models[m.id]) continue;
      p.models[m.id] = openCodeModel(m);
      added++;
    }
  } else if (harness === 'zcode') {
    const c = doc.config;
    c.providerConfigRules = isObj(c.providerConfigRules) ? c.providerConfigRules : {};
    c.providerConfigRules.providerRules = c.providerConfigRules.providerRules || [];
    c.modelConfigRules = isObj(c.modelConfigRules) ? c.modelConfigRules : {};
    for (const k of ['providerModelRules', 'manualProviderModelRules']) c.modelConfigRules[k] = c.modelConfigRules[k] || [];
    const rules = c.providerConfigRules.providerRules;
    let r = rules.find((x) => x.providerId === entry.in.zcode?.id) || rules.find((x) => !x.templateId && urlKey(x.config?.api?.baseUrl) === entry.key);
    if (!r) {
      id = uniqueId(entry.name, (x) => rules.some((y) => y.providerId === x) || ZCODE_RESERVED.includes(x));
      r = { providerId: id, providerName: entry.name, config: { group: 'standard-personal', access: { type: 'api-key', apiKey: key.value || null }, api: def({ type: TO_ZCODE[entry.api], baseUrl: entry.baseURL, headers: entry.headers }), personalModelIds: [], modelOrder: [] } };
      rules.push(r);
      c.providerOrder = [...(c.providerOrder || []).filter((x) => x !== id), id];
    }
    id = r.providerId;
    if (!r.config.access?.apiKey && key.value) r.config.access = { type: 'api-key', apiKey: key.value };
    const manual = c.modelConfigRules.manualProviderModelRules;
    const apiType = r.config.api?.type || 'openai-chat-completions';
    for (const m of models) {
      if (manual.some((x) => x.providerId === id && x.modelId === m.id)) continue;
      const ctx = m.context || 128000;
      manual.push(zcodeModelRule(id, m.id, apiType, { contextWindow: ctx, max: m.output || Math.min(32000, ctx), reasoning: !!m.reasoning, image: !!m.vision, pdf: !!m.pdf, video: !!m.video }));
      for (const list of ['personalModelIds', 'modelOrder']) r.config[list] = [...(r.config[list] || []).filter((x) => x !== m.id), m.id];
      added++;
    }
  } else if (harness === 'pi') {
    doc.providers = isObj(doc.providers) ? doc.providers : {};
    id = entry.in.pi?.id || Object.keys(doc.providers).find((k) => urlKey(doc.providers[k]?.baseUrl) === entry.key);
    if (!id) {
      id = uniqueId(entry.name, (x) => !!doc.providers[x] || PI_BUILTIN.includes(x));
      // Pi hides models of a provider without a key, so keyless endpoints get a placeholder.
      if (!key.value) notes.push('Pi needs some API key to show these models; a placeholder "none" was set');
      doc.providers[id] = def({ name: entry.name, baseUrl: entry.baseURL, api: TO_PI[entry.api], apiKey: key.value || 'none', headers: entry.headers, models: [] });
    }
    const p = doc.providers[id];
    if (!p.apiKey) p.apiKey = key.value || 'none';
    p.models = Array.isArray(p.models) ? p.models : [];
    for (const m of models) {
      if (p.models.some((x) => x.id === m.id)) continue;
      p.models.push(piModel(m));
      added++;
    }
  } else {
    throw new Error(`Unknown harness "${harness}"`);
  }
  return { id, added, notes };
}

module.exports = { HARNESSES, libraryPath, readLibrary, writeLibrary, urlKey, fromOpenCode, fromZcode, fromPi, buildShared, applyTo, convertKey, keyFromPi };
