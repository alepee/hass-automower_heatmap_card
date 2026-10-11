import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const {version} = JSON.parse(await readFile('package.json', 'utf8'));

// The map runs in a sandboxed iframe fed through srcdoc, so everything it needs is inlined in one HTML page.
const map = await build({entryPoints: ['src/map/map.js'], bundle: true, format: 'iife', minify: true, write: false, legalComments: 'none'});
const css = await readFile('node_modules/leaflet/dist/leaflet.css', 'utf8');
const html = (await readFile('src/map/map.html', 'utf8')).trim()
  .replace('/*LEAFLET_CSS*/', () => css)
  .replace('/*MAP_JS*/', () => map.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));

await build({
  entryPoints: ['src/automower-heatmap-card.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'dist/automower-heatmap-card.js',
  define: {MAP_HTML: JSON.stringify(html)},
  banner: {js: `/*! automower-heatmap-card v${version} | MIT | bundles Leaflet (BSD-2-Clause) and Leaflet.heat (MIT), see THIRD_PARTY_LICENSES.md */`},
  legalComments: 'none',
});
