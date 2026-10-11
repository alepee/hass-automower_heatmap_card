import {DEFAULTS, suggestEntities} from './config.js';
import {language, translator, errorLabel} from './i18n.js';

class AutomowerHeatmapCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode: 'open'}); this._registry = []; }

  setConfig(config) { this._config = {...DEFAULTS, ...config}; this._render(); }

  set hass(hass) {
    this._hass = hass;
    const signature = `${language(hass)}|${Object.keys(hass.states).join('|')}`;
    if (this._signature !== signature) { this._signature = signature; this._render(); }
    if (!this._registryLoaded && hass.callWS) { this._registryLoaded = true; hass.callWS({type: 'config/entity_registry/list'}).then(r => { this._registry = r; }).catch(() => {}); }
  }

  _change(key, value) {
    const next = {...this._config, [key]: value};
    if (key === 'entity') Object.assign(next, suggestEntities(value, this._hass?.states || {}, this._registry));
    this._config = next;
    this.dispatchEvent(new CustomEvent('config-changed', {detail: {config: {...next, type: 'custom:automower-heatmap-card'}}, bubbles: true, composed: true}));
    if (['entity', 'error_entity', 'error_filter'].includes(key)) this._render();
  }

  _render() {
    if (!this._config) return;
    const c = this._config, states = this._hass?.states || {}, t = translator(language(this._hass));
    this.shadowRoot.innerHTML = `<style>:host{display:block;color:var(--primary-text-color,#24372d);font:14px system-ui}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:flex;flex-direction:column;gap:7px;margin:0 0 16px}input,select{box-sizing:border-box;width:100%;font:inherit;padding:11px;border:1px solid var(--divider-color,#aab6ae);border-radius:8px;background:var(--card-background-color,white);color:inherit}h3{font-size:16px;margin:20px 0 14px}small,p{color:var(--secondary-text-color,#637268);line-height:1.5}.check{display:flex;align-items:center;gap:10px;padding:7px 0}.check input{width:auto}.check[hidden]{display:none}.types{max-height:220px;overflow:auto;border:1px solid var(--divider-color,#ccc);border-radius:8px;padding:8px}.warning{color:var(--error-color,#b53b2d)}@media(max-width:420px){.grid{grid-template-columns:1fr}}</style><div id="form"></div>`;
    const form = this.shadowRoot.querySelector('#form');
    const heading = text => { const h = document.createElement('h3'); h.textContent = text; form.append(h); };
    const field = (key, title, {options, min, max, step = 1, domain} = {}) => {
      const label = document.createElement('label'); label.className = 'field';
      const text = document.createElement('span'); text.textContent = title; label.append(text);
      const input = document.createElement(options ? 'select' : 'input'); input.setAttribute('aria-label', title);
      if (options) { for (const [value, name] of options) input.add(new Option(name, value)); }
      else if (min !== undefined) { input.type = 'number'; input.min = min; input.max = max; input.step = step; }
      else if (domain) {
        const id = `list-${key}`, list = document.createElement('datalist'); list.id = id;
        for (const [entity, s] of Object.entries(states).filter(([id]) => id.startsWith(domain + '.'))) { const o = document.createElement('option'); o.value = entity; o.label = s.attributes.friendly_name || entity; list.append(o); }
        input.setAttribute('list', id); input.autocomplete = 'off'; label.append(list);
      }
      input.value = c[key] ?? '';
      input.addEventListener('change', () => {
        if (input.type === 'number' && (!input.value || !input.checkValidity())) { input.reportValidity(); return; }
        this._change(key, input.type === 'number' ? Number(input.value) : input.value);
      });
      label.append(input); return label;
    };

    heading(t('section_mower'));
    const mowers = Object.entries(states).filter(([id]) => id.startsWith('lawn_mower.')).map(([id, s]) => [id, `${s.attributes.friendly_name || id} (${id})`]);
    if (c.entity && !mowers.some(([id]) => id === c.entity)) mowers.unshift([c.entity, c.entity]);
    form.append(field('entity', t('mower'), {options: mowers}));
    const suggested = c.entity ? suggestEntities(c.entity, states, this._registry) : {};
    const effectiveError = c.error_entity || suggested.error_entity, effectiveTracker = c.tracker_entity || suggested.tracker_entity;
    for (const [key, value, title, domain] of [['error_entity', effectiveError, t('error_sensor'), 'sensor'], ['tracker_entity', effectiveTracker, t('gps'), 'device_tracker']]) {
      const node = field(key, title, {domain}); node.querySelector('input').placeholder = value || t('select_entity', {domain}); form.append(node);
      if (!value || (!states[value] && this._hass)) { const note = document.createElement('p'); note.className = 'warning'; note.textContent = t('select_available', {title}); form.append(note); }
    }
    const hint = document.createElement('small'); hint.textContent = t('sensors_hint'); form.append(hint);

    heading(t('section_errors'));
    form.append(field('error_filter', t('error_selection'), {options: [['terrain', t('filter_terrain')], ['all', t('filter_all')], ['custom', t('filter_custom')]]}));
    if (c.error_filter === 'custom') {
      const search = document.createElement('input'); search.placeholder = t('search'); search.setAttribute('aria-label', t('search_label')); form.append(search);
      const list = document.createElement('div'); list.className = 'types'; form.append(list);
      const errorState = states[effectiveError];
      const codes = [...new Set([...(errorState?.attributes?.options || []), ...c.error_types])].filter(x => !['no_error', 'unknown', 'unavailable', ''].includes(x));
      const entries = codes.map(code => [code, errorLabel(this._hass, errorState, code)]).sort((a, b) => a[1].localeCompare(b[1]));
      for (const [code, name] of entries) {
        const label = document.createElement('label'); label.className = 'check';
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = c.error_types.includes(code);
        input.addEventListener('change', () => { const selected = new Set(this._config.error_types); input.checked ? selected.add(code) : selected.delete(code); this._change('error_types', [...selected]); });
        label.append(input, document.createTextNode(`${name} (${code})`)); list.append(label);
      }
      search.oninput = () => { for (const item of list.children) item.hidden = !item.textContent.toLowerCase().includes(search.value.toLowerCase()); };
      const note = document.createElement('small'); note.textContent = t('custom_hint'); form.append(note);
    }

    heading(t('section_history'));
    const row = document.createElement('div'); row.className = 'grid';
    row.append(field('days', t('days'), {min: 1, max: 365}), field('refresh_interval', t('refresh'), {min: 30, max: 86400})); form.append(row);

    heading(t('section_map'));
    form.append(field('map_type', t('map_type'), {options: [['satellite', t('satellite')], ['plan', t('plan')]]}));
    const display = document.createElement('div'); display.className = 'grid';
    display.append(field('height', t('height'), {min: 200, max: 2000}), field('zoom', t('zoom'), {min: 10, max: 22}), field('heat_radius', t('heat_radius'), {min: 5, max: 150}), field('heat_blur', t('heat_blur'), {min: 1, max: 100}));
    form.append(display);
    for (const key of ['show_points', 'show_zones']) {
      const label = document.createElement('label'); label.className = 'check';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = c[key]; input.onchange = () => this._change(key, input.checked);
      label.append(input, document.createTextNode(t(key))); form.append(label);
    }
  }
}

if (!customElements.get('automower-heatmap-card-editor')) customElements.define('automower-heatmap-card-editor', AutomowerHeatmapCardEditor);
