import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tileXY, imageryNativeZoom, MAX_NATIVE_ZOOM} from '../src/map/tiles.js';

test('computes slippy map tile coordinates', () => {
  assert.deepEqual(tileXY(58.6101, 15.2601, 18), {x: 142184, y: 78109});
});

test('picks the deepest level with imagery', async () => {
  const deepest = 18;
  const fetchJson = async url => ({valid: true, data: [Number(url.split('/tilemap/')[1].split('/')[0]) <= deepest ? 1 : 0]});
  assert.equal(await imageryNativeZoom(58.6101, 15.2601, fetchJson), 18);
});

test('falls back to the default depth when the service fails', async () => {
  assert.equal(await imageryNativeZoom(0, 0, async () => { throw new Error('offline'); }), MAX_NATIVE_ZOOM);
  assert.equal(await imageryNativeZoom(0, 0, async () => ({valid: false})), MAX_NATIVE_ZOOM);
});
