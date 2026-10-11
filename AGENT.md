# AGENT.md: agent & contributor guide

Canonical, tool-agnostic guidance for any AI coding agent (Claude Code, Codex, Cursor, Aider, …) or human contributor working in this repository. Tool-specific entrypoints (editor configs, …) should defer to this file rather than duplicate it.

## Project Overview

Home Assistant dashboard card (Lovelace custom card) showing where a robotic mower gets into trouble: it reads the error history of a Husqvarna Automower from the recorder, places each incident at the GPS position published just before it, and draws a heatmap over a satellite or OpenStreetMap base map. Distributed through HACS as a **Dashboard** custom repository. The version source of truth is `package.json`. User documentation lives in [README.md](README.md).

## Development Commands

```bash
npm install          # Install dev dependencies (esbuild, Leaflet, Leaflet.heat)
npm test             # Unit tests (node:test), no browser needed
npm run build        # Bundle dist/automower-heatmap-card.js
python3 -m http.server 8765   # Then open http://127.0.0.1:8765/demo/index.html
```

The demo page runs the card against **synthetic data**, without Home Assistant. Query parameters: `points`, `zones`, `editor`, `filter=all`, `lang=fr`, `height=<px>`, `at=<lat>,<lon>` (move the demo mower, e.g. to check satellite imagery depth elsewhere).

## Architecture

```
src/
  automower-heatmap-card.js   # Custom element: config, history fetching, GPS cache, refresh loop
  editor.js                   # Visual editor (getConfigElement), auto-suggests sensors from the mower device
  config.js                   # DEFAULTS, normalizeConfig (validation), filterEvents, suggestEntities
  history.js                  # Pure logic: incident episodes, GPS location, clustering, error categories
  i18n.js                     # UI strings (en, fr), language detection, error labels via HA
  map/
    map.html                  # Iframe page template (Leaflet CSS and map bundle are inlined at build)
    map.js                    # Leaflet rendering inside the iframe: heatmap, points, sectors, popups
    leaflet-global.js         # Exposes window.L before leaflet.heat is evaluated
build.mjs                     # Two-stage esbuild: map page (IIFE, inlined into HTML), then the card (ESM)
dist/automower-heatmap-card.js  # Committed build, the file HACS installs
```

### Critical Architecture Rules

- **Single-file bundle.** HACS installs one JS file. Everything, including Leaflet, Leaflet.heat and the map page, ends up in `dist/automower-heatmap-card.js`. Never load code or styles from a CDN at runtime.
- **The map runs in a sandboxed iframe** (`sandbox="allow-scripts"`, fed through `srcdoc`). It has no access to the Home Assistant session and only receives data through `postMessage`. Keep it that way: never pass `hass`, tokens or entity states other than what the map needs to draw.
- **History is read with the user session** (`hass.callApi`). Never embed a token, a URL of a specific instance or history data in the card.
- **`history.js` and `config.js` stay pure** (no DOM, no `hass`): they are shared by the card, the iframe and the tests.
- **`dist/` is committed and must match the sources.** CI rebuilds it and fails if `git diff dist/` is not empty: run `npm run build` before committing a source change.

## Key Domain Concepts

### Incident episodes (`history.js`)
- An episode runs from the first error code to the return to `no_error`. Secondary codes are appended to the episode (`codes`), the filter applies to the first one (`code`).
- `unavailable` / `unknown` never split or duplicate an episode.
- An error already active at the start of the period is ignored: its origin is unknown.

### GPS location
- An episode is placed at the **last GPS position published at most 300 s before its start**, with a 2 s tolerance after it (same HA batch). Older or missing positions leave the episode unlocated, and unlocated episodes are not drawn.
- The synthetic state Home Assistant inserts at the start of a history query does not count as a published position.
- GPS history is fetched only around incident onsets (3 requests in parallel) and cached in memory per episode; recent episodes (< 10 min) are re-located on each refresh.

