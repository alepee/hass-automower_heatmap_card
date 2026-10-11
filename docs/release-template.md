# Release template

Follow this template when cutting a release so titles and descriptions stay consistent with past releases (`v1.0.0`, `v1.0.1`), themselves aligned on the release notes of [hass-hitachi_yutaki](https://github.com/alepee/hass-hitachi_yutaki/releases).

## Release flow (recap)

```bash
npm version <patch|minor|major> --no-git-tag-version
npm run build
git commit -am "release: X.Y.Z" && git push
gh release create vX.Y.Z --target main --title "vX.Y.Z" --notes-file <body.md> dist/automower-heatmap-card.js
```

Pre-releases use a `-beta.N` version and `--prerelease`, so HACS only offers them to users who enable "Show beta versions".

## Bump commit title

```
release: X.Y.Z
```

## GitHub Release title

The release **name/tag** is `vX.Y.Z`. The body opens with a themed H1, the theme separated by a colon:

```
# Automower Heatmap Card vX.Y.Z: <short theme>
```

Examples: `: first release`, `: repository renamed`.

## GitHub Release body

Scale the sections to the release size (a patch may only need intro, Installation and Changelog; a minor or major uses Highlights and per-feature sections). Keep the emoji section headers. No em dash: use a colon, a comma or a new sentence.

```markdown
# Automower Heatmap Card vX.Y.Z: <short theme>

[![Downloads for this release](https://img.shields.io/github/downloads/alepee/hass-automower_heatmap_card/vX.Y.Z/total.svg)](https://github.com/alepee/hass-automower_heatmap_card/releases/vX.Y.Z)

<One or two sentences: what this release delivers and why it matters. Link the driving issues, e.g. ([#12](https://github.com/alepee/hass-automower_heatmap_card/issues/12)).>

> 🧪 <Optional: what was and was not validated, and what feedback is expected.>

## 🎯 Highlights   <!-- minor/major only -->

- **<Feature>**: one-line value statement

## ✨ What's New

### <Feature title> ([#NNN](https://github.com/alepee/hass-automower_heatmap_card/issues/NNN))

<What changed, from the user's point of view.>

## 🐛 Bug Fixes   <!-- if any -->

### <Fix title> ([#NNN](https://github.com/alepee/hass-automower_heatmap_card/issues/NNN))

<What was wrong and what the user will now observe.>

## ⚠️ Upgrade note   <!-- only when the release needs a manual user action, e.g. a renamed option -->

<Exact steps: card option to change, old and new YAML.>

## 🔧 Under the Hood   <!-- optional: CI, tooling, docs, internal changes -->

- <Internal change, with PR link.>

## 📦 Installation via HACS

1. In HACS, open **Automower Heatmap Card** → **Redownload** and select `vX.Y.Z`
2. Reload your browser
3. <"No configuration change is needed." or the required steps.>

## 🐛 Bug Reports

If you hit an issue, please include:
- Home Assistant version and browser
- Mower model
- The states of the error sensor and GPS tracker around an incident (Developer tools → History)
- Errors from the browser console, if any

---

**Full Changelog:** [vPREV...vX.Y.Z](https://github.com/alepee/hass-automower_heatmap_card/compare/vPREV...vX.Y.Z)
```
