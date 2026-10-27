'use strict';

// ---------- tiny helpers ----------

const TOKEN = (() => {
  const t = new URLSearchParams(location.search).get('t');
  try {
    if (t) sessionStorage.setItem('switchyard-token', t);
    return t || sessionStorage.getItem('switchyard-token');
  } catch {
    return t;
  }
})();

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (['value', 'checked', 'selected', 'disabled', 'indeterminate', 'open'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

// 16px outline icons, 1.5px stroke, drawn in currentColor.
const ICONS = {
  server: '<rect x="2.5" y="3" width="11" height="4" rx="1"/><rect x="2.5" y="9" width="11" height="4" rx="1"/><path d="M5 5h.01M5 11h.01"/>',
  star: '<path d="M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4l-3.6 1.9.7-4L2.2 6.5l4-.6z"/>',
  sliders: '<path d="M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.5" cy="11.5" r="1.5"/>',
  braces: '<path d="M6 2.5c-1.5 0-2 .7-2 2v1.5c0 1-.5 2-1.5 2 1 0 1.5 1 1.5 2v1.5c0 1.3.5 2 2 2M10 2.5c1.5 0 2 .7 2 2v1.5c0 1 .5 2 1.5 2-1 0-1.5 1-1.5 2v1.5c0 1.3-.5 2-2 2"/>',
  doc: '<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3M6 8.5h4M6 11h4"/>',
  file: '<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/>',
  refresh: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/>',
  edit: '<path d="M10.5 2.8l2.7 2.7L6 12.7H3.3V10z"/>',
  play: '<path d="M5 3.5v9l7-4.5z"/>',
  eye: '<path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8z"/><circle cx="8" cy="8" r="2"/>',
  x: '<path d="M4 4l8 8M12 4l-8 8"/>',
  download: '<path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10"/>',
  check: '<path d="M3 8.5l3 3 7-7"/>',
  chevrons: '<path d="M5 6l3-3 3 3M5 10l3 3 3-3"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
  bolt: '<path d="M9 1.8L3.5 9h4l-1 5.2L12.5 7h-4z"/>',
  layers: '<path d="M8 2l6 3.2-6 3.2-6-3.2z"/><path d="M2 8.3l6 3.2 6-3.2M2 11.2l6 3.2 6-3.2"/>',
  info: '<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.8M8 5h.01"/>',
  alert: '<path d="M8 2.2l6.3 11H1.7z"/><path d="M8 6.5v3M8 11.4h.01"/>',
  link: '<path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.7.7M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.7-.7"/>',
  key: '<circle cx="5.5" cy="10.5" r="3"/><path d="M7.6 8.4L13.5 2.5M11.5 4.5l1.5 1.5M10 6l1.2 1.2"/>',
  globe: '<circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.8 2 2.6 4 2.6 6.2S9.8 12.2 8 14.2C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 1.8z"/>',
  folder: '<path d="M2 4.5c0-.6.4-1 1-1h3.2l1.5 1.6H13c.6 0 1 .4 1 1v6.4c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1z"/>',
  bot: '<rect x="3" y="5" width="10" height="8" rx="2"/><path d="M8 2.5V5M6 9h.01M10 9h.01M1.5 9v2M14.5 9v2"/>',
  terminal: '<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7l2 1.5L5 10M8.5 10.5H11"/>',
  eyeoff: '<path d="M2 2l12 12M6.6 6.7a2 2 0 0 0 2.7 2.7M4.2 4.4C2.8 5.5 1.8 8 1.8 8s2.2 4.2 6.2 4.2c1.3 0 2.4-.4 3.3-1M7 3.9c.3 0 .7-.1 1-.1 4 0 6.2 4.2 6.2 4.2s-.5 1-1.4 2"/>',
};
// Stable hue per provider so its avatar keeps one colour everywhere.
const HUES = ['blue', 'green', 'violet', 'amber', 'cyan', 'rose', 'orange', 'teal'];
function hueFor(id) {
  let n = 0;
  for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[n % HUES.length];
}
function initials(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/);
  return ((words[0]?.[0] || '?') + (words[1]?.[0] || words[0]?.[1] || '')).toUpperCase();
}
function avatar(id, name, cls = '') {
  return h('span', { class: `avatar ${cls}`, style: `--h: var(--${hueFor(id)})`, 'aria-hidden': 'true' }, initials(name || id));
}
function icon(name) {
  const s = document.createElement('span');
  s.className = 'ico';
  s.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return s;
}
document.querySelectorAll('[data-icon]').forEach((el) => el.replaceWith(icon(el.dataset.icon)));

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Token': TOKEN || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.attempts = data.attempts;
    err.confirm = data.confirm;
    throw err;
  }
  return data;
}

function toast(msg, type = '') {
  const el = h('div', { class: `toast ${type}` }, icon(type === 'error' ? 'alert' : 'check'), h('span', null, msg));
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
}

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const fmtNum = (n) => (n === undefined || n === null ? '' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));
const fmtCost = (c) => (c ? `$${c.input} / $${c.output}` : '');
// Table cells: a quiet dash for missing values, units as a smaller grey suffix.
const dash = () => h('span', { class: 'dash' }, '—');
// Context windows run from ~4k to ~2M, so the bar is on a log scale.
const ctxPct = (n) => Math.max(4, Math.min(100, ((Math.log(n) - Math.log(4096)) / (Math.log(2e6) - Math.log(4096))) * 100));
const tokCell = (n, guessed, bar) =>
  n === undefined || n === null
    ? dash()
    : h(
        'span',
        { class: 'ctx', title: `${Number(n).toLocaleString()} tokens` },
        h('span', null, fmtNum(n), guessed ? h('span', { class: 'unit', title: 'Default guess, check it' }, '?') : null),
        bar ? h('span', { class: 'ctx-bar' }, h('i', { style: `width:${ctxPct(n)}%` })) : null
      );
// Context on top with its bar, max output underneath.
const limitsCell = (l, src = {}) =>
  !l || (l.context === undefined && l.output === undefined)
    ? dash()
    : h(
        'span',
        { class: 'ctx', title: `Context ${l.context?.toLocaleString() ?? '?'} tokens, max output ${l.output?.toLocaleString() ?? '?'} tokens` },
        h('span', { class: 'ctx-main' }, l.context !== undefined ? fmtNum(l.context) : '—', src.context === 'default' ? h('span', { class: 'unit' }, '?') : null),
        l.context !== undefined ? h('span', { class: 'ctx-bar' }, h('i', { style: `width:${ctxPct(l.context)}%` })) : null,
        h('span', { class: 'ctx-sub' }, l.output !== undefined ? `${fmtNum(l.output)} out` : 'output ?', src.output === 'default' ? '?' : '')
      );
const costCell = (c) =>
  c && c.input !== undefined
    ? c.input === 0 && !c.output
      ? h('span', { class: 'tag green round' }, 'Free')
      : h('span', { class: 'price' }, `$${c.input}`, h('span', { class: 'sep' }, '/'), `$${c.output ?? '?'}`)
    : dash();

function getIn(obj, path) {
  let cur = obj;
  for (const k of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[k];
  }
  return cur;
}
function setIn(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObj(cur[path[i]]) && !Array.isArray(cur[path[i]])) cur[path[i]] = {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}
function delIn(obj, path) {
  const parents = [];
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObj(cur)) return;
    parents.push([cur, path[i]]);
    cur = cur[path[i]];
  }
  if (isObj(cur)) delete cur[path[path.length - 1]];
  // prune now-empty parent objects (but never the root)
  for (let i = parents.length - 1; i >= 0; i--) {
    const [p, k] = parents[i];
    if (isObj(p[k]) && !Object.keys(p[k]).length) delete p[k];
    else break;
  }
}
// Rename a key while keeping object order.
function renameKey(obj, from, to) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k === from ? to : k] = v;
  return out;
}

// ---------- app state ----------

const S = {
  file: null, // server state for the current file
  cfg: null,
  savedText: '',
  schema: null,
  schemaSource: '',
  view: 'shared',
  selected: null, // provider id
  editingModel: null,
  discovery: null,
  settingsFilter: '',
  settingsOnlySet: false,
  open: new Set(),
  tests: {},
  ptab: 'models', // provider detail tab
  mfilter: '',
  files: null, // { globalDir, projectDir, groups }
  doc: null, // { path, content, saved, exists }
  zc: null, // Z-Code: { path, exists, doc, error, running, apiTypes, reserved, reasoningMaps, saved }
  zsel: null, // Z-Code provider id
  ztab: 'models',
  zedit: null, // Z-Code model id being edited
  shared: null, // { providers, harnesses, library } from /api/shared
  sopen: null, // expanded shared provider key
  ssel: {}, // shared provider key → Set of selected model ids
  copying: null, // "key>harness" while a copy runs
  pi: null, // Pi: { path, exists, doc, error, reserved, saved }
  psel: null,
  pptab: 'models',
  pedit: null,
};

const isDirty = () => S.cfg && JSON.stringify(S.cfg) !== S.savedText;

function markDirty() {
  const d = isDirty();
  document.getElementById('savebar').hidden = !d;
  document.getElementById('save').disabled = !d;
  if (S.file) document.getElementById('dirty-text').textContent = `in ${S.file.path.split(/[\\/]/).pop()}, not written to disk yet`;
  const n = S.cfg ? Object.keys(providers()).length : 0;
  document.getElementById('count-providers').textContent = n || '';
  renderBanner();
}

function providers() {
  return isObj(S.cfg.provider) ? S.cfg.provider : {};
}

// ---------- load / save ----------

function applyState(st) {
  S.file = st;
  S.cfg = st.config ? clone(st.config) : null;
  S.savedText = S.cfg ? JSON.stringify(S.cfg) : '';
  if (S.selected && !providers()[S.selected]) S.selected = null;
  renderFileSelect();
  markDirty();
  render();
}

async function load() {
  if (S.files) loadFiles();
  loadZc();
  loadPi();
  loadShared();
  try {
    applyState(await api('GET', '/api/state'));
  } catch (e) {
    document.getElementById('main').replaceChildren(h('div', { class: 'error-box' }, e.message));
  }
  api('GET', '/api/schema')
    .then((r) => {
      S.schema = r.schema;
      S.schemaSource = r.source;
      document
        .getElementById('side-foot')
        .replaceChildren(
          h('span', { class: 'status-dot ' + (!r.schema ? 'bad' : r.source === 'live' ? 'ok' : 'warn') }),
          h('span', { title: r.schema ? (r.source === 'live' ? 'Fetched from opencode.ai/config.json' : 'opencode.ai unreachable, using the bundled copy') : '' }, r.schema ? `Schema ${r.source === 'live' ? 'live' : 'bundled (offline)'}` : 'Schema unavailable')
        );
      if (S.view === 'settings') render();
    })
    .catch(() => {});
}

