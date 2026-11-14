import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_INDIAN_STATES_DATA,
  getAllIndianStates,
  getStateUnitConfig,
  convertStateUnitToSqm,
  convertSqmToStateUnits,
} from './indianStateUnits.ts';

test('Indian States & UTs: Covers all 28 states and 8 union territories plus All-India', () => {
  const allStates = getAllIndianStates();
  // 28 states + 8 UTs + 1 All-India = 37
  assert.equal(allStates.length, 37);

  // Check essential states from each zone
  const names = allStates.map((s) => s.state);
  assert.ok(names.includes('Punjab'));
  assert.ok(names.includes('Haryana'));
  assert.ok(names.includes('Uttar Pradesh'));
  assert.ok(names.includes('Rajasthan'));
  assert.ok(names.includes('Bihar'));
  assert.ok(names.includes('West Bengal'));
  assert.ok(names.includes('Odisha'));
  assert.ok(names.includes('Assam'));
  assert.ok(names.includes('Tripura'));
  assert.ok(names.includes('Maharashtra'));
  assert.ok(names.includes('Gujarat'));
  assert.ok(names.includes('Goa'));
  assert.ok(names.includes('Karnataka'));
  assert.ok(names.includes('Tamil Nadu'));
  assert.ok(names.includes('Telangana'));
  assert.ok(names.includes('Andhra Pradesh'));
  assert.ok(names.includes('Kerala'));
  assert.ok(names.includes('Delhi (NCT)'));
  assert.ok(names.includes('Jammu and Kashmir'));
  assert.ok(names.includes('Ladakh'));
  assert.ok(names.includes('All-India'));
});

test('Punjab & Haryana: 1 Acre = 8 Kanals = 160 Marlas = 43,560 sq ft', () => {
  const punjab = getStateUnitConfig('Punjab');
  const kanal = punjab.units.find((u) => u.key === 'kanal');
  const marla = punjab.units.find((u) => u.key === 'marla');

  assert.ok(kanal);
  assert.ok(marla);
  assert.equal(kanal.sqft, 5445);
  assert.equal(marla.sqft, 272.25);
  assert.equal(kanal.sqft / marla.sqft, 20); // 1 Kanal = 20 Marlas
  assert.equal(kanal.sqft * 8, 43560); // 8 Kanals = 1 Acre
});

test('Uttar Pradesh: 1 Pucca Bigha = 20 Biswa = 27,225 sq ft = 3,025 sq yd', () => {
  const up = getStateUnitConfig('Uttar Pradesh');
  const puccaBigha = up.units.find((u) => u.key === 'bigha_pucca_up');
  const biswa = up.units.find((u) => u.key === 'biswa_up');

  assert.ok(puccaBigha);
  assert.ok(biswa);
  assert.equal(puccaBigha.sqft, 27225);
  assert.equal(biswa.sqft, 1361.25);
  assert.equal(puccaBigha.sqft / biswa.sqft, 20);
});

test('West Bengal: 1 Bigha = 20 Cottahs (14,400 sq ft) and 1 Cottah = 16 Chhataks (720 sq ft)', () => {
  const wb = getStateUnitConfig('West Bengal');
  const bigha = wb.units.find((u) => u.key === 'bigha_wb');
  const cottah = wb.units.find((u) => u.key === 'cottah_wb');
  const chhatak = wb.units.find((u) => u.key === 'chhatak_wb');

  assert.ok(bigha);
  assert.ok(cottah);
  assert.ok(chhatak);
  assert.equal(bigha.sqft, 14400);
  assert.equal(cottah.sqft, 720);
  assert.equal(chhatak.sqft, 45);
  assert.equal(cottah.sqft / chhatak.sqft, 16);
});

test('Tamil Nadu: 1 Ground = 2,400 sq ft and 1 Kani = 57,499.2 sq ft (1.32 Acre)', () => {
  const tn = getStateUnitConfig('Tamil Nadu');
  const ground = tn.units.find((u) => u.key === 'ground_tn');
  const kani = tn.units.find((u) => u.key === 'kani_tn');

  assert.ok(ground);
  assert.ok(kani);
  assert.equal(ground.sqft, 2400);
  assert.equal(kani.sqft, 57499.2);
});

test('Gujarat: 1 Bigha = 16 Vassa = 17,424 sq ft (0.40 Acre)', () => {
  const gj = getStateUnitConfig('Gujarat');
  const bigha = gj.units.find((u) => u.key === 'bigha_gujarat');
  const vassa = gj.units.find((u) => u.key === 'vassa_gujarat');

  assert.ok(bigha);
  assert.ok(vassa);
  assert.equal(bigha.sqft, 17424);
  assert.equal(vassa.sqft, 1089);
  assert.equal(bigha.sqft / vassa.sqft, 16);
});

test('Assam: 1 Bigha = 5 Kathas = 100 Lessas (14,400 sq ft)', () => {
  const as = getStateUnitConfig('Assam');
  const bigha = as.units.find((u) => u.key === 'bigha_assam');
  const katha = as.units.find((u) => u.key === 'katha_assam');
  const lessa = as.units.find((u) => u.key === 'lessa_assam');

  assert.ok(bigha);
  assert.ok(katha);
  assert.ok(lessa);
  assert.equal(bigha.sqft, 14400);
  assert.equal(katha.sqft, 2880);
  assert.equal(lessa.sqft, 144);
  assert.equal(bigha.sqft / katha.sqft, 5);
  assert.equal(katha.sqft / lessa.sqft, 20);
});

test('convertSqmToStateUnits: accurately breaks down area for selected state', () => {
  // 1 Acre = 4046.856 m²
  const acreSqm = 4046.8564;
  const punjabUnits = convertSqmToStateUnits(acreSqm, 'Punjab');
  const kanalConversion = punjabUnits.find((u) => u.unit.key === 'kanal');
  assert.ok(kanalConversion);
  // Should equal 8 Kanals
  assert.equal(Math.round(kanalConversion.value), 8);

  const upUnits = convertSqmToStateUnits(acreSqm, 'Uttar Pradesh');
  const upBiswaConversion = upUnits.find((u) => u.unit.key === 'biswa_up');
  assert.ok(upBiswaConversion);
  // 1 Acre = 32 Biswa in UP
  assert.equal(Math.round(upBiswaConversion.value), 32);
});
