import test from 'node:test';
import assert from 'node:assert/strict';
import { convertArea, convertFromUnitToSqm, SQM_PER_UNIT, getLinearUnitMultiplier } from './units.ts';
import { calculateHeronTriangle, calculateFourSidedPlot, calculateFiveSidedPlot } from './triangulation.ts';
import { calculateFourSidedNoDiagonal } from './fourSidedNoDiag.ts';
import { computeClosedTraverse } from './traverse.ts';
import { wgs84ToUtm44N, utm44NToWgs84 } from './gis.ts';

test('Land Units Conversion: 1 Acre accurately converts to Indian units', () => {
  const oneAcreSqm = SQM_PER_UNIT.acre;
  const breakdown = convertArea(oneAcreSqm);

  assert.equal(breakdown.acres, 1);
  assert.equal(breakdown.cents, 100);
  assert.equal(breakdown.guntas, 40);
  // 1 Acre = 4840 Sq. Yards
  assert.equal(Math.round(breakdown.sqyd), 4840);
  // 1 Acre = 43560 Sq. Feet
  assert.equal(Math.round(breakdown.sqft), 43560);
});

test('Land Units: Cent and Gunta conversions', () => {
  // 1 Cent = 48.4 sq yards = 435.6 sq ft
  const oneCentSqm = SQM_PER_UNIT.cent;
  const res = convertArea(oneCentSqm);
  assert.equal(Math.round(res.sqyd * 10) / 10, 48.4);
  assert.equal(Math.round(res.sqft * 10) / 10, 435.6);

  // 1 Gunta = 121 sq yards = 1089 sq ft
  const oneGuntaSqm = SQM_PER_UNIT.gunta;
  const resGunta = convertArea(oneGuntaSqm);
  assert.equal(Math.round(resGunta.sqyd), 121);
  assert.equal(Math.round(resGunta.sqft), 1089);
});

test('Triangulation: Heron formula for 3-4-5 right triangle', () => {
  const result = calculateHeronTriangle(3, 4, 5);
  assert.equal(result.isValid, true);
  assert.equal(result.s, 6);
  assert.equal(result.area, 6);
});

test('Triangulation: Detects invalid triangle inequality', () => {
  // 2 + 3 <= 6 (fails)
  const result = calculateHeronTriangle(2, 3, 6);
  assert.equal(result.isValid, false);
  assert.equal(result.area, 0);
  assert.match(result.errorMessage || '', /triangle inequality|Invalid geometry/i);
});

test('4-Sided Irregular Plot: Computes exact rectangular area via diagonal', () => {
  // Rectangle of 30m x 40m with diagonal = 50m
  // Two 30-40-50 triangles, each area = 600 sqm => total = 1200 sqm
  const res = calculateFourSidedPlot(30, 40, 30, 40, 50);
  assert.equal(res.isValid, true);
  assert.equal(Math.round(res.totalArea), 1200);
  assert.equal(res.points.length, 4);
});

test('4-Sided Without Diagonal: Computes Cyclic Quadrilateral (Brahmagupta Formula) and Patwari Average', () => {
  // Rectangle of 30 x 40:
  // Cyclic Brahmagupta: sqrt(40*30*40*30) = 1200
  // Patwari: ((30 + 30)/2) * ((40 + 40)/2) = 30 * 40 = 1200
  const res = calculateFourSidedNoDiagonal(30, 40, 30, 40);
  assert.equal(res.isValid, true);
  assert.equal(res.cyclicArea, 1200);
  assert.equal(res.patwariArea, 1200);
  assert.equal(res.maxArea, 1200);
  assert.equal(res.points.length, 4);
  assert.equal(Math.round(res.diagonalAC), 50);
  assert.equal(Math.round(res.diagonalBD), 50);
});

test('4-Sided Without Diagonal: Detects geometric impossibility when one side exceeds sum of three', () => {
  // Side A = 100, others 10, 10, 10 => 100 >= 30 impossible
  const res = calculateFourSidedNoDiagonal(100, 10, 10, 10);
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage || '', /Invalid quadrilateral/);
});

