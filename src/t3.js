'use strict';

// T3 Code has no provider list of its own: it runs other agents through "drivers".
// A custom endpoint is a claudeAgent instance in <home>/userdata/settings.json, under
// providerInstances, whose environment points Claude Code at the endpoint. Checks below
// mirror ProviderInstanceConfig and CustomModelSetting in T3's server bundle.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseJsonc, hasComments } = require('./jsonc');
const { writeConfig } = require('./config');

const DRIVER = 'claudeAgent';
const BASE_VAR = 'ANTHROPIC_BASE_URL';
const TOKEN_VAR = 'ANTHROPIC_AUTH_TOKEN';
const KEY_VAR = 'ANTHROPIC_API_KEY';
const HEADERS_VAR = 'ANTHROPIC_CUSTOM_HEADERS';

// Default instances are named after their driver, so a new instance must not reuse those.
const RESERVED_IDS = ['acpRegistry', 'antigravity', 'claudeAgent', 'codex', 'cursor', 'fx', 'grok', 'muse', 'opencode', 'pi'];

const SLUG = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const ENV_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Same lookup as T3: $T3CODE_HOME (with ~ expanded), else ~/.t3.
function t3ConfigPath() {
  const env = process.env.T3CODE_HOME?.trim();
  const home = env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.t3');
  return path.join(home, 'userdata', 'settings.json');
}

function readT3(file) {
  if (!fs.existsSync(file)) return { path: file, exists: false, doc: { providerInstances: {} }, error: null };
  const raw = fs.readFileSync(file, 'utf8');
  try {
    const doc = parseJsonc(raw);
    return { path: file, exists: true, doc, error: null, hasComments: hasComments(raw) };
  } catch (e) {
    return { path: file, exists: true, doc: null, error: e.message };
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Claude Code appends /v1/messages itself, so its base URL stops before /v1.
const anthropicRoot = (url) => String(url || '').trim().replace(/\/+$/, '').replace(/\/v1$/i, '');

const envVar = (inst, name) => (Array.isArray(inst?.environment) ? inst.environment.find((v) => v?.name === name) : undefined);

// A key T3 moved to its secret store reads back empty but is still there.
const hasStoredKey = (v) => !!(v && (v.valueRedacted || v.secret));

function headersToEnv(headers) {
  return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function headersFromEnv(text) {
  const out = {};
  for (const line of String(text || '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

const customModel = (id, name) => (name && name !== id ? { slug: id, name } : id);

// The instance for an endpoint. ANTHROPIC_API_KEY is emptied so one set on the machine
// can't override the token. Keyless endpoints get a placeholder so Claude Code doesn't
// fall back to the user's own login and send that to the endpoint.
function t3Instance({ name, baseURL, apiKey, headers }) {
  const environment = [
    { name: BASE_VAR, value: anthropicRoot(baseURL), sensitive: false },
    { name: TOKEN_VAR, value: apiKey || 'none', sensitive: true },
    { name: KEY_VAR, value: '', sensitive: false },
  ];
  if (headers && Object.keys(headers).length) environment.push({ name: HEADERS_VAR, value: headersToEnv(headers), sensitive: true });
  return { driver: DRIVER, displayName: name, enabled: true, environment, config: { customModels: [] } };
}

// Catches what T3 would reject. It falls back to default settings for the whole file
// when one field fails to decode, so a bad save would cost more than this provider.
function validateT3(doc) {
  const errs = [];
  if (!isObj(doc)) return ['expected a settings object'];
  if (doc.providerInstances === undefined) return errs;
  if (!isObj(doc.providerInstances)) return ['providerInstances must be an object'];
  for (const [id, inst] of Object.entries(doc.providerInstances)) {
    if (id.length > 64 || !SLUG.test(id)) errs.push(`${id}: an instance ID must start with a letter and use only letters, numbers, - and _ (64 characters at most)`);
    if (!isObj(inst)) {
      errs.push(`${id}: must be an object`);
      continue;
    }
    if (typeof inst.driver !== 'string' || !SLUG.test(inst.driver)) errs.push(`${id}: needs a driver`);
    if (inst.displayName !== undefined && !(typeof inst.displayName === 'string' && inst.displayName.trim())) errs.push(`${id}: display name can't be blank`);
    if (inst.enabled !== undefined && typeof inst.enabled !== 'boolean') errs.push(`${id}: enabled must be true or false`);
    if (inst.environment !== undefined) {
      if (!Array.isArray(inst.environment)) errs.push(`${id}: environment must be a list`);
      else {
        for (const v of inst.environment) {
          if (typeof v?.name !== 'string' || v.name.length > 128 || !ENV_NAME.test(v.name)) errs.push(`${id}: "${v?.name}" is not a valid variable name`);
          if (v?.value !== undefined && typeof v.value !== 'string') errs.push(`${id}: ${v?.name} must have a text value`);
        }
      }
    }
    if (inst.driver !== DRIVER) continue;
    const base = envVar(inst, BASE_VAR)?.value;
    if (base) {
      try {
        new URL(base);
      } catch {
        errs.push(`${id}: base URL is not a valid URL`);
      }
    }
    const models = inst.config?.customModels;
    if (models === undefined) continue;
    if (!Array.isArray(models)) {
      errs.push(`${id}: customModels must be a list`);
      continue;
    }
    const seen = new Set();
    for (const m of models) {
      const slug = typeof m === 'string' ? m : m?.slug;
      if (typeof slug !== 'string' || !slug.trim()) {
        errs.push(`${id}: every model needs an ID`);
        continue;
      }
      if (seen.has(slug)) errs.push(`${id}/${slug}: listed twice`);
      seen.add(slug);
    }
  }
  return errs;
}

function writeT3(file, doc) {
  const errs = validateT3(doc);
  if (errs.length) throw new Error('T3 Code would reject this config:\n• ' + errs.join('\n• '));
  // May hold plain API keys, so keep it owner-only like Z-Code's file.
  return writeConfig(file, doc, { mode: 0o600 });
}

module.exports = { t3ConfigPath, readT3, writeT3, validateT3, t3Instance, anthropicRoot, envVar, hasStoredKey, headersToEnv, headersFromEnv, customModel, DRIVER, BASE_VAR, TOKEN_VAR, KEY_VAR, HEADERS_VAR, RESERVED_IDS };
