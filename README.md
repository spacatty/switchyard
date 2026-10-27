# Switchyard

[![npm](https://img.shields.io/npm/v/@spacatty/switchyard)](https://www.npmjs.com/package/@spacatty/switchyard)
[![node](https://img.shields.io/node/v/@spacatty/switchyard)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@spacatty/switchyard)](LICENSE)

One provider list for all your coding agents. Switchyard is a local web UI that reads the custom model providers you've set up in [OpenCode](https://opencode.ai), [Z-Code](https://z.ai) and [Pi](https://pi.dev), shows them as one list, and copies any of them into another agent in one click, with model IDs, context limits, reasoning and vision support already filled in.

```bash
npx @spacatty/switchyard
```

It finds each agent's config, starts a server on `127.0.0.1` and opens your browser. Works on macOS, Linux and Windows with Node.js 18+. No dependencies.

Or install it globally and run `switchyard`:

```bash
npm i -g @spacatty/switchyard
```

## Why

Every coding agent ("harness") stores custom providers in its own format: OpenCode's `provider` block, Z-Code's provider and model rules, Pi's `models.json`. Setting up the same OpenRouter, DeepInfra or self-hosted endpoint in each one means typing the same model IDs and limits again, in a different shape each time. Switchyard keeps one list and writes each format for you.

## Features

- **Shared providers.** Every custom provider found in OpenCode, Z-Code and Pi, merged by endpoint URL. Each row shows which agents already have it and how many of its models. **Copy** adds it to an agent that doesn't; **+N** adds the models that agent is missing. Expand a row to copy only some models.
- **Library.** Add a provider by hand or from an endpoint without picking an agent yet. It's kept in `~/.config/switchyard/providers.json` and stays listed even if you remove it from every agent.
- **Add from an endpoint.** Paste a base URL (OpenRouter, DeepInfra, Together, Groq, vLLM, LiteLLM, LM Studio, Ollama…) and an optional key. Switchyard calls `/models` and fills in each model's limits, pricing and capabilities from the endpoint and [models.dev](https://models.dev). Embedding, image and TTS models are flagged.
- **Per-agent editors.** Switch between OpenCode, Z-Code and Pi in the sidebar to edit everything that agent supports:
  - **OpenCode:** providers and models, default models, every other setting (generated from `opencode.ai/config.json`), `AGENTS.md` / agents / commands, raw JSON.
  - **Z-Code:** custom providers and their models, including reasoning levels and image/PDF/video input.
  - **Pi:** providers, models, costs, plus raw JSON for `compat`, `thinkingLevelMap` and the rest.
- **Test button.** Sends a tiny request to check a model answers.
- **Safe writes.** Every write makes a `.bak` first and replaces the file atomically. Configs are checked against what each agent would reject before writing.

## API keys between agents

Each agent stores keys differently, so copying converts them:

| Stored as | OpenCode | Pi | Z-Code |
|---|---|---|---|
| Env variable | `{env:VAR}` | `$VAR` | the variable's value, as plain text (Z-Code can't read variables) |
| File | `{file:path}` | the file's contents, as plain text | the file's contents, as plain text |
| Command (Pi `!cmd`) | not copied | `!cmd` | not copied |

Switchyard tells you whenever a copy stored a key as plain text or couldn't copy it. Z-Code and Pi files are written owner-only (`0600`). Keys are only ever sent to the endpoint you entered, and never logged.

## Which files it edits

| Agent | Default path |
|---|---|
| OpenCode | `$OPENCODE_CONFIG`, `~/.config/opencode/opencode.json(c)` (on Windows too), or the project's `opencode.json(c)` / `.opencode/opencode.json(c)`. Switch in the sidebar. |
| Z-Code | `~/.zcode/v2/provider_config.json` (or `$ZCODE_DATA_BASE_DIR/.zcode/v2/…`) |
| Pi | `~/.pi/agent/models.json` (or `$PI_CODING_AGENT_DIR/models.json`) |
| Library | `~/.config/switchyard/providers.json` (respects `$XDG_CONFIG_HOME`) |

**Z-Code:** quit it (including the tray icon) before saving or copying to it. Z-Code keeps its providers in memory and rewrites its file when it exits, which would undo your changes. Switchyard warns you while it's running.

**Pi:** re-reads `models.json` every time you open `/model`, so no restart is needed. Pi hides models of a provider without a key, so keyless endpoints get the placeholder key `none`.

## Options

```
npx @spacatty/switchyard [options]   # or: switchyard [options]

-c, --config <path>        OpenCode config (default: auto-detect)
    --zcode-config <path>  Z-Code provider_config.json
    --pi-config <path>     Pi models.json
    --library <path>       Shared provider library
-p, --port <port>          Port (default 4747, falls back to a free one)
    --no-open              Don't open the browser
```

`occ-manager`, the old command name, still works.

## Security

The server listens on `127.0.0.1` only, checks the `Host` header, and requires a random per-session token, so other sites in your browser can't talk to it.

## Development

```bash
git clone https://github.com/spacatty/opencode-json-manager
cd opencode-json-manager
# Try it against scratch files, never your real configs:
node bin/cli.js --config /tmp/sy/opencode.json --zcode-config /tmp/sy/zc.json --pi-config /tmp/sy/pi.json --library /tmp/sy/lib.json
```

| Command | What it does |
|---|---|
| `npm start` | Run the CLI |
| `npm test` | End-to-end smoke test (needs network: hits OpenRouter `/models` and opencode.ai) |
| `npm run check-schema` | Compare the live OpenCode schema with the bundled snapshot |
| `npm run update-schema` | Refresh the bundled snapshot in `schema/` |

The UI in `public/` is plain HTML/CSS/JS with no build step. See [AGENTS.md](AGENTS.md) for the code layout and the rules contributors (human or AI) should follow.

## License

[MIT](LICENSE)
