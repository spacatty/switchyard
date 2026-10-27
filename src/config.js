'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseJsonc, hasComments } = require('./jsonc');

const CONFIG_NAMES = ['opencode.jsonc', 'opencode.json', 'config.json'];

// OpenCode uses XDG-style paths on every platform (including Windows):
// ~/.config/opencode/opencode.json(c)
function globalConfigDir() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'opencode');
}

function candidatePaths(cwd = process.cwd()) {
  const list = [];
  const add = (p, scope) => {
    const abs = path.resolve(p);
    if (list.some((c) => c.path === abs)) return;
    list.push({ path: abs, scope, exists: fs.existsSync(abs) });
  };
  if (process.env.OPENCODE_CONFIG) add(process.env.OPENCODE_CONFIG, 'env');
  const gdir = globalConfigDir();
  for (const name of CONFIG_NAMES) add(path.join(gdir, name), 'global');
  for (const name of ['opencode.jsonc', 'opencode.json']) add(path.join(cwd, name), 'project');
  for (const name of ['opencode.jsonc', 'opencode.json']) add(path.join(cwd, '.opencode', name), 'project');
  // Hide config.json unless it actually exists (legacy name).
  return list.filter((c) => c.exists || !c.path.endsWith('config.json'));
}

function pickDefault(candidates) {
  const existing = candidates.filter((c) => c.exists);
  // Prefer a file that already holds providers, since that's the main use case.
  for (const c of existing) {
    try {
      const cfg = parseJsonc(fs.readFileSync(c.path, 'utf8'));
      if (cfg && (cfg.provider || cfg.providers)) return c.path;
    } catch {
      /* ignore unreadable */
    }
  }
  if (existing.length) return existing[0].path;
  return path.join(globalConfigDir(), 'opencode.json');
}

function readConfig(file) {
  if (!fs.existsSync(file)) {
    return { path: file, exists: false, raw: '', config: { $schema: 'https://opencode.ai/config.json' }, hasComments: false };
  }
  const raw = fs.readFileSync(file, 'utf8');
  let config;
  let error = null;
  try {
    config = parseJsonc(raw);
  } catch (e) {
    error = e.message;
    config = null;
  }
  return { path: file, exists: true, raw, config, error, hasComments: hasComments(raw) };
}

function writeConfig(file, config, { mode } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let backup = null;
  if (fs.existsSync(file)) {
    backup = file + '.bak';
    fs.copyFileSync(file, backup);
    if (mode) fs.chmodSync(backup, mode);
  }
  const text = JSON.stringify(config, null, 2) + '\n';
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, text, { encoding: 'utf8', mode });
  fs.renameSync(tmp, file);
  return { backup };
}

module.exports = { candidatePaths, pickDefault, readConfig, writeConfig, globalConfigDir };
