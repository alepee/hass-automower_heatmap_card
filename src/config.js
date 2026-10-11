import {translator} from './i18n.js';

export const DEFAULTS = {entity: '', days: 30, refresh_interval: 300, height: 500, error_filter: 'terrain', error_types: [], map_type: 'satellite', zoom: 20, heat_radius: 60, heat_blur: 35, show_points: false, show_zones: false};

export function normalizeConfig(config, t = translator()) {
  const result = {...DEFAULTS, ...config};
  if (!/^lawn_mower\.[a-z0-9_]+$/.test(result.entity)) throw new Error(t('invalid_mower'));
  const slug = result.entity.split('.')[1];
  result.error_entity = config.error_entity || `sensor.${slug}_error`;
  result.tracker_entity = config.tracker_entity || `device_tracker.${slug}`;
  for (const [key, domain] of [['error_entity', 'sensor'], ['tracker_entity', 'device_tracker']]) {
    if (!new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(result[key])) throw new Error(t('invalid_entity', {key}));
  }
  for (const [key, min, max] of [['days', 1, 365], ['refresh_interval', 30, 86400], ['height', 200, 2000], ['zoom', 10, 22], ['heat_radius', 5, 150], ['heat_blur', 1, 100]]) {
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error(t('invalid_range', {key, min, max}));
  }
  if (!['terrain', 'all', 'custom'].includes(result.error_filter)) throw new Error(t('invalid_filter'));
  if (!['satellite', 'plan'].includes(result.map_type)) throw new Error(t('invalid_map'));
  if (!Array.isArray(result.error_types) || result.error_types.some(c => typeof c !== 'string' || !c)) throw new Error(t('invalid_types'));
  for (const key of ['show_points', 'show_zones']) if (typeof result[key] !== 'boolean') throw new Error(t('invalid_boolean', {key}));
  return result;
}

export function filterEvents(events, config) {
  return events.filter(e => config.error_filter === 'all' || (config.error_filter === 'custom' ? config.error_types.includes(e.code) : e.category === 'terrain'));
}

export function suggestEntities(entity, states, registry = []) {
  const slug = entity.split('.')[1], device = registry.find(e => e.entity_id === entity)?.device_id;
  const peers = device ? registry.filter(e => e.device_id === device && states[e.entity_id]).map(e => e.entity_id) : [];
  const choose = (expected, predicate) => states[expected] ? expected : peers.filter(predicate).length === 1 ? peers.find(predicate) : '';
  return {
    error_entity: choose(`sensor.${slug}_error`, id => id.startsWith('sensor.') && (states[id]?.attributes?.options || []).includes('no_error')),
    tracker_entity: choose(`device_tracker.${slug}`, id => id.startsWith('device_tracker.')),
  };
}