async function save() {
  const warnings = validate();
  if (warnings.length && !confirm(`Some entries look incomplete:\n\n• ${warnings.join('\n• ')}\n\nSave anyway?`)) return;
  if (S.file.hasComments && !confirm('This file contains comments. Saving rewrites it as plain JSON, so the comments will be removed (a .bak backup is kept). Continue?')) return;
  try {
    const r = await api('POST', '/api/save', { config: S.cfg });
    applyState(r);
    toast(r.backup ? `Saved. Backup: ${r.backup}` : 'Saved.');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function validate() {
  const out = [];
  for (const [pid, p] of Object.entries(providers())) {
    if (!isObj(p)) continue;
    if (p.npm === '@ai-sdk/openai-compatible' && !p.options?.baseURL) out.push(`provider "${pid}" has no baseURL`);
    for (const [mid, m] of Object.entries(p.models || {})) {
      if (m?.limit && (m.limit.context === undefined || m.limit.output === undefined)) out.push(`${pid}/${mid}: limit needs both context and output`);
      if (m?.cost && (m.cost.input === undefined || m.cost.output === undefined)) out.push(`${pid}/${mid}: cost needs both input and output`);
    }
  }
  return out;
}

// ---------- chrome ----------

function renderFileSelect() {
  const sel = document.getElementById('file-select');
  sel.replaceChildren(
    ...S.file.candidates.map((c) => h('option', { value: c.path, selected: c.path === S.file.path }, `${c.scope}${c.exists ? '' : ' (new)'} · ${c.path}`)),
    h('option', { value: '__custom' }, 'Open another file…')
  );
  const badge = document.getElementById('file-badge');
  badge.textContent = S.file.exists ? (S.file.path.endsWith('.jsonc') ? 'JSONC' : 'JSON') : 'New file';
  badge.className = 'tag ' + (S.file.exists ? 'plain' : 'amber');
  const scope = S.file.candidates.find((c) => c.path === S.file.path)?.scope || 'custom';
  const scopeEl = document.getElementById('file-scope');
  scopeEl.textContent = scope[0].toUpperCase() + scope.slice(1);
  scopeEl.className = 'tag ' + ({ global: 'violet', project: 'green', env: 'cyan' }[scope] || 'blue');
  const parts = S.file.path.split(/[\\/]/);
  document.getElementById('file-name').textContent = parts.pop();
  document.getElementById('file-dir').textContent = parts.join(S.file.path.includes('\\') ? '\\' : '/');
}

function renderBanner() {
  const b = document.getElementById('banner');
  const notes = [];
  if (S.file?.error) notes.push(h('div', { class: 'note danger' }, icon('alert'), h('span', null, `Could not parse this file: ${S.file.error}. Fix it in a text editor or choose another file.`)));
  else if (S.file?.hasComments && isDirty()) notes.push(h('div', { class: 'note warn' }, icon('info'), h('span', null, 'This file contains comments. Saving rewrites it as plain JSON, so the comments will be lost (a .bak backup is made).')));
  b.replaceChildren(...notes);
}

function go(view) {
  if (location.hash.slice(1) !== view) location.hash = view;
  S.view = view;
  enterView(view);
  render();
}

// Which harness each page belongs to; the shared page belongs to none.
const VIEW_HARNESS = { providers: 'opencode', defaults: 'opencode', settings: 'opencode', files: 'opencode', raw: 'opencode', zcode: 'zcode', pi: 'pi' };
const HARNESS_HOME = { opencode: 'providers', zcode: 'zcode', pi: 'pi' };

function renderChrome() {
  if (VIEW_HARNESS[S.view]) S.harness = VIEW_HARNESS[S.view];
  document.querySelectorAll('.nav').forEach((n) => n.classList.toggle('active', n.dataset.view === S.view));
  document.querySelectorAll('#harness-switch button').forEach((b) => {
    const on = b.dataset.harness === S.harness;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-harness-group]').forEach((g) => (g.hidden = g.dataset.harnessGroup !== S.harness));
}

function render() {
  renderChrome();
  const main = document.getElementById('main');
  if (S.discovery && S.discovery.target !== { providers: 'opencode', zcode: 'zcode', pi: 'pi', shared: 'library' }[S.view]) S.discovery = null;
  if (!S.cfg && VIEW_HARNESS[S.view] === 'opencode' && S.view !== 'files') {
    main.replaceChildren(h('div', { class: 'empty' }, S.file?.error ? 'This file could not be parsed.' : 'Loading…'));
    return;
  }
  const scroller = document.getElementById('sheet');
  const scroll = scroller.scrollTop;
  const view = { providers: viewProviders, defaults: viewDefaults, settings: viewSettings, files: viewFiles, zcode: viewZcode, pi: viewPi, shared: viewShared, raw: viewRaw }[S.view]();
  if (S.lastView !== S.view) view.classList.add('fade-in');
  main.replaceChildren(view);
  scroller.scrollTop = S.lastView === S.view ? scroll : 0;
  S.lastView = S.view;
}

// ---------- providers view ----------

const NPM_OPTIONS = ['@ai-sdk/openai-compatible', '@ai-sdk/openai', '@ai-sdk/anthropic', '@openrouter/ai-sdk-provider', '@ai-sdk/google', '@ai-sdk/azure', '@ai-sdk/mistral', '@ai-sdk/groq', '@ai-sdk/deepinfra', '@ai-sdk/xai', '@ai-sdk/amazon-bedrock'];

function viewProviders() {
  const ps = providers();
  const ids = Object.keys(ps);
  const totalModels = ids.reduce((n, id) => n + Object.keys(ps[id]?.models || {}).length, 0);
  // With nothing selected, open the first provider so the detail pane is never empty.
  if (!S.discovery && (!S.selected || !ps[S.selected]) && ids.length) S.selected = ids[0];
  const adding = !!(S.discovery && !S.discovery.pid);

  const list = h(
    'div',
    { class: 'card plist' },
    h('div', { class: 'plist-head' }, h('h2', null, 'Your providers'), h('span', { class: 'count' }, ids.length)),
    ids.length ? null : h('div', { class: 'empty-inline' }, 'Nothing here yet.'),
    ids.map((id) => {
      const p = ps[id] || {};
      const n = Object.keys(p.models || {}).length;
      return h(
        'button',
        { class: 'pitem' + (S.selected === id && !S.discovery ? ' active' : ''), onclick: () => { S.selected = id; S.discovery = null; S.editingModel = null; S.mfilter = ''; render(); } },
        avatar(id, p.name || id),
        h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, p.name || id), h('span', { class: 'purl' }, (p.options?.baseURL || p.npm || id).replace(/^https?:\/\//, ''))),
        h('span', { class: 'pn', title: `${n} model${n === 1 ? '' : 's'}` }, n)
      );
    }),
    adding ? h('button', { class: 'pitem active' }, h('span', { class: 'avatar', style: '--h: var(--accent)' }, icon('plus')), h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, 'New provider'), h('span', { class: 'purl' }, S.discovery.baseURL.replace(/^https?:\/\//, '') || 'Connect an endpoint'))) : null,
    h('div', { class: 'plist-add' }, h('button', { class: 'btn ghost sm', onclick: addEmptyProvider, title: 'Create a provider and fill in its details by hand' }, icon('plus'), 'Blank provider'))
  );

  let right;
  if (S.discovery) right = viewDiscovery();
  else if (S.selected && ps[S.selected]) right = viewProviderEditor(S.selected);
  else
    right = h(
      'div',
      { class: 'card empty' },
      h('span', { class: 'icon-chip' }, icon('link')),
      h('h2', null, 'Connect your first model endpoint'),
      h('p', null, 'Paste any OpenAI-compatible base URL, such as OpenRouter, DeepInfra, Together, vLLM, LM Studio or Ollama. Its models are listed with context limits, pricing and capabilities.'),
      h('button', { class: 'btn primary', onclick: () => startDiscovery() }, icon('plus'), 'Add from endpoint')
    );

  const v2 = isObj(S.cfg.providers)
    ? h('div', { class: 'note info' }, icon('info'), h('span', null, 'This file also has a V2 ', h('code', null, 'providers'), ' block. Edit it under All settings.'))
    : null;
  const stat = (hue, ico, label, value, onclick) =>
    h(onclick ? 'button' : 'div', { class: 'stat' + (onclick ? '' : ' static'), onclick, title: onclick ? 'Change in Default models' : null }, h('span', { class: 'icon-chip', style: `--h: var(--${hue})` }, icon(ico)), h('span', { class: 'txt' }, h('span', { class: 'lbl' }, label), value));
  const refVal = (v) => (typeof v === 'string' && v ? h('span', { class: 'val', title: v }, v) : h('span', { class: 'val unset' }, 'Not set'));
  const goDefaults = () => go('defaults');

  return h(
    'div',
    null,
    h(
      'div',
      { class: 'page-head' },
      h('div', null, h('h1', null, 'OpenCode providers'), h('div', { class: 'sub' }, 'Connect OpenAI-compatible endpoints and choose which of their models OpenCode can use.')),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => startDiscovery(), disabled: adding }, icon('plus'), 'Add from endpoint'))
    ),
    h(
      'div',
      { class: 'stats' },
      stat('blue', 'star', 'Default model', refVal(S.cfg.model), goDefaults),
      stat('amber', 'bolt', 'Small model', refVal(S.cfg.small_model), goDefaults),
      stat('green', 'layers', 'Catalog', h('span', { class: 'val big' }, totalModels, h('span', null, `model${totalModels === 1 ? '' : 's'} · ${ids.length} provider${ids.length === 1 ? '' : 's'}`)))
    ),
    v2,
    h('div', { class: 'split' }, list, right)
  );
}

function addEmptyProvider() {
  let id = prompt('Provider ID (lowercase, used as prefix like myprovider/model-name):', 'custom');
  if (!id) return;
  id = id.trim();
  if (providers()[id]) return toast('A provider with this ID already exists', 'error');
  setIn(S.cfg, ['provider', id], { npm: '@ai-sdk/openai-compatible', name: id, options: { baseURL: '' }, models: {} });
  S.selected = id;
  S.discovery = null;
  S.ptab = 'connection';
  markDirty();
  render();
}

function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
}

function textInput(value, onchange, attrs = {}) {
  return h('input', { type: 'text', value: value ?? '', onchange: (e) => onchange(e.target.value), ...attrs });
}

function numInput(value, onchange, attrs = {}) {
  return h('input', {
    type: 'number',
    value: value ?? '',
    onchange: (e) => onchange(e.target.value === '' ? undefined : Number(e.target.value)),
    ...attrs,
  });
}

function triSelect(value, onchange) {
  return h(
    'select',
    { onchange: (e) => onchange(e.target.value === '' ? undefined : e.target.value === 'true') },
    h('option', { value: '', selected: value === undefined }, '(unset)'),
    h('option', { value: 'true', selected: value === true }, 'yes'),
    h('option', { value: 'false', selected: value === false }, 'no')
  );
}

// Unset / Yes / No as a segmented control.
function triSeg(value, onchange) {
  const opt = (v, label, cls) => h('button', { type: 'button', class: cls + (value === v ? ' on' : ''), 'aria-pressed': String(value === v), onclick: () => onchange(v) }, label);
  return h('div', { class: 'seg sm' }, opt(undefined, 'Auto', ''), opt(true, 'Yes', 'yes'), opt(false, 'No', 'no'));
}

function setOrDel(obj, path, v) {
  if (v === undefined || v === '') delIn(obj, path);
  else setIn(obj, path, v);
  markDirty();
}

function viewProviderEditor(pid) {
  const p = providers()[pid];
  const pp = ['provider', pid];
  const set = (path, v) => setOrDel(S.cfg, [...pp, ...path], v);
  const models = p.models || {};
  const nModels = Object.keys(models).length;

  const rename = () => {
    const to = prompt('New provider ID:', pid)?.trim();
    if (!to || to === pid) return;
    if (providers()[to]) return toast('That ID is taken', 'error');
    S.cfg.provider = renameKey(S.cfg.provider, pid, to);
    if (typeof S.cfg.model === 'string' && S.cfg.model.startsWith(pid + '/')) S.cfg.model = to + S.cfg.model.slice(pid.length);
    if (typeof S.cfg.small_model === 'string' && S.cfg.small_model.startsWith(pid + '/')) S.cfg.small_model = to + S.cfg.small_model.slice(pid.length);
    S.selected = to;
    markDirty();
    render();
  };
  const remove = () => {
    if (!confirm(`Delete provider "${pid}" and its ${nModels} models from the config?`)) return;
    delete S.cfg.provider[pid];
    S.selected = null;
    markDirty();
    render();
  };
  const addById = () => {
    const id = prompt('Model ID exactly as the endpoint expects it:')?.trim();
    if (!id) return;
    setIn(S.cfg, [...pp, 'models', id], { name: id });
    S.editingModel = id;
    S.ptab = 'models';
    markDirty();
    render();
  };

  const knownTop = new Set(['npm', 'name', 'options', 'models']);
  const extraKeys = Object.keys(p).some((k) => !knownTop.has(k));
  const tab = (id, label, count) =>
    h('button', { class: 'tab' + (S.ptab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(S.ptab === id), onclick: () => { S.ptab = id; render(); } }, label, count !== undefined ? h('span', { class: 'tcount' }, count) : null);

  const hero = h(
    'div',
    { class: 'phero' },
    h(
      'div',
      { class: 'phero-top' },
      avatar(pid, p.name || pid, 'lg'),
      h(
        'div',
        { class: 'phero-title' },
        h('h2', null, p.name || pid, h('span', { class: 'tag mono plain' }, pid)),
        h(
          'div',
          { class: 'phero-meta' },
          p.options?.baseURL ? h('span', { class: 'url', title: p.options.baseURL }, p.options.baseURL) : h('span', { class: 'tag amber' }, 'No base URL'),
          p.npm ? h('span', { class: 'tag blue mono' }, p.npm) : null,
          p.options?.apiKey ? h('span', { class: 'tag green' }, icon('key'), /^\{env:/.test(p.options.apiKey) ? 'env key' : 'key set') : null
        )
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => startDiscovery(pid), disabled: !p.options?.baseURL, title: p.options?.baseURL ? 'List the models this endpoint serves' : 'Set a base URL first' }, icon('download'), 'Fetch models'),
        h('button', { class: 'btn sm icon ghost', onclick: rename, title: 'Rename provider ID', 'aria-label': 'Rename provider ID' }, icon('edit')),
        h('button', { class: 'btn sm icon ghost danger', onclick: remove, title: 'Delete provider', 'aria-label': 'Delete provider' }, icon('trash'))
      )
    ),
    h('div', { class: 'tabs', role: 'tablist' }, tab('models', 'Models', nModels), tab('connection', 'Connection'), tab('json', 'JSON', extraKeys ? '+' : undefined))
  );

  let panel;
  if (S.ptab === 'connection') {
    const headers = p.options?.headers || {};
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h(
        'div',
        { class: 'grid two' },
        field('Base URL', textInput(p.options?.baseURL, (v) => { set(['options', 'baseURL'], v.trim()); render(); }, { placeholder: 'https://api.together.xyz/v1', class: 'mono-input' }), 'The OpenAI-compatible root, usually ending in /v1'),
        field('API key', apiKeyInput(p.options?.apiKey, (v) => { set(['options', 'apiKey'], v); render(); }), 'Paste a key, or reference one: {env:VAR_NAME} or {file:~/path}'),
        field('Display name', textInput(p.name, (v) => { set(['name'], v); render(); }), 'Shown in the OpenCode model picker'),
        field('npm package', textInput(p.npm, (v) => { set(['npm'], v); render(); }, { list: 'npm-list', class: 'mono-input' }), '@ai-sdk/openai-compatible fits most custom endpoints')
      ),
      h('datalist', { id: 'npm-list' }, NPM_OPTIONS.map((o) => h('option', { value: o }))),
      h('div', { class: 'ep-title', style: 'margin-top:28px' }, 'Custom headers', h('span', { class: 'count', style: 'font-size:13px' }, Object.keys(headers).length || '')),
      Object.entries(headers).map(([k, v]) =>
        h(
          'div',
          { class: 'kv' },
          textInput(k, (nk) => { set(['options', 'headers'], renameKey(headers, k, nk.trim())); render(); }, { class: 'mono-input', 'aria-label': 'Header name' }),
          textInput(v, (nv) => set(['options', 'headers', k], nv), { 'aria-label': `${k} value` }),
          h('button', { class: 'btn icon ghost danger', title: `Remove ${k}`, 'aria-label': `Remove ${k}`, onclick: () => { set(['options', 'headers', k], undefined); render(); } }, icon('x'))
        )
      ),
      h('button', { class: 'btn sm soft', onclick: () => { set(['options', 'headers', 'X-Header-' + (Object.keys(headers).length + 1)], ''); render(); } }, icon('plus'), 'Add header')
    );
  } else if (S.ptab === 'json') {
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h('div', { class: 'note info', style: 'margin-bottom:16px' }, icon('info'), h('span', null, 'The raw provider object. Use it for options this form does not cover. Apply updates the page; Save writes the file.')),
      jsonEditor(p, (v) => {
        if (!isObj(v)) throw new Error('Provider must be an object');
        S.cfg.provider[pid] = v;
        markDirty();
        render();
      }, 18)
    );
  } else {
    const q = S.mfilter.trim().toLowerCase();
    const search = h('label', { class: 'search' }, icon('search'), h('input', { type: 'search', placeholder: 'Filter models', value: S.mfilter, 'aria-label': 'Filter models', id: 'model-filter', oninput: (e) => { S.mfilter = e.target.value; const pos = e.target.selectionStart; render(); const el = document.getElementById('model-filter'); el?.focus(); el?.setSelectionRange(pos, pos); } }));
    panel = h(
      'div',
      { class: 'tabpanel' },
      nModels
        ? [
            h('div', { class: 'toolbar' }, nModels > 5 || q ? search : h('span', { class: 'muted small' }, `${nModels} model${nModels === 1 ? '' : 's'} configured`), h('span', { class: 'spacer' }), h('button', { class: 'btn sm ghost', onclick: addById }, icon('plus'), 'Add by ID'), h('button', { class: 'btn sm soft', onclick: () => startDiscovery(pid), disabled: !p.options?.baseURL }, icon('download'), 'Fetch more')),
            modelsTable(pid, q),
          ]
        : h(
            'div',
            { class: 'empty' },
            h('span', { class: 'icon-chip', style: '--h: var(--violet)' }, icon('layers')),
            h('h2', null, 'No models yet'),
            h('p', null, p.options?.baseURL ? 'Fetch the list this endpoint serves and pick the ones you want, or add a model by its ID.' : 'Set a base URL on the Connection tab first, then fetch its models.'),
            h('div', { class: 'btn-row', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => (p.options?.baseURL ? startDiscovery(pid) : ((S.ptab = 'connection'), render())) }, icon(p.options?.baseURL ? 'download' : 'link'), p.options?.baseURL ? 'Fetch models' : 'Set base URL'), h('button', { class: 'btn', onclick: addById }, 'Add by ID'))
          )
    );
  }
  return h('div', { class: 'card flush' }, hero, panel);
}

function apiKeyInput(value, onchange) {
  const inp = h('input', { type: value && !/^\{(env|file):/.test(value) ? 'password' : 'text', value: value ?? '', class: 'mono-input', placeholder: '{env:MY_API_KEY}', onchange: (e) => onchange(e.target.value), autocomplete: 'off', spellcheck: 'false' });
  const toggle = h('button', { class: 'btn icon', type: 'button', title: 'Show or hide the key', 'aria-label': 'Show or hide the key', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; toggle.replaceChildren(icon(inp.type === 'password' ? 'eye' : 'eyeoff')); } }, icon('eye'));
  return h('div', { class: 'inline-input' }, inp, toggle);
}

const CAPS = [
  ['tool_call', 'Tools', 'teal', 'Tool calling, needed for agent work'],
  ['reasoning', 'Reasoning', 'violet', 'Reasoning / thinking'],
  ['attachment', 'Vision', 'rose', 'Image and file attachments'],
];
function flagsCell(m) {
  return h(
    'div',
    { class: 'caps' },
    CAPS.map(([k, label, hue, title]) => (m[k] === undefined ? null : h('span', { class: m[k] ? `tag ${hue}` : 'tag off', title: `${title}: ${m[k] ? 'yes' : 'no'}` }, label))),
    m.temperature === false ? h('span', { class: 'tag off', title: 'Temperature not supported' }, 'Temp') : null
  );
}

function modelRef(pid, mid) {
  return `${pid}/${mid}`;
}

function modelsTable(pid, q = '') {
  const p = providers()[pid];
  const models = p.models;
  const rows = [];
  const entries = Object.entries(models).filter(([mid, m]) => !q || mid.toLowerCase().includes(q) || (m?.name || '').toLowerCase().includes(q));
  for (const [mid, m] of entries) {
    const ref = modelRef(pid, mid);
    const isDefault = S.cfg.model === ref;
    const isSmall = S.cfg.small_model === ref;
    const test = S.tests[ref];
    const editing = S.editingModel === mid;
    rows.push(
      h(
        'tr',
        { class: editing ? 'editing' : '' },
        h(
          'td',
          null,
          h(
            'div',
            { class: 'mcell' },
            h('div', { class: 'mid', title: mid }, mid),
            h('div', { class: 'msub' }, m?.name && m.name !== mid ? m.name : null, isDefault ? h('span', { class: 'tag blue round' }, icon('star'), 'Default') : null, isSmall ? h('span', { class: 'tag amber round' }, icon('bolt'), 'Small') : null)
          )
        ),
        h('td', { class: 'num' }, limitsCell(m?.limit)),
        h('td', null, flagsCell(m || {})),
        h('td', { class: 'num' }, costCell(m?.cost)),
        h(
          'td',
          { class: 'actions' },
          h(
            'div',
            { class: 'row-actions' },
            h('button', { class: 'btn sm icon ghost', onclick: () => runTest(pid, mid), title: 'Send a tiny test request', 'aria-label': `Test ${mid}` }, test?.loading ? h('span', { class: 'spinner' }) : icon('play')),
            h('button', { class: 'btn sm icon ' + (editing ? 'soft' : 'ghost'), onclick: () => { S.editingModel = editing ? null : mid; render(); }, title: editing ? 'Close editor' : 'Edit model', 'aria-label': editing ? 'Close editor' : `Edit ${mid}` }, icon(editing ? 'x' : 'edit')),
            h('button', { class: 'btn sm icon ghost danger', onclick: () => { delete models[mid]; markDirty(); render(); }, title: `Remove ${mid}`, 'aria-label': `Remove ${mid}` }, icon('trash'))
          )
        )
      )
    );
    if (test && !test.loading) {
      rows.push(h('tr', { class: 'result-row' }, h('td', { colspan: 5 }, test.ok ? h('div', { class: 'ok-box' }, icon('check'), `Replied in ${test.ms} ms: "${test.reply}"`) : h('div', { class: 'error-box' }, icon('alert'), `Failed ${test.status || ''} ${test.error}`))));
    }
    if (editing) rows.push(h('tr', { class: 'model-edit' }, h('td', { colspan: 5 }, modelEditor(pid, mid))));
  }
  if (!entries.length) rows.push(h('tr', null, h('td', { colspan: 5, class: 'muted', style: 'text-align:center' }, 'No model matches this filter.')));
  return h(
    'div',
    { class: 'tablewrap' },
    h(
      'table',
      null,
      h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', { class: 'num', title: 'Context window and max output, in tokens' }, 'Limits'), h('th', null, 'Capabilities'), h('th', { class: 'num', title: 'US dollars per million tokens, input / output' }, 'Price per 1M'), h('th', null))),
      h('tbody', null, rows)
    )
  );
}

async function runTest(pid, mid) {
  const p = providers()[pid];
  const ref = modelRef(pid, mid);
  if (p.npm && !/openai/.test(p.npm)) toast('Test uses the OpenAI-style /chat/completions call; it may not work for this provider type.');
  S.tests[ref] = { loading: true };
  render();
  try {
    S.tests[ref] = await api('POST', '/api/test', { baseURL: p.options?.baseURL, apiKey: p.options?.apiKey, headers: p.options?.headers, model: mid });
  } catch (e) {
    S.tests[ref] = { ok: false, error: e.message };
  }
  render();
}

function modelEditor(pid, mid) {
  const mp = ['provider', pid, 'models', mid];
  const m = getIn(S.cfg, mp) || {};
  const set = (path, v) => setOrDel(S.cfg, [...mp, ...path], v);
  const setR = (path, v) => { set(path, v); render(); };
  const ref = modelRef(pid, mid);
  const renameModel = () => {
    const to = prompt('Model ID (must match what the endpoint expects):', mid)?.trim();
    if (!to || to === mid) return;
    const models = S.cfg.provider[pid].models;
    if (models[to]) return toast('That model ID already exists', 'error');
    S.cfg.provider[pid].models = renameKey(models, mid, to);
    if (S.cfg.model === ref) S.cfg.model = modelRef(pid, to);
    if (S.cfg.small_model === ref) S.cfg.small_model = modelRef(pid, to);
    S.editingModel = to;
    markDirty();
    render();
  };
  const capRow = (label, key) => h('div', { class: 'cap-row' }, h('span', { class: 'cl' }, label), triSeg(m[key], (v) => setR([key], v)));
  return h(
    'div',
    { class: 'editor-panel' },
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'General'),
      h(
        'div',
        { class: 'grid four' },
        field('Display name', textInput(m.name, (v) => setR(['name'], v))),
        field('Context window', numInput(m.limit?.context, (v) => setR(['limit', 'context'], v), { placeholder: 'tokens' })),
        field('Max output', numInput(m.limit?.output, (v) => setR(['limit', 'output'], v), { placeholder: 'tokens' }))
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'Capabilities'),
      h('div', { class: 'cap-grid' }, capRow('Tool calling', 'tool_call'), capRow('Reasoning', 'reasoning'), capRow('Images & files', 'attachment'), capRow('Temperature', 'temperature'))
    ),
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'Price per 1M tokens (USD)'),
      h(
        'div',
        { class: 'grid four' },
        field('Input', numInput(m.cost?.input, (v) => setR(['cost', 'input'], v), { step: 'any', placeholder: '0.00' })),
        field('Output', numInput(m.cost?.output, (v) => setR(['cost', 'output'], v), { step: 'any', placeholder: '0.00' })),
        field('Cache read', numInput(m.cost?.cache_read, (v) => setR(['cost', 'cache_read'], v), { step: 'any', placeholder: '0.00' })),
        field('Cache write', numInput(m.cost?.cache_write, (v) => setR(['cost', 'cache_write'], v), { step: 'any', placeholder: '0.00' })),
        field('Release date', textInput(m.release_date, (v) => setR(['release_date'], v), { placeholder: 'YYYY-MM-DD' }))
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn sm' + (S.cfg.model === ref ? ' soft' : ''), disabled: S.cfg.model === ref, onclick: () => { S.cfg.model = ref; markDirty(); render(); } }, icon(S.cfg.model === ref ? 'check' : 'star'), S.cfg.model === ref ? 'Default model' : 'Make default'),
        h('button', { class: 'btn sm' + (S.cfg.small_model === ref ? ' soft' : ''), disabled: S.cfg.small_model === ref, onclick: () => { S.cfg.small_model = ref; markDirty(); render(); } }, icon(S.cfg.small_model === ref ? 'check' : 'bolt'), S.cfg.small_model === ref ? 'Small model' : 'Make small model'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn sm ghost', onclick: renameModel }, icon('edit'), 'Rename ID')
      ),
      h(
        'details',
        { class: 'adv' },
        h('summary', null, 'Model JSON (options, headers, variants, modalities)'),
        h('div', { class: 'body' }, jsonEditor(m, (v) => { setIn(S.cfg, mp, v); markDirty(); render(); }, 10))
      )
    )
  );
}

