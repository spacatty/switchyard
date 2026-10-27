'use strict';

// Z-Code (Z.ai's desktop agent) keeps custom providers in
// <base>/.zcode/v2/provider_config.json, validated by Zod schemas in the app.
// The shapes below mirror those schemas (checked against ZCode's bundled
// `providerConfigRules` / `modelConfigRules` validators).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { writeConfig } = require('./config');

const API_TYPES = ['openai-chat-completions', 'anthropic-messages', 'openai-responses'];

// Provider IDs that Z-Code's built-in templates already use. A personal rule with
// one of these IDs would overlay the built-in provider instead of adding a new one.
const RESERVED_IDS = [
  'zai-api', 'zai-standard-api', 'bigmodel-api', 'bigmodel-standard-api', 'moonshot-kimi', 'minimax', 'deepseek',
  'qwen-alibaba-model-studio-cn', 'qwen-alibaba-model-studio-intl', 'xiaomi-mimo', 'xiaomi-mimo-token-plan', 'openai',
  'anthropic', 'xai', 'openrouter', 'opencode-go-chat', 'opencode-go-messages', 'opencode-go-responses',
  'opencode-zen-responses', 'opencode-zen-messages', 'opencode-zen-chat',
];

// Z-Code's own default request mappings per API format (from its built-in modelApiRules).
// Manual model rules must carry a reasoning map, so new models get the same one Z-Code would use.
const REASONING_MAPS = {
  'openai-chat-completions':
    '{\n  "thinking": {\n    "type": reasoningLevel == "disabled" || reasoningLevel == "none" ? "disabled" : "enabled"\n  },\n  "enable_thinking": reasoningLevel != "disabled" && reasoningLevel != "none",\n  "reasoning_effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel,\n  "reasoning": {\n    "effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel\n  }\n}',
  'anthropic-messages':
    'reasoningLevel == "disabled"\n  ? {\n      "thinking": {\n        "type": "disabled"\n      }\n    }\n  : {\n      "thinking": {\n        "type": "adaptive"\n      },\n      "output_config": {\n        "effort": reasoningLevel == "enabled" ? "high" : reasoningLevel\n      }\n    }',
  'openai-responses': '{\n  "reasoning": {\n    "effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel\n  }\n}',
};

// A complete manual model rule; Z-Code rejects one with any of these fields missing.
function zcodeModelRule(providerId, modelId, apiType, { contextWindow = 128000, max = 32000, reasoning = false, image = false, pdf = false, video = false } = {}) {
  return {
    providerId,
    modelId,
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
        reasoningLevel: reasoning ? { values: ['disabled', 'low', 'medium', 'high'], map: REASONING_MAPS[apiType] || REASONING_MAPS['openai-chat-completions'] } : { values: ['disabled'], map: '{}' },
        maxOutputTokens: { max },
      },
    },
  };
}

// Same lookup order as Z-Code: ZCODE_DATA_BASE_DIR, then HOME, then the OS home dir.
function zcodeConfigPath() {
  const base = process.env.ZCODE_DATA_BASE_DIR?.trim() || process.env.HOME?.trim() || os.homedir();
  return path.join(base, '.zcode', 'v2', 'provider_config.json');
}

function emptyDoc() {
  return {
    schemaVersion: 1,
    config: {
      providerOrder: [],
      providerConfigRules: { providerRules: [] },
      modelConfigRules: { providerModelRules: [], manualProviderModelRules: [] },
    },
  };
}

