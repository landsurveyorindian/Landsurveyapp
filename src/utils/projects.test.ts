import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_PROJECT } from '../services/projectsService';
import { calculateDistanceMeters } from './geoUtils';
import * as turf from '@turf/turf';

test('SAMPLE_PROJECT: Contains clear illustrative demo parcel disclaimer', () => {
  assert.ok(SAMPLE_PROJECT.notes, 'SAMPLE_PROJECT must have notes');
  assert.ok(
    SAMPLE_PROJECT.notes.includes('Illustrative demo') || SAMPLE_PROJECT.notes.includes('Not an actual surveyed property'),
    'SAMPLE_PROJECT must have explicit demo parcel disclaimer'
  );
  assert.equal(SAMPLE_PROJECT.userId, 'guest');
});

test('SAMPLE_PROJECT: Polygon coordinates form a closed quadrilateral ring', () => {
  const coords = SAMPLE_PROJECT.polygon?.coordinates;
  assert.ok(coords && coords.length === 5, 'Coordinates must be 5 points (closed 4-sided polygon)');

  // First and last point must match
  assert.equal(coords[0][0], coords[4][0]);
  assert.equal(coords[0][1], coords[4][1]);
});

test('SAMPLE_PROJECT: Geodesic edge lengths match declared lengths within 0.05%', () => {
  const coords = SAMPLE_PROJECT.polygon!.coordinates;
  const declaredEdges = SAMPLE_PROJECT.polygon!.edgeLengths!;
  assert.equal(declaredEdges.length, 4);

  for (let i = 0; i < 4; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const computedMeters = calculateDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
    const declaredMeters = declaredEdges[i].lengthMeters;

    const diffPercent = (Math.abs(computedMeters - declaredMeters) / declaredMeters) * 100;
    assert.ok(
      diffPercent < 0.05,
      `Edge #${i + 1} computed ${computedMeters.toFixed(2)}m vs declared ${declaredMeters}m differs by ${diffPercent.toFixed(4)}% (> 0.05%)`
    );

    // Verify feet conversion: 1m = 3.28084 ft
    const expectedFeet = declaredMeters * 3.28084;
    const declaredFeet = declaredEdges[i].lengthFeet;
    const feetDiffPercent = (Math.abs(expectedFeet - declaredFeet) / declaredFeet) * 100;
    assert.ok(
      feetDiffPercent < 0.05,
      `Edge #${i + 1} declared feet ${declaredFeet} vs computed ${expectedFeet.toFixed(2)} differs by ${feetDiffPercent.toFixed(4)}%`
    );
  }
});

test('SAMPLE_PROJECT: Geodesic area matches declared area and Indian conversions within 0.05%', () => {
  const coords = SAMPLE_PROJECT.polygon!.coordinates;
  const poly = turf.polygon([coords]);
  const turfAreaSqm = turf.area(poly);

  const declaredAreaSqm = SAMPLE_PROJECT.polygon!.areaSqm;
  const diffPercent = (Math.abs(turfAreaSqm - declaredAreaSqm) / declaredAreaSqm) * 100;

  assert.ok(
    diffPercent < 0.05,
    `Turf computed area ${turfAreaSqm.toFixed(2)} sqm vs declared ${declaredAreaSqm} sqm differs by ${diffPercent.toFixed(4)}% (> 0.05%)`
  );

  // 1 Cent = 40.468564 sqm
  const expectedCents = declaredAreaSqm / 40.468564;
  const declaredCents = SAMPLE_PROJECT.polygon!.areaCents;
  const centsDiff = (Math.abs(expectedCents - declaredCents) / declaredCents) * 100;
  assert.ok(centsDiff < 0.05, `Cents conversion differs by ${centsDiff.toFixed(4)}%`);

  // 1 Acre = 4046.8564 sqm
  const expectedAcres = declaredAreaSqm / 4046.8564;
  const declaredAcres = SAMPLE_PROJECT.polygon!.areaAcres;
  const acresDiff = (Math.abs(expectedAcres - declaredAcres) / declaredAcres) * 100;
  assert.ok(acresDiff < 0.05, `Acres conversion differs by ${acresDiff.toFixed(4)}%`);
});