function jsonEditor(value, onApply, rows = 8) {
  const ta = h('textarea', { rows, spellcheck: 'false' });
  ta.value = JSON.stringify(value ?? {}, null, 2);
  const err = h('div', { class: 'small', style: 'color:var(--danger);margin-top:4px' });
  ta.addEventListener('input', () => {
    try {
      JSON.parse(ta.value);
      ta.classList.remove('invalid');
      err.textContent = '';
    } catch (e) {
      ta.classList.add('invalid');
      err.textContent = e.message;
    }
  });
  return h(
    'div',
    null,
    ta,
    err,
    h('div', { class: 'btn-row', style: 'margin-top:8px' }, h('button', { class: 'btn sm', onclick: () => {
      try {
        onApply(JSON.parse(ta.value));
        toast('Applied (not saved to disk yet)');
      } catch (e) {
        toast(e.message, 'error');
      }
    } }, 'Apply JSON'))
  );
}

// ---------- discovery ----------

// Discovery fills a provider in one place, d.target: 'opencode', 'zcode', 'pi' or the shared 'library'.
// Returns { name, models: { id: … }, headers } for the provider being filled.
function discTarget(d) {
  if (!d.pid) return null;
  if (d.target === 'zcode') {
    const r = zcRule(d.pid);
    return r && { name: r.providerName || r.providerId, models: Object.fromEntries(zcModelRules(d.pid).map((m) => [m.modelId, m])), headers: r.config?.api?.headers };
  }
  if (d.target === 'pi') {
    const p = piProviders()[d.pid];
    return p && { name: p.name || d.pid, models: Object.fromEntries((p.models || []).map((m) => [m.id, m])), headers: p.headers };
  }
  if (d.target === 'library') {
    const p = S.shared?.providers.find((x) => x.key === d.pid);
    return p && { name: p.name, models: Object.fromEntries(p.models.map((m) => [m.id, m])), headers: p.headers };
  }
  const p = providers()[d.pid];
  return p && { name: p.name, models: p.models || {}, headers: p.options?.headers };
}
const discTaken = (d, id) => (d.target === 'zcode' ? zcTaken(id) : d.target === 'pi' ? piTaken(id) : d.target === 'library' ? false : !!providers()[id]);