test('Closed Traverse: Bowditch rule balances closing error to zero', () => {
  // 4-sided closed square traverse: 100m East, 100m South, 100m West, 100m North
  // Bearings: 90 deg, 180 deg, 270 deg, 360 (0) deg
  const stations = [
    { id: '1', lineId: '1-2', bearingDeg: 90, distanceMeters: 100 },
    { id: '2', lineId: '2-3', bearingDeg: 180, distanceMeters: 100 },
    { id: '3', lineId: '3-4', bearingDeg: 270, distanceMeters: 100 },
    { id: '4', lineId: '4-1', bearingDeg: 0, distanceMeters: 100 },
  ];

  const summary = computeClosedTraverse(stations, 1000, 1000);
  assert.equal(summary.totalPerimeter, 400);
  assert.ok(summary.linearClosingError < 0.001);
  assert.equal(summary.isClosedGood, true);

  // Check adjusted coordinates end back at initial base (1000, 1000)
  const lastLine = summary.lines[summary.lines.length - 1];
  assert.equal(Math.round(lastLine.northing), 1000);
  assert.equal(Math.round(lastLine.easting), 1000);
  assert.equal(Math.round(summary.areaSqm), 10000);
  assert.equal(summary.points.length, 4);
});

test('GIS & Proj4: Round-trip UTM Zone 44N projection for Andhra Pradesh (Vijayawada)', () => {
  const lng = 80.6480;
  const lat = 16.5062;
  const utm = wgs84ToUtm44N(lng, lat);
  
  // Vijayawada should have valid positive Easting (~462,000m) and Northing (~1,825,000m)
  assert.ok(utm.easting > 400000 && utm.easting < 500000);
  assert.ok(utm.northing > 1800000 && utm.northing < 1900000);

  const restored = utm44NToWgs84(utm.easting, utm.northing);
  assert.ok(restored !== null);
  const [restoredLng, restoredLat] = restored;
  assert.ok(Math.abs(restoredLng - lng) < 0.0001);
  assert.ok(Math.abs(restoredLat - lat) < 0.0001);
});

test('GIS & Cad: extractFourSidedDimensions calculates correct side lengths and diagonal in meters', async () => {
  const { extractFourSidedDimensions } = await import('./gis.ts');
  // 4 corners of an approximate square in WGS84
  const coords: [number, number][] = [
    [80.6480, 16.5062],
    [80.6490, 16.5062],
    [80.6490, 16.5072],
    [80.6480, 16.5072],
    [80.6480, 16.5062], // closed
  ];

  const dims = extractFourSidedDimensions(coords);
  assert.ok(dims !== null);
  assert.ok(dims.sideA > 100 && dims.sideA < 120);
  assert.ok(dims.sideB > 100 && dims.sideB < 120);
  assert.ok(dims.sideC > 100 && dims.sideC < 120);
  assert.ok(dims.sideD > 100 && dims.sideD < 120);
  // Diagonal should be approximately sqrt(2) * side
  assert.ok(dims.diagonal > dims.sideA);
});

test('GIS & UTM: wgs84ToUtmAuto correctly auto-detects zones 43N, 44N, and 45N across Indian states', async () => {
  const { wgs84ToUtmAuto } = await import('./gis.ts');

  // Mumbai / Maharashtra (lng 72.8777) -> Zone 43N
  const mumbai = wgs84ToUtmAuto(72.8777, 19.0760);
  assert.equal(mumbai.zone, 43);
  assert.ok(mumbai.easting > 100000 && mumbai.easting < 900000);
  assert.ok(mumbai.northing > 2000000 && mumbai.northing < 2200000);

  // Bengaluru / Karnataka (lng 77.5946) -> Zone 43N
  const bengaluru = wgs84ToUtmAuto(77.5946, 12.9716);
  assert.equal(bengaluru.zone, 43);
  assert.ok(bengaluru.easting > 700000 && bengaluru.easting < 900000);

  // Vijayawada / Andhra Pradesh (lng 80.6480) -> Zone 44N
  const vijayawada = wgs84ToUtmAuto(80.6480, 16.5062);
  assert.equal(vijayawada.zone, 44);
  assert.ok(vijayawada.easting > 400000 && vijayawada.easting < 500000);

  // Kolkata / West Bengal (lng 88.3639) -> Zone 45N (central meridian 87 deg E -> easting ~640,000m)
  const kolkata = wgs84ToUtmAuto(88.3639, 22.5726);
  assert.equal(kolkata.zone, 45);
  assert.ok(kolkata.easting > 600000 && kolkata.easting < 700000);
});

