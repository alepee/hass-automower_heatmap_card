import {test} from 'node:test';
import assert from 'node:assert/strict';
import {episodes, locate, clusters, category} from '../src/history.js';

const state = (seconds, code, attributes = {}) => ({last_updated: new Date(seconds * 1000).toISOString(), state: code, attributes});

test('deduplicates outages and secondary errors, resets only on no_error', () => {
  const es = episodes([state(0, 'no_error'), state(10, 'no_drive'), state(11, 'unavailable'), state(12, 'no_drive'), state(13, 'empty_battery'), state(20, 'no_error'), state(21, 'no_drive')], 0);
  assert.equal(es.length, 2);
  assert.deepEqual(es[0].codes, ['no_drive', 'empty_battery']);
  assert.equal(es[0].end, state(20).last_updated);
});

test('does not count an error already active at the history boundary', () => {
  const es = episodes([state(0, 'no_drive'), state(5, 'stopped'), state(10, 'no_error'), state(20, 'lifted')], 0);
  assert.equal(es.length, 1);
  assert.equal(es[0].code, 'lifted');
});

test('rejects synthetic GPS boundary and stale position, allows same-batch update', () => {
  const e = {start: state(1000).last_updated}; const attrs = {latitude: 44, longitude: 0};
  assert.equal(locate(e, [state(699, 'home', attrs)], 699000).located, false);
  assert.equal(locate(e, [state(698, 'home', attrs)], 600000).located, false);
  assert.equal(locate(e, [state(1001, 'home', attrs)], 699000).located, true);
  assert.equal(locate(e, [state(1003, 'home', attrs)], 699000).located, false);
});

test('clusters never duplicate incidents', () => {
  const es = [0, 1, 2, 50].map((m, i) => ({id: i, lat: 44 + m / 111320, lon: 0, located: true, code: 'no_drive'}));
  assert.deepEqual(clusters(es).map(c => c.count), [3, 1]);
});

test('classifies terrain errors across mower models', () => {
  for (const code of ['no_drive', 'trapped', 'wheel_motor_overloaded_rear_right', 'slope_too_steep']) assert.equal(category(code), 'terrain');
  assert.equal(category('stopped'), 'handling');
  assert.equal(category('low_battery'), 'battery');
  assert.equal(category('gps_navigation_problem'), 'technical');
});
