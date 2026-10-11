import {episodes, locate} from './history.js';
import {normalizeConfig, DEFAULTS} from './config.js';
import {language, translator, errorLabel, strings} from './i18n.js';
import './editor.js';

// Replaced at build time by the self-contained map page (Leaflet, Leaflet.heat and map.js inlined).
/* global MAP_HTML */

class AutomowerHeatmapCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'}); this._cache = new Map(); this._version = 0;
    this._message = e => { if (e.source === this._frame?.contentWindow && e.data?.type === 'automower-heatmap-ready') this._send(); };
    this._visibility = () => { if (!document.hidden) this._refresh(); };
  }

  get _t() { return translator(language(this._hass)); }

  setConfig(config) {
    const next = normalizeConfig(config, this._t);
    if (JSON.stringify(next) === JSON.stringify(this._config)) return;
    const sourceChanged = !this._config || ['entity', 'error_entity', 'tracker_entity', 'days'].some(k => next[k] !== this._config[k]);
    this._config = next; this._version++; if (sourceChanged) { this._cache.clear(); this._data = null; }
    if (!this._frame) {
      this.shadowRoot.innerHTML = `<style>:host{display:block}ha-card{display:block;overflow:hidden;position:relative}.status{position:absolute;bottom:28px;left:10px;right:10px;z-index:2;width:fit-content;max-width:calc(100% - 40px);padding:8px 12px;border-radius:6px;background:#fffE;color:#29382e;font:13px system-ui}.status[hidden]{display:none}iframe{width:100%;border:0;display:block}</style><ha-card><span class="status" role="status"></span><iframe sandbox="allow-scripts"></iframe></ha-card>`;
      this._frame = this.shadowRoot.querySelector('iframe'); this._status = this.shadowRoot.querySelector('.status');
      this._frame.title = this._t('frame_title'); this._status.textContent = this._t('loading');
      this._frame.onload = () => this._send(); this._frame.srcdoc = MAP_HTML;
    }
    this._frame.style.height = `${next.height}px`; this._schedule(); this._send(); this._refresh();
  }

  static getConfigElement() { return document.createElement('automower-heatmap-card-editor'); }
  static getStubConfig(hass) { return {...DEFAULTS, entity: Object.keys(hass?.states || {}).find(id => id.startsWith('lawn_mower.')) || 'lawn_mower.automower'}; }
  set hass(value) { this._hass = value; if (!this._started) this._refresh(); }
  getCardSize() { return Math.ceil((this._config?.height || 500) / 50); }
  getGridOptions() { return {columns: 12, min_columns: 6}; }

  connectedCallback() { window.addEventListener('message', this._message); document.addEventListener('visibilitychange', this._visibility); this._schedule(); this._refresh(); }
  disconnectedCallback() { clearInterval(this._timer); window.removeEventListener('message', this._message); document.removeEventListener('visibilitychange', this._visibility); }
  _schedule() { clearInterval(this._timer); if (this.isConnected && this._config) this._timer = setInterval(() => this._refresh(), this._config.refresh_interval * 1000); }

  _send() {
    if (!this._data) return;
    const lang = language(this._hass), errorState = this._hass?.states?.[this._config.error_entity];
    const codes = new Set(this._data.episodes.flatMap(e => e.codes));
    const labels = Object.fromEntries([...codes].map(code => [code, errorLabel(this._hass, errorState, code)]));
    this._frame?.contentWindow?.postMessage({type: 'automower-heatmap-data', data: {...this._data, config: this._config, center: this._center(), labels, strings: strings[lang], locale: this._hass?.locale?.language || lang}}, '*');
  }

  _center() {
    const a = this._hass?.states?.[this._config.tracker_entity]?.attributes;
    if (typeof a?.latitude === 'number' && typeof a?.longitude === 'number') return [a.latitude, a.longitude];
    const home = this._hass?.config;
    return typeof home?.latitude === 'number' && typeof home?.longitude === 'number' ? [home.latitude, home.longitude] : null;
  }

  async _history(entity, start, end) {
    const query = new URLSearchParams({filter_entity_id: entity, end_time: new Date(end).toISOString()});
    if (entity === this._config.error_entity) query.set('no_attributes', '');
    const response = await this._hass.callApi('GET', `history/period/${new Date(start).toISOString()}?${query}`);
    return response.find(a => a[0]?.entity_id === entity) || [];
  }

  async _refresh() {
    if (!this.isConnected || !this._hass || !this._config || this._busy || document.hidden) return;
    this._started = true; this._busy = true; const version = this._version, t = this._t;
    const end = Date.now(), since = end - this._config.days * 86400000;
    if (!this._data) { this._status.hidden = false; this._status.textContent = t('loading'); }
    try {
      for (const id of [this._config.entity, this._config.error_entity, this._config.tracker_entity]) if (!this._hass.states?.[id]) throw new Error(t('entity_missing', {id}));
      const rows = await this._history(this._config.error_entity, since, end);
      if (version !== this._version) return;
      const events = episodes(rows, since), cache = this._cache;
      const wanted = new Set(events.map(e => e.id)); for (const key of cache.keys()) if (!wanted.has(key)) cache.delete(key);
      // Fetch GPS only near incident onsets, not every position over the entire period.
      const pending = events.filter(e => !cache.has(e.id) || end - Date.parse(e.start) < 600000);
      let index = 0;
      await Promise.all(Array.from({length: Math.min(3, pending.length)}, async () => {
        while (index < pending.length) {
          const e = pending[index++], start = Date.parse(e.start), begin = start - 301000;
          const gps = await this._history(this._config.tracker_entity, begin, Math.min(start + 2001, end));
          if (version !== this._version) return;
          cache.set(e.id, locate(e, gps, begin));
        }
      }));
      if (version !== this._version) return;
      // Merge episode metadata with cached coordinates without retaining an old end time.
      const located = events.map(e => ({...cache.get(e.id), ...e, located: cache.get(e.id)?.located || false}));
      this._data = {episodes: located, start: new Date(since).toISOString(), end: new Date(end).toISOString(), updated: new Date().toISOString(), days: this._config.days};
      this._send(); this._status.hidden = true;
    } catch (error) {
      this._status.hidden = false;
      this._status.textContent = `${t(this._data ? 'refresh_failed_kept' : 'refresh_failed')} ${error?.message || t('refresh_hint')}`;
    } finally {
      this._busy = false;
      if (version !== this._version) this._refresh();
    }
  }
}

if (!customElements.get('automower-heatmap-card')) customElements.define('automower-heatmap-card', AutomowerHeatmapCard);
const t = translator(language());
window.customCards = window.customCards || [];
window.customCards.push({type: 'automower-heatmap-card', name: t('card_name'), description: t('card_description'), preview: false, documentationURL: 'https://github.com/alepee/hass-automower_heatmap_card'});