test('GIS Export: exportPolygonToGeoJson produces valid GeoJSON with required legal disclaimer', async () => {
  const { exportPolygonToGeoJson } = await import('./gis.ts');

  const coords: [number, number][] = [
    [80.528, 16.518],
    [80.531, 16.518],
    [80.531, 16.515],
    [80.527, 16.515],
  ];

  const jsonStr = exportPolygonToGeoJson(coords, {
    name: 'Test Parcel',
    areaAcres: 3.5,
    areaCents: 350,
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.type, 'FeatureCollection');
  assert.equal(parsed.features.length, 1);
  const feature = parsed.features[0];
  assert.equal(feature.geometry.type, 'Polygon');
  // First and last coordinates should be identical (closed ring)
  const ring = feature.geometry.coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  assert.equal(feature.properties.name, 'Test Parcel');
  assert.equal(feature.properties.areaAcres, 3.5);
  // Must include legal disclaimer
  assert.ok(typeof feature.properties.disclaimer === 'string');
  assert.match(feature.properties.disclaimer, /Not an official government survey record/i);
});

test('Cadastral: Synthetic parcels and survey numbers contain mandatory isSynthetic: true and disclaimer', async () => {
  const { generateCadastralParcelsGeoJSON, resolvePresentSurveyNumber } = await import('./cadastral.ts');

  // Test parcel generation
  const parcels = generateCadastralParcelsGeoJSON(80.6480, 16.5062);
  assert.equal(parcels.type, 'FeatureCollection');
  assert.ok(parcels.features.length > 0);
  for (const f of parcels.features) {
    assert.ok(f.properties);
    assert.equal(f.properties?.isSynthetic, true);
    assert.match(f.properties?.disclaimer || '', /illustrative demo|not an official/i);
  }

  // Test survey number lookup
  const lookup = resolvePresentSurveyNumber(80.6480, 16.5062);
  assert.equal(lookup.isSynthetic, true);
  assert.match(lookup.disclaimer || '', /illustrative demo|not an official/i);
});

test('Cadastral Links: Gunter Links precision (100,000 sq links = 1 Acre, 1,000 sq links = 1 Cent)', () => {
  // 1 Acre in Gunter's links
  const oneAcreSqm = SQM_PER_UNIT.acre;
  const breakdown = convertArea(oneAcreSqm);

  // Exactly 100,000 sq links = 1 Acre
  assert.equal(Math.round(breakdown.gunterLinks), 100000);

  // 1 Cent in Gunter's links = 1,000 sq links
  const oneCentSqm = SQM_PER_UNIT.cent;
  const centBreakdown = convertArea(oneCentSqm);
  assert.equal(Math.round(centBreakdown.gunterLinks), 1000);

  // Gunter linear factor = 0.201168 m, area factor = 0.201168^2
  const factor = getLinearUnitMultiplier('links', 'gunter');
  assert.equal(factor, 0.040468564224);

  // A 100 link x 100 link square plot (1 square chain) = 10,000 sq links = 0.1 Acre = 10 Cents
  const plotAreaSqm = 100 * 100 * factor;
  const plotBreakdown = convertArea(plotAreaSqm);
  assert.equal(plotBreakdown.acres, 0.1);
  assert.equal(plotBreakdown.cents, 10);
});

test('Cadastral Links: Metric Links precision (IS 1492: 1 link = 0.20m, 1 sq link = 0.04 sqm)', () => {
  // Metric linear factor: 1 link = 0.20 m (20 cm), area factor = 0.04 sqm
  const factor = getLinearUnitMultiplier('links', 'metric');
  assert.equal(factor, 0.04);

  // 100m x 100m plot (1 Hectare = 10,000 sqm)
  // In metric links: 100m = 500 links. 500 x 500 = 250,000 sq links
  const oneHaSqm = 10000;
  const breakdown = convertArea(oneHaSqm);
  assert.equal(Math.round(breakdown.metricLinks), 250000);

  // 1 Are = 100 sqm = 2,500 sq metric links (50 links x 50 links)
  const oneAreSqm = 100;
  const areBreakdown = convertArea(oneAreSqm);
  assert.equal(Math.round(areBreakdown.metricLinks), 2500);

  // Compare Metric vs Gunter's link length: 0.20m vs 0.201168m
  // Ratio is exactly (0.201168 / 0.20)^2 = 1.011714 (approx 1.17% area difference)
  const metricChainAreaSqm = 100 * 100 * getLinearUnitMultiplier('links', 'metric'); // 100 links x 100 links = 400 sqm
  const gunterChainAreaSqm = 100 * 100 * getLinearUnitMultiplier('links', 'gunter'); // 100 links x 100 links = 404.6856 sqm
  assert.equal(metricChainAreaSqm, 400);
  assert.equal(Math.round(gunterChainAreaSqm * 100) / 100, 404.69);
});

test('GPS Quality: checkVelocityGate rejects impossible human surveyor speed spikes (> 5.5 m/s)', async () => {
  const { checkVelocityGate } = await import('./gpsFilter.ts');
  const t0 = 1700000000000;
  const t1 = t0 + 2000; // 2 seconds later

  // Case 1: Realistic walking movement (2.5 meters in 2s = 1.25 m/s)
  const normal = checkVelocityGate(16.5000, 80.5000, t0, 16.50002, 80.5000, t1, 5.5);
  assert.equal(normal.isValid, true);
  assert.ok(normal.impliedSpeedMps < 3.0);

  // Case 2: Multipath teleportation jump (100 meters in 2s = 50 m/s)
  const spike = checkVelocityGate(16.5000, 80.5000, t0, 16.5009, 80.5000, t1, 5.5);
  assert.equal(spike.isValid, false);
  assert.ok(spike.impliedSpeedMps > 20);
});

test('GPS Filtering: StaticEpochAccumulator calculates inverse-variance weighted mean and rejects bad accuracy', async () => {
  const { StaticEpochAccumulator } = await import('./gpsFilter.ts');
  const acc = new StaticEpochAccumulator(5);

  acc.addSample(16.5000, 80.5000, 2.0);
  acc.addSample(16.5002, 80.5002, 1.5);
  acc.addSample(16.5001, 80.5001, 1.8);
  // Extremely bad multipath sample should be ignored (> 25m)
  acc.addSample(16.5100, 80.5100, 35.0);

  const res = acc.computeResult();
  assert.ok(res !== null);
  assert.equal(res.sampleCount, 3); // Bad sample excluded
  assert.ok(res.convergedAccuracy <= 2.0);
  assert.ok(res.stdDevMeters < 50);
});

test('Geometry Validation: validateSurveyPolygon catches self-intersections and collapses duplicate points', async () => {
  const { validateSurveyPolygon } = await import('./geometryValidation.ts');

  // Case 1: Valid simple square
  const validSquare: [number, number][] = [
    [80.528, 16.518],
    [80.531, 16.518],
    [80.531, 16.515],
    [80.528, 16.515],
  ];
  const validRes = validateSurveyPolygon(validSquare);
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.hasSelfIntersection, false);
  assert.equal(validRes.vertexCount, 4);
  assert.ok(validRes.estimatedAreaSqm > 1000);

  // Case 2: Self-intersecting bowtie polygon (invalid in cadastral law)
  const bowtie: [number, number][] = [
    [80.528, 16.518],
    [80.531, 16.515],
    [80.531, 16.518],
    [80.528, 16.515],
  ];
  const bowtieRes = validateSurveyPolygon(bowtie);
  assert.equal(bowtieRes.isValid, false);
  assert.equal(bowtieRes.hasSelfIntersection, true);
  assert.ok(bowtieRes.errors.some(e => e.includes('self-intersects')));

  // Case 3: Degenerate collinear line (zero enclosed area)
  const collinear: [number, number][] = [
    [80.528, 16.518],
    [80.529, 16.518],
    [80.530, 16.518],
  ];
  const colRes = validateSurveyPolygon(collinear);
  assert.equal(colRes.isValid, false);
  assert.ok(colRes.errors.some(e => e.includes('zero or near-zero')));
});

