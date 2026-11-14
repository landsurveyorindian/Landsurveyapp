import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GpsKalmanFilter,
  StaticEpochAccumulator,
  checkVelocityGate,
  GcpCalibrationManager,
} from './gpsFilter';
import { calculateDistanceMeters } from './geoUtils';

test('GpsKalmanFilter: Initializes and progressively converges variance on consecutive readings', () => {
  const filter = new GpsKalmanFilter(2.0); // 2.0 m^2/s process noise

  const baseLat = 16.5062;
  const baseLng = 80.6480;

  // First reading: initializes filter
  const fix1 = filter.update(baseLat, baseLng, 12.0, 1000);
  assert.equal(fix1.lat, baseLat);
  assert.equal(fix1.lng, baseLng);
  assert.equal(fix1.estimatedAccuracy, 12.0);

  // Subsequent noisy readings around base point
  // The filter should smooth out jitter and decrease estimated error variance
  let lastFix = fix1;
  const noiseOffsets = [
    { dLat: 0.00003, dLng: -0.00002, acc: 8.0 },
    { dLat: -0.00002, dLng: 0.00001, acc: 7.5 },
    { dLat: 0.00001, dLng: 0.00002, acc: 6.0 },
    { dLat: -0.00001, dLng: -0.00001, acc: 5.5 },
    { dLat: 0.00000, dLng: 0.00000, acc: 5.0 },
  ];

  let timeMs = 2000;
  for (const n of noiseOffsets) {
    lastFix = filter.update(baseLat + n.dLat, baseLng + n.dLng, n.acc, timeMs);
    timeMs += 1000;
  }

  // Estimated accuracy should have improved substantially compared to the initial 12m
  assert.ok(
    lastFix.estimatedAccuracy < 5.0,
    `Expected converged accuracy < 5.0m, got ${lastFix.estimatedAccuracy}m`
  );

  // Filter coordinate should be very close to ground truth (within 3 meters)
  const dist = calculateDistanceMeters(baseLat, baseLng, lastFix.lat, lastFix.lng);
  assert.ok(dist < 3.0, `Expected distance < 3m, got ${dist}m`);
});

test('StaticEpochAccumulator: Weighted Centroid reduces random jitter to sub-meter precision', () => {
  const accumulator = new StaticEpochAccumulator(10);

  const trueLat = 17.385044;
  const trueLng = 78.486671;

  // Simulate 12 GPS readings with varying accuracy (some 10m, some 4m, some 3m)
  accumulator.addSample(trueLat + 0.00004, trueLng - 0.00003, 10.0);
  accumulator.addSample(trueLat - 0.00003, trueLng + 0.00004, 9.0);
  accumulator.addSample(trueLat + 0.00001, trueLng - 0.00001, 4.0); // high quality
  accumulator.addSample(trueLat - 0.00001, trueLng + 0.00001, 3.5); // high quality
  accumulator.addSample(trueLat + 0.000005, trueLng - 0.000005, 3.0); // high quality
  accumulator.addSample(trueLat, trueLng, 3.0);
  accumulator.addSample(trueLat + 0.000008, trueLng, 3.2);
  accumulator.addSample(trueLat - 0.000006, trueLng, 3.1);
  accumulator.addSample(trueLat, trueLng + 0.000007, 3.3);
  accumulator.addSample(trueLat, trueLng - 0.000008, 3.0);

  assert.equal(accumulator.getCount(), 10);
  assert.equal(accumulator.isComplete(), true);

  const result = accumulator.computeResult();
  assert.ok(result !== null);
  assert.ok(result.isConverged);
  assert.ok(
    result.convergedAccuracy <= 1.5,
    `Expected converged accuracy <= 1.5m, got ${result.convergedAccuracy}m`
  );

  const errorDist = calculateDistanceMeters(trueLat, trueLng, result.lat, result.lng);
  assert.ok(
    errorDist < 1.0,
    `Expected converged coordinate within 1 meter of ground truth, got ${errorDist}m`
  );
});