// API formats each target can write, as [value, label].
const API_CHOICES = {
  zcode: [['openai-chat-completions', 'Chat completions'], ['anthropic-messages', 'Anthropic messages'], ['openai-responses', 'Responses']],
  pi: [['openai-completions', 'Chat completions'], ['anthropic-messages', 'Anthropic messages'], ['openai-responses', 'Responses'], ['google-generative-ai', 'Google Generative AI']],
  library: [['openai-chat', 'Chat completions'], ['anthropic', 'Anthropic messages'], ['openai-responses', 'Responses']],
};
function apiSelect(target, value, onchange) {
  return h('select', { onchange: (e) => onchange(e.target.value) }, API_CHOICES[target].map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
}

function startDiscovery(pid, target = 'opencode') {
  const p = pid && target === 'opencode' ? providers()[pid] : null;
  const z = pid && target === 'zcode' ? zcRule(pid)?.config : null;
  const pp = pid && target === 'pi' ? piProviders()[pid] : null;
  const sp = pid && target === 'library' ? S.shared?.providers.find((x) => x.key === pid) : null;
  S.discovery = {
    target,
    pid: pid || null,
    baseURL: p?.options?.baseURL || z?.api?.baseUrl || pp?.baseUrl || sp?.baseURL || '',
    // A {cmd:…} key can't be resolved here; the endpoint list is often public anyway.
    apiKey: p?.options?.apiKey || z?.access?.apiKey || piKeyRef(pp?.apiKey) || (sp?.apiKey?.startsWith('{cmd:') ? '' : sp?.apiKey) || '',
    apiType: API_CHOICES[target]?.[0][0],
    keyMode: 'literal',
    envName: '',
    newId: '',
    newName: '',
    newNpm: '@ai-sdk/openai-compatible',
    loading: false,
    error: null,
    result: null,
    selected: new Set(),
    filter: '',
    show: 'chat',
    overwrite: false,
  };
  S.editingModel = null;
  render();
  if (pid && S.discovery.baseURL) runDiscovery();
}

async function runDiscovery() {
  const d = S.discovery;
  d.loading = true;
  d.error = null;
  render();
  try {
    const r = await api('POST', '/api/discover', { baseURL: d.baseURL.trim(), apiKey: d.apiKey.trim(), headers: discTarget(d)?.headers || undefined });
    d.result = r;
    d.baseURL = r.baseURL;
    if (!d.pid) {
      let id = d.target === 'opencode' ? r.hint.id : zcSlug(r.hint.id);
      if (discTaken(d, id)) id = id + '-2';
      d.newId = d.newId || id;
      d.newName = d.newName || r.hint.name;
      d.newNpm = r.hint.npm || d.newNpm;
      d.envName = d.envName || r.hint.env?.[0] || '';
    }
    const existing = discTarget(d)?.models || {};
    d.selected = new Set(d.pid ? [] : r.models.filter((m) => m.recommended && r.models.length <= 15).map((m) => m.id));
    for (const id of Object.keys(existing)) d.selected.delete(id);
  } catch (e) {
    d.error = e.message + (e.attempts ? '\n\n' + e.attempts.map((a) => `${a.url} → ${a.status || 'failed'} ${a.error ? a.error.slice(0, 200) : ''}`).join('\n') : '');
  }
  d.loading = false;
  render();
}

function visibleModels() {
  const d = S.discovery;
  const q = d.filter.trim().toLowerCase();
  return d.result.models.filter((m) => {
    if (d.show === 'chat' && m.nonChat) return false;
    if (d.show === 'recommended' && !m.recommended) return false;
    if (d.show === 'free' && !m.free) return false;
    if (d.show === 'selected' && !d.selected.has(m.id)) return false;
    if (q && !(m.id.toLowerCase().includes(q) || (m.suggestion.name || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

const PRESETS = [
  ['openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1'],
  ['ollama', 'Ollama', 'http://localhost:11434/v1'],
  ['lmstudio', 'LM Studio', 'http://localhost:1234/v1'],
  ['huggingface', 'Hugging Face', 'https://router.huggingface.co/v1'],
  ['deepinfra', 'DeepInfra', 'https://api.deepinfra.com/v1/openai'],
];

function viewDiscovery() {
  const d = S.discovery;
  const target = discTarget(d);
  const cancel = () => { S.discovery = null; render(); };
  const form = h(
    'div',
    { class: 'card flush' },
    h(
      'div',
      { class: 'card-head' },
      d.pid ? avatar(d.pid, target?.name || d.pid) : h('span', { class: 'icon-chip' }, icon('link')),
      h('div', { style: 'flex:1;min-width:0' }, h('h2', null, d.pid ? `Fetch models for ${target?.name || d.pid}` : 'Connect an endpoint'), h('div', { class: 'sub' }, 'Lists the models it serves, with limits, pricing and capabilities from models.dev.')),
      h('button', { class: 'btn sm ghost', onclick: cancel }, icon('x'), 'Cancel')
    ),
    h(
      'div',
      { class: 'card-body' },
      h(
        'div',
        { class: 'connect' },
        field('Base URL', h('input', { type: 'url', class: 'mono-input', value: d.baseURL, placeholder: 'https://openrouter.ai/api/v1', oninput: (e) => (d.baseURL = e.target.value), onkeydown: (e) => e.key === 'Enter' && runDiscovery(), autofocus: !d.baseURL }), 'Any OpenAI-compatible URL. Full …/v1/models or …/chat/completions URLs work too.'),
        field('API key', h('input', { type: 'password', class: 'mono-input', value: d.apiKey, autocomplete: 'off', placeholder: 'Optional for public lists', oninput: (e) => (d.apiKey = e.target.value), onkeydown: (e) => e.key === 'Enter' && runDiscovery() }), 'Only ever sent to this endpoint.')
      ),
      h(
        'div',
        { class: 'presets' },
        h('button', { class: 'btn primary', onclick: runDiscovery, disabled: d.loading }, d.loading ? [h('span', { class: 'spinner' }), 'Fetching…'] : [icon('download'), 'Fetch models']),
        d.pid ? null : h('span', { class: 'muted small', style: 'margin:0 4px 0 10px' }, 'or try'),
        d.pid ? null : PRESETS.map(([id, label, url]) => h('button', { class: 'preset', title: url, onclick: () => { d.baseURL = url; runDiscovery(); } }, avatar(id, label), label))
      ),
      d.error ? h('div', { class: 'error-box', style: 'margin-top:18px' }, icon('alert'), h('span', null, d.error)) : null
    )
  );
  if (!d.result) return h('div', null, form);

  const r = d.result;
  const existing = target?.models || {};
  const providerCard = d.pid
    ? null
    : h(
        'div',
        { class: 'card flush' },
        h('div', { class: 'card-head' }, avatar(d.newId || r.hint.id, d.newName || r.hint.name), h('div', { style: 'flex:1' }, h('h2', null, { opencode: 'New OpenCode provider', zcode: 'New Z-Code provider', pi: 'New Pi provider', library: 'New shared provider' }[d.target]), h('div', { class: 'sub' }, `Detected ${r.hint.name} (${r.hint.source === 'guess' ? 'guessed from the URL' : 'from ' + r.hint.source})`, r.hint.doc ? [' · ', h('a', { href: r.hint.doc, target: '_blank', rel: 'noopener' }, 'Docs')] : null))),
        h(
          'div',
          { class: 'card-body' },
          h(
            'div',
            { class: 'grid four' },
            field('Provider ID', h('input', { type: 'text', class: 'mono-input', value: d.newId, oninput: (e) => (d.newId = e.target.value.trim()) }), 'Models become id/model-name'),
            field('Display name', h('input', { type: 'text', value: d.newName, oninput: (e) => (d.newName = e.target.value) })),
            d.target !== 'opencode'
              ? field('API format', apiSelect(d.target, d.apiType, (v) => (d.apiType = v)), 'Most custom endpoints use Chat completions')
              : field('npm package', h('input', { type: 'text', class: 'mono-input', value: d.newNpm, list: 'npm-list2', oninput: (e) => (d.newNpm = e.target.value.trim()) })),
            d.target === 'zcode' ? null : field(
              'Store the API key as',
              h(
                'select',
                { onchange: (e) => { d.keyMode = e.target.value; render(); } },
                h('option', { value: 'literal', selected: d.keyMode === 'literal' }, 'Plain value in config'),
                h('option', { value: 'env', selected: d.keyMode === 'env' }, 'Environment variable'),
                h('option', { value: 'none', selected: d.keyMode === 'none' }, "Don't store a key")
              )
            ),
            d.target !== 'zcode' && d.keyMode === 'env' ? field('Variable name', h('input', { type: 'text', class: 'mono-input', value: d.envName, oninput: (e) => (d.envName = e.target.value.trim()) }), `Saved as ${d.target === 'pi' ? '$' + (d.envName || 'NAME') : `{env:${d.envName || 'NAME'}}`}`) : null
          ),
          h('datalist', { id: 'npm-list2' }, NPM_OPTIONS.map((o) => h('option', { value: o })))
        )
      );

  const tbody = h('tbody');
  const countEl = h('span', { class: 'small', style: 'color:var(--text-2)' });
  const addBtn = h('button', { class: 'btn primary', onclick: addSelected });
  const drawRows = () => {
    const vis = visibleModels();
    const rowEls = [
      ...vis.slice(0, 600).map((m) => {
        const s = m.suggestion;
        const have = !!existing[m.id];
        const cb = h('input', { type: 'checkbox', checked: d.selected.has(m.id), 'aria-label': `Select ${m.id}`, onchange: (e) => { e.target.checked ? d.selected.add(m.id) : d.selected.delete(m.id); updateCount(); } });
        const srcTitle = Object.entries(m.sources).map(([k, v]) => `${k}: ${v}`).join('\n');
        const tr = h(
          'tr',
          { class: (m.nonChat ? 'disabled' : '') + (d.selected.has(m.id) ? ' picked' : ''), title: m.description || '' },
          h('td', { class: 'check-cell' }, cb),
          h(
            'td',
            null,
            h(
              'div',
              { class: 'mcell' },
              h('div', { class: 'mid' }, m.id, have ? h('span', { class: 'tag plain round' }, 'Added') : null, m.free ? h('span', { class: 'tag green round' }, 'Free') : null, m.nonChat ? h('span', { class: 'tag amber round' }, 'Not chat') : null),
              h('div', { class: 'msub', title: srcTitle }, s.name && s.name !== m.id ? s.name + ' · ' : '', m.match ? `models.dev ${m.match.provider}/${m.match.id}` : Object.values(m.sources).includes('endpoint') ? 'from the endpoint' : 'no metadata found')
            )
          ),
          h('td', { class: 'num' }, limitsCell(s.limit, m.sources)),
          h('td', null, flagsCell(s)),
          h('td', { class: 'num' }, costCell(s.cost))
        );
        // Whole row toggles the checkbox.
        tr.addEventListener('click', (e) => {
          if (e.target === cb || e.target.closest('a')) return;
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        });
        cb.addEventListener('change', () => tr.classList.toggle('picked', cb.checked));
        tr.style.cursor = 'pointer';
        return tr;
      }),
    ];
    if (vis.length > 600) rowEls.push(h('tr', null, h('td', { colspan: 6, class: 'muted', style: 'text-align:center' }, `${vis.length - 600} more. Use the filter to narrow down.`)));
    if (!vis.length) rowEls.push(h('tr', null, h('td', { colspan: 6, class: 'muted', style: 'text-align:center' }, 'No models match this filter.')));
    tbody.replaceChildren(...rowEls);
    updateCount();
  };
  const updateCount = () => {
    countEl.replaceChildren(h('b', null, d.selected.size), ' selected · ', `${visibleModels().length} of ${r.models.length} shown`);
    const n = `${d.selected.size} model${d.selected.size === 1 ? '' : 's'}`;
    addBtn.replaceChildren(icon(d.pid ? 'plus' : 'check'), d.pid ? `Add ${n}` : `Create provider with ${n}`);
    addBtn.disabled = !d.selected.size && !!d.pid;
  };
  const selectVisible = (pred) => {
    for (const m of visibleModels()) if (pred(m) && !existing[m.id]) d.selected.add(m.id);
    drawRows();
  };

  const seg = h(
    'div',
    { class: 'seg', role: 'group', 'aria-label': 'Show' },
    [['chat', 'Chat'], ['recommended', 'Recommended'], ['free', 'Free'], ['selected', 'Selected'], ['all', 'All']].map(([v, l]) =>
      h('button', { class: d.show === v ? 'on' : '', 'aria-pressed': String(d.show === v), onclick: (e) => { d.show = v; seg.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-pressed', String(b === e.currentTarget)); }); drawRows(); } }, l)
    )
  );
  const table = h(
    'div',
    { class: 'card flush' },
    h('div', { class: 'card-head' }, h('h2', null, 'Pick models'), h('span', { class: 'spacer' }), h('button', { class: 'btn xs ghost', onclick: () => selectVisible((m) => m.recommended), title: 'Chat models with tool calling' }, 'Select recommended'), h('button', { class: 'btn xs ghost', onclick: () => selectVisible(() => true) }, 'Select shown'), h('button', { class: 'btn xs ghost', onclick: () => { d.selected.clear(); drawRows(); } }, 'Clear')),
    h('div', { class: 'toolbar' }, h('label', { class: 'search' }, icon('search'), h('input', { type: 'search', placeholder: 'Filter by ID or name', value: d.filter, 'aria-label': 'Filter models', oninput: (e) => { d.filter = e.target.value; drawRows(); } })), seg),
    h(
      'div',
      { class: 'tablewrap tall' },
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', { class: 'check-cell' }), h('th', null, 'Model'), h('th', { class: 'num', title: 'Context window and max output, in tokens' }, 'Limits'), h('th', null, 'Capabilities'), h('th', { class: 'num', title: 'US dollars per million tokens, input / output' }, 'Price per 1M'))),
        tbody
      )
    ),
    h(
      'div',
      { class: 'card-foot' },
      countEl,
      h('span', { class: 'spacer' }),
      d.pid ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.overwrite, onchange: (e) => (d.overwrite = e.target.checked) }), 'Overwrite models already added') : null,
      addBtn
    )
  );
  drawRows();
  return h(
    'div',
    null,
    form,
    h('div', { class: 'found' }, icon('check'), h('span', null, h('b', null, `${r.models.length} models`), ' found at ', h('code', null, r.usedUrl), r.modelsDev ? ', enriched with models.dev.' : '. models.dev was unreachable.', ' A ? marks a guessed value.')),
    providerCard,
    table
  );
}

function addSelected() {
  const d = S.discovery;
  if (d.target === 'zcode') return zcAddSelected();
  if (d.target === 'pi') return piAddSelected();
  if (d.target === 'library') return libAddSelected();
  const r = d.result;
  let pid = d.pid;
  if (!pid) {
    pid = d.newId.trim();
    if (!pid || /[\/\s]/.test(pid)) return toast('Provider ID must be non-empty and contain no "/" or spaces', 'error');
    if (providers()[pid]) return toast(`Provider "${pid}" already exists. Pick another ID.`, 'error');
    const key = d.apiKey.trim();
    const options = { baseURL: d.baseURL };
    if (d.keyMode === 'literal' && key) options.apiKey = key;
    if (d.keyMode === 'env' && d.envName) options.apiKey = `{env:${d.envName}}`;
    setIn(S.cfg, ['provider', pid], { npm: d.newNpm || '@ai-sdk/openai-compatible', name: d.newName || pid, options, models: {} });
  }
  const models = getIn(S.cfg, ['provider', pid, 'models']) || {};
  let added = 0;
  for (const m of r.models) {
    if (!d.selected.has(m.id)) continue;
    if (models[m.id] && !d.overwrite) continue;
    models[m.id] = clone(m.suggestion);
    added++;
  }
  setIn(S.cfg, ['provider', pid, 'models'], models);
  S.discovery = null;
  S.selected = pid;
  S.ptab = 'models';
  markDirty();
  render();
  toast(`Added ${added} model${added === 1 ? '' : 's'} to ${pid}. Save to write the file.`);
}

// ---------- defaults view ----------

function viewDefaults() {
  const refs = [];
  for (const [pid, p] of Object.entries(providers())) for (const mid of Object.keys(p?.models || {})) refs.push([pid, mid, p.models[mid] || {}, p]);
  const dl = h('datalist', { id: 'model-refs' }, refs.map(([pid, mid]) => h('option', { value: modelRef(pid, mid) })));
  const modelVal = typeof S.cfg.model === 'string' ? S.cfg.model : S.cfg.model ? JSON.stringify(S.cfg.model) : '';
  const current = (v) => {
    if (!v) return h('div', { class: 'pick-current' }, 'Not set: OpenCode picks one for you.');
    const pid = v.split('/')[0];
    const p = providers()[pid];
    return h('div', { class: 'pick-current' }, p ? avatar(pid, p.name || pid, 'sm') : h('span', { class: 'avatar sm', style: '--h: var(--text-3)' }, icon('globe')), p ? `From ${p.name || pid}` : 'Built-in or not in this file');
  };
  const pickCard = (key, hue, ico, label, desc, value) =>
    h(
      'div',
      { class: 'card pick' },
      h('div', { class: 'pick-head' }, h('span', { class: 'icon-chip', style: `--h: var(--${hue})` }, icon(ico)), h('div', null, h('h2', null, label), h('div', { class: 'desc' }, desc))),
      h(
        'div',
        { class: 'inline-input' },
        textInput(value, (v) => { setOrDel(S.cfg, [key], v.trim() || undefined); render(); }, { list: 'model-refs', placeholder: 'provider/model', class: 'mono-input', 'aria-label': label }),
        h('button', { class: 'btn ghost', disabled: !value, onclick: () => { delIn(S.cfg, [key]); markDirty(); render(); } }, 'Clear')
      ),
      current(value)
    );
  const radio = (key, ref, label, cls) => {
    const on = S.cfg[key] === ref;
    return h(
      'label',
      { class: `radio-pill ${cls}` + (on ? ' on' : ''), title: on ? `Current ${label.toLowerCase()} model` : `Make this the ${label.toLowerCase()} model` },
      h('input', { type: 'radio', name: key, checked: on, 'aria-label': `${label} model: ${ref}`, onchange: () => { S.cfg[key] = ref; markDirty(); render(); } }),
      icon(on ? 'check' : key === 'model' ? 'star' : 'bolt'),
      label
    );
  };
  return h(
    'div',
    null,
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Default models'), h('div', { class: 'sub' }, 'Choose which models OpenCode reaches for first. Pick from your providers, or type any built-in model such as anthropic/claude-sonnet-4-5.'))),
    dl,
    h(
      'div',
      { class: 'pick-cards' },
      pickCard('model', 'blue', 'star', 'Default model', 'Used when no session or agent model is chosen.', modelVal),
      pickCard('small_model', 'amber', 'bolt', 'Small model', 'Used for light tasks such as session titles.', S.cfg.small_model)
    ),
    h(
      'div',
      { class: 'card flush' },
      h('div', { class: 'card-head' }, h('h2', null, 'Your custom models', h('span', { class: 'count' }, refs.length)), h('span', { class: 'sub', style: 'margin-left:auto' }, 'Click to assign')),
      refs.length
        ? h(
            'div',
            { class: 'tablewrap' },
            h(
              'table',
              null,
              h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', { class: 'num' }, 'Context'), h('th', null, 'Capabilities'), h('th', { class: 'radio-cell' }, 'Default'), h('th', { class: 'radio-cell' }, 'Small'))),
              h(
                'tbody',
                null,
                refs.map(([pid, mid, m, p]) => {
                  const ref = modelRef(pid, mid);
                  return h(
                    'tr',
                    null,
                    h('td', null, h('div', { style: 'display:flex;align-items:center;gap:12px' }, avatar(pid, p.name || pid, 'sm'), h('div', { class: 'mcell' }, h('div', { class: 'mid' }, mid), h('div', { class: 'msub' }, p.name || pid)))),
                    h('td', { class: 'num' }, tokCell(m.limit?.context, false, true)),
                    h('td', null, flagsCell(m)),
                    h('td', { class: 'radio-cell' }, radio('model', ref, 'Default', '')),
                    h('td', { class: 'radio-cell' }, radio('small_model', ref, 'Small', 'small'))
                  );
                })
              )
            )
          )
        : h('div', { class: 'empty' }, h('span', { class: 'icon-chip', style: '--h: var(--violet)' }, icon('layers')), h('h2', null, 'No custom models yet'), h('p', null, 'Add a provider and pick some of its models first.'), h('button', { class: 'btn primary', onclick: () => { go('providers'); startDiscovery(); } }, icon('plus'), 'Add from endpoint'))
    )
  );
}

// ---------- schema-driven settings ----------

function deref(s, depth = 0) {
  if (!s || typeof s !== 'object' || depth > 20) return s || {};
  let out = s;
  if (s.$ref && s.$ref.startsWith('#/$defs/')) {
    const target = S.schema?.$defs?.[s.$ref.slice(8)];
    const { $ref, ...rest } = s;
    out = { ...deref(target, depth + 1), ...rest };
  }
  if (Array.isArray(out.allOf)) {
    const { allOf, ...rest } = out;
    let merged = { ...rest };
    for (const part of allOf.map((p) => deref(p, depth + 1))) {
      merged = { ...part, ...merged, properties: { ...(part.properties || {}), ...(merged.properties || {}) } };
      if (part.additionalProperties !== undefined && merged.additionalProperties === undefined) merged.additionalProperties = part.additionalProperties;
    }
    out = merged;
  }
  return out;
}

// Classifies a schema node into one of the widget kinds we can draw.
function kindOf(s) {
  s = deref(s);
  if (s.enum) return s.enum.every((v) => typeof v === 'string') ? 'enum' : 'smart';
  const alts = s.anyOf || s.oneOf;
  if (alts) {
    const opts = alts.map((a) => deref(a));
    if (opts.every((o) => o.enum && o.enum.every((v) => typeof v === 'string'))) return 'enum';
    if (opts.every((o) => o.type === 'string' || (o.enum && o.enum.every((v) => typeof v === 'string')))) return 'string';
    return 'smart';
  }
  const t = Array.isArray(s.type) ? s.type.filter((x) => x !== 'null') : [s.type];
  if (t.length > 1) return 'smart';
  switch (t[0]) {
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'array': {
      const it = deref(s.items);
      return it.type === 'string' || (it.enum && it.enum.every((v) => typeof v === 'string')) ? 'strings' : 'json';
    }
    case 'object':
      if (s.properties && Object.keys(s.properties).length) return 'object';
      if (isObj(s.additionalProperties) && Object.keys(s.additionalProperties).length) return 'map';
      return 'json';
    default:
      if (s.properties) return 'object';
      return 'smart';
  }
}

function enumValues(s) {
  s = deref(s);
  if (s.enum) return s.enum;
  return [...new Set((s.anyOf || s.oneOf || []).flatMap((o) => deref(o).enum || []))];
}

function describeType(s) {
  s = deref(s);
  const k = kindOf(s);
  return { enum: 'choice', smart: 'value', strings: 'list', json: 'JSON', map: 'map', object: 'object' }[k] || k;
}

// Text input that accepts JSON literals (numbers, booleans, objects) or falls back to a plain string.
function smartInput(value, onchange) {
  const str = value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return h('input', {
    type: 'text',
    value: str,
    placeholder: '(unset)',
    onchange: (e) => {
      const t = e.target.value.trim();
      if (t === '') return onchange(undefined);
      if (/^(-?\d+(\.\d+)?|true|false|null|\{.*\}|\[.*\])$/s.test(t)) {
        try {
          return onchange(JSON.parse(t));
        } catch {
          /* fall through */
        }
      }
      onchange(e.target.value);
    },
  });
}

function control(s, path) {
  s = deref(s);
  const value = getIn(S.cfg, path);
  const set = (v) => setOrDel(S.cfg, path, v);
  const kind = kindOf(s);
  if (kind === 'object' || kind === 'map') return objectNode(s, path);
  switch (kind) {
    case 'boolean':
      return triSelect(value, set);
    case 'number':
      return numInput(value, set, { step: 'any' });
    case 'string':
      return typeof value === 'string' || value === undefined ? textInput(value, (v) => set(v === '' ? undefined : v), { placeholder: '(unset)' }) : smartInput(value, set);
    case 'enum': {
      const vals = enumValues(s);
      return h('select', { onchange: (e) => set(e.target.value || undefined) }, h('option', { value: '' }, '(unset)'), vals.map((v) => h('option', { value: v, selected: value === v }, v)), value !== undefined && !vals.includes(value) ? h('option', { value: String(value), selected: true }, String(value)) : null);
    }
    case 'strings': {
      const ta = h('textarea', { rows: Math.min(8, Math.max(2, (value || []).length + 1)), placeholder: 'one per line', spellcheck: 'false' });
      ta.value = Array.isArray(value) ? value.join('\n') : '';
      ta.addEventListener('change', () => {
        const lines = ta.value.split('\n').map((l) => l.trim()).filter(Boolean);
        set(lines.length ? lines : undefined);
      });
      return ta;
    }
    case 'smart':
      if (isObj(value) || Array.isArray(value)) return inlineJson(value, set);
      return smartInput(value, set);
    default:
      return inlineJson(value, set);
  }
}

function inlineJson(value, set) {
  const ta = h('textarea', { rows: value === undefined ? 2 : Math.min(14, JSON.stringify(value, null, 2).split('\n').length + 1), placeholder: '(unset). Enter JSON', spellcheck: 'false' });
  ta.value = value === undefined ? '' : JSON.stringify(value, null, 2);
  ta.addEventListener('change', () => {
    if (!ta.value.trim()) return set(undefined);
    try {
      set(JSON.parse(ta.value));
      ta.classList.remove('invalid');
    } catch {
      ta.classList.add('invalid');
      toast('Invalid JSON, not applied', 'error');
    }
  });
  return ta;
}

function propRow(key, s, path) {
  s = deref(s);
  const kind = kindOf(s);
  const value = getIn(S.cfg, path);
  if (kind === 'object' || kind === 'map') return objectNode(s, path, key);
  return h(
    'div',
    { class: 'sf-row' },
    h(
      'div',
      null,
      h('div', { class: 'sf-key' }, value !== undefined ? h('span', { class: 'dot', title: 'Set in this file' }) : null, key, s.deprecated ? h('span', { class: 'tag amber' }, 'Deprecated') : null),
      s.description ? h('div', { class: 'sf-desc' }, s.description) : null
    ),
    h('div', { class: 'sf-ctl' }, control(s, path))
  );
}

function objectNode(s, path, label) {
  s = deref(s);
  const pathKey = path.join('\u0000');
  const value = getIn(S.cfg, path);
  const props = s.properties || {};
  const extraSchema = isObj(s.additionalProperties) ? s.additionalProperties : s.additionalProperties === false ? null : {};
  const extraKeys = isObj(value) ? Object.keys(value).filter((k) => !(k in props)) : [];
  const setCount = isObj(value) ? Object.keys(value).length : 0;

  const details = h('details', { class: 'sf', open: S.open.has(pathKey) });
  details.addEventListener('toggle', () => {
    details.open ? S.open.add(pathKey) : S.open.delete(pathKey);
    if (details.open && !body.childElementCount) fill();
  });
  const summary = h(
    'summary',
    null,
    h('span', { class: 'k' }, label ?? path[path.length - 1]),
    setCount ? h('span', { class: 'tag blue round' }, `${setCount} set`) : null,
    s.deprecated ? h('span', { class: 'tag amber' }, 'Deprecated') : null,
    h('span', { class: 'd' }, s.description || '')
  );
  const body = h('div', { class: 'body' });
  // Render children lazily: the schema is large and deep.
  const fill = () => {
    const kids = [];
    if (value !== undefined && !isObj(value)) {
      kids.push(h('div', { class: 'sf-desc', style: 'margin:12px 0 8px' }, 'Current value is not an object; edit as JSON:'), inlineJson(value, (v) => setOrDel(S.cfg, path, v)));
    } else {
      for (const [k, ps] of Object.entries(props)) kids.push(propRow(k, ps, [...path, k]));
      for (const k of extraKeys) {
        const row = propRow(k, extraSchema || {}, [...path, k]);
        const del = h('button', { class: 'btn xs ghost danger', title: `Remove "${k}"`, onclick: () => { delIn(S.cfg, [...path, k]); markDirty(); render(); } }, icon('trash'), 'Remove ', k);
        kids.push(h('div', null, row, h('div', { style: 'margin:-6px 0 10px' }, del)));
      }
      if (extraSchema) {
        const inp = h('input', { type: 'text', placeholder: 'New key name', class: 'mono-input' });
        const add = () => {
          const k = inp.value.trim();
          if (!k) return;
          if (isObj(value) && k in value) return toast('Key exists', 'error');
          const kk = kindOf(extraSchema);
          setIn(S.cfg, [...path, k], kk === 'object' || kk === 'map' ? {} : kk === 'boolean' ? true : kk === 'strings' ? [] : '');
          S.open.add([...path, k].join('\u0000'));
          markDirty();
          render();
        };
        inp.addEventListener('keydown', (e) => e.key === 'Enter' && add());
        kids.push(h('div', { class: 'add-key' }, inp, h('button', { class: 'btn soft', onclick: add }, icon('plus'), 'Add entry')));
      }
    }
    body.replaceChildren(...kids);
  };
  if (details.open) fill();
  details.append(summary, body);
  return details;
}

function viewSettings() {
  if (!S.schema) return h('div', null, h('div', { class: 'page-head' }, h('h1', null, 'All settings')), h('div', { class: 'card empty' }, h('span', { class: 'spinner' }), h('p', null, 'Loading the OpenCode schema…')));
  const skip = new Set(['$schema', 'provider']);
  const q = S.settingsFilter.toLowerCase();
  const props = Object.entries(S.schema.properties).filter(([k, s]) => {
    if (skip.has(k)) return false;
    if (S.settingsOnlySet && S.cfg[k] === undefined) return false;
    if (!q) return true;
    return k.toLowerCase().includes(q) || (deref(s).description || '').toLowerCase().includes(q);
  });
  const unknown = Object.keys(S.cfg).filter((k) => !(k in S.schema.properties));
  const simple = [];
  const nested = [];
  for (const [k, s] of props) {
    const kind = kindOf(s);
    (kind === 'object' || kind === 'map' ? nested : simple).push([k, s]);
  }
  const list = h(
    'div',
    null,
    simple.length ? [h('div', { class: 'section-title', style: 'margin-top:8px' }, 'General'), h('div', { class: 'card sf-card' }, simple.map(([k, s]) => propRow(k, s, [k])))] : null,
    nested.length ? [h('div', { class: 'section-title' }, 'Sections'), nested.map(([k, s]) => objectNode(s, [k], k))] : null,
    unknown.length
      ? [
          h('div', { class: 'section-title' }, 'Not in the schema'),
          h('div', { class: 'card sf-card' }, h('div', { class: 'note warn', style: 'margin:16px 0 4px' }, icon('info'), h('span', null, 'These keys may come from an older or newer OpenCode version.')), unknown.map((k) => h('div', { class: 'sf-row' }, h('div', { class: 'sf-key' }, k), inlineJson(S.cfg[k], (v) => setOrDel(S.cfg, [k], v))))),
        ]
      : null,
    !simple.length && !nested.length ? h('div', { class: 'card empty' }, h('span', { class: 'icon-chip' }, icon('search')), h('h2', null, S.settingsOnlySet ? 'Nothing set yet' : 'No matches'), h('p', null, S.settingsOnlySet ? 'This file only sets providers. Switch to All to browse every option.' : 'Try another word, or clear the search.')) : null
  );
  const search = h('label', { class: 'search', style: 'max-width:440px' }, icon('search'), h('input', { type: 'search', placeholder: 'Search by key or description', value: S.settingsFilter, 'aria-label': 'Search settings', oninput: (e) => { S.settingsFilter = e.target.value; const pos = e.target.selectionStart; render(); const el = document.querySelector('#settings-search'); el?.focus(); el?.setSelectionRange(pos, pos); }, id: 'settings-search' }));
  const total = Object.keys(S.schema.properties).length - skip.size;
  const setCount = Object.keys(S.cfg).filter((k) => !skip.has(k) && k in S.schema.properties).length;
  return h(
    'div',
    null,
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'All settings'), h('div', { class: 'sub' }, 'Every option in the OpenCode schema, kept in sync with opencode.ai. Providers have their own page.'))),
    h(
      'div',
      { class: 'settings-bar' },
      search,
      h('div', { class: 'seg' }, h('button', { class: S.settingsOnlySet ? '' : 'on', onclick: () => { S.settingsOnlySet = false; render(); } }, `All ${total}`), h('button', { class: S.settingsOnlySet ? 'on' : '', onclick: () => { S.settingsOnlySet = true; render(); } }, `Set in this file ${setCount}`))
    ),
    list
  );
}

// ---------- rules, agents, commands and ignore files ----------

const DOC_HELP = {
  rules: ['Instructions added to every session in scope.', 'https://opencode.ai/docs/rules/'],
  agents: ['One agent per file; the file name is the agent name. Frontmatter sets description, mode, model and tools.', 'https://opencode.ai/docs/agents/'],
  commands: ['One slash command per file; the file name is the command. $ARGUMENTS is replaced with what you type after it.', 'https://opencode.ai/docs/commands/'],
  modes: ['Legacy modes; OpenCode now prefers primary agents.', 'https://opencode.ai/docs/modes/'],
  ignore: ['Glob patterns, one per line. .gitignore hides files from search tools; .ignore can bring them back with !pattern.', 'https://opencode.ai/docs/tools/'],
};
const DOC_ICON = { rules: 'doc', agents: 'bot', commands: 'terminal', modes: 'sliders', ignore: 'eyeoff' };
const docDirty = () => !!S.doc && S.doc.content !== S.doc.saved;

async function loadFiles() {
  try {
    S.files = await api('GET', '/api/files');
  } catch (e) {
    S.files = { error: e.message, groups: [] };
  }
  if (S.view === 'files') render();
}

async function openDoc(f) {
  if (S.doc?.path === f.path) return;
  if (docDirty() && !confirm(`Discard unsaved edits to ${S.doc.name}?`)) return;
  try {
    const r = await api('POST', '/api/file/read', { path: f.path });
    S.doc = { ...r, kind: f.kind, note: f.note, saved: r.content };
  } catch (e) {
    toast(e.message, 'error');
  }
  render();
}

async function saveDoc() {
  const d = S.doc;
  try {
    const r = await api('POST', '/api/file/write', { path: d.path, content: d.content });
    Object.assign(d, { exists: true, saved: d.content, size: r.size, mtime: r.mtime });
    toast(r.backup ? `Saved ${d.name}. Previous version kept as ${d.name}.bak` : `Created ${d.name}.`);
    await loadFiles();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function newDoc(group) {
  const what = group.label.toLowerCase().replace(/s$/, '');
  const name = prompt(`Name of the new ${what} (becomes the file name, e.g. review):`)?.trim();
  if (!name) return;
  try {
    const r = await api('POST', '/api/file/create', { group: group.id, name });
    await loadFiles();
    S.doc = null;
    await openDoc({ path: r.path, kind: group.id.replace(/^(global|project)-/, '') });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteDoc() {
  const d = S.doc;
  if (!confirm(`Remove ${d.name}? It is renamed to ${d.name}.bak, so OpenCode stops reading it and you can restore it by hand.`)) return;
  try {
    await api('POST', '/api/file/delete', { path: d.path });
    toast(`Removed ${d.name} (kept as ${d.name}.bak)`);
    S.doc = null;
    await loadFiles();
  } catch (e) {
    toast(e.message, 'error');
  }
}

const fmtSize = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

function viewFiles() {
  const head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Rules & agents'), h('div', { class: 'sub' }, 'The instruction, agent, command and ignore files OpenCode reads. Each one saves on its own and keeps a .bak of the previous version.')));
  if (!S.files) {
    loadFiles();
    return h('div', null, head, h('div', { class: 'card empty' }, h('span', { class: 'spinner' }), h('p', null, 'Looking for files…')));
  }
  if (S.files.error) return h('div', null, head, h('div', { class: 'error-box' }, icon('alert'), S.files.error));

  const scopes = [
    ['global', 'Global', 'violet', 'globe', S.files.globalDir],
    ['project', 'This project', 'green', 'folder', S.files.projectDir],
  ];
  // Open the global AGENTS.md first so the editor is never empty.
  if (!S.doc && !S.docAutoOpened) {
    S.docAutoOpened = true;
    const first = S.files.groups[0]?.files[0];
    if (first) openDoc(first);
  }
  const tree = h(
    'nav',
    { class: 'card ftree', 'aria-label': 'Files' },
    scopes.map(([scope, label, hue, ico, dir], i) => [
      i ? h('div', { class: 'fsep' }) : null,
      h('div', { class: 'fscope' }, h('span', { class: 'icon-chip', style: `--h: var(--${hue}); width:32px; height:32px; border-radius:9px` }, icon(ico)), h('span', { class: 'txt' }, h('b', null, label), h('code', { title: dir }, dir))),
      S.files.groups
        // Modes are legacy: only list them when some exist.
        .filter((g) => g.scope === scope && !(g.id.endsWith('-modes') && !g.files.length))
        .map((g) => [
          h('div', { class: 'fgroup' }, h('span', null, g.label), g.canCreate ? h('button', { class: 'btn xs icon ghost', title: `New ${g.label.toLowerCase().replace(/s$/, '')}`, 'aria-label': `New ${g.label.toLowerCase().replace(/s$/, '')}`, onclick: () => newDoc(g) }, icon('plus')) : null),
          g.files.length
            ? g.files.map((f) =>
                h(
                  'button',
                  { class: 'fitem' + (S.doc?.path === f.path ? ' active' : '') + (f.exists ? '' : ' missing'), title: f.note ? `${f.path}\n${f.note}` : f.path, onclick: () => openDoc(f) },
                  icon(DOC_ICON[f.kind] || 'file'),
                  h('span', { class: 'fname' }, g.canCreate ? f.name.replace(/\.md$/i, '') : f.name),
                  h('span', { class: 'fmeta' }, f.exists ? fmtSize(f.size) : 'Create')
                )
              )
            : h('div', { class: 'fempty' }, 'None yet')
        ]),
    ])
  );

  let pane;
  const d = S.doc;
  if (!d) pane = h('div', { class: 'card empty' }, h('span', { class: 'icon-chip' }, icon('doc')), h('h2', null, 'Pick a file'), h('p', null, 'Choose a file on the left to view or edit it.'));
  else {
    const [help, link] = DOC_HELP[d.kind] || ['', ''];
    const saveBtn = h('button', { class: 'btn sm primary', onclick: saveDoc }, d.exists ? 'Save file' : 'Create file');
    const revertBtn = h('button', { class: 'btn sm ghost', onclick: () => { d.content = d.saved; render(); } }, 'Revert');
    const lines = h('span', { class: 'num' });
    const state = h('span', { class: 'state' });
    const sync = () => {
      const dirty = docDirty();
      saveBtn.disabled = !dirty && d.exists;
      revertBtn.disabled = !dirty;
      lines.textContent = `${d.content ? d.content.split('\n').length : 0} lines`;
      state.replaceChildren(
        h('span', { class: 'status-dot ' + (dirty ? 'warn' : d.exists ? 'ok' : '') }),
        dirty ? 'Edited, not saved' : d.exists ? `Saved ${new Date(d.mtime).toLocaleString()}` : 'Not created yet. Type, then Create file.'
      );
    };
    const ta = h('textarea', { class: 'editor', spellcheck: 'false', 'aria-label': d.name, placeholder: d.kind === 'ignore' ? 'node_modules/\n!dist/' : '# Rules\n\n- Write tests for every change.' });
    ta.value = d.content;
    ta.addEventListener('input', () => { d.content = ta.value; sync(); });
    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || e.shiftKey) return;
      e.preventDefault();
      ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    });
    sync();
    const canDelete = d.exists && d.kind !== 'rules' && d.kind !== 'ignore';
    pane = h(
      'div',
      { class: 'card flush' },
      h(
        'div',
        { class: 'doc-head' },
        h('span', { class: 'icon-chip', style: `--h: var(--${d.path.startsWith(S.files.globalDir) ? 'violet' : 'green'})` }, icon(DOC_ICON[d.kind] || 'file')),
        h('div', { class: 't' }, h('h2', null, d.name, d.note ? h('span', { class: 'tag plain' }, d.note) : null), h('div', { class: 'path', title: d.path }, d.path)),
        canDelete ? h('button', { class: 'btn sm icon ghost danger', title: `Remove ${d.name}`, 'aria-label': `Remove ${d.name}`, onclick: deleteDoc }, icon('trash')) : null,
        revertBtn,
        saveBtn
      ),
      help ? h('div', { class: 'doc-help' }, icon('info'), h('span', { style: 'flex:1' }, help), link ? h('a', { href: link, target: '_blank', rel: 'noopener' }, 'Docs') : null) : null,
      ta,
      h('div', { class: 'doc-foot' }, state, h('span', { class: 'spacer' }), lines, h('span', null, 'Ctrl S to save'))
    );
  }
  return h('div', null, head, h('div', { class: 'files' }, tree, pane));
}

// ---------- Z-Code view ----------
// Edits ~/.zcode/v2/provider_config.json. Custom providers are personal provider
// rules; their models are "manual" model rules that must spell out every field.

const ZC_API_LABELS = { 'openai-chat-completions': 'Chat completions', 'anthropic-messages': 'Anthropic messages', 'openai-responses': 'Responses' };
const ZC_LEVELS = ['disabled', 'low', 'medium', 'high'];

const zcDirty = () => !!(S.zc?.doc && JSON.stringify(S.zc.doc) !== S.zc.saved);
const zcCfg = () => S.zc.doc.config;
function zcRules() {
  const c = zcCfg();
  if (!isObj(c.providerConfigRules)) c.providerConfigRules = { providerRules: [] };
  if (!Array.isArray(c.providerConfigRules.providerRules)) c.providerConfigRules.providerRules = [];
  return c.providerConfigRules.providerRules;
}
function zcModelCfg() {
  const c = zcCfg();
  if (!isObj(c.modelConfigRules)) c.modelConfigRules = {};
  for (const k of ['providerModelRules', 'manualProviderModelRules']) if (!Array.isArray(c.modelConfigRules[k])) c.modelConfigRules[k] = [];
  return c.modelConfigRules;
}
const zcRule = (pid) => (S.zc?.doc ? zcRules().find((r) => r.providerId === pid) : null);
const zcModelRules = (pid) => zcModelCfg().manualProviderModelRules.filter((m) => m.providerId === pid);
const zcModel = (pid, mid) => zcModelCfg().manualProviderModelRules.find((m) => m.providerId === pid && m.modelId === mid);
// Same normalisation Z-Code uses for new provider IDs.
const zcSlug = (v) => String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-provider';
const zcTaken = (id) => !!zcRule(id) || S.zc.reserved.includes(id);
function zcUniqueId(seed) {
  const base = zcSlug(seed);
  if (!zcTaken(base)) return base;
  for (let n = 2; ; n++) if (!zcTaken(`${base}-${n}`)) return `${base}-${n}`;
}

function zcNewModel(pid, mid, { contextWindow = 128000, max = 32000, reasoning = false, image = false, pdf = false, video = false } = {}) {
  const apiType = zcRule(pid)?.config?.api?.type || 'openai-chat-completions';
  return {
    providerId: pid,
    modelId: mid,
    config: {
      enabled: true,
      properties: {
        contextWindow,
        supportsJsonSchemaOutput: false,
        supportsNativeWebSearch: false,
        supportsMidConversationSystem: false,
        inputFormat: { supportsImage: image, supportsVideo: video, supportsPdf: pdf },
      },
      optionSpecs: {
        reasoningLevel: reasoning ? { values: [...ZC_LEVELS], map: S.zc.reasoningMaps[apiType] } : { values: ['disabled'], map: '{}' },
        maxOutputTokens: { max },
      },
    },
  };
}

// Keeps the provider's personalModelIds / modelOrder in step with its manual model rules.
function zcSyncIds(pid) {
  const r = zcRule(pid);
  if (!r) return;
  r.config = r.config || {};
  const ids = zcModelRules(pid).map((m) => m.modelId);
  const merge = (list) => [...(list || []).filter((id) => ids.includes(id)), ...ids.filter((id) => !(list || []).includes(id))];
  r.config.personalModelIds = merge(r.config.personalModelIds);
  // Built-in providers also list their own models in modelOrder, so only append there.
  r.config.modelOrder = r.templateId ? [...(r.config.modelOrder || []), ...ids.filter((id) => !(r.config.modelOrder || []).includes(id))] : merge(r.config.modelOrder);
}

function zcPutModel(rule) {
  const list = zcModelCfg().manualProviderModelRules;
  const i = list.findIndex((m) => m.providerId === rule.providerId && m.modelId === rule.modelId);
  if (i >= 0) list[i] = rule;
  else list.push(rule);
  zcSyncIds(rule.providerId);
}

function zcRemoveModel(pid, mid) {
  const mc = zcModelCfg();
  mc.manualProviderModelRules = mc.manualProviderModelRules.filter((m) => !(m.providerId === pid && m.modelId === mid));
  const r = zcRule(pid);
  if (r?.config?.modelOrder) r.config.modelOrder = r.config.modelOrder.filter((id) => id !== mid);
  zcSyncIds(pid);
}

function zcAddProvider({ name, baseUrl = '', apiKey = '', apiType = 'openai-chat-completions', id } = {}) {
  const pid = id || zcUniqueId(name || 'new-provider');
  zcRules().push({
    providerId: pid,
    providerName: name || pid,
    config: { group: 'standard-personal', access: { type: 'api-key', apiKey: apiKey || null }, api: { type: apiType, baseUrl }, personalModelIds: [], modelOrder: [] },
  });
  const c = zcCfg();
  c.providerOrder = [...(c.providerOrder || []).filter((x) => x !== pid), pid];
  return pid;
}

async function loadZc() {
  try {
    const r = await api('GET', '/api/zcode');
    S.zc = { ...r, saved: r.doc ? JSON.stringify(r.doc) : '' };
  } catch (e) {
    S.zc = { error: e.message, doc: null };
  }
  if (S.zsel && !zcRule(S.zsel)) S.zsel = null;
  zcCount();
  if (S.view === 'zcode') render();
}

function zcCount() {
  document.getElementById('count-zcode').textContent = (S.zc?.doc && zcRules().filter((r) => !r.templateId).length) || '';
}

async function saveZc() {
  if (S.zc.running && !confirm('Z-Code is running. It rewrites this file from memory when it exits, which would undo these changes.\n\nQuit Z-Code first (including the tray icon), then save. Save anyway?')) return;
  try {
    const r = await api('POST', '/api/zcode/save', { doc: S.zc.doc });
    S.zc = { ...S.zc, ...r, saved: JSON.stringify(r.doc) };
    render();
    toast(r.backup ? `Saved. Backup: ${r.backup}` : 'Saved.');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function zcChanged() {
  zcCount();
  render();
}

function zcApiSelect(value, onchange) {
  return h('select', { onchange: (e) => onchange(e.target.value) }, (S.zc?.apiTypes || Object.keys(ZC_API_LABELS)).map((t) => h('option', { value: t, selected: t === value }, ZC_API_LABELS[t] || t)));
}

const startZcDiscovery = (pid) => startDiscovery(pid, 'zcode');

function zcAddSelected() {
  const d = S.discovery;
  let pid = d.pid;
  if (!pid) {
    const id = zcSlug(d.newId);
    if (zcTaken(id)) return toast(`Provider "${id}" already exists or is a Z-Code built-in. Pick another ID.`, 'error');
    pid = zcAddProvider({ id, name: d.newName || id, baseUrl: d.baseURL, apiKey: d.apiKey.trim(), apiType: d.apiType });
  }
  let added = 0;
  for (const m of d.result.models) {
    if (!d.selected.has(m.id) || (zcModel(pid, m.id) && !d.overwrite)) continue;
    const s = m.suggestion;
    const ctx = s.limit?.context || 128000;
    const inp = s.modalities?.input || [];
    zcPutModel(zcNewModel(pid, m.id, { contextWindow: ctx, max: s.limit?.output || Math.min(32000, ctx), reasoning: !!s.reasoning, image: !!s.attachment || inp.includes('image'), pdf: inp.includes('pdf'), video: inp.includes('video') }));
    added++;
  }
  S.discovery = null;
  S.zsel = pid;
  S.ztab = 'models';
  zcChanged();
  toast(`Added ${added} model${added === 1 ? '' : 's'} to ${pid}. Save to write the file.`);
}

function viewZcode() {
  const z = S.zc;
  const head = (actions) =>
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Z-Code providers'), h('div', { class: 'sub' }, 'Custom OpenAI- or Anthropic-compatible providers for the Z-Code desktop app, with models picked from the endpoint.')), actions);
  if (!z) return h('div', null, head(null), h('div', { class: 'card empty' }, 'Loading…'));
  if (!z.doc) return h('div', null, head(null), h('div', { class: 'error-box' }, icon('alert'), h('span', null, `Could not read ${z.path || 'the Z-Code config'}: ${z.error}`)));

  const rules = zcRules();
  if (!S.discovery && (!S.zsel || !zcRule(S.zsel)) && rules.length) S.zsel = (rules.find((r) => !r.templateId) || rules[0]).providerId;
  const adding = !!(S.discovery && !S.discovery.pid);
  const dirty = zcDirty();
  const addBlank = () => {
    const name = prompt('Provider name (shown in Z-Code):', 'My provider')?.trim();
    if (!name) return;
    S.zsel = zcAddProvider({ name });
    S.discovery = null;
    S.ztab = 'connection';
    zcChanged();
  };

  const notes = [];
  if (z.running) notes.push(h('div', { class: 'note warn' }, icon('alert'), h('span', null, h('b', null, 'Z-Code is running. '), 'It rewrites this file when it exits and would undo your changes. Quit it (including the tray icon) before saving, then reopen it.')));
  if (!z.exists) notes.push(h('div', { class: 'note info' }, icon('info'), h('span', null, 'No Z-Code provider config yet. Saving creates ', h('code', null, z.path), '.')));

  const list = h(
    'div',
    { class: 'card plist' },
    h('div', { class: 'plist-head' }, h('h2', null, 'Z-Code providers'), h('span', { class: 'count' }, rules.length)),
    rules.length ? null : h('div', { class: 'empty-inline' }, 'Nothing here yet.'),
    rules.map((r) => {
      const n = zcModelRules(r.providerId).length;
      return h(
        'button',
        { class: 'pitem' + (S.zsel === r.providerId && !S.discovery ? ' active' : ''), onclick: () => { S.zsel = r.providerId; S.discovery = null; S.zedit = null; render(); } },
        avatar(r.providerId, r.providerName || r.providerId),
        h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, r.providerName || r.providerId), h('span', { class: 'purl' }, r.templateId ? `Built-in · ${r.templateId}` : (r.config?.api?.baseUrl || 'No base URL').replace(/^https?:\/\//, ''))),
        h('span', { class: 'pn', title: `${n} custom model${n === 1 ? '' : 's'}` }, n)
      );
    }),
    adding ? h('button', { class: 'pitem active' }, h('span', { class: 'avatar', style: '--h: var(--accent)' }, icon('plus')), h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, 'New provider'), h('span', { class: 'purl' }, S.discovery.baseURL.replace(/^https?:\/\//, '') || 'Connect an endpoint'))) : null,
    h('div', { class: 'plist-add' }, h('button', { class: 'btn ghost sm', onclick: addBlank, title: 'Create a provider and fill in its details by hand' }, icon('plus'), 'Blank provider'))
  );

  let right;
  if (S.discovery) right = viewDiscovery();
  else if (S.zsel && zcRule(S.zsel)) right = viewZcProvider(S.zsel);
  else
    right = h(
      'div',
      { class: 'card empty' },
      h('span', { class: 'icon-chip' }, icon('link')),
      h('h2', null, 'Add a custom provider to Z-Code'),
      h('p', null, "Paste an OpenAI-compatible base URL and pick models from its list, so you don't have to type model IDs and limits into Z-Code by hand."),
      h('button', { class: 'btn primary', onclick: () => startZcDiscovery() }, icon('plus'), 'Add from endpoint')
    );

  return h(
    'div',
    null,
    head(
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => { if (!dirty || confirm('Discard unsaved Z-Code changes?')) loadZc(); }, title: 'Reload the file from disk' }, icon('refresh'), dirty ? 'Discard' : 'Reload'),
        h('button', { class: 'btn', onclick: () => startZcDiscovery(), disabled: adding }, icon('plus'), 'Add from endpoint'),
        h('button', { class: 'btn primary', onclick: saveZc, disabled: !dirty }, 'Save')
      )
    ),
    h('div', { class: 'muted small', style: 'margin:-8px 0 14px' }, h('code', null, z.path), dirty ? h('span', { class: 'tag amber', style: 'margin-left:8px' }, 'Unsaved') : null),
    notes,
    h('div', { class: 'split' }, list, right)
  );
}

function viewZcProvider(pid) {
  const r = zcRule(pid);
  const builtin = !!r.templateId;
  const cfg = (r.config = r.config || {});
  const models = zcModelRules(pid);
  const baseUrl = cfg.api?.baseUrl;
  const set = (fn) => { fn(); zcChanged(); };
  const tab = (id, label, count) =>
    h('button', { class: 'tab' + (S.ztab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(S.ztab === id), onclick: () => { S.ztab = id; render(); } }, label, count !== undefined ? h('span', { class: 'tcount' }, count) : null);
  const remove = () => {
    if (!confirm(`Delete provider "${pid}" and its ${models.length} custom models from the Z-Code config?`)) return;
    const c = zcCfg();
    c.providerConfigRules.providerRules = zcRules().filter((x) => x.providerId !== pid);
    c.providerOrder = (c.providerOrder || []).filter((x) => x !== pid);
    const mc = zcModelCfg();
    mc.manualProviderModelRules = mc.manualProviderModelRules.filter((m) => m.providerId !== pid);
    mc.providerModelRules = mc.providerModelRules.filter((m) => m.providerId !== pid);
    S.zsel = null;
    zcChanged();
  };
  const addById = () => {
    const id = prompt('Model ID exactly as the endpoint expects it:')?.trim();
    if (!id) return;
    if (zcModel(pid, id)) return toast('That model is already added', 'error');
    zcPutModel(zcNewModel(pid, id));
    S.zedit = id;
    S.ztab = 'models';
    zcChanged();
  };

  const hero = h(
    'div',
    { class: 'phero' },
    h(
      'div',
      { class: 'phero-top' },
      avatar(pid, r.providerName || pid, 'lg'),
      h(
        'div',
        { class: 'phero-title' },
        h('h2', null, r.providerName || pid, h('span', { class: 'tag mono plain' }, pid)),
        h(
          'div',
          { class: 'phero-meta' },
          builtin ? h('span', { class: 'tag violet' }, `Built-in · ${r.templateId}`) : baseUrl ? h('span', { class: 'url', title: baseUrl }, baseUrl) : h('span', { class: 'tag amber' }, 'No base URL'),
          cfg.api?.type ? h('span', { class: 'tag blue' }, ZC_API_LABELS[cfg.api.type] || cfg.api.type) : null,
          cfg.access?.apiKey ? h('span', { class: 'tag green' }, icon('key'), 'key set') : null
        )
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => startZcDiscovery(pid), disabled: !baseUrl, title: baseUrl ? 'List the models this endpoint serves' : 'Set a base URL first' }, icon('download'), 'Fetch models'),
        h('button', { class: 'btn sm icon ghost danger', onclick: remove, title: 'Delete provider', 'aria-label': 'Delete provider' }, icon('trash'))
      )
    ),
    h('div', { class: 'tabs', role: 'tablist' }, tab('models', 'Models', models.length), tab('connection', 'Connection'), tab('json', 'JSON'))
  );

  let panel;
  if (S.ztab === 'connection' && builtin) {
    panel = h('div', { class: 'card-body tabpanel' }, h('div', { class: 'note info' }, icon('info'), h('span', null, "This is one of Z-Code's built-in providers. Its sign-in and key are managed inside Z-Code; you can still add custom models to it here.")));
  } else if (S.ztab === 'connection') {
    const headers = cfg.api?.headers || {};
    const setApi = (k, v) =>
      set(() => {
        cfg.api = { type: 'openai-chat-completions', baseUrl: '', ...cfg.api };
        if (v === undefined) delete cfg.api[k];
        else cfg.api[k] = v;
      });
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h(
        'div',
        { class: 'grid two' },
        field('Base URL', textInput(baseUrl, (v) => setApi('baseUrl', v.trim()), { placeholder: 'https://api.together.xyz/v1', class: 'mono-input' }), 'The API root, usually ending in /v1'),
        field('API key', apiKeyInput(cfg.access?.apiKey, (v) => set(() => (cfg.access = { type: 'api-key', apiKey: v.trim() || null }))), 'Stored as plain text: Z-Code cannot read environment variables'),
        field('Display name', textInput(r.providerName, (v) => set(() => (r.providerName = v.trim() || pid))), 'Shown in the Z-Code model picker'),
        field('API format', zcApiSelect(cfg.api?.type || 'openai-chat-completions', (v) => setApi('type', v)), 'Chat completions fits most OpenAI-compatible endpoints')
      ),
      h('div', { class: 'ep-title', style: 'margin-top:28px' }, 'Custom headers', h('span', { class: 'count', style: 'font-size:13px' }, Object.keys(headers).length || '')),
      Object.entries(headers).map(([k, v]) =>
        h(
          'div',
          { class: 'kv' },
          textInput(k, (nk) => setApi('headers', renameKey(headers, k, nk.trim())), { class: 'mono-input', 'aria-label': 'Header name' }),
          textInput(v, (nv) => setApi('headers', { ...headers, [k]: nv }), { 'aria-label': `${k} value` }),
          h('button', { class: 'btn icon ghost danger', title: `Remove ${k}`, 'aria-label': `Remove ${k}`, onclick: () => { const rest = { ...headers }; delete rest[k]; setApi('headers', Object.keys(rest).length ? rest : undefined); } }, icon('x'))
        )
      ),
      h('button', { class: 'btn sm soft', onclick: () => setApi('headers', { ...headers, ['X-Header-' + (Object.keys(headers).length + 1)]: '' }) }, icon('plus'), 'Add header')
    );
  } else if (S.ztab === 'json') {
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h('div', { class: 'note info', style: 'margin-bottom:16px' }, icon('info'), h('span', null, 'The raw provider rule. Apply updates the page; Save writes the file.')),
      jsonEditor(r, (v) => {
        if (!isObj(v) || v.providerId !== pid) throw new Error(`Must be an object with providerId "${pid}"`);
        zcRules()[zcRules().indexOf(r)] = v;
        zcChanged();
      }, 18)
    );
  } else {
    panel = h(
      'div',
      { class: 'tabpanel' },
      models.length
        ? [
            h('div', { class: 'toolbar' }, h('span', { class: 'muted small' }, `${models.length} custom model${models.length === 1 ? '' : 's'}`), h('span', { class: 'spacer' }), h('button', { class: 'btn sm ghost', onclick: addById }, icon('plus'), 'Add by ID'), h('button', { class: 'btn sm soft', onclick: () => startZcDiscovery(pid), disabled: !baseUrl }, icon('download'), 'Fetch more')),
            zcModelsTable(pid),
          ]
        : h(
            'div',
            { class: 'empty' },
            h('span', { class: 'icon-chip', style: '--h: var(--violet)' }, icon('layers')),
            h('h2', null, 'No custom models yet'),
            h('p', null, baseUrl ? 'Fetch the list this endpoint serves and pick the ones you want, or add a model by its ID.' : builtin ? 'Add a model by its ID.' : 'Set a base URL on the Connection tab first, then fetch its models.'),
            h(
              'div',
              { class: 'btn-row', style: 'justify-content:center' },
              builtin && !baseUrl ? null : h('button', { class: 'btn primary', onclick: () => (baseUrl ? startZcDiscovery(pid) : ((S.ztab = 'connection'), render())) }, icon(baseUrl ? 'download' : 'link'), baseUrl ? 'Fetch models' : 'Set base URL'),
              h('button', { class: 'btn', onclick: addById }, 'Add by ID')
            )
          )
    );
  }
  return h('div', { class: 'card flush' }, hero, panel);
}

function zcModelsTable(pid) {
  const r = zcRule(pid);
  const rows = [];
  for (const m of zcModelRules(pid)) {
    const mid = m.modelId;
    const p = m.config?.properties || {};
    const o = m.config?.optionSpecs || {};
    const levels = (o.reasoningLevel?.values || []).filter((v) => v !== 'disabled' && v !== 'none');
    const ref = `zc:${pid}/${mid}`;
    const test = S.tests[ref];
    const editing = S.zedit === mid;
    const tag = (on, label, hue, title) => (on ? h('span', { class: `tag ${hue}`, title }, label) : null);
    rows.push(
      h(
        'tr',
        { class: editing ? 'editing' : '' },
        h('td', null, h('div', { class: 'mcell' }, h('div', { class: 'mid', title: mid }, mid), h('div', { class: 'msub' }, m.config?.enabled === false ? h('span', { class: 'tag off round' }, 'Disabled') : null))),
        h('td', { class: 'num' }, limitsCell({ context: p.contextWindow, output: o.maxOutputTokens?.max })),
        h(
          'td',
          null,
          h(
            'div',
            { class: 'caps' },
            tag(levels.length, 'Reasoning', 'violet', `Levels: ${levels.join(', ')}`),
            tag(p.inputFormat?.supportsImage, 'Vision', 'rose', 'Image input'),
            tag(p.inputFormat?.supportsPdf, 'PDF', 'amber', 'PDF input'),
            tag(p.inputFormat?.supportsVideo, 'Video', 'cyan', 'Video input'),
            tag(p.supportsNativeWebSearch, 'Web', 'teal', 'Native web search')
          )
        ),
        h(
          'td',
          { class: 'actions' },
          h(
            'div',
            { class: 'row-actions' },
            h('button', { class: 'btn sm icon ghost', onclick: () => zcRunTest(pid, mid), title: 'Send a tiny test request', 'aria-label': `Test ${mid}`, disabled: !r.config?.api?.baseUrl }, test?.loading ? h('span', { class: 'spinner' }) : icon('play')),
            h('button', { class: 'btn sm icon ' + (editing ? 'soft' : 'ghost'), onclick: () => { S.zedit = editing ? null : mid; render(); }, title: editing ? 'Close editor' : 'Edit model', 'aria-label': editing ? 'Close editor' : `Edit ${mid}` }, icon(editing ? 'x' : 'edit')),
            h('button', { class: 'btn sm icon ghost danger', onclick: () => { zcRemoveModel(pid, mid); zcChanged(); }, title: `Remove ${mid}`, 'aria-label': `Remove ${mid}` }, icon('trash'))
          )
        )
      )
    );
    if (test && !test.loading) rows.push(h('tr', { class: 'result-row' }, h('td', { colspan: 4 }, test.ok ? h('div', { class: 'ok-box' }, icon('check'), `Replied in ${test.ms} ms: "${test.reply}"`) : h('div', { class: 'error-box' }, icon('alert'), `Failed ${test.status || ''} ${test.error}`))));
    if (editing) rows.push(h('tr', { class: 'model-edit' }, h('td', { colspan: 4 }, zcModelEditor(pid, mid))));
  }
  return h(
    'div',
    { class: 'tablewrap' },
    h('table', null, h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', { class: 'num', title: 'Context window and max output, in tokens' }, 'Limits'), h('th', null, 'Capabilities'), h('th', null))), h('tbody', null, rows))
  );
}

async function zcRunTest(pid, mid) {
  const a = zcRule(pid).config;
  if (a.api?.type !== 'openai-chat-completions') toast('Test uses the OpenAI-style /chat/completions call; it may not work for this API format.');
  const ref = `zc:${pid}/${mid}`;
  S.tests[ref] = { loading: true };
  render();
  try {
    S.tests[ref] = await api('POST', '/api/test', { baseURL: a.api?.baseUrl, apiKey: a.access?.apiKey || '', headers: a.api?.headers, model: mid });
  } catch (e) {
    S.tests[ref] = { ok: false, error: e.message };
  }
  render();
}

function zcModelEditor(pid, mid) {
  const m = zcModel(pid, mid);
  const c = m.config;
  const p = c.properties;
  const o = c.optionSpecs;
  const setR = (fn) => { fn(); zcChanged(); };
  const apiType = zcRule(pid)?.config?.api?.type || 'openai-chat-completions';
  const setLevels = (text) =>
    setR(() => {
      const vals = [...new Set(text.split(',').map((v) => v.trim()).filter(Boolean))];
      o.reasoningLevel.values = vals.length ? vals : ['disabled'];
      const reasons = o.reasoningLevel.values.some((v) => v !== 'disabled' && v !== 'none');
      // Without levels nothing extra is sent; turning levels on picks up Z-Code's default mapping.
      if (reasons && o.reasoningLevel.map === '{}') o.reasoningLevel.map = S.zc.reasoningMaps[apiType];
      if (!reasons) o.reasoningLevel.map = '{}';
    });
  const flag = (label, get, put) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!get(), onchange: (e) => setR(() => put(e.target.checked)) }), label);
  const posInt = (v, fallback) => (Number.isInteger(v) && v > 0 ? v : fallback);
  return h(
    'div',
    { class: 'editor-panel' },
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'General'),
      h(
        'div',
        { class: 'grid four' },
        field('Context window', numInput(p.contextWindow, (v) => setR(() => (p.contextWindow = posInt(v, p.contextWindow))), { placeholder: 'tokens', min: 1, step: 1 })),
        field('Max output', numInput(o.maxOutputTokens?.max, (v) => setR(() => (o.maxOutputTokens = { ...o.maxOutputTokens, max: posInt(v, o.maxOutputTokens?.max || 32000) })), { placeholder: 'tokens', min: 1, step: 1 })),
        field('Reasoning levels', textInput((o.reasoningLevel?.values || []).join(', '), setLevels, { class: 'mono-input', placeholder: 'disabled, low, medium, high' }), 'Comma-separated, lowest first. Only "disabled" turns reasoning off.')
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'Capabilities'),
      h(
        'div',
        { class: 'btn-row', style: 'flex-wrap:wrap;gap:8px 20px' },
        flag('Enabled', () => c.enabled !== false, (v) => (c.enabled = v)),
        flag('Image input', () => p.inputFormat.supportsImage, (v) => (p.inputFormat.supportsImage = v)),
        flag('PDF input', () => p.inputFormat.supportsPdf, (v) => (p.inputFormat.supportsPdf = v)),
        flag('Video input', () => p.inputFormat.supportsVideo, (v) => (p.inputFormat.supportsVideo = v)),
        flag('JSON schema output', () => p.supportsJsonSchemaOutput, (v) => (p.supportsJsonSchemaOutput = v)),
        flag('Native web search', () => p.supportsNativeWebSearch, (v) => (p.supportsNativeWebSearch = v)),
        flag('Mid-conversation system messages', () => p.supportsMidConversationSystem, (v) => (p.supportsMidConversationSystem = v))
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h(
        'details',
        { class: 'adv' },
        h('summary', null, 'Model JSON (request mapping for reasoning and max output)'),
        h(
          'div',
          { class: 'body' },
          jsonEditor(m, (v) => {
            if (!isObj(v) || v.providerId !== pid || !v.modelId) throw new Error(`Must keep providerId "${pid}" and a modelId`);
            zcRemoveModel(pid, mid);
            zcPutModel(v);
            S.zedit = v.modelId;
            zcChanged();
          }, 14)
        )
      )
    )
  );
}

