import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig, filterEvents, suggestEntities} from '../src/config.js';

test('derives sensors from the mower and keeps explicit ones', () => {
  assert.equal(normalizeConfig({entity: 'lawn_mower.mower', error_entity: 'sensor.custom'}).error_entity, 'sensor.custom');
  const c = normalizeConfig({entity: 'lawn_mower.other'});
  assert.equal(c.tracker_entity, 'device_tracker.other');
  assert.equal(c.error_entity, 'sensor.other_error');
  assert.equal(c.show_points, false);
  assert.equal(c.show_zones, false);
});

test('requires a mower entity', () => {
  assert.throws(() => normalizeConfig({}), /lawn_mower/);
});

test('validates heatmap options', () => {
  for (const c of [{height: 0}, {error_types: 'no_drive'}, {show_points: 'yes'}, {map_type: 'foo'}, {entity: 'sensor.bad'}, {refresh_interval: 1}]) {
    assert.throws(() => normalizeConfig({entity: 'lawn_mower.mower', ...c}));
  }
});

test('custom filter including no selection is unambiguous', () => {
  const es = [{code: 'no_drive', category: 'terrain'}, {code: 'stopped', category: 'handling'}];
  const base = {entity: 'lawn_mower.mower'};
  assert.deepEqual(filterEvents(es, normalizeConfig({...base, error_filter: 'custom', error_types: ['stopped']})), [es[1]]);
  assert.equal(filterEvents(es, normalizeConfig({...base, error_filter: 'custom'})).length, 0);
  assert.equal(filterEvents(es, normalizeConfig(base)).length, 1);
});

test('mower change never retains previous mower sensors; registry detects renamed entities', () => {
  const states = {'sensor.special_error': {attributes: {options: ['no_error']}}, 'device_tracker.special': {}};
  const registry = [{entity_id: 'lawn_mower.new', device_id: '1'}, {entity_id: 'sensor.special_error', device_id: '1'}, {entity_id: 'device_tracker.special', device_id: '1'}];
  assert.deepEqual(suggestEntities('lawn_mower.new', states, registry), {error_entity: 'sensor.special_error', tracker_entity: 'device_tracker.special'});
  assert.deepEqual(suggestEntities('lawn_mower.absent', states, registry), {error_entity: '', tracker_entity: ''});
});