test('GIS & CRS: projectWgs84ToUtm returns explicit success and errors on out-of-range coordinates', async () => {
  const { projectWgs84ToUtm, unprojectUtmToWgs84 } = await import('./geometryValidation.ts');

  // Valid projection
  const valid = projectWgs84ToUtm(80.528, 16.518);
  assert.equal(valid.success, true);
  assert.ok(valid.easting > 0);
  assert.ok(valid.northing > 0);

  // Invalid coordinates should fail explicitly without returning [0, 0]
  const invalid = projectWgs84ToUtm(999, 999);
  assert.equal(invalid.success, false);
  assert.ok(isNaN(invalid.easting));
  assert.ok(typeof invalid.error === 'string');

  // Unprojection with invalid numbers returns null
  const unprojInvalid = unprojectUtmToWgs84(NaN, NaN);
  assert.equal(unprojInvalid, null);
});

test('Triangle Area: 3-4-5 triangle computes exact area with linear unit multipliers', () => {
  const tri = calculateHeronTriangle(30, 40, 50);
  assert.equal(tri.isValid, true);
  assert.equal(tri.area, 600); // 0.5 * 30 * 40 = 600

  // Meters: linearSqmFactor = 1.0 => 600 sqm
  const factorMeters = getLinearUnitMultiplier('m', 'metric');
  assert.equal(factorMeters, 1.0);
  const sqm = tri.area * factorMeters;
  const breakdown = convertArea(sqm);
  assert.equal(breakdown.sqm, 600);

  // Gunter Links: 1 link = 0.201168m, 100,000 sq links = 1 Acre
  const triGunter = calculateHeronTriangle(100, 100, 141.421356);
  assert.equal(triGunter.isValid, true);
  assert.ok(Math.abs(triGunter.area - 5000) < 0.1);
  const factorGunter = getLinearUnitMultiplier('links', 'gunter');
  const gunterSqm = triGunter.area * factorGunter;
  const gunterBreakdown = convertArea(gunterSqm);
  // 5,000 sq gunter links = 5 Cents = 0.05 Acres
  assert.equal(Math.round(gunterBreakdown.cents * 10) / 10, 5.0);
});