### Error codes and categories
- Error codes are the states of the Automower error enum sensor (`sensor.<name>_error`, 160+ codes, `no_error` when fine). The reference list is `entity.sensor.error.state` in the [HA core strings](https://github.com/home-assistant/core/blob/dev/homeassistant/components/husqvarna_automower/strings.json).
- `category()` classifies codes; only `terrain` drives the default filter. When Husqvarna adds a code caused by the lawn itself (slope, obstacle, trap, blocked wheel), add it to the `terrain` set and to the history test.
- **Labels are not translated here**: they come from `hass.formatEntityState(errorState, code)`, so HA translations cover every code and language. `humanize()` is only a fallback.

### Internationalisation
- UI strings live in `i18n.js` (`en` is the reference, `fr` must define the same keys; a test enforces it). Add a language by adding a table with all keys.
- The language comes from `hass.locale.language`, then `<html lang>` (set by HA, useful in `setConfig` before `hass` is known), then the browser, falling back to English.

## Important Development Notes

### When changing the card configuration
Update together: `DEFAULTS` and `normalizeConfig` in `config.js`, the editor field, the strings in **every** language of `i18n.js`, the options table in the README, and the config tests. Keep existing YAML configs valid; if an option must change meaning, accept the old form.

### When changing the iframe protocol
Messages are `automower-heatmap-ready` (iframe → card) and `automower-heatmap-data` (card → iframe). Both sides check `event.source`. The payload carries `episodes`, `config`, `center`, `labels`, `strings` and `locale`.

### Privacy of test data
The repository is public. **Never commit real history, coordinates, entity IDs or screenshots from a real garden.** Tests and the demo use synthetic data; the demo mower is placed on a public lawn (Champ de Mars, Paris). Before a commit that adds data or images, check they are synthetic.

### Screenshots
README screenshots (`docs/`) are taken from the demo page **in English**, with all tiles loaded (wait a few seconds). The map screenshot shows points, sectors and an open sector popup (`?zones&points`, then click a sector badge); the editor screenshot uses `?editor&height=200`.

## Code Quality Standards

- Plain modern JavaScript (ES modules), no framework, no runtime dependency besides the bundled Leaflet and Leaflet.heat.
- Match the existing style: compact functions, comments only where the intent is not obvious (mostly the *why*).
- Escape anything inserted as HTML in popups (`escape()` in `map.js`): error labels come from HA translations and entity data.

## Testing

Tests live in `test/` and use `node:test`:
- `history.test.js`: episodes, GPS location, clustering, categories.
- `config.test.js`: validation, filters, sensor suggestion.
- `i18n.test.js`: language detection, key parity across languages, error labels.

Changes to rendering (card, editor, map) are checked manually on the demo page, in English and French.

## Operating Modes (preserved conventions)

These workflows are stable; do not change them without explicit request.

### Branch Strategy
- **`main`**: single branch, all development and releases happen here.
- **Feature branches**: created from `main`, named `feat/...`, `fix/...`, or `chore/...`; PRs are squash-merged.

### Git Conventions
- **No AI signature**: do not add "Co-Authored-By: …" trailers in commit messages.
- Conventional-commit style: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `release:`.
- Code, commits, README and release notes are in **English** (public repository).

### Version Management
`package.json` → `version` is the source of truth; the build writes it into the bundle banner. Bump with `npm version <patch|minor|major> --no-git-tag-version`, then `npm run build`.

### Release Process
`npm version` → `npm run build` → commit `release: X.Y.Z` → push → create the GitHub release `vX.Y.Z` with `dist/automower-heatmap-card.js` attached (the `Release` workflow re-uploads a fresh build). HACS offers the latest release to users. **Follow the [release template](docs/release-template.md)** so titles and descriptions stay consistent with past releases.

## Keeping Documentation in Sync

Documentation is part of the definition of done. A change to behavior, configuration options, the incident logic or a workflow **must** update in the same commit:

| You changed… | Update… |
|---|---|
| A configuration option | README options table, editor, `i18n.js`, config tests |
| Incident, GPS or category logic | README "How it works", this file, history tests |
| Rendering of the map or editor | README screenshots if the visible result changed |
| Commands, conventions, release flow | this file, [docs/release-template.md](docs/release-template.md) |
