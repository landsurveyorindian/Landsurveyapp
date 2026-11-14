import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePolygonArea,
  computePolygonPerimeter,
  computeBearingWCB,
  toQuadrantalBearing,
  computeCogoForward,
  computeCogoInverse,
  computeCentroid,
  splitPolygonByLine,
  computeParallelOffset,
  computeFmbPoints,
  generateCadDxf,
  generateCadSvg,
  findOsnapTarget,
  parseCadCommand,
  CadPoint,
} from './cadEngine.ts';

test('CAD Engine: Computes exact rectangular area and perimeter', () => {
  // 30m x 40m rectangle
  const rect: CadPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
    { x: 0, y: 30 },
  ];

  const area = computePolygonArea(rect);
  const perim = computePolygonPerimeter(rect);

  assert.equal(area, 1200);
  assert.equal(perim, 140);
});

test('CAD COGO: WCB Bearings & Quadrantal conversions', () => {
  const origin: CadPoint = { x: 0, y: 0 };
  const north: CadPoint = { x: 0, y: 50 };
  const east: CadPoint = { x: 50, y: 0 };
  const south: CadPoint = { x: 0, y: -50 };
  const west: CadPoint = { x: -50, y: 0 };

  assert.equal(computeBearingWCB(origin, north), 0);
  assert.equal(computeBearingWCB(origin, east), 90);
  assert.equal(computeBearingWCB(origin, south), 180);
  assert.equal(computeBearingWCB(origin, west), 270);

  assert.equal(toQuadrantalBearing(45), "N 45° 00' E");
  assert.equal(toQuadrantalBearing(135), "S 45° 00' E");
  assert.equal(toQuadrantalBearing(225), "S 45° 00' W");
  assert.equal(toQuadrantalBearing(315), "N 45° 00' W");
});

test('CAD COGO: Forward and Inverse round-trip', () => {
  const p1: CadPoint = { x: 100, y: 200 };
  const bearing = 60; // 60 degrees WCB
  const distance = 80; // 80 meters

  const p2 = computeCogoForward(p1, bearing, distance);
  const inv = computeCogoInverse(p1, p2);

  assert.equal(Math.round(inv.distance), 80);
  assert.equal(Math.round(inv.bearingDeg), 60);
});

test('CAD Engine: Polygon Centroid computation', () => {
  const rect: CadPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
    { x: 0, y: 30 },
  ];

  const centroid = computeCentroid(rect);
  assert.equal(centroid.x, 20);
  assert.equal(centroid.y, 15);
});

test('CAD Subdivision: Splits a 40x30 plot into two 20x30 sub-parcels', () => {
  const plot: CadPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
    { x: 0, y: 30 },
  ];

  // Vertical cutting line along x=20
  const cutP1: CadPoint = { x: 20, y: -10 };
  const cutP2: CadPoint = { x: 20, y: 50 };

  const result = splitPolygonByLine(plot, cutP1, cutP2);
  assert.ok(result);
  assert.equal(Math.round(result.part1Area), 600);
  assert.equal(Math.round(result.part2Area), 600);
  assert.equal(result.ratio, 0.5);
  assert.equal(result.splitLine[0].x, 20);
  assert.equal(result.splitLine[1].x, 20);
});

test('CAD Offsets: Inward setback offset on rectangular boundary', () => {
  const rect: CadPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
    { x: 0, y: 30 },
  ];

  // Inward offset of 2m (setback)
  const offset = computeParallelOffset(rect, 2, true);
  assert.equal(offset.length, 4);
  const offsetArea = computePolygonArea(offset);
  // (40 - 4) * (30 - 4) = 36 * 26 = 936
  assert.equal(Math.round(offsetArea), 936);
});