// ---------- shared providers view ----------
// One list of every custom provider found in OpenCode, Z-Code and Pi, plus the
// ones saved in Switchyard's library, matched by endpoint. Copies go straight to
// the harness file on disk (with a .bak), so unsaved edits there must be saved first.

const HARNESS_LIST = [
  ['opencode', 'OpenCode', 'violet'],
  ['zcode', 'Z-Code', 'cyan'],
  ['pi', 'Pi', 'amber'],
];
const harnessName = (id) => HARNESS_LIST.find(([h]) => h === id)?.[1] || id;
const harnessDirty = (id) => (id === 'opencode' ? isDirty() : id === 'zcode' ? zcDirty() : piDirty());

async function loadShared() {
  try {
    S.shared = await api('GET', '/api/shared');
  } catch (e) {
    S.shared = { error: e.message, providers: [], harnesses: [] };
  }
  document.getElementById('count-shared').textContent = S.shared.providers.length || '';
  if (S.view === 'shared') render();
}

async function sharedCopy(p, to, models) {
  if (harnessDirty(to)) return toast(`Save or discard your unsaved ${harnessName(to)} changes first.`, 'error');
  S.copying = `${p.key}>${to}`;
  render();
  const send = (force) => api('POST', '/api/shared/copy', { key: p.key, to, models, force });
  try {
    let r;
    try {
      r = await send(false);
    } catch (e) {
      if (!e.confirm || !confirm(e.message)) throw e;
      r = await send(true);
    }
    S.shared = r;
    const res = r.result;
    toast(`${res.added ? `Copied ${res.added} model${res.added === 1 ? '' : 's'}` : 'Already up to date'} in ${harnessName(to)} as "${res.id}".${res.notes.length ? ' Note: ' + res.notes.join('; ') + '.' : ''}`);
    if (to === 'opencode') applyState(await api('GET', '/api/state'));
    else if (to === 'zcode') await loadZc();
    else await loadPi();
  } catch (e) {
    toast(e.message, 'error');
  }
  S.copying = null;
  render();
}

