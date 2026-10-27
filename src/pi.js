'use strict';

// Pi (pi coding agent) reads custom providers from <agent dir>/models.json.
// Checks below mirror its TypeBox schema and validateConfig() in core/model-registry.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseJsonc, hasComments } = require('./jsonc');
const { writeConfig } = require('./config');

const API_TYPES = ['openai-completions', 'openai-responses', 'anthropic-messages', 'google-generative-ai'];

// Pi's built-in provider names. A models.json entry with one of these names
// overrides the built-in provider instead of adding a new one.
const BUILTIN_IDS = [
  'amazon-bedrock', 'anthropic', 'azure-openai-responses', 'cerebras', 'cloudflare-ai-gateway', 'cloudflare-workers-ai',
  'deepseek', 'fireworks', 'github-copilot', 'google', 'google-vertex', 'groq', 'huggingface', 'kimi-coding', 'minimax',
  'minimax-cn', 'mistral', 'moonshotai', 'moonshotai-cn', 'openai', 'openai-codex', 'opencode', 'opencode-go', 'openrouter',
  'together', 'vercel-ai-gateway', 'xai', 'xiaomi', 'xiaomi-token-plan-ams', 'xiaomi-token-plan-cn', 'xiaomi-token-plan-sgp', 'zai',
];

// Same lookup as Pi: $PI_CODING_AGENT_DIR (with ~ expanded), else ~/.pi/agent.
function piConfigPath() {
  const env = process.env.PI_CODING_AGENT_DIR?.trim();
  const dir = env ? env.replace(/^~(?=$|[\\/])/, os.homedir()) : path.join(os.homedir(), '.pi', 'agent');
  return path.join(dir, 'models.json');
}

function readPi(file) {
  if (!fs.existsSync(file)) return { path: file, exists: false, doc: { providers: {} }, error: null };
  const raw = fs.readFileSync(file, 'utf8');
  try {
    const doc = parseJsonc(raw);
    return { path: file, exists: true, doc, error: null, hasComments: hasComments(raw) };
  } catch (e) {
    return { path: file, exists: true, doc: null, error: e.message };
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0;

function validatePi(doc) {
  const errs = [];
  if (!isObj(doc) || !isObj(doc.providers)) return ['expected { "providers": { … } }'];
  for (const [name, p] of Object.entries(doc.providers)) {
    if (!isObj(p)) {
      errs.push(`${name}: must be an object`);
      continue;
    }
    for (const k of ['name', 'baseUrl', 'apiKey', 'api']) if (p[k] !== undefined && !nonEmpty(p[k])) errs.push(`${name}: "${k}" must be a non-empty string`);
    const models = p.models ?? [];
    if (!Array.isArray(models)) {
      errs.push(`${name}: "models" must be a list`);
      continue;
    }
    const builtin = BUILTIN_IDS.includes(name);
    if (!models.length && !p.baseUrl && !p.headers && !p.compat && !(isObj(p.modelOverrides) && Object.keys(p.modelOverrides).length)) {
      errs.push(`${name}: needs a base URL or at least one model`);
    }
    if (models.length && !builtin) {
      if (!p.baseUrl) errs.push(`${name}: a base URL is required when defining models`);
      if (!p.apiKey) errs.push(`${name}: an API key is required when defining models (use any placeholder for keyless servers)`);
    }
    const seen = new Set();
    for (const m of models) {
      const id = `${name}/${m?.id}`;
      if (!nonEmpty(m?.id)) {
        errs.push(`${name}: every model needs an id`);
        continue;
      }
      if (seen.has(m.id)) errs.push(`${id}: listed twice`);
      seen.add(m.id);
      if (!p.api && !m.api && !builtin) errs.push(`${id}: no API format set on the provider or the model`);
      for (const k of ['contextWindow', 'maxTokens']) if (m[k] !== undefined && !(typeof m[k] === 'number' && m[k] > 0)) errs.push(`${id}: ${k} must be a positive number`);
      if (m.input !== undefined && (!Array.isArray(m.input) || m.input.some((v) => v !== 'text' && v !== 'image'))) errs.push(`${id}: input may only contain "text" and "image"`);
      if (m.cost !== undefined && (!isObj(m.cost) || ['input', 'output', 'cacheRead', 'cacheWrite'].some((k) => typeof m.cost[k] !== 'number'))) {
        errs.push(`${id}: cost needs input, output, cacheRead and cacheWrite numbers`);
      }
      if (m.reasoning !== undefined && typeof m.reasoning !== 'boolean') errs.push(`${id}: reasoning must be true or false`);
    }
  }
  return errs;
}

function writePi(file, doc) {
  const errs = validatePi(doc);
  if (errs.length) throw new Error('Pi would reject this config:\n• ' + errs.join('\n• '));
  // May hold plain API keys, so keep it owner-only like Z-Code's file.
  return writeConfig(file, doc, { mode: 0o600 });
}

module.exports = { piConfigPath, readPi, writePi, validatePi, API_TYPES, BUILTIN_IDS };
