<h1 align="center">Switchyard</h1>

<p align="center">
  <b>One provider list for all your coding agents.</b><br>
  Set up a custom model provider once, then copy it into OpenCode, Z-Code and Pi in one click.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@spacatty/switchyard"><img alt="npm" src="https://img.shields.io/npm/v/@spacatty/switchyard"></a>
  <a href="https://nodejs.org"><img alt="node" src="https://img.shields.io/node/v/@spacatty/switchyard"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/npm/l/@spacatty/switchyard"></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/shared-dark.png">
    <img alt="Shared providers: every custom provider from OpenCode, Z-Code and Pi in one table, with Copy buttons per agent" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/shared-light.png" width="900">
  </picture>
</p>

```bash
npx @spacatty/switchyard
```

Switchyard finds each agent's config, starts a local web UI on `127.0.0.1` and opens your browser. Works on macOS, Linux and Windows with Node.js 18+, with no dependencies.

## Why

Every coding agent ("harness") keeps custom providers in its own format: OpenCode's `provider` block, Z-Code's provider and model rules, Pi's `models.json`. Adding the same OpenRouter, DeepInfra or self-hosted endpoint to each one means typing the same model IDs, context limits and prices again, in a different shape every time.

Switchyard reads them all, shows them as one list, and writes each format for you.

## Shared providers

Every custom provider from every agent, merged by endpoint URL. For each agent you see:

- **✓ id**: the agent has the provider and all its models
- **+N**: it has the provider but is missing N models; click to add them
- **Copy**: it doesn't have it yet; click to add it with all its models

Open a row to pick individual models and copy only those.

<p align="center"><img alt="An expanded provider with per-model checkboxes and Copy selected buttons for each agent" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/shared-detail.png" width="900"></p>

Copying is safe to repeat: it reuses the provider the agent already has for that URL, adds only missing models, and never overwrites an existing API key or headers.

**Library.** Providers you add with **Add by hand** or **Add from endpoint** on this page are kept in Switchyard's own file, so they stay listed even when no agent has them yet. Any provider can be saved there with **Save to library**.

## Add a provider from its endpoint

Paste a base URL (OpenRouter, DeepInfra, Together, Groq, vLLM, LiteLLM, LM Studio, Ollama…) and an optional key. Switchyard calls `/models`, then fills in each model's context and output limits, pricing, reasoning, tool and vision support from the endpoint and [models.dev](https://models.dev). Filter, tick the ones you want, done. Embedding, image and TTS models are flagged so you don't add them by accident.

<p align="center"><img alt="Model picker after fetching OpenRouter's model list, filtered to qwen3, with limits and capabilities per model" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/discover.png" width="900"></p>

## An editor for each agent

Switch between agents in the sidebar.

| OpenCode | Z-Code | Pi |
|---|---|---|
| <img alt="OpenCode provider editor" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/opencode.png"> | <img alt="Z-Code provider editor" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/zcode.png"> | <img alt="Pi provider editor" src="https://raw.githubusercontent.com/spacatty/switchyard/main/docs/screenshots/pi.png"> |
| Providers and models, default and small model, every other setting (built from the live `opencode.ai/config.json` schema), `AGENTS.md`, agents and commands, raw JSON. | Custom providers and their models, including reasoning levels and image, PDF and video input. Chat completions, Responses and Anthropic APIs. | Providers, models, limits, reasoning, image input and prices, plus raw JSON for `compat`, `thinkingLevelMap` and the rest. |

Every model row has a **test** button that sends a tiny request to check the model answers.

## API keys between agents

Each agent stores keys differently, so copying converts them:

| Stored as | OpenCode | Pi | Z-Code |
|---|---|---|---|
| Env variable | `{env:VAR}` | `$VAR` | the variable's value, as plain text (Z-Code can't read variables) |
| File | `{file:path}` | the file's contents, as plain text | the file's contents, as plain text |
| Command (Pi `!cmd`) | not copied | `!cmd` | not copied |

Switchyard tells you whenever a copy stored a key as plain text or couldn't copy it.

## Files it edits

| Agent | Default path |
|---|---|
| OpenCode | `$OPENCODE_CONFIG`, `~/.config/opencode/opencode.json(c)` (on Windows too), or the project's `opencode.json(c)` / `.opencode/opencode.json(c)`. Switch between them in the sidebar. |
| Z-Code | `~/.zcode/v2/provider_config.json` (or `$ZCODE_DATA_BASE_DIR/.zcode/v2/…`) |
| Pi | `~/.pi/agent/models.json` (or `$PI_CODING_AGENT_DIR/models.json`) |
| Library | `~/.config/switchyard/providers.json` (respects `$XDG_CONFIG_HOME`) |

Every write makes a `.bak` first and replaces the file atomically, and each config is checked against what its agent would reject before it's written. Z-Code, Pi and library files are written owner-only (`0600`).

**Z-Code:** quit it (including the tray icon) before saving or copying to it. Z-Code keeps its providers in memory and rewrites its file when it exits, which would undo your changes. Switchyard warns you while it's running.

**Pi:** re-reads `models.json` every time you open `/model`, so no restart is needed. Pi hides a provider's models if it has no key, so keyless endpoints get the placeholder key `none`.

## Options

```
npx @spacatty/switchyard [options]

-c, --config <path>        OpenCode config (default: auto-detect)
    --zcode-config <path>  Z-Code provider_config.json
    --pi-config <path>     Pi models.json
    --library <path>       Switchyard's provider library
-p, --port <port>          Port (default 4747, falls back to a free one)
    --no-open              Don't open the browser
```

To install it as a `switchyard` command:

```bash
npm i -g @spacatty/switchyard
```

Switchyard used to be `@spacatty/occ-manager`; the `occ-manager` command still works.

## Security

- The server listens on `127.0.0.1` only, checks the `Host` header, and requires a random per-session token, so other sites open in your browser can't talk to it.
- API keys are only ever sent to the endpoint you entered, and never logged.

## Development

```bash
git clone https://github.com/spacatty/switchyard
cd switchyard
# Point all four paths at scratch files, never at your real configs:
node bin/cli.js --config /tmp/sy/opencode.json --zcode-config /tmp/sy/zc.json --pi-config /tmp/sy/pi.json --library /tmp/sy/lib.json
```

| Command | What it does |
|---|---|
| `npm start` | Run the CLI |
| `npm test` | End-to-end smoke test (needs network: hits OpenRouter `/models` and opencode.ai) |
| `npm run check-schema` | Compare the live OpenCode schema with the bundled snapshot |
| `npm run update-schema` | Refresh the bundled snapshot in `schema/` |

The UI in `public/` is plain HTML, CSS and JS with no build step. See [AGENTS.md](AGENTS.md) for the code layout, how to add another agent, and the rules contributors (human or AI) follow.

## License

[MIT](LICENSE)
