# AGENTS.md

Instructions for AI coding agents (OpenCode, Claude Code, Codex, etc.) working on this repo.

## What this is

Switchyard (`@spacatty/switchyard`, command `switchyard`, old alias `occ-manager`) is a zero-dependency Node (>=18) CLI, run with `npx @spacatty/switchyard`. It starts a local web UI that keeps one list of custom model providers across coding agents ("harnesses"): OpenCode (`opencode.json(c)`), Z-Code (`~/.zcode/v2/provider_config.json`) and Pi (`~/.pi/agent/models.json`). It parses each harness's providers into one merged list (matched by base URL), copies providers between harnesses, keeps a library of its own, and has a full editor per harness.

- `bin/cli.js`: arg parsing, port fallback, cross-platform browser opening
- `src/server.js`: `node:http` server bound to 127.0.0.1, token + Host-header checks
- `src/config.js`: config file discovery (XDG path on all OSes, `OPENCODE_CONFIG`, project files), read/write with `.bak`
- `src/files.js`: lists, reads and writes the other files OpenCode reads (global/project `AGENTS.md`, `agents/`, `commands/`, `modes/`, `.gitignore`/`.ignore`). Only listed paths (or new `.md` files in those folders) can be touched; delete renames to `.bak`
- `src/shared.js`: the shared list. Converts each harness format to and from one neutral provider/model shape (`fromOpenCode` / `fromZcode` / `fromPi`, `applyTo`), merges by `urlKey()`, converts API keys between harness syntaxes (`convertKey`), and reads/writes the library file (`~/.config/switchyard/providers.json`)
- `src/pi.js`: Pi's `models.json` (path lookup incl. `PI_CODING_AGENT_DIR`, validation mirroring Pi's TypeBox schema and `validateConfig()`, built-in provider names)
- `src/zcode.js`: Z-Code's `~/.zcode/v2/provider_config.json` (path lookup, validation mirroring Z-Code's Zod schemas, default reasoning maps, running-process check). The UI side is the `Z-Code view` section of `public/app.js`; the `shared providers view` and `Pi view` sections hold the other two
- `src/discover.js`: lists `/models` from an endpoint, enriches with models.dev, builds suggested model entries
- `src/jsonc.js`: comment/trailing-comma tolerant parser
- `public/`: vanilla JS UI, no build step
- `schema/opencode-config.schema.json`: bundled snapshot of `https://opencode.ai/config.json` (offline fallback)

## ALWAYS check the OpenCode schema first

OpenCode's config format changes often (for example, the `provider` block was marked deprecated in favour of a V2 `providers` block). **Before any change, and at the start of every session, run:**

```bash
npm run check-schema
```

- Exit code 0: the snapshot matches the live schema. Carry on.
- Exit code 1: the schema changed. Read the report, then:
  1. If any **WATCHED** definition changed (`provider`, `providers`, `model`, `small_model`, `ProviderConfig`, `Config.ProviderEncoded`, `Config.ModelEncoded`), update the code that writes those shapes:
     - `src/discover.js` → `buildSuggestion()` (which model fields are generated)
     - `public/app.js` → `modelEditor()`, `viewProviderEditor()`, `addSelected()`, `validate()`
     - `scripts/check-schema.js` → `WATCHED` list, if definitions were renamed
  2. If OpenCode now says the legacy `provider` block is removed or no longer read, switch the Providers tab to write the new format (and keep reading the old one).
  3. Run `npm run update-schema` to refresh the bundled snapshot.
  4. Run `npm test` and mention the schema changes in your summary/commit message.
- Exit code 2: network error. Say so and don't update the snapshot.

The "All settings" tab renders from the live schema at runtime, so new top-level options show up automatically. Only the hand-built Providers / Default models tabs need manual updates.

Also check the OpenCode docs for provider config (https://opencode.ai/docs/providers/ and https://opencode.ai/docs/config/) when changing what gets written, and check models.dev (`https://models.dev/api.json`) if the field names used in `buildSuggestion()` look stale.

## Z-Code format

Z-Code has no public schema. `src/zcode.js` mirrors its Zod validators (bundled in the app's `app.asar`, `providerConfigRules` / `modelConfigRules`). Manual model rules must carry every field (`contextWindow`, the three `supports*` flags, `inputFormat.{supportsImage,supportsVideo,supportsPdf}`, `reasoningLevel.{values,map}`, `maxOutputTokens.max`). If a Z-Code update makes it reject or ignore what we write, compare against a provider/model added through Z-Code's own settings UI, and against `resources/config/provider/zcode-builtin.json` for the default reasoning maps.

## Pi format

`src/pi.js` mirrors `ModelsConfigSchema` and `validateConfig()` in Pi's `dist/core/model-registry.js` (`@earendil-works/pi-coding-agent`). Non-built-in providers with models need `baseUrl`, `apiKey` and an `api`; `cost` needs all four rates. API key values use Pi's syntax: `$VAR` / `${VAR}`, `!command`, `$$` / `$!` escapes. Docs: `docs/models.md` in the Pi package.

## Adding a harness

1. A `src/<harness>.js` with `<harness>ConfigPath()`, `read…()`, `write…()` (validating, `.bak`, atomic via `writeConfig`).
2. In `src/shared.js`: a `from<Harness>()` parser, a branch in `applyTo()`, a branch in `convertKey()`, and an entry in `HARNESSES`.
3. In `src/server.js`: its path in `state`, `GET`/`POST` routes, and a branch in `copyToHarness()` and `sharedResponse()`.
4. In `public/`: a view, a `data-harness-group` nav group and switcher button in `index.html`, and entries in `VIEW_HARNESS`, `HARNESS_HOME`, `HARNESS_LIST`, `API_CHOICES` and discovery's `discTarget()` / `addSelected()`.
5. A CLI flag for its path, and smoke-test coverage.

## Rules

- No runtime dependencies. Use Node built-ins and global `fetch` only.
- Must work on macOS, Linux and Windows: use `path`/`os`, never hard-code `/` or `~` in file paths, and keep `openBrowser()` platform branches intact.
- Never log or transmit API keys. Keys only go to the endpoint the user typed.
- Keep the server bound to `127.0.0.1` with the token and Host checks.
- Writes must keep making a `.bak` and write atomically (tmp file + rename).
- Verify with `npm test` (needs network; hits OpenRouter's public `/models` and opencode.ai) and by running `node bin/cli.js --config <tmp> --zcode-config <tmp> --pi-config <tmp> --library <tmp>` to try the UI. Pass all four: any you leave out points at the user's real file. Never test against the user's real configs without asking.