test('CAD FMB: Reconstructs field parcel from G-line and perpendicular tie ladder', () => {
  const gLineStart: CadPoint = { x: 0, y: 0 };
  const fmb = computeFmbPoints(gLineStart, 90, 60, [
    { id: '1', distanceAlongGLine: 15, offsetDistance: 20, side: 'L', pointLabel: 'F1' },
    { id: '2', distanceAlongGLine: 40, offsetDistance: 15, side: 'R', pointLabel: 'F2' },
  ]);

  assert.equal(fmb.gLineStart.x, 0);
  assert.equal(fmb.gLineEnd.x, 60);
  assert.equal(fmb.tieLines.length, 2);
  assert.ok(fmb.boundaryPoints.length >= 4);
});

test('CAD DXF & SVG: Exports valid CAD exchange formats with layers', () => {
  const plot: CadPoint[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 30 },
    { x: 0, y: 30 },
  ];

  const dxf = generateCadDxf({
    boundary: plot,
    surveyNumber: '142/3',
    state: 'Andhra Pradesh',
  });

  assert.ok(dxf.includes('0_BOUNDARY'));
  assert.ok(dxf.includes('0_SUBDIVISION'));
  assert.ok(dxf.includes('AC1009'));
  assert.ok(dxf.includes('142/3'));

  const svg = generateCadSvg({
    boundary: plot,
    surveyNumber: '142/3',
    state: 'Andhra Pradesh',
  });

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('142/3'));
  assert.ok(svg.includes('North Arrow'));
});

test('CAD OSNAP: Snaps to Endpoint, Midpoint and Centroid with magnetic marker', () => {
  const square: CadPoint[] = [
    { x: 0, y: 0, label: 'A' },
    { x: 20, y: 0, label: 'B' },
    { x: 20, y: 20, label: 'C' },
    { x: 0, y: 20, label: 'D' },
  ];

  // Near endpoint A (0.2, 0.1)
  const snapEnd = findOsnapTarget({ x: 0.2, y: 0.1 }, square, 2.0);
  assert.ok(snapEnd);
  assert.equal(snapEnd.type, 'endpoint');
  assert.equal(snapEnd.point.x, 0);
  assert.equal(snapEnd.point.y, 0);

  // Near midpoint of AB (10, 0)
  const snapMid = findOsnapTarget({ x: 10.3, y: 0.4 }, square, 2.0);
  assert.ok(snapMid);
  assert.equal(snapMid.type, 'midpoint');
  assert.equal(snapMid.point.x, 10);
  assert.equal(snapMid.point.y, 0);

  // Near centroid (10, 10)
  const snapCenter = findOsnapTarget({ x: 9.8, y: 10.1 }, square, 2.0);
  assert.ok(snapCenter);
  assert.equal(snapCenter.type, 'center');
  assert.equal(snapCenter.point.x, 10);
  assert.equal(snapCenter.point.y, 10);
});

test('CAD Command Line: Parses AutoCAD commands and relative coordinates', () => {
  const cmdLine = parseCadCommand('LINE');
  assert.equal(cmdLine.command, 'LINE');

  const cmdPl = parseCadCommand('PL');
  assert.equal(cmdPl.command, 'PL');

  const cmdCart = parseCadCommand('25,30');
  assert.ok(cmdCart.isCoordinate);
  assert.equal(cmdCart.coord?.x, 25);
  assert.equal(cmdCart.coord?.y, 30);
  assert.equal(cmdCart.relative, false);

  const cmdRel = parseCadCommand('@15,-5', { x: 10, y: 20 });
  assert.ok(cmdRel.isCoordinate);
  assert.equal(cmdRel.coord?.x, 25);
  assert.equal(cmdRel.coord?.y, 15);
  assert.equal(cmdRel.relative, true);

  const cmdPolar = parseCadCommand('@10<0', { x: 5, y: 5 });
  assert.ok(cmdPolar.isCoordinate);
  assert.equal(cmdPolar.coord?.x, 15);
  assert.equal(cmdPolar.coord?.y, 5);
});