function readZcode(file) {
  if (!fs.existsSync(file)) return { path: file, exists: false, doc: emptyDoc(), error: null };
  try {
    return { path: file, exists: true, doc: JSON.parse(fs.readFileSync(file, 'utf8')), error: null };
  } catch (e) {
    return { path: file, exists: true, doc: null, error: e.message };
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Catches the mistakes Z-Code's validator would reject, so a bad save can't
// leave Z-Code unable to load its providers.
function validateZcode(doc) {
  const errs = [];
  if (!isObj(doc) || doc.schemaVersion !== 1 || !isObj(doc.config)) return ['expected { "schemaVersion": 1, "config": { … } }'];
  const c = doc.config;
  const rules = c.providerConfigRules?.providerRules;
  if (!Array.isArray(rules)) errs.push('config.providerConfigRules.providerRules must be an array');
  const seen = new Set();
  for (const r of rules || []) {
    if (!r?.providerId) errs.push('every provider needs a providerId');
    else if (seen.has(r.providerId)) errs.push(`duplicate providerId "${r.providerId}"`);
    seen.add(r?.providerId);
    const api = r?.config?.api;
    if (api) {
      if (!API_TYPES.includes(api.type)) errs.push(`${r.providerId}: API format must be one of ${API_TYPES.join(', ')}`);
      if (api.baseUrl) {
        try {
          new URL(api.baseUrl);
        } catch {
          errs.push(`${r.providerId}: base URL is not a valid URL`);
        }
      }
    }
  }
  const mr = c.modelConfigRules;
  if (!isObj(mr) || !Array.isArray(mr.providerModelRules) || !Array.isArray(mr.manualProviderModelRules)) {
    errs.push('config.modelConfigRules needs providerModelRules and manualProviderModelRules arrays');
    return errs;
  }
  const auto = new Set(mr.providerModelRules.map((m) => `${m.providerId}\0${m.modelId}`));
  for (const m of mr.manualProviderModelRules) {
    const id = `${m?.providerId}/${m?.modelId}`;
    if (!m?.providerId || !m?.modelId) {
      errs.push('every model needs a providerId and modelId');
      continue;
    }
    if (auto.has(`${m.providerId}\0${m.modelId}`)) errs.push(`${id} is declared both automatically and manually`);
    const p = m.config?.properties;
    const o = m.config?.optionSpecs;
    if (!Number.isInteger(p?.contextWindow) || p.contextWindow <= 0) errs.push(`${id}: context window must be a positive whole number`);
    for (const k of ['supportsJsonSchemaOutput', 'supportsNativeWebSearch', 'supportsMidConversationSystem']) {
      if (typeof p?.[k] !== 'boolean') errs.push(`${id}: properties.${k} must be true or false`);
    }
    for (const k of ['supportsImage', 'supportsVideo', 'supportsPdf']) {
      if (typeof p?.inputFormat?.[k] !== 'boolean') errs.push(`${id}: properties.inputFormat.${k} must be true or false`);
    }
    if (!Number.isInteger(o?.maxOutputTokens?.max) || o.maxOutputTokens.max <= 0) errs.push(`${id}: max output must be a positive whole number`);
    const vals = o?.reasoningLevel?.values;
    if (!Array.isArray(vals) || !vals.length || vals.some((v) => typeof v !== 'string' || !v.trim()) || new Set(vals).size !== vals.length) {
      errs.push(`${id}: reasoning levels must be a non-empty list without duplicates`);
    }
    if (typeof o?.reasoningLevel?.map !== 'string' || !o.reasoningLevel.map.trim()) errs.push(`${id}: reasoning map must be a non-empty expression`);
  }
  return errs;
}

function writeZcode(file, doc) {
  const errs = validateZcode(doc);
  if (errs.length) throw new Error('Z-Code would reject this config:\n• ' + errs.join('\n• '));
  // The file holds plain API keys (Z-Code has no env lookup), so keep it owner-only.
  return writeConfig(file, doc, { mode: 0o600 });
}

// Z-Code rewrites provider_config.json from memory when it saves settings or exits,
// so edits made while it runs get lost. Best-effort check; null means "unknown".
function zcodeRunning() {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['tasklist', ['/FI', 'IMAGENAME eq ZCode.exe', '/NH', '/FO', 'CSV']]
      : process.platform === 'darwin'
        ? ['pgrep', ['-x', 'ZCode']]
        : ['pgrep', ['-ix', 'zcode']];
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 4000, windowsHide: true }, (err, stdout) => {
      if (process.platform === 'win32') return resolve(err ? null : /zcode\.exe/i.test(stdout));
      if (err) return resolve(err.code === 1 ? false : null);
      resolve(stdout.trim().length > 0);
    });
  });
}

module.exports = { zcodeConfigPath, readZcode, writeZcode, validateZcode, zcodeRunning, zcodeModelRule, emptyDoc, API_TYPES, RESERVED_IDS, REASONING_MAPS };