async function sharedSaveToLibrary(p) {
  try {
    S.shared = await api('POST', '/api/shared/library/save', { provider: { id: p.key, name: p.name, baseURL: p.baseURL, api: p.api, apiKey: p.apiKey, headers: p.headers, models: p.models } });
    toast(`Saved "${p.name}" to the library. It stays listed even if you remove it from every harness.`);
  } catch (e) {
    toast(e.message, 'error');
  }
  render();
}

async function sharedForget(p) {
  if (!confirm(`Remove "${p.name}" from the library? Harness configs are not touched.`)) return;
  try {
    S.shared = await api('POST', '/api/shared/library/remove', { key: p.key });
  } catch (e) {
    toast(e.message, 'error');
  }
  render();
}

function sharedAddByHand() {
  const baseURL = prompt('Base URL of the OpenAI-compatible endpoint:', 'https://')?.trim();
  if (!baseURL || baseURL === 'https://') return;
  const name = prompt('Display name:', baseURL.replace(/^https?:\/\//, '').split(/[/:]/)[0])?.trim();
  if (!name) return;
  api('POST', '/api/shared/library/save', { provider: { name, baseURL, api: 'openai-chat', models: [] } })
    .then((r) => {
      S.shared = r;
      S.sopen = r.providers.find((p) => p.baseURL === baseURL)?.key || null;
      render();
      toast('Saved to the library. Add models with "Fetch models".');
    })
    .catch((e) => toast(e.message, 'error'));
}

// Converts a discovered model suggestion (OpenCode shape) to the shared model shape.
function sharedModel(m) {
  const s = m.suggestion;
  const inp = s.modalities?.input || [];
  const out = { id: m.id, name: s.name, context: s.limit?.context, output: s.limit?.output, reasoning: s.reasoning, vision: s.attachment ?? (inp.length ? inp.includes('image') : undefined), toolCall: s.tool_call };
  if (inp.includes('pdf')) out.pdf = true;
  if (inp.includes('video')) out.video = true;
  if (s.cost) out.cost = { input: s.cost.input, output: s.cost.output, cacheRead: s.cost.cache_read, cacheWrite: s.cost.cache_write };
  return JSON.parse(JSON.stringify(out));
}

async function libAddSelected() {
  const d = S.discovery;
  const existing = d.pid ? S.shared.providers.find((p) => p.key === d.pid) : null;
  const picked = d.result.models.filter((m) => d.selected.has(m.id)).map(sharedModel);
  const key = d.apiKey.trim();
  const apiKey = existing ? existing.apiKey : d.keyMode === 'literal' ? key || undefined : d.keyMode === 'env' && d.envName ? `{env:${d.envName}}` : undefined;
  const models = [...(existing?.models || [])];
  for (const m of picked) {
    const i = models.findIndex((x) => x.id === m.id);
    if (i < 0) models.push(m);
    else if (d.overwrite) models[i] = m;
  }
  try {
    const r = await api('POST', '/api/shared/library/save', { provider: { id: d.newId || existing?.key, name: existing?.name || d.newName || d.newId, baseURL: d.baseURL, api: existing?.api || d.apiType, apiKey, headers: existing?.headers, models } });
    S.shared = r;
    S.discovery = null;
    S.sopen = r.providers.find((p) => p.key === existing?.key || p.baseURL === d.baseURL)?.key || null;
    render();
    toast(`Saved ${picked.length} model${picked.length === 1 ? '' : 's'} to the library. Copy the provider to a harness to use it.`);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function viewShared() {
  const sh = S.shared;
  const head = h(
    'div',
    { class: 'page-head' },
    h('div', null, h('h1', null, 'Shared providers'), h('div', { class: 'sub' }, 'Every custom provider found in your harnesses, matched by endpoint. Copy one to another harness in one click, or keep it in the library.')),
    h(
      'div',
      { class: 'btn-row' },
      h('button', { class: 'btn ghost', onclick: loadShared, title: 'Re-read every config from disk' }, icon('refresh'), 'Reload'),
      h('button', { class: 'btn', onclick: sharedAddByHand }, icon('plus'), 'Add by hand'),
      h('button', { class: 'btn primary', onclick: () => startDiscovery(null, 'library'), disabled: !!S.discovery }, icon('download'), 'Add from endpoint')
    )
  );
  if (!sh) return h('div', null, head, h('div', { class: 'card empty' }, 'Loading…'));
  if (S.discovery) return h('div', null, head, viewDiscovery());

  const status = h(
    'div',
    { class: 'stats' },
    sh.harnesses.map((x) => {
      const [, name, hue] = HARNESS_LIST.find(([id]) => id === x.id);
      const n = sh.providers.filter((p) => p.in[x.id]).length;
      const val = x.error ? h('span', { class: 'val', style: 'color:var(--danger)' }, 'Unreadable file') : h('span', { class: 'val big' }, n, h('span', null, `provider${n === 1 ? '' : 's'}${x.exists ? '' : ' · no file yet'}`));
      return h(
        'button',
        { class: 'stat', title: x.path, onclick: () => go(HARNESS_HOME[x.id]) },
        h('span', { class: 'icon-chip', style: `--h: var(--${hue})` }, icon(x.id === 'opencode' ? 'braces' : 'bot')),
        h('span', { class: 'txt' }, h('span', { class: 'lbl' }, name, x.running ? h('span', { class: 'tag amber', style: 'margin-left:6px' }, 'running') : null), val)
      );
    })
  );

  const notes = [];
  if (sh.harnesses.find((x) => x.id === 'zcode')?.running) notes.push(h('div', { class: 'note warn' }, icon('alert'), h('span', null, 'Z-Code is running. Quit it (including the tray icon) before copying a provider to it, or Z-Code will undo the change when it exits.')));
  const dirty = HARNESS_LIST.filter(([id]) => harnessDirty(id)).map(([, n]) => n);
  if (dirty.length) notes.push(h('div', { class: 'note info' }, icon('info'), h('span', null, `This page reads the files on disk. Unsaved changes in ${dirty.join(' and ')} are not shown here.`)));

  const cell = (p, id) => {
    const inH = p.in[id];
    const missing = p.models.filter((m) => !inH?.models.includes(m.id)).length;
    const busy = S.copying === `${p.key}>${id}`;
    if (inH && !missing) return h('span', { class: 'tag green', title: `In ${harnessName(id)} as "${inH.id}" with ${inH.models.length} models` }, icon('check'), inH.id);
    const label = inH ? `+${missing}` : 'Copy';
    return h(
      'button',
      { class: 'btn xs ' + (inH ? 'soft' : 'ghost'), disabled: busy || !!S.copying, title: inH ? `Add the ${missing} model${missing === 1 ? '' : 's'} ${harnessName(id)} doesn't have yet` : `Copy this provider and its ${p.models.length} models to ${harnessName(id)}`, onclick: (e) => { e.stopPropagation(); sharedCopy(p, id, null); } },
      busy ? h('span', { class: 'spinner' }) : icon(inH ? 'plus' : 'download'),
      label
    );
  };

  const rows = [];
  for (const p of sh.providers) {
    const open = S.sopen === p.key;
    rows.push(
      h(
        'tr',
        { class: open ? 'editing' : '', style: 'cursor:pointer', onclick: () => { S.sopen = open ? null : p.key; render(); } },
        h(
          'td',
          null,
          h(
            'div',
            { class: 'mcell', style: 'flex-direction:row;align-items:center;gap:10px' },
            avatar(p.key, p.name, 'sm'),
            h('div', { style: 'min-width:0' }, h('div', { class: 'mid', style: 'font-family:var(--font)', title: p.name }, p.name, p.in.library ? h('span', { class: 'tag plain round' }, 'Library') : null), h('div', { class: 'msub', title: p.baseURL }, p.baseURL.replace(/^https?:\/\//, '')))
          )
        ),
        h('td', { class: 'num' }, p.models.length),
        h('td', null, p.keyKind === 'none' ? h('span', { class: 'tag off' }, 'No key') : h('span', { class: 'tag ' + (p.keyKind === 'literal' ? 'plain' : 'blue'), title: p.keyKind === 'literal' ? 'Plain key' : `Key read from ${p.keyKind}` }, icon('key'), p.keyKind === 'literal' ? 'key' : p.keyKind)),
        HARNESS_LIST.map(([id]) => h('td', null, cell(p, id)))
      )
    );
    if (open) rows.push(h('tr', { class: 'model-edit' }, h('td', { colspan: 3 + HARNESS_LIST.length }, sharedDetail(p))));
  }

  const table = sh.providers.length
    ? h(
        'div',
        { class: 'card flush' },
        h(
          'div',
          { class: 'tablewrap' },
          h(
            'table',
            null,
            h('thead', null, h('tr', null, h('th', null, 'Provider'), h('th', { class: 'num' }, 'Models'), h('th', null, 'Key'), HARNESS_LIST.map(([, n]) => h('th', null, n)))),
            h('tbody', null, rows)
          )
        )
      )
    : h(
        'div',
        { class: 'card empty' },
        h('span', { class: 'icon-chip' }, icon('layers')),
        h('h2', null, 'No custom providers yet'),
        h('p', null, 'Providers you add to OpenCode, Z-Code or Pi show up here automatically. You can also add one here and copy it to each harness.'),
        h('button', { class: 'btn primary', onclick: () => startDiscovery(null, 'library') }, icon('download'), 'Add from endpoint')
      );
  return h('div', null, head, status, notes, table, sh.library?.error ? h('div', { class: 'error-box' }, icon('alert'), `Library file unreadable: ${sh.library.error}`) : null);
}

function sharedDetail(p) {
  const sel = (S.ssel[p.key] = S.ssel[p.key] || new Set(p.models.map((m) => m.id)));
  const picked = () => p.models.filter((m) => sel.has(m.id)).map((m) => m.id);
  const yes = (on) => (on ? h('span', { class: 'tag green' }, icon('check')) : dash());
  const caps = (m) => h('div', { class: 'caps' }, m.toolCall === false ? h('span', { class: 'tag off' }, 'No tools') : null, m.reasoning ? h('span', { class: 'tag violet' }, 'Reasoning') : null, m.vision ? h('span', { class: 'tag rose' }, 'Vision') : null, m.pdf ? h('span', { class: 'tag amber' }, 'PDF') : null);
  return h(
    'div',
    { class: 'editor-panel' },
    h(
      'div',
      { class: 'ep-section' },
      h(
        'div',
        { class: 'btn-row', style: 'flex-wrap:wrap' },
        h('span', { class: 'muted small' }, `${sel.size} of ${p.models.length} models selected. API: ${{ 'openai-chat': 'Chat completions', 'openai-responses': 'Responses', anthropic: 'Anthropic messages' }[p.api] || p.api}`),
        h('span', { class: 'spacer' }),
        HARNESS_LIST.map(([id, name]) => h('button', { class: 'btn sm', disabled: !sel.size || !!S.copying, onclick: () => sharedCopy(p, id, picked()) }, icon('download'), `Copy selected to ${name}`))
      )
    ),
    p.models.length
      ? h(
          'div',
          { class: 'tablewrap' },
          h(
            'table',
            null,
            h('thead', null, h('tr', null, h('th', { class: 'check-cell' }, h('input', { type: 'checkbox', checked: sel.size === p.models.length, 'aria-label': 'Select all', onchange: (e) => { p.models.forEach((m) => (e.target.checked ? sel.add(m.id) : sel.delete(m.id))); render(); } })), h('th', null, 'Model'), h('th', { class: 'num' }, 'Limits'), h('th', null, 'Capabilities'), HARNESS_LIST.map(([, n]) => h('th', null, n)))),
            h(
              'tbody',
              null,
              p.models.map((m) =>
                h(
                  'tr',
                  null,
                  h('td', { class: 'check-cell' }, h('input', { type: 'checkbox', checked: sel.has(m.id), 'aria-label': `Select ${m.id}`, onchange: (e) => { e.target.checked ? sel.add(m.id) : sel.delete(m.id); render(); } })),
                  h('td', null, h('div', { class: 'mcell' }, h('div', { class: 'mid' }, m.id), m.name && m.name !== m.id ? h('div', { class: 'msub' }, m.name) : null)),
                  h('td', { class: 'num' }, limitsCell({ context: m.context, output: m.output })),
                  h('td', null, caps(m)),
                  HARNESS_LIST.map(([id]) => h('td', null, yes(p.in[id]?.models.includes(m.id))))
                )
              )
            )
          )
        )
      : h('div', { class: 'empty-inline' }, 'No models yet.'),
    h(
      'div',
      { class: 'ep-section btn-row' },
      h('button', { class: 'btn sm soft', onclick: () => startDiscovery(p.key, 'library') }, icon('download'), 'Fetch models'),
      h('span', { class: 'spacer' }),
      p.in.library ? h('button', { class: 'btn sm ghost danger', onclick: () => sharedForget(p) }, icon('trash'), 'Remove from library') : h('button', { class: 'btn sm ghost', onclick: () => sharedSaveToLibrary(p), title: 'Keep a copy that survives removing it from every harness' }, icon('layers'), 'Save to library')
    )
  );
}

// ---------- Pi view ----------
// Edits Pi's ~/.pi/agent/models.json: { providers: { name: { baseUrl, api, apiKey, models: [...] } } }.
// Pi re-reads the file whenever /model is opened, so no restart is needed.

const PI_LEVEL_LABEL = { 'openai-completions': 'Chat completions', 'openai-responses': 'Responses', 'anthropic-messages': 'Anthropic messages', 'google-generative-ai': 'Google' };
const piDirty = () => !!(S.pi?.doc && JSON.stringify(S.pi.doc) !== S.pi.saved);
function piProviders() {
  if (!S.pi?.doc) return {};
  if (!isObj(S.pi.doc.providers)) S.pi.doc.providers = {};
  return S.pi.doc.providers;
}
const piTaken = (id) => !!piProviders()[id] || (S.pi?.reserved || []).includes(id);
// Pi key syntax → the {env:…} form /api/discover and /api/test understand.
function piKeyRef(v) {
  if (!v) return '';
  const env = v.match(/^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))$/);
  if (env) return `{env:${env[1] || env[2]}}`;
  return v.startsWith('!') ? '' : v.replace(/\$\$/g, '$').replace(/\$!/g, '!');
}

async function loadPi() {
  try {
    const r = await api('GET', '/api/pi');
    S.pi = { ...r, saved: r.doc ? JSON.stringify(r.doc) : '' };
  } catch (e) {
    S.pi = { error: e.message, doc: null };
  }
  if (S.psel && !piProviders()[S.psel]) S.psel = null;
  document.getElementById('count-pi').textContent = Object.keys(piProviders()).length || '';
  if (S.view === 'pi') render();
}

async function savePi() {
  if (S.pi.hasComments && !confirm('models.json contains comments. Saving rewrites it as plain JSON, so the comments will be removed (a .bak backup is kept). Continue?')) return;
  try {
    const r = await api('POST', '/api/pi/save', { doc: S.pi.doc });
    S.pi = { ...S.pi, ...r, saved: JSON.stringify(r.doc) };
    render();
    toast(r.backup ? `Saved. Backup: ${r.backup}` : 'Saved. Pi picks it up next time you open /model.');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function piChanged() {
  document.getElementById('count-pi').textContent = Object.keys(piProviders()).length || '';
  render();
}

function piModelFromSuggestion(m) {
  const s = m.suggestion;
  const out = { id: m.id };
  if (s.name && s.name !== m.id) out.name = s.name;
  if (s.reasoning) out.reasoning = true;
  if (s.attachment || (s.modalities?.input || []).includes('image')) out.input = ['text', 'image'];
  if (s.limit?.context) out.contextWindow = s.limit.context;
  if (s.limit?.output) out.maxTokens = s.limit.output;
  if (s.cost) out.cost = { input: s.cost.input, output: s.cost.output, cacheRead: s.cost.cache_read ?? 0, cacheWrite: s.cost.cache_write ?? 0 };
  return out;
}

function piAddSelected() {
  const d = S.discovery;
  let pid = d.pid;
  const ps = piProviders();
  if (!pid) {
    pid = zcSlug(d.newId);
    if (piTaken(pid)) return toast(`"${pid}" already exists or is one of Pi's built-in providers. Pick another ID.`, 'error');
    const key = d.apiKey.trim();
    // Pi hides models of a provider without a key, so keyless endpoints get a placeholder.
    const apiKey = d.keyMode === 'env' && d.envName ? '$' + d.envName : d.keyMode === 'literal' && key ? key.replace(/\$/g, '$$$$').replace(/^!/, '$!') : 'none';
    ps[pid] = { name: d.newName || pid, baseUrl: d.baseURL, api: d.apiType, apiKey, models: [] };
  }
  const p = ps[pid];
  p.models = Array.isArray(p.models) ? p.models : [];
  let added = 0;
  for (const m of d.result.models) {
    if (!d.selected.has(m.id)) continue;
    const i = p.models.findIndex((x) => x.id === m.id);
    if (i >= 0 && !d.overwrite) continue;
    if (i >= 0) p.models[i] = piModelFromSuggestion(m);
    else p.models.push(piModelFromSuggestion(m));
    added++;
  }
  S.discovery = null;
  S.psel = pid;
  S.pptab = 'models';
  piChanged();
  toast(`Added ${added} model${added === 1 ? '' : 's'} to ${pid}. Save to write the file.`);
}

function viewPi() {
  const z = S.pi;
  const dirty = piDirty();
  const head = (actions) => h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Pi providers'), h('div', { class: 'sub' }, "Custom providers for the Pi coding agent. Pi reloads this file whenever you open /model.")), actions);
  if (!z) return h('div', null, head(null), h('div', { class: 'card empty' }, 'Loading…'));
  if (!z.doc) return h('div', null, head(null), h('div', { class: 'error-box' }, icon('alert'), h('span', null, `Could not read ${z.path || 'models.json'}: ${z.error}`)));
  const ps = piProviders();
  const ids = Object.keys(ps);
  if (!S.discovery && (!S.psel || !ps[S.psel]) && ids.length) S.psel = ids[0];
  const adding = !!(S.discovery && !S.discovery.pid);
  const addBlank = () => {
    const name = prompt('Provider ID (used in Pi as provider/model):', 'my-provider')?.trim();
    if (!name) return;
    const id = zcSlug(name);
    if (piTaken(id)) return toast(`"${id}" already exists or is one of Pi's built-in providers.`, 'error');
    ps[id] = { name, baseUrl: '', api: 'openai-completions', apiKey: 'none', models: [] };
    S.psel = id;
    S.pptab = 'connection';
    S.discovery = null;
    piChanged();
  };

  const list = h(
    'div',
    { class: 'card plist' },
    h('div', { class: 'plist-head' }, h('h2', null, 'Pi providers'), h('span', { class: 'count' }, ids.length)),
    ids.length ? null : h('div', { class: 'empty-inline' }, 'Nothing here yet.'),
    ids.map((id) => {
      const p = ps[id] || {};
      const n = (p.models || []).length;
      return h(
        'button',
        { class: 'pitem' + (S.psel === id && !S.discovery ? ' active' : ''), onclick: () => { S.psel = id; S.discovery = null; S.pedit = null; render(); } },
        avatar(id, p.name || id),
        h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, p.name || id), h('span', { class: 'purl' }, (z.reserved.includes(id) ? 'Built-in override · ' : '') + (p.baseUrl || 'No base URL').replace(/^https?:\/\//, ''))),
        h('span', { class: 'pn' }, n)
      );
    }),
    adding ? h('button', { class: 'pitem active' }, h('span', { class: 'avatar', style: '--h: var(--accent)' }, icon('plus')), h('span', { class: 'ptxt' }, h('span', { class: 'pname' }, 'New provider'), h('span', { class: 'purl' }, S.discovery.baseURL.replace(/^https?:\/\//, '') || 'Connect an endpoint'))) : null,
    h('div', { class: 'plist-add' }, h('button', { class: 'btn ghost sm', onclick: addBlank }, icon('plus'), 'Blank provider'))
  );

  let right;
  if (S.discovery) right = viewDiscovery();
  else if (S.psel && ps[S.psel]) right = viewPiProvider(S.psel);
  else
    right = h(
      'div',
      { class: 'card empty' },
      h('span', { class: 'icon-chip' }, icon('link')),
      h('h2', null, 'Add a custom provider to Pi'),
      h('p', null, 'Paste an OpenAI-compatible base URL and pick models from its list, or copy one you already use elsewhere from Shared providers.'),
      h('div', { class: 'btn-row', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => startDiscovery(null, 'pi') }, icon('plus'), 'Add from endpoint'), h('button', { class: 'btn', onclick: () => go('shared') }, 'Shared providers'))
    );

  return h(
    'div',
    null,
    head(
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => { if (!dirty || confirm('Discard unsaved Pi changes?')) loadPi(); } }, icon('refresh'), dirty ? 'Discard' : 'Reload'),
        h('button', { class: 'btn', onclick: () => startDiscovery(null, 'pi'), disabled: adding }, icon('plus'), 'Add from endpoint'),
        h('button', { class: 'btn primary', onclick: savePi, disabled: !dirty }, 'Save')
      )
    ),
    h('div', { class: 'muted small', style: 'margin:-8px 0 14px' }, h('code', null, z.path), z.exists ? null : h('span', { class: 'tag plain', style: 'margin-left:8px' }, 'New file'), dirty ? h('span', { class: 'tag amber', style: 'margin-left:8px' }, 'Unsaved') : null),
    h('div', { class: 'split' }, list, right)
  );
}

function viewPiProvider(pid) {
  const p = piProviders()[pid];
  const models = (p.models = Array.isArray(p.models) ? p.models : []);
  const set = (fn) => { fn(); piChanged(); };
  const setKey = (k, v) => set(() => (v === undefined || v === '' ? delete p[k] : (p[k] = v)));
  const tab = (id, label, count) => h('button', { class: 'tab' + (S.pptab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(S.pptab === id), onclick: () => { S.pptab = id; render(); } }, label, count !== undefined ? h('span', { class: 'tcount' }, count) : null);
  const remove = () => {
    if (!confirm(`Delete provider "${pid}" and its ${models.length} models from Pi's models.json?`)) return;
    delete piProviders()[pid];
    S.psel = null;
    piChanged();
  };
  const addById = () => {
    const id = prompt('Model ID exactly as the endpoint expects it:')?.trim();
    if (!id) return;
    if (models.some((m) => m.id === id)) return toast('That model is already added', 'error');
    models.push({ id });
    S.pedit = id;
    S.pptab = 'models';
    piChanged();
  };
  const hero = h(
    'div',
    { class: 'phero' },
    h(
      'div',
      { class: 'phero-top' },
      avatar(pid, p.name || pid, 'lg'),
      h(
        'div',
        { class: 'phero-title' },
        h('h2', null, p.name || pid, h('span', { class: 'tag mono plain' }, pid)),
        h('div', { class: 'phero-meta' }, p.baseUrl ? h('span', { class: 'url', title: p.baseUrl }, p.baseUrl) : h('span', { class: 'tag amber' }, 'No base URL'), p.api ? h('span', { class: 'tag blue' }, PI_LEVEL_LABEL[p.api] || p.api) : null, p.apiKey && p.apiKey !== 'none' ? h('span', { class: 'tag green' }, icon('key'), /^\$/.test(p.apiKey) ? 'env key' : p.apiKey.startsWith('!') ? 'command' : 'key set') : null)
      ),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => startDiscovery(pid, 'pi'), disabled: !p.baseUrl }, icon('download'), 'Fetch models'), h('button', { class: 'btn sm icon ghost danger', onclick: remove, title: 'Delete provider', 'aria-label': 'Delete provider' }, icon('trash')))
    ),
    h('div', { class: 'tabs', role: 'tablist' }, tab('models', 'Models', models.length), tab('connection', 'Connection'), tab('json', 'JSON'))
  );
  let panel;
  if (S.pptab === 'connection') {
    const headers = p.headers || {};
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h(
        'div',
        { class: 'grid two' },
        field('Base URL', textInput(p.baseUrl, (v) => setKey('baseUrl', v.trim()), { placeholder: 'https://api.together.xyz/v1', class: 'mono-input' }), 'The API root, usually ending in /v1'),
        field('API key', apiKeyInput(p.apiKey, (v) => setKey('apiKey', v.trim())), 'A key, $ENV_VAR, or !command. Pi needs some value even for keyless servers.'),
        field('Display name', textInput(p.name, (v) => setKey('name', v.trim())), 'Shown in Pi\'s /model list'),
        field('API format', apiSelect('pi', p.api || 'openai-completions', (v) => setKey('api', v)), 'Chat completions fits most OpenAI-compatible endpoints')
      ),
      h('div', { class: 'ep-title', style: 'margin-top:28px' }, 'Custom headers', h('span', { class: 'count', style: 'font-size:13px' }, Object.keys(headers).length || '')),
      Object.entries(headers).map(([k, v]) =>
        h(
          'div',
          { class: 'kv' },
          textInput(k, (nk) => setKey('headers', renameKey(headers, k, nk.trim())), { class: 'mono-input', 'aria-label': 'Header name' }),
          textInput(v, (nv) => setKey('headers', { ...headers, [k]: nv }), { 'aria-label': `${k} value` }),
          h('button', { class: 'btn icon ghost danger', title: `Remove ${k}`, 'aria-label': `Remove ${k}`, onclick: () => { const rest = { ...headers }; delete rest[k]; setKey('headers', Object.keys(rest).length ? rest : undefined); } }, icon('x'))
        )
      ),
      h('button', { class: 'btn sm soft', onclick: () => setKey('headers', { ...headers, ['X-Header-' + (Object.keys(headers).length + 1)]: '' }) }, icon('plus'), 'Add header')
    );
  } else if (S.pptab === 'json') {
    panel = h(
      'div',
      { class: 'card-body tabpanel' },
      h('div', { class: 'note info', style: 'margin-bottom:16px' }, icon('info'), h('span', null, 'The raw provider object (compat, modelOverrides, thinkingLevelMap…). Apply updates the page; Save writes the file.')),
      jsonEditor(p, (v) => {
        if (!isObj(v)) throw new Error('Provider must be an object');
        piProviders()[pid] = v;
        piChanged();
      }, 18)
    );
  } else {
    const rows = [];
    for (const m of models) {
      const editing = S.pedit === m.id;
      const ref = `pi:${pid}/${m.id}`;
      const test = S.tests[ref];
      rows.push(
        h(
          'tr',
          { class: editing ? 'editing' : '' },
          h('td', null, h('div', { class: 'mcell' }, h('div', { class: 'mid', title: m.id }, m.id), m.name ? h('div', { class: 'msub' }, m.name) : null)),
          h('td', { class: 'num' }, limitsCell({ context: m.contextWindow, output: m.maxTokens })),
          h('td', null, h('div', { class: 'caps' }, m.reasoning ? h('span', { class: 'tag violet' }, 'Reasoning') : null, (m.input || []).includes('image') ? h('span', { class: 'tag rose' }, 'Vision') : null)),
          h('td', { class: 'num' }, costCell(m.cost)),
          h(
            'td',
            { class: 'actions' },
            h(
              'div',
              { class: 'row-actions' },
              h('button', { class: 'btn sm icon ghost', disabled: !p.baseUrl, title: 'Send a tiny test request', 'aria-label': `Test ${m.id}`, onclick: () => piRunTest(pid, m.id) }, test?.loading ? h('span', { class: 'spinner' }) : icon('play')),
              h('button', { class: 'btn sm icon ' + (editing ? 'soft' : 'ghost'), onclick: () => { S.pedit = editing ? null : m.id; render(); }, title: editing ? 'Close editor' : 'Edit model', 'aria-label': editing ? 'Close editor' : `Edit ${m.id}` }, icon(editing ? 'x' : 'edit')),
              h('button', { class: 'btn sm icon ghost danger', title: `Remove ${m.id}`, 'aria-label': `Remove ${m.id}`, onclick: () => { p.models = models.filter((x) => x !== m); piChanged(); } }, icon('trash'))
            )
          )
        )
      );
      if (test && !test.loading) rows.push(h('tr', { class: 'result-row' }, h('td', { colspan: 5 }, test.ok ? h('div', { class: 'ok-box' }, icon('check'), `Replied in ${test.ms} ms: "${test.reply}"`) : h('div', { class: 'error-box' }, icon('alert'), `Failed ${test.status || ''} ${test.error}`))));
      if (editing) rows.push(h('tr', { class: 'model-edit' }, h('td', { colspan: 5 }, piModelEditor(pid, m))));
    }
    panel = h(
      'div',
      { class: 'tabpanel' },
      models.length
        ? [
            h('div', { class: 'toolbar' }, h('span', { class: 'muted small' }, `${models.length} model${models.length === 1 ? '' : 's'}`), h('span', { class: 'spacer' }), h('button', { class: 'btn sm ghost', onclick: addById }, icon('plus'), 'Add by ID'), h('button', { class: 'btn sm soft', onclick: () => startDiscovery(pid, 'pi'), disabled: !p.baseUrl }, icon('download'), 'Fetch more')),
            h('div', { class: 'tablewrap' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', { class: 'num' }, 'Limits'), h('th', null, 'Capabilities'), h('th', { class: 'num' }, 'Price per 1M'), h('th', null))), h('tbody', null, rows))),
          ]
        : h(
            'div',
            { class: 'empty' },
            h('span', { class: 'icon-chip', style: '--h: var(--violet)' }, icon('layers')),
            h('h2', null, 'No models yet'),
            h('p', null, p.baseUrl ? 'Fetch the list this endpoint serves and pick the ones you want, or add a model by its ID.' : 'Set a base URL on the Connection tab first, then fetch its models.'),
            h('div', { class: 'btn-row', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => (p.baseUrl ? startDiscovery(pid, 'pi') : ((S.pptab = 'connection'), render())) }, icon(p.baseUrl ? 'download' : 'link'), p.baseUrl ? 'Fetch models' : 'Set base URL'), h('button', { class: 'btn', onclick: addById }, 'Add by ID'))
          )
    );
  }
  return h('div', { class: 'card flush' }, hero, panel);
}

async function piRunTest(pid, mid) {
  const p = piProviders()[pid];
  if ((p.api || 'openai-completions') !== 'openai-completions') toast('Test uses the OpenAI-style /chat/completions call; it may not work for this API format.');
  const ref = `pi:${pid}/${mid}`;
  S.tests[ref] = { loading: true };
  render();
  try {
    S.tests[ref] = await api('POST', '/api/test', { baseURL: p.baseUrl, apiKey: piKeyRef(p.apiKey === 'none' ? '' : p.apiKey), headers: p.headers, model: mid });
  } catch (e) {
    S.tests[ref] = { ok: false, error: e.message };
  }
  render();
}

function piModelEditor(pid, m) {
  const setR = (fn) => { fn(); piChanged(); };
  const setNum = (k, v) => setR(() => (v === undefined ? delete m[k] : (m[k] = v)));
  const vision = (m.input || []).includes('image');
  const setCost = (k, v) =>
    setR(() => {
      const c = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ...m.cost, [k]: v ?? 0 };
      // Pi wants all four rates or no cost at all.
      if (Object.values(c).every((x) => !x)) delete m.cost;
      else m.cost = c;
    });
  return h(
    'div',
    { class: 'editor-panel' },
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'General'),
      h(
        'div',
        { class: 'grid four' },
        field('Display name', textInput(m.name, (v) => setR(() => (v.trim() ? (m.name = v.trim()) : delete m.name)))),
        field('Context window', numInput(m.contextWindow, (v) => setNum('contextWindow', v), { placeholder: '128000', min: 1 })),
        field('Max output', numInput(m.maxTokens, (v) => setNum('maxTokens', v), { placeholder: '16384', min: 1 }))
      ),
      h(
        'div',
        { class: 'btn-row', style: 'gap:8px 20px;margin-top:12px' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!m.reasoning, onchange: (e) => setR(() => (e.target.checked ? (m.reasoning = true) : delete m.reasoning)) }), 'Reasoning'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: vision, onchange: (e) => setR(() => (e.target.checked ? (m.input = ['text', 'image']) : delete m.input)) }), 'Image input')
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h('div', { class: 'ep-title' }, 'Price per 1M tokens (USD)'),
      h(
        'div',
        { class: 'grid four' },
        field('Input', numInput(m.cost?.input, (v) => setCost('input', v), { step: 'any', placeholder: '0.00' })),
        field('Output', numInput(m.cost?.output, (v) => setCost('output', v), { step: 'any', placeholder: '0.00' })),
        field('Cache read', numInput(m.cost?.cacheRead, (v) => setCost('cacheRead', v), { step: 'any', placeholder: '0.00' })),
        field('Cache write', numInput(m.cost?.cacheWrite, (v) => setCost('cacheWrite', v), { step: 'any', placeholder: '0.00' }))
      )
    ),
    h(
      'div',
      { class: 'ep-section' },
      h(
        'details',
        { class: 'adv' },
        h('summary', null, 'Model JSON (compat, thinkingLevelMap, headers)'),
        h(
          'div',
          { class: 'body' },
          jsonEditor(m, (v) => {
            if (!isObj(v) || !v.id) throw new Error('A model needs an id');
            const list = piProviders()[pid].models;
            list[list.indexOf(m)] = v;
            S.pedit = v.id;
            piChanged();
          }, 12)
        )
      )
    )
  );
}