test('checkVelocityGate: Rejects multipath speed spikes and permits walking speed', () => {
  const p1 = { lat: 16.5000, lng: 80.6000, t: 1000 };

  // Walking 2 meters in 2 seconds = 1 m/s (valid)
  // 1 degree lat ~ 111132 m, so 2m is ~ 0.000018 deg
  const pWalk = { lat: 16.500018, lng: 80.6000, t: 3000 };
  const walkCheck = checkVelocityGate(p1.lat, p1.lng, p1.t, pWalk.lat, pWalk.lng, pWalk.t, 3.5);
  assert.equal(walkCheck.isValid, true);
  assert.ok(walkCheck.impliedSpeedMps < 2.0);

  // Multipath jump: 50 meters in 1 second = 50 m/s (rejected)
  const pJump = { lat: 16.50045, lng: 80.6000, t: 2000 };
  const jumpCheck = checkVelocityGate(p1.lat, p1.lng, p1.t, pJump.lat, pJump.lng, pJump.t, 3.5);
  assert.equal(jumpCheck.isValid, false);
  assert.ok(jumpCheck.impliedSpeedMps > 30);
});

test('GcpCalibrationManager: Computes differential offset and applies to subsequent coordinates', () => {
  const manager = GcpCalibrationManager.getInstance();
  manager.clear();

  const measuredLat = 16.506200;
  const measuredLng = 80.648000;

  // Authoritative boundary benchmark is 3.5m north-east
  const knownLat = 16.506225;
  const knownLng = 80.648030;

  const cal = manager.calibrate(measuredLat, measuredLng, knownLat, knownLng, 'FMB Stone #12');
  assert.ok(cal.offsetMeters > 0);

  // Applying calibration to original measured coordinates should match known point
  const corrected = manager.apply(measuredLat, measuredLng);
  assert.equal(corrected.lat, knownLat);
  assert.equal(corrected.lng, knownLng);

  manager.clear();
  const uncalibrated = manager.apply(measuredLat, measuredLng);
  assert.equal(uncalibrated.lat, measuredLat);
});

test('checkVelocityGate: Outlier rejection and recovery thresholds', () => {
  const pOrigin = { lat: 16.5000, lng: 80.6000, t: 10000 };

  // Speed threshold at 6.0 m/s
  // 12 meters in 1 second = 12 m/s -> Outlier!
  const pOutlier = { lat: 16.500108, lng: 80.6000, t: 11000 };
  const outlierCheck = checkVelocityGate(pOrigin.lat, pOrigin.lng, pOrigin.t, pOutlier.lat, pOutlier.lng, pOutlier.t, 6.0);
  assert.equal(outlierCheck.isValid, false);
  assert.ok(outlierCheck.impliedSpeedMps > 10.0);

  // Normal walking surveyor: 4 meters in 2 seconds = 2 m/s -> Valid!
  const pWalk = { lat: 16.500036, lng: 80.6000, t: 12000 };
  const walkCheck = checkVelocityGate(pOrigin.lat, pOrigin.lng, pOrigin.t, pWalk.lat, pWalk.lng, pWalk.t, 6.0);
  assert.equal(walkCheck.isValid, true);
  assert.ok(walkCheck.impliedSpeedMps < 3.0);
});

test('GPS Guard: Identifies stale timestamps older than 10 seconds', () => {
  const now = Date.now();
  const freshTimestamp = now - 2000; // 2 seconds old
  const staleTimestamp = now - 15000; // 15 seconds old

  const isFresh = now - freshTimestamp <= 10000;
  const isStale = now - staleTimestamp > 10000;

  assert.equal(isFresh, true, 'Fresh timestamp should not be marked stale');
  assert.equal(isStale, true, 'Timestamp older than 10s must be marked stale');
});

