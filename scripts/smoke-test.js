#!/usr/bin/env node
'use strict';

// End-to-end check: start the server on a temp config, discover models from a
// public endpoint, save a provider, and verify the written file.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { createServer } = require('../src/server');
const { parseJsonc } = require('../src/jsonc');

async function main() {
  // JSONC parser
  const parsed = parseJsonc('{\n // c\n "a": "http://x//y", /* b */ "b": [1,2,],\n}');
  assert.deepStrictEqual(parsed, { a: 'http://x//y', b: [1, 2] });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocjm-'));
  const file = path.join(dir, 'opencode.json');
  fs.writeFileSync(file, JSON.stringify({ $schema: 'https://opencode.ai/config.json', theme: 'x' }));

  process.env.XDG_CONFIG_HOME = path.join(dir, 'xdg');
  const zfile = path.join(dir, 'zcode', 'provider_config.json');
  const pfile = path.join(dir, 'pi', 'models.json');
  const { server, token } = createServer({ configPath: file, zcodePath: zfile, piPath: pfile, libraryPath: path.join(dir, 'lib', 'providers.json'), cwd: dir });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, p, body) => {
    const res = await fetch(base + p, { method, headers: { 'X-Token': token, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json() };
  };

  try {
    assert.strictEqual((await fetch(base + '/api/state')).status, 401, 'token required');
    const st = await call('GET', '/api/state');
    assert.strictEqual(st.json.config.theme, 'x');

    const d = await call('POST', '/api/discover', { baseURL: 'https://openrouter.ai/api/v1/models' });
    assert.strictEqual(d.status, 200, JSON.stringify(d.json));
    assert.ok(d.json.models.length > 10, 'models discovered');
    const m = d.json.models.find((x) => x.recommended && x.suggestion.limit);
    assert.ok(m, 'has a recommended model with limits');
    console.log(`discovered ${d.json.models.length} models; sample ${m.id}`);

    const cfg = { ...st.json.config, provider: { openrouter: { npm: d.json.hint.npm, options: { baseURL: d.json.baseURL }, models: { [m.id]: m.suggestion } } } };
    const sv = await call('POST', '/api/save', { config: cfg });
    assert.strictEqual(sv.status, 200);
    const written = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(written.provider.openrouter.models[m.id]);
    assert.ok(fs.existsSync(file + '.bak'), 'backup created');

    // Rules / agents / ignore files (global dir redirected to the temp folder).
    const files = await call('GET', '/api/files');
    assert.strictEqual(files.status, 200);
    const agentsMd = files.json.groups.find((g) => g.id === 'global-rules').files[0];
    assert.strictEqual(agentsMd.path, path.join(dir, 'xdg', 'opencode', 'AGENTS.md'));
    assert.strictEqual((await call('POST', '/api/file/write', { path: agentsMd.path, content: '# Rules\n' })).status, 200);
    assert.strictEqual(fs.readFileSync(agentsMd.path, 'utf8'), '# Rules\n');
    const created = await call('POST', '/api/file/create', { group: 'global-agents', name: 'review' });
    assert.strictEqual(created.status, 200, JSON.stringify(created.json));
    assert.ok(fs.existsSync(path.join(dir, 'xdg', 'opencode', 'agents', 'review.md')));
    assert.strictEqual((await call('POST', '/api/file/read', { path: path.join(dir, 'secret.txt') })).status, 400, 'unlisted files are refused');
    assert.strictEqual((await call('POST', '/api/file/create', { group: 'global-agents', name: '../x' })).status, 400, 'no path tricks');
    await call('POST', '/api/file/delete', { path: created.json.path });
    assert.ok(fs.existsSync(created.json.path + '.bak') && !fs.existsSync(created.json.path), 'delete keeps a .bak');

    // Z-Code provider_config.json (path redirected to the temp folder).
    const zs = await call('GET', '/api/zcode');
    assert.strictEqual(zs.status, 200);
    assert.strictEqual(zs.json.path, zfile);
    assert.strictEqual(zs.json.exists, false);
    const zdoc = zs.json.doc;
    zdoc.config.providerConfigRules.providerRules.push({
      providerId: 'openrouter-custom',
      providerName: 'OpenRouter',
      config: { group: 'standard-personal', access: { type: 'api-key', apiKey: null }, api: { type: 'openai-chat-completions', baseUrl: d.json.baseURL }, personalModelIds: [m.id], modelOrder: [m.id] },
    });
    const zmodel = {
      providerId: 'openrouter-custom',
      modelId: m.id,
      config: {
        enabled: true,
        properties: { contextWindow: m.suggestion.limit.context, supportsJsonSchemaOutput: false, supportsNativeWebSearch: false, supportsMidConversationSystem: false, inputFormat: { supportsImage: false, supportsVideo: false, supportsPdf: false } },
        optionSpecs: { reasoningLevel: { values: ['disabled'], map: '{}' }, maxOutputTokens: { max: m.suggestion.limit.output } },
      },
    };
    zdoc.config.modelConfigRules.manualProviderModelRules.push(zmodel);
    const zsv = await call('POST', '/api/zcode/save', { doc: zdoc });
    assert.strictEqual(zsv.status, 200, JSON.stringify(zsv.json));
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(zfile, 'utf8')), zdoc);
    const bad = JSON.parse(JSON.stringify(zdoc));
    bad.config.modelConfigRules.manualProviderModelRules[0].config.optionSpecs.reasoningLevel.values = [];
    assert.strictEqual((await call('POST', '/api/zcode/save', { doc: bad })).status, 400, 'invalid Z-Code config is refused');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(zfile, 'utf8')), zdoc, 'refused save leaves the file alone');
    assert.strictEqual((await call('POST', '/api/zcode/save', { doc: zdoc })).status, 200);
    assert.ok(fs.existsSync(zfile + '.bak'), 'Z-Code backup created');

    // Shared providers: the OpenRouter provider above is in OpenCode and Z-Code; copy it to Pi.
    const sh = await call('GET', '/api/shared');
    assert.strictEqual(sh.status, 200);
    const orp = sh.json.providers.find((p) => p.in.opencode && p.in.zcode);
    assert.ok(orp, 'OpenCode and Z-Code entries for the same endpoint are merged');
    const cp = await call('POST', '/api/shared/copy', { key: orp.key, to: 'pi' });
    assert.strictEqual(cp.status, 200, JSON.stringify(cp.json));
    const piDoc = JSON.parse(fs.readFileSync(pfile, 'utf8'));
    const piProv = piDoc.providers[cp.json.result.id];
    assert.ok(piProv && piProv.baseUrl && piProv.api === 'openai-completions' && piProv.apiKey, 'Pi provider written with the fields Pi requires');
    assert.ok(piProv.models.some((x) => x.id === m.id && x.contextWindow === m.suggestion.limit.context));
    const again = await call('POST', '/api/shared/copy', { key: orp.key, to: 'pi' });
    assert.strictEqual(again.json.result.added, 0, 'copying twice adds nothing');
    assert.strictEqual((await call('POST', '/api/pi/save', { doc: { providers: { x: { baseUrl: 'http://y', models: [{ id: 'a' }] } } } })).status, 400, 'invalid Pi config is refused');
    // Library: save by hand, then it shows up and can be removed.
    const lib = await call('POST', '/api/shared/library/save', { provider: { name: 'Local', baseURL: 'http://localhost:11434/v1', models: [{ id: 'llama3' }] } });
    assert.ok(lib.json.providers.some((p) => p.in.library && p.models[0]?.id === 'llama3'));
    const rm = await call('POST', '/api/shared/library/remove', { key: 'http://localhost:11434/v1' });
    assert.ok(!rm.json.providers.some((p) => p.in.library));

    const schema = await call('GET', '/api/schema');
    assert.ok(schema.json.schema?.properties, 'schema available');
    console.log(`schema source: ${schema.json.source}`);
    console.log('smoke test passed');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
