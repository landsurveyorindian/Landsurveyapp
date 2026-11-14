import test from 'node:test';
import assert from 'node:assert';
import {
  tileToBBox3857,
  bboxToTile,
  TRANSPARENT_PNG,
} from './bhuvanTileService.js';

test('tileToBBox3857 correctly computes EPSG:3857 bounding box for Vijayawada z16 tile', () => {
  // Tile x=47524, y=29675, z=16
  const bbox = tileToBBox3857(47524, 29675, 16);
  assert.ok(bbox.includes(','), 'BBox must be comma-delimited');
  const parts = bbox.split(',').map(Number);
  assert.strictEqual(parts.length, 4, 'BBox must have 4 coordinate values');
  const [minx, miny, maxx, maxy] = parts;

  // In India (East Longitude ~80.6 deg, North Lat ~16.5 deg)
  assert.ok(minx > 8000000 && minx < 10000000, `minx ${minx} should be in Indian longitude range`);
  assert.ok(miny > 1500000 && miny < 2500000, `miny ${miny} should be in South India latitude range`);
  assert.ok(maxx > minx, 'maxx must be greater than minx');
  assert.ok(maxy > miny, 'maxy must be greater than miny');
});

test('bboxToTile correctly resolves tile coordinates from EPSG:3857 bbox', () => {
  const bbox = tileToBBox3857(47524, 29675, 16);
  const tile = bboxToTile(bbox);
  assert.ok(tile, 'tile should not be null');
  assert.strictEqual(tile.z, 16);
  assert.strictEqual(tile.x, 47524);
  assert.strictEqual(tile.y, 29675);
});

test('TRANSPARENT_PNG is a valid 1x1 PNG image buffer', () => {
  assert.ok(Buffer.isBuffer(TRANSPARENT_PNG));
  assert.strictEqual(TRANSPARENT_PNG[0], 0x89);
  assert.strictEqual(TRANSPARENT_PNG[1], 0x50);
  assert.strictEqual(TRANSPARENT_PNG[2], 0x4e);
  assert.strictEqual(TRANSPARENT_PNG[3], 0x47);
});
