// Runs inside the sandboxed iframe: it never sees the Home Assistant session, only the data posted by the card.
import './leaflet-global.js';
import 'leaflet.heat';
import {clusters} from '../history.js';
import {filterEvents} from '../config.js';
import {ESRI_IMAGERY, MAX_NATIVE_ZOOM, imageryNativeZoom} from './tiles.js';

const L = window.L;
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const notice = document.getElementById('notice');
let data = null, fitted = false, fitKey = '', baseType = '', depthKey = '';

const t = (key, params = {}) => (data?.strings?.[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
const label = code => data?.labels?.[code] || code;
const date = s => new Date(s).toLocaleString(data?.locale || undefined);

const map = L.map('map', {maxZoom: 22, fadeAnimation: false}).setView([20, 0], 2);
const satellite = maxNativeZoom => L.tileLayer(`${ESRI_IMAGERY}/tile/{z}/{y}/{x}`, {maxNativeZoom, maxZoom: 22, attribution: 'Tiles © Esri · Esri, Maxar, Earthstar Geographics, GIS User Community'});
const bases = {
  satellite: satellite(MAX_NATIVE_ZOOM),
  plan: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxNativeZoom: 19, maxZoom: 22, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}),
};
const markers = L.layerGroup().addTo(map), zones = L.layerGroup().addTo(map);
L.control.scale({imperial: false}).addTo(map);
const heat = L.heatLayer([], {radius: 60, blur: 35, maxZoom: 20, max: 2, minOpacity: .35, gradient: {.2: '#4cc9bd', .5: '#d2df49', .75: '#ffac36', 1: '#e9422d'}});

function render() {
  const c = data.config, selected = filterEvents(data.episodes, c), es = selected.filter(e => e.located);
  const nextKey = JSON.stringify([c.entity, c.error_filter, c.error_types, c.zoom]);
  if (nextKey !== fitKey) { fitted = false; fitKey = nextKey; }
  if (baseType !== c.map_type) { if (bases[baseType]) map.removeLayer(bases[baseType]); baseType = c.map_type; bases[baseType].addTo(map); }
  markers.clearLayers(); zones.clearLayers();
  const size = map.getSize(); if (size.x <= 0 || size.y <= 0) return;
  heat.setOptions({radius: c.heat_radius, blur: c.heat_blur}); heat.setLatLngs(es.map(e => [e.lat, e.lon, 1])); map.addLayer(heat);
  if (c.show_points) {
    for (const e of es) {
      const codes = [...new Set(e.codes)].map(code => escape(label(code))).join(' → ');
      L.circleMarker([e.lat, e.lon], {radius: 4, color: 'white', weight: 1, fillColor: '#db4c2b', fillOpacity: 1})
        .bindPopup(`<b>${escape(label(e.code))}</b><br>${escape(date(e.start))}<br>${escape(t('end', {date: e.end ? date(e.end) : t('not_observed')}))}<br>${codes}`).addTo(markers);
    }
  }
  if (c.show_zones) {
    for (const g of clusters(es)) {
      L.marker([g.lat, g.lon], {icon: L.divIcon({className: 'badge', html: String(g.zone), iconSize: [28, 28]})})
        .bindPopup(`<b>${escape(t('sector', {zone: g.zone, count: g.count}))}</b><br>${Object.entries(g.types).map(([code, n]) => `${n} × ${escape(label(code))}`).join('<br>')}`).addTo(zones);
    }
  }
  notice.hidden = es.length > 0; notice.textContent = selected.length ? t('no_located') : t('no_match');
  if (!fitted) {
    if (es.length) { map.fitBounds(es.map(e => [e.lat, e.lon]), {padding: [25, 25], maxZoom: c.zoom}); fitted = true; }
    else if (data.center) { map.setView(data.center, c.zoom); fitted = true; }
  }
  if (fitted && c.map_type === 'satellite') adjustImageryDepth();
}

// Past the deepest imagery level of the area, upscale that level instead of showing Esri's placeholder tiles.
async function adjustImageryDepth() {
  const center = map.getCenter(), key = `${center.lat.toFixed(2)},${center.lng.toFixed(2)}`;
  if (key === depthKey) return;
  depthKey = key;
  const depth = await imageryNativeZoom(center.lat, center.lng, url => fetch(url).then(r => r.json()));
  if (key !== depthKey || depth === bases.satellite.options.maxNativeZoom) return;
  const active = map.hasLayer(bases.satellite);
  if (active) map.removeLayer(bases.satellite);
  bases.satellite = satellite(depth);
  if (active) bases.satellite.addTo(map).bringToBack();
}

const safeRender = () => { try { render(); } catch (error) { notice.hidden = false; notice.textContent = t('map_error', {message: error.message}); } };
window.addEventListener('message', event => { if (event.source !== parent || event.data?.type !== 'automower-heatmap-data') return; data = event.data.data; safeRender(); });
new ResizeObserver(() => { if (map.hasLayer(heat)) map.removeLayer(heat); map.invalidateSize(); if (data) safeRender(); }).observe(document.getElementById('map'));
parent.postMessage({type: 'automower-heatmap-ready'}, '*');