// ---------- raw view ----------

function viewRaw() {
  const ta = h('textarea', { class: 'editor', rows: 32, spellcheck: 'false', 'aria-label': 'Config JSON' });
  ta.value = JSON.stringify(S.cfg, null, 2);
  const state = h('span', { class: 'state' });
  const lines = h('span', { class: 'num' });
  const sync = () => {
    lines.textContent = `${ta.value.split('\n').length} lines`;
    try {
      JSON.parse(ta.value);
      ta.classList.remove('invalid');
      state.replaceChildren(h('span', { class: 'status-dot ok' }), 'Valid JSON');
    } catch (e) {
      ta.classList.add('invalid');
      state.replaceChildren(h('span', { class: 'status-dot bad' }), h('span', { style: 'color:var(--danger)' }, e.message));
    }
  };
  ta.addEventListener('input', sync);
  sync();
  const apply = () => {
    try {
      const v = JSON.parse(ta.value);
      if (!isObj(v)) throw new Error('Top level must be an object');
      S.cfg = v;
      markDirty();
      toast('Applied. Save to write the file.');
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return h(
    'div',
    null,
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Raw JSON'), h('div', { class: 'sub' }, 'Edit the whole config at once. Apply updates the other pages; Save writes the file.'))),
    h(
      'div',
      { class: 'card flush' },
      h('div', { class: 'doc-head' }, h('span', { class: 'icon-chip', style: '--h: var(--cyan)' }, icon('braces')), h('div', { class: 't' }, h('h2', null, S.file.path.split(/[\\/]/).pop()), h('div', { class: 'path', title: S.file.path }, S.file.path)), h('button', { class: 'btn sm ghost', onclick: () => render() }, 'Revert'), h('button', { class: 'btn sm primary', onclick: apply }, 'Apply')),
      ta,
      h('div', { class: 'doc-foot' }, state, h('span', { class: 'spacer' }), lines)
    )
  );
}

// ---------- wiring ----------

// Each page has its own hash route, so it can be linked and Back works.
const VIEWS = ['shared', ...Object.keys(VIEW_HARNESS)];
const viewFromHash = () => (VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'shared');
S.view = viewFromHash();
S.harness = VIEW_HARNESS[S.view] || 'opencode';
// The shared page reads the files on disk, so refresh it whenever it's opened.
const enterView = (view) => {
  if (view === 'shared' && S.shared) loadShared();
};
window.addEventListener('hashchange', () => {
  if (viewFromHash() === S.view) return;
  S.view = viewFromHash();
  enterView(S.view);
  render();
});
document.querySelectorAll('.nav').forEach((n) =>
  n.addEventListener('click', () => {
    if (location.hash.slice(1) !== n.dataset.view) location.hash = n.dataset.view;
    S.view = n.dataset.view;
    enterView(S.view);
    render();
  })
);
document.querySelectorAll('#harness-switch button').forEach((b) => b.addEventListener('click', () => go(HARNESS_HOME[b.dataset.harness])));
document.getElementById('save').addEventListener('click', save);
const reloadFromDisk = () => {
  if (isDirty() && !confirm('Discard unsaved changes?')) return;
  load();
};
document.getElementById('reload').addEventListener('click', reloadFromDisk);
document.getElementById('discard').addEventListener('click', reloadFromDisk);
document.getElementById('file-select').addEventListener('change', async (e) => {
  let p = e.target.value;
  if (isDirty() && !confirm('Discard unsaved changes and switch file?')) return renderFileSelect();
  if (p === '__custom') {
    p = prompt('Full path to an opencode.json / .jsonc file:');
    if (!p) return renderFileSelect();
  }
  try {
    S.selected = null;
    S.discovery = null;
    applyState(await api('POST', '/api/target', { path: p }));
  } catch (err) {
    toast(err.message, 'error');
    renderFileSelect();
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (S.view === 'files' && S.doc && (docDirty() || !S.doc.exists)) saveDoc();
    else if (S.view === 'zcode' && zcDirty()) saveZc();
    else if (S.view === 'pi' && piDirty()) savePi();
    else if (isDirty()) save();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (isDirty() || docDirty() || zcDirty() || piDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

load();