test('Units Separation: Links and Chains are distinct units with correct linear and area multipliers', () => {
  // Gunter standards (Cadastral / FMB / Patta):
  // 1 Gunter Link = 0.66 ft = 0.201168 m
  // 1 Gunter Chain = 100 Gunter Links = 66 ft = 20.1168 m
  const gunterLinkFactor = getLinearUnitMultiplier('links', 'gunter');
  const gunterChainFactor = getLinearUnitMultiplier('chains', 'gunter');
  assert.equal(gunterLinkFactor, 0.040468564224);
  assert.equal(gunterChainFactor, 404.68564224);
  // Ratio must be exactly 10,000 (100^2)
  assert.equal(Math.round(gunterChainFactor / gunterLinkFactor), 10000);

  // Metric standards (IS 1492):
  // 1 Metric Link = 0.20 m (20 cm)
  // 1 Metric Chain = 100 Metric Links = 20.0 m
  const metricLinkFactor = getLinearUnitMultiplier('links', 'metric');
  const metricChainFactor = getLinearUnitMultiplier('chains', 'metric');
  assert.equal(metricLinkFactor, 0.04);
  assert.equal(metricChainFactor, 400.0);
  // Ratio must be exactly 10,000 (100^2)
  assert.equal(metricChainFactor / metricLinkFactor, 10000);
});

