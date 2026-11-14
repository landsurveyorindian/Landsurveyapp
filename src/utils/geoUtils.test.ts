import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectIndianState,
  rateGpsAccuracy,
  toDms,
  calculateDistanceMeters,
} from './geoUtils';

test('detectIndianState accurately maps Amaravati/Vijayawada to Andhra Pradesh', () => {
  // Vijayawada: ~16.5062, 80.6480
  const state = detectIndianState(16.5062, 80.648);
  assert.equal(state, 'Andhra Pradesh');
});

test('detectIndianState accurately maps Hyderabad to Telangana', () => {
  // Hyderabad: ~17.3850, 78.4867
  const state = detectIndianState(17.385, 78.4867);
  assert.equal(state, 'Telangana');
});

test('detectIndianState accurately maps Bengaluru to Karnataka', () => {
  // Bengaluru: ~12.9716, 77.5946
  const state = detectIndianState(12.9716, 77.5946);
  assert.equal(state, 'Karnataka');
});

test('detectIndianState maps newly supported Indian states accurately', () => {
  // Tamil Nadu: Chennai
  assert.equal(detectIndianState(13.0827, 80.2707), 'Tamil Nadu');

  // Maharashtra: Mumbai
  assert.equal(detectIndianState(19.0760, 72.8777), 'Maharashtra');

  // Kerala: Kochi
  assert.equal(detectIndianState(9.9312, 76.2673), 'Kerala');

  // Gujarat: Ahmedabad
  assert.equal(detectIndianState(23.0225, 72.5714), 'Gujarat');

  // Rajasthan: Jaipur
  assert.equal(detectIndianState(26.9124, 75.7873), 'Rajasthan');

  // Uttar Pradesh: Lucknow
  assert.equal(detectIndianState(26.8467, 80.9462), 'Uttar Pradesh');

  // West Bengal: Kolkata
  assert.equal(detectIndianState(22.5726, 88.3639), 'West Bengal');

  // Odisha: Bhubaneswar
  assert.equal(detectIndianState(20.2961, 85.8245), 'Odisha');

  // Madhya Pradesh: Bhopal
  assert.equal(detectIndianState(23.2599, 77.4126), 'Madhya Pradesh');

  // Bihar: Patna
  assert.equal(detectIndianState(25.5941, 85.1376), 'Bihar');

  // Punjab: Ludhiana
  assert.equal(detectIndianState(30.9010, 75.8573), 'Punjab');

  // Delhi: New Delhi
  assert.equal(detectIndianState(28.6139, 77.2090), 'Delhi');

  // Goa: Panaji
  assert.equal(detectIndianState(15.4909, 73.8278), 'Goa');
});

test('detectIndianState returns null for coordinates outside covered bounding boxes', () => {
  const state = detectIndianState(0, 0);
  assert.equal(state, null);
});

test('rateGpsAccuracy flags survey readiness properly', () => {
  const excellent = rateGpsAccuracy(3.2);
  assert.equal(excellent.level, 'excellent');
  assert.equal(excellent.surveyReady, true);

  const good = rateGpsAccuracy(12.0);
  assert.equal(good.level, 'good');
  assert.equal(good.surveyReady, true);

  const fair = rateGpsAccuracy(25.0);
  assert.equal(fair.level, 'fair');
  assert.equal(fair.surveyReady, false);

  const poor = rateGpsAccuracy(55.0);
  assert.equal(poor.level, 'poor');
  assert.equal(poor.surveyReady, false);
});

test('toDms formats positive latitude to N and longitude to E', () => {
  const latDms = toDms(16.5062, true);
  assert.match(latDms, /16° 30' .* N/);

  const lngDms = toDms(80.648, false);
  assert.match(lngDms, /80° 38' .* E/);
});

test('calculateDistanceMeters calculates accurate distance between two nearby survey markers', () => {
  // 1 degree latitude is approx 111,000 meters
  const dist = calculateDistanceMeters(16.0, 80.0, 16.001, 80.0);
  // ~111 meters
  assert.ok(dist > 105 && dist < 115, `Expected ~111m, got ${dist}`);
});
