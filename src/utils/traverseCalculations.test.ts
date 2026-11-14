import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeClosedTraverse,
  validateTraverseStations,
  normalizeBearing,
  TraverseStation,
} from './traverse.ts';

test('Traverse Validation: Normalizes bearings into [0, 360) range', () => {
  assert.equal(normalizeBearing(0), 0);
  assert.equal(normalizeBearing(360), 0);
  assert.equal(normalizeBearing(450), 90);
  assert.equal(normalizeBearing(-90), 270);
  assert.equal(normalizeBearing(-180), 180);
});

test('Traverse Validation: Rejects invalid, negative, NaN, or zero distances', () => {
  const invalidStations: TraverseStation[] = [
    { id: '1', lineId: '1-2', bearingDeg: 90, distanceMeters: -50 }, // negative
    { id: '2', lineId: '2-3', bearingDeg: 180, distanceMeters: 100 },
    { id: '3', lineId: '3-4', bearingDeg: 270, distanceMeters: NaN }, // NaN
  ];

  const validation = validateTraverseStations(invalidStations);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some((e) => e.includes('negative')));
  assert.ok(validation.errors.some((e) => e.includes('valid finite number')));
});

test('Traverse Closure: All-zero traverse does NOT report false closure', () => {
  const allZeroStations: TraverseStation[] = [
    { id: '1', lineId: '1-2', bearingDeg: 0, distanceMeters: 0 },
    { id: '2', lineId: '2-3', bearingDeg: 0, distanceMeters: 0 },
    { id: '3', lineId: '3-4', bearingDeg: 0, distanceMeters: 0 },
  ];

  const summary = computeClosedTraverse(allZeroStations);
  assert.equal(summary.isValid, false);
  assert.equal(summary.isClosedGood, false);
  assert.equal(summary.qualityGrade, 'Invalid');
  assert.notEqual(summary.relativePrecision, '1 in ∞ (Exact)');
});

test('Traverse Closure: Rejects traverse with fewer than 3 stations', () => {
  const twoStations: TraverseStation[] = [
    { id: '1', lineId: '1-2', bearingDeg: 90, distanceMeters: 100 },
    { id: '2', lineId: '2-1', bearingDeg: 270, distanceMeters: 100 },
  ];

  const summary = computeClosedTraverse(twoStations);
  assert.equal(summary.isValid, false);
  assert.equal(summary.isClosedGood, false);
});

test('Bowditch Adjustment: Correctly adjusts real closed traverse with closing error', () => {
  // A 4-sided traverse with a slight 0.2m misclosure:
  // Leg 1: 90 deg, 100m (lat 0, dep 100)
  // Leg 2: 180 deg, 100.1m (lat -100.1, dep 0)
  // Leg 3: 270 deg, 99.9m (lat 0, dep -99.9)
  // Leg 4: 0 deg, 100m (lat 100, dep 0)
  // Total Perimeter ~ 400m
  // Latitude misclosure = -0.1m
  // Departure misclosure = +0.1m
  const stations: TraverseStation[] = [
    { id: '1', lineId: '1-2', bearingDeg: 90, distanceMeters: 100 },
    { id: '2', lineId: '2-3', bearingDeg: 180, distanceMeters: 100.1 },
    { id: '3', lineId: '3-4', bearingDeg: 270, distanceMeters: 99.9 },
    { id: '4', lineId: '4-1', bearingDeg: 0, distanceMeters: 100 },
  ];

  const summary = computeClosedTraverse(stations, 1000, 1000);
  assert.equal(summary.isValid, true);
  assert.ok(summary.totalPerimeter > 399 && summary.totalPerimeter < 401);

  // Closing error is sqrt((-0.1)^2 + 0.1^2) ~ 0.1414m
  assert.ok(summary.linearClosingError > 0.14 && summary.linearClosingError < 0.15);

  // Precision ratio ~ 400 / 0.1414 ~ 2828 (1 in ~2,828) -> Third-Order
  assert.ok(summary.precisionRatio > 2500 && summary.precisionRatio < 3000);
  assert.equal(summary.qualityGrade, 'Third-Order');
  assert.equal(summary.isClosedGood, true);

  // Verify Bowditch corrections: sum of adjusted latitudes and departures MUST equal 0 exactly
  let adjLatSum = 0;
  let adjDepSum = 0;
  summary.lines.forEach((line) => {
    adjLatSum += line.adjLat;
    adjDepSum += line.adjDep;
  });
  assert.ok(Math.abs(adjLatSum) < 0.01, `Adjusted latitude sum should be 0, got ${adjLatSum}`);
  assert.ok(Math.abs(adjDepSum) < 0.01, `Adjusted departure sum should be 0, got ${adjDepSum}`);

  // Final adjusted coordinates return to initial station (1000, 1000)
  const finalLine = summary.lines[summary.lines.length - 1];
  assert.equal(Math.round(finalLine.northing), 1000);
  assert.equal(Math.round(finalLine.easting), 1000);

  // Both adjusted points and unadjusted points are provided
  assert.equal(summary.points.length, 4);
  assert.equal(summary.unadjustedPoints.length, 4);
});

test('Traverse Quality: Rejects degenerate collinear stations with zero enclosed area', () => {
  // 3 collinear stations moving back and forth on a single line (0 area)
  const collinearStations: TraverseStation[] = [
    { id: '1', lineId: '1-2', bearingDeg: 90, distanceMeters: 50 },
    { id: '2', lineId: '2-3', bearingDeg: 90, distanceMeters: 50 },
    { id: '3', lineId: '3-1', bearingDeg: 270, distanceMeters: 100 },
  ];

  const summary = computeClosedTraverse(collinearStations);
  assert.equal(summary.isValid, false);
  assert.ok(summary.validationErrors.some((e) => e.includes('near-zero enclosed area')));
});
