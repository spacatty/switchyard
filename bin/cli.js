#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const { createServer } = require('../src/server');
const pkg = require('../package.json');

const HELP = `
switchyard v${pkg.version}
One provider list for your coding agents. A local web UI that reads the custom
providers from OpenCode, Z-Code and Pi, and copies them between them.

Usage:
  npx @spacatty/switchyard [options]

Options:
  -c, --config <path>        OpenCode config to edit (default: auto-detect)
      --zcode-config <path>  Z-Code provider_config.json (default: ~/.zcode/v2/provider_config.json)
      --pi-config <path>     Pi models.json (default: ~/.pi/agent/models.json)
      --library <path>       Shared provider library (default: ~/.config/switchyard/providers.json)
  -p, --port <port>          Port to listen on (default: 4747, falls back to a free port)
      --no-open              Don't open the browser automatically
  -h, --help                 Show this help
  -v, --version              Show version
`;

function parseArgs(argv) {
  const opts = { port: 4747, open: true, config: null, zcodeConfig: null, piConfig: null, library: null, portExplicit: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-v' || a === '--version') opts.version = true;
    else if (a === '--no-open') opts.open = false;
    else if (a === '-p' || a === '--port') {
      opts.port = Number(argv[++i]);
      opts.portExplicit = true;
    } else if (a === '-c' || a === '--config') opts.config = argv[++i];
    else if (a === '--zcode-config') opts.zcodeConfig = argv[++i];
    else if (a === '--pi-config') opts.piConfig = argv[++i];
    else if (a === '--library') opts.library = argv[++i];
    else {
      console.error(`Unknown option: ${a}\n${HELP}`);
      process.exit(1);
    }
  }
  return opts;
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* user can open the URL manually */
  }
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return console.log(HELP);
  if (opts.version) return console.log(pkg.version);

  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    console.error('switchyard requires Node.js 18 or newer.');
    process.exit(1);
  }

  const { server, token, state } = createServer({ configPath: opts.config, zcodePath: opts.zcodeConfig, piPath: opts.piConfig, libraryPath: opts.library });
  let port;
  try {
    port = await listen(server, opts.port);
  } catch (e) {
    if (e.code !== 'EADDRINUSE' || opts.portExplicit) throw e;
    port = await listen(server, 0);
  }

  const url = `http://localhost:${port}/?t=${token}`;
  console.log(`\n  Switchyard v${pkg.version}`);
  console.log(`  OpenCode: ${state.target}`);
  console.log(`  Z-Code:   ${state.zcode}`);
  console.log(`  Pi:       ${state.pi}`);
  console.log(`  Library:  ${state.library}`);
  console.log(`  Open:     ${url}\n`);
  console.log('  Press Ctrl+C to stop.\n');
  if (opts.open) openBrowser(url);

  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
