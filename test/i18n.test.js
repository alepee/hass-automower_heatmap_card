import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strings, language, translator, errorLabel} from '../src/i18n.js';

test('every language defines the same keys', () => {
  const keys = Object.keys(strings.en).sort();
  for (const [lang, table] of Object.entries(strings)) assert.deepEqual(Object.keys(table).sort(), keys, lang);
});

test('picks the Home Assistant language and falls back to English', () => {
  assert.equal(language({locale: {language: 'fr'}}), 'fr');
  assert.equal(language({language: 'fr-BE'}), 'fr');
  assert.equal(language({locale: {language: 'de'}}), 'en');
});

test('interpolates parameters', () => {
  assert.equal(translator('en')('sector', {zone: 2, count: 5}), 'Sector 2 · 5 incidents');
});

test('uses the Home Assistant translation of error codes, with a readable fallback', () => {
  const stateObj = {entity_id: 'sensor.mower_error'};
  assert.equal(errorLabel({formatEntityState: (s, code) => code === 'no_drive' ? 'Aucune traction' : code}, stateObj, 'no_drive'), 'Aucune traction');
  assert.equal(errorLabel({}, stateObj, 'wheel_motor_blocked_left'), 'Wheel motor blocked left');
});