test('Cadastral Chains & Links: Exact equivalence for 1 Sq Gunter Chain = 10,000 Sq Gunter Links = 10 Cents = 0.1 Acre', () => {
  // 1 Sq Gunter Chain = 404.68564224 sqm
  const oneSqChainSqm = SQM_PER_UNIT.sq_gunter_chain;
  assert.equal(oneSqChainSqm, 404.68564224);

  const breakdown = convertArea(oneSqChainSqm);
  assert.equal(breakdown.gunterChains, 1.0);
  assert.equal(breakdown.gunterLinks, 10000);
  assert.equal(breakdown.cents, 10.0);
  assert.equal(breakdown.acres, 0.1);

  // 10 Sq Gunter Chains = 1 Acre = 100 Cents = 100,000 Sq Gunter Links
  const tenSqChainsSqm = oneSqChainSqm * 10;
  const tenChainsBreakdown = convertArea(tenSqChainsSqm);
  assert.equal(tenChainsBreakdown.gunterChains, 10.0);
  assert.equal(tenChainsBreakdown.gunterLinks, 100000);
  assert.equal(tenChainsBreakdown.cents, 100.0);
  assert.equal(tenChainsBreakdown.acres, 1.0);
});

test('Metric Chains & Links: Exact equivalence for 1 Sq Metric Chain = 10,000 Sq Metric Links = 400 m² = 4 Ares', () => {
  // 1 Sq Metric Chain = 400 sqm
  const oneSqMetricChainSqm = SQM_PER_UNIT.sq_metric_chain;
  assert.equal(oneSqMetricChainSqm, 400.0);

  const breakdown = convertArea(oneSqMetricChainSqm);
  assert.equal(breakdown.metricChains, 1.0);
  assert.equal(breakdown.metricLinks, 10000);
  assert.equal(breakdown.sqm, 400.0);

  // 25 Sq Metric Chains = 10,000 sqm = 1 Hectare = 250,000 Sq Metric Links
  const oneHaSqm = 10000.0;
  const haBreakdown = convertArea(oneHaSqm);
  assert.equal(haBreakdown.metricChains, 25.0);
  assert.equal(haBreakdown.metricLinks, 250000);
  assert.equal(haBreakdown.hectares, 1.0);
});

test('Calculation Verification: Heron Triangle produces identical results with links vs chains inputs', () => {
  // Triangle with legs = 1 chain and 1 chain (right triangle, hypotenuse = sqrt(2) = 1.41421356 chains)
  // In chains:
  const triChains = calculateHeronTriangle(1, 1, 1.41421356);
  assert.equal(triChains.isValid, true);
  assert.ok(Math.abs(triChains.area - 0.5) < 0.0001); // 0.5 sq chains
  const chainsSqm = triChains.area * getLinearUnitMultiplier('chains', 'gunter');
  const chainsBreakdown = convertArea(chainsSqm);

  // In links (1 chain = 100 links):
  const triLinks = calculateHeronTriangle(100, 100, 141.421356);
  assert.equal(triLinks.isValid, true);
  assert.ok(Math.abs(triLinks.area - 5000) < 0.1); // 5000 sq links
  const linksSqm = triLinks.area * getLinearUnitMultiplier('links', 'gunter');
  const linksBreakdown = convertArea(linksSqm);

  // Both should be exactly 5.0 Cents and 0.05 Acres
  assert.equal(chainsBreakdown.cents, 5.0);
  assert.equal(linksBreakdown.cents, 5.0);
  assert.equal(chainsBreakdown.acres, 0.05);
  assert.equal(linksBreakdown.acres, 0.05);
  assert.ok(Math.abs(chainsSqm - linksSqm) < 0.001);
});

