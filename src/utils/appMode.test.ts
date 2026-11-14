import test from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleTiles, getSimpleGpsRating } from './appMode.ts';

test('App Mode: Simple mode isolates exactly 4 core landowner tiles', () => {
  const { coreTiles, advancedTiles } = getVisibleTiles('simple');
  assert.equal(coreTiles.length, 4);
  const ids = coreTiles.map((t) => t.id);
  assert.deepEqual(ids, ['gps_walk', 'area_calc', 'projects', 'market']);

  // Professional CAD, traverse, and GIS tools are placed under advanced
  assert.ok(advancedTiles.some((t) => t.id === 'cadtools'));
  assert.ok(advancedTiles.some((t) => t.id === 'traverse'));
  assert.ok(advancedTiles.some((t) => t.id === 'cad'));
  assert.ok(advancedTiles.some((t) => t.id === 'survey_quality'));
});

test('App Mode: Advanced mode presents full professional suite', () => {
  const { coreTiles, advancedTiles } = getVisibleTiles('advanced');
  assert.ok(coreTiles.length >= 11);
  assert.equal(advancedTiles.length, 0);
});

test('App Mode: getSimpleGpsRating maps meters to human ratings', () => {
  assert.equal(getSimpleGpsRating(null, false), 'No Signal');
  assert.equal(getSimpleGpsRating(1.8, true), 'Good');
  assert.equal(getSimpleGpsRating(3.0, true), 'Good');
  assert.equal(getSimpleGpsRating(5.4, true), 'OK');
  assert.equal(getSimpleGpsRating(8.0, true), 'OK');
  assert.equal(getSimpleGpsRating(14.2, true), 'Poor');
});
