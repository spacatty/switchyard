'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { candidatePaths, pickDefault, readConfig, writeConfig } = require('./config');
const { discover, testModel, getSchema } = require('./discover');
const { listFiles, readFile, writeFile, createFile, removeFile } = require('./files');
const { zcodeConfigPath, readZcode, writeZcode, zcodeRunning, API_TYPES, RESERVED_IDS, REASONING_MAPS } = require('./zcode');
const pi = require('./pi');
const shared = require('./shared');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function createServer({ configPath, zcodePath, piPath, libraryPath, cwd = process.cwd() }) {
  const token = crypto.randomBytes(16).toString('hex');
  const state = {
    target: configPath ? path.resolve(configPath) : pickDefault(candidatePaths(cwd)),
    zcode: zcodePath ? path.resolve(zcodePath) : zcodeConfigPath(),
    pi: piPath ? path.resolve(piPath) : pi.piConfigPath(),
    library: libraryPath ? path.resolve(libraryPath) : shared.libraryPath(),
  };

  const send = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > 10 * 1024 * 1024) reject(new Error('Body too large'));
        else chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

  // Only matters when editing the file the running Z-Code app actually uses.
  const zcodeLive = async () => state.zcode === zcodeConfigPath() && (await zcodeRunning());

  // Everything on disk, merged into one provider list.
  const sharedResponse = async () => {
    const oc = readConfig(state.target);
    const zc = readZcode(state.zcode);
    const pc = pi.readPi(state.pi);
    const lib = shared.readLibrary(state.library);
    const harnesses = [
      { id: 'opencode', name: 'OpenCode', path: oc.path, exists: oc.exists, error: oc.error || null },
      { id: 'zcode', name: 'Z-Code', path: zc.path, exists: zc.exists, error: zc.error, running: await zcodeLive() },
      { id: 'pi', name: 'Pi', path: pc.path, exists: pc.exists, error: pc.error },
    ];
    const providers = shared.buildShared({
      library: lib.doc?.providers || [],
      opencode: oc.config ? shared.fromOpenCode(oc.config) : [],
      zcode: zc.doc ? shared.fromZcode(zc.doc) : [],
      pi: pc.doc ? shared.fromPi(pc.doc) : [],
    });
    return { providers, harnesses, library: { path: lib.path, error: lib.error || null } };
  };

  // Writes that would clobber something ask the UI to confirm first (body.force).
  const needsConfirm = (msg) => Object.assign(new Error(msg), { confirm: true });

  const copyToHarness = async ({ key, to, models, force }) => {
    const entry = (await sharedResponse()).providers.find((p) => p.key === key);
    if (!entry) throw new Error('That provider is no longer in the shared list. Reload and try again.');
    let doc;
    let write;
    if (to === 'opencode') {
      const oc = readConfig(state.target);
      if (!oc.config) throw new Error(`Could not parse ${oc.path}: ${oc.error}`);
      if (oc.hasComments && !force) throw needsConfirm(`${path.basename(oc.path)} contains comments. Writing to it removes them (a .bak backup is kept). Continue?`);
      doc = oc.config;
      write = () => writeConfig(state.target, doc);
    } else if (to === 'zcode') {
      const zc = readZcode(state.zcode);
      if (!zc.doc) throw new Error(`Could not parse ${zc.path}: ${zc.error}`);
      if (!force && (await zcodeLive())) throw needsConfirm('Z-Code is running and rewrites its config when it exits, which would undo this copy. Quit Z-Code first (including the tray icon). Copy anyway?');
      doc = zc.doc;
      write = () => writeZcode(state.zcode, doc);
    } else if (to === 'pi') {
      const pc = pi.readPi(state.pi);
      if (!pc.doc) throw new Error(`Could not parse ${pc.path}: ${pc.error}`);
      if (pc.hasComments && !force) throw needsConfirm('models.json contains comments. Writing to it removes them (a .bak backup is kept). Continue?');
      doc = pc.doc;
      write = () => pi.writePi(state.pi, doc);
    } else throw new Error('Unknown harness');
    const result = shared.applyTo(to, doc, entry, Array.isArray(models) ? models : null);
    const r = write();
    return { ...(await sharedResponse()), result: { ...result, to, backup: r.backup } };
  };

  const saveToLibrary = async ({ provider, replaceKey }) => {
    if (!provider?.baseURL || !/^https?:\/\//i.test(provider.baseURL)) throw new Error('A provider needs a base URL starting with http:// or https://');
    const lib = shared.readLibrary(state.library);
    if (!lib.doc) throw new Error(`Could not parse ${lib.path}: ${lib.error}`);
    const key = shared.urlKey(provider.baseURL);
    const old = replaceKey || key;
    const list = lib.doc.providers.filter((p) => shared.urlKey(p.baseURL) !== old && shared.urlKey(p.baseURL) !== key);
    list.push({ id: provider.id || key, name: provider.name || provider.id || key, baseURL: provider.baseURL, api: provider.api || 'openai-chat', apiKey: provider.apiKey || undefined, headers: provider.headers || undefined, models: Array.isArray(provider.models) ? provider.models : [] });
    lib.doc.providers = list;
    shared.writeLibrary(state.library, lib.doc);
    return sharedResponse();
  };

  const stateResponse = () => {
    const candidates = candidatePaths(cwd);
    if (!candidates.some((c) => c.path === state.target)) candidates.unshift({ path: state.target, scope: 'custom', exists: fs.existsSync(state.target) });
    return { ...readConfig(state.target), candidates };
  };

  const routes = {
    'GET /api/state': async () => stateResponse(),
    'POST /api/target': async (body) => {
      if (!body.path || !/\.jsonc?$/i.test(body.path)) throw new Error('Config path must end with .json or .jsonc');
      state.target = path.resolve(body.path);
      return stateResponse();
    },
    'POST /api/save': async (body) => {
      if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) throw new Error('config must be an object');
      const r = writeConfig(state.target, body.config);
      return { ...stateResponse(), backup: r.backup };
    },
    'POST /api/discover': async (body) => discover(body),
    'POST /api/test': async (body) => testModel(body),
    'GET /api/schema': async () => getSchema(),
    'GET /api/files': async () => listFiles(cwd),
    'POST /api/file/read': async (body) => readFile(String(body.path || ''), cwd),
    'POST /api/file/write': async (body) => writeFile(String(body.path || ''), body.content, cwd),
    'POST /api/file/create': async (body) => createFile(String(body.group || ''), String(body.name || '').trim(), cwd),
    'POST /api/file/delete': async (body) => removeFile(String(body.path || ''), cwd),
    'GET /api/shared': async () => sharedResponse(),
    'POST /api/shared/copy': async (body) => copyToHarness(body),
    'POST /api/shared/library/save': async (body) => saveToLibrary(body),
    'POST /api/shared/library/remove': async (body) => {
      const lib = shared.readLibrary(state.library);
      if (!lib.doc) throw new Error(`Could not parse ${lib.path}: ${lib.error}`);
      lib.doc.providers = lib.doc.providers.filter((p) => shared.urlKey(p.baseURL) !== body.key);
      shared.writeLibrary(state.library, lib.doc);
      return sharedResponse();
    },
    'GET /api/pi': async () => ({ ...pi.readPi(state.pi), apiTypes: pi.API_TYPES, reserved: pi.BUILTIN_IDS }),
    'POST /api/pi/save': async (body) => {
      const r = pi.writePi(state.pi, body.doc);
      return { ...pi.readPi(state.pi), apiTypes: pi.API_TYPES, reserved: pi.BUILTIN_IDS, backup: r.backup };
    },
    'GET /api/zcode': async () => ({ ...readZcode(state.zcode), running: await zcodeLive(), apiTypes: API_TYPES, reserved: RESERVED_IDS, reasoningMaps: REASONING_MAPS }),
    'POST /api/zcode/save': async (body) => {
      const r = writeZcode(state.zcode, body.doc);
      return { ...readZcode(state.zcode), running: await zcodeLive(), backup: r.backup };
    },
  };

  const server = http.createServer(async (req, res) => {
    // Only answer to localhost names (blocks DNS-rebinding attacks).
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      if (req.headers['x-token'] !== token) return send(res, 401, { error: 'Invalid session token. Reopen the URL printed in the terminal.' });
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) return send(res, 404, { error: 'Not found' });
      try {
        const body = req.method === 'POST' ? await readBody(req) : {};
        return send(res, 200, await handler(body));
      } catch (e) {
        return send(res, 400, { error: e.message, attempts: e.attempts, confirm: e.confirm });
      }
    }

    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(PUBLIC_DIR, path.normalize(rel));
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });

  return { server, token, state };
}

module.exports = { createServer };