test('Calculation Verification: 4-Sided Quadrilateral (with diagonal) matches with links and chains', () => {
  // 1 chain x 1 chain plot with diagonal = sqrt(2) = 1.41421356 chains
  const quadChains = calculateFourSidedPlot(1, 1, 1, 1, 1.41421356);
  assert.equal(quadChains.isValid, true);
  assert.ok(Math.abs(quadChains.totalArea - 1.0) < 0.0001); // 1.0 sq chain
  const quadChainsSqm = quadChains.totalArea * getLinearUnitMultiplier('chains', 'gunter');
  const quadChainsBreakdown = convertArea(quadChainsSqm);

  // 100 links x 100 links with diagonal = 141.421356 links
  const quadLinks = calculateFourSidedPlot(100, 100, 100, 100, 141.421356);
  assert.equal(quadLinks.isValid, true);
  assert.ok(Math.abs(quadLinks.totalArea - 10000) < 0.1); // 10,000 sq links
  const quadLinksSqm = quadLinks.totalArea * getLinearUnitMultiplier('links', 'gunter');
  const quadLinksBreakdown = convertArea(quadLinksSqm);

  // Both should equal 10.0 Cents = 0.1 Acres
  assert.equal(quadChainsBreakdown.cents, 10.0);
  assert.equal(quadLinksBreakdown.cents, 10.0);
  assert.equal(quadChainsBreakdown.acres, 0.1);
  assert.equal(quadLinksBreakdown.acres, 0.1);
  assert.equal(Math.round(quadChainsSqm * 100) / 100, 404.69);
  assert.equal(Math.round(quadLinksSqm * 100) / 100, 404.69);
});

test('Calculation Verification: 4-Sided Cyclic Quadrilateral (Brahmagupta) matches with links and chains', () => {
  // 1 chain square cyclic plot
  const cyclicChains = calculateFourSidedNoDiagonal(1, 1, 1, 1);
  assert.equal(cyclicChains.isValid, true);
  assert.equal(cyclicChains.cyclicArea, 1.0); // 1.0 sq chain
  const cyclicChainsSqm = cyclicChains.cyclicArea * getLinearUnitMultiplier('chains', 'gunter');
  const cyclicChainsBreakdown = convertArea(cyclicChainsSqm);

  // 100 links square cyclic plot
  const cyclicLinks = calculateFourSidedNoDiagonal(100, 100, 100, 100);
  assert.equal(cyclicLinks.isValid, true);
  assert.equal(cyclicLinks.cyclicArea, 10000); // 10,000 sq links
  const cyclicLinksSqm = cyclicLinks.cyclicArea * getLinearUnitMultiplier('links', 'gunter');
  const cyclicLinksBreakdown = convertArea(cyclicLinksSqm);

  assert.equal(cyclicChainsBreakdown.cents, 10.0);
  assert.equal(cyclicLinksBreakdown.cents, 10.0);
  assert.equal(cyclicChainsBreakdown.acres, 0.1);
  assert.equal(cyclicLinksBreakdown.acres, 0.1);
});

test('Quick Converter: convertFromUnitToSqm accurately converts sq_gunter_chain and sq_metric_chain', () => {
  // 1 Sq Gunter Chain = 404.68564224 sqm = 10 Cents
  const gunterChainSqm = convertFromUnitToSqm(1, 'sq_gunter_chain');
  assert.equal(gunterChainSqm, 404.68564224);

  // 10 Sq Gunter Chains = 1 Acre = 4046.8564224 sqm
  const tenGunterChainsSqm = convertFromUnitToSqm(10, 'sq_gunter_chain');
  assert.equal(tenGunterChainsSqm, 4046.8564224);

  // 1 Sq Metric Chain = 400 sqm = 4 Ares
  const metricChainSqm = convertFromUnitToSqm(1, 'sq_metric_chain');
  assert.equal(metricChainSqm, 400.0);

  // 25 Sq Metric Chains = 1 Hectare = 10,000 sqm
  const twentyFiveMetricChainsSqm = convertFromUnitToSqm(25, 'sq_metric_chain');
  assert.equal(twentyFiveMetricChainsSqm, 10000.0);
});

