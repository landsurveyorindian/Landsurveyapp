/**
 * CAD Engine for Cadastral Surveying & Vector Drafting
 * Pure 2D geometry, COGO, boundary sub-division, offset buffers,
 * FMB ladder sketching, and AutoCAD DXF/SVG generation.
 */

export interface CadPoint {
  x: number; // Easting / local X (meters)
  y: number; // Northing / local Y (meters)
  id?: string;
  label?: string;
  code?: string;
}

export interface CadLine {
  id: string;
  start: CadPoint;
  end: CadPoint;
  label?: string;
  layer?: string;
  color?: string;
}

export interface CadArc {
  id: string;
  center: CadPoint;
  radius: number;
  startAngleDeg: number;
  endAngleDeg: number;
  layer?: string;
  color?: string;
}

export interface CadCircle {
  id: string;
  center: CadPoint;
  radius: number;
  layer?: string;
  color?: string;
}

export interface CadLayerDef {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineWeight?: number;
}

export interface CadDimension {
  id: string;
  p1: CadPoint;
  p2: CadPoint;
  value: number; // in current linear unit
  unitLabel: string;
  text?: string;
}

export interface CadStation {
  id: string;
  point: CadPoint;
  label: string;
  isBenchmark?: boolean;
}

export interface CadFmbOffset {
  id: string;
  distanceAlongGLine: number; // distance from start of G-Line (m)
  offsetDistance: number;     // perpendicular offset (m)
  side: 'L' | 'R';            // Left or Right of G-line
  pointLabel: string;
}

export interface OsnapResult {
  point: CadPoint;
  type: 'endpoint' | 'midpoint' | 'center' | 'perpendicular' | 'intersection' | 'nearest';
  sourceSegmentIdx?: number;
}

export interface CadSubdivisionResult {
  part1: CadPoint[];
  part2: CadPoint[];
  part1Area: number;
  part2Area: number;
  totalArea: number;
  ratio: number; // part1Area / totalArea
  splitLine: [CadPoint, CadPoint];
}

/**
 * Compute planar 2D polygon area using Shoelace formula (Survey convention: positive area).
 */
export function computePolygonArea(points: CadPoint[]): number {
  if (!points || points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Compute polygon perimeter in meters.
 */
export function computePolygonPerimeter(points: CadPoint[]): number {
  if (!points || points.length < 2) return 0;
  let perimeter = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += computeSegmentLength(points[i], points[j]);
  }
  return perimeter;
}

/**
 * Distance between two points in meters.
 */
export function computeSegmentLength(p1: CadPoint, p2: CadPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Compute Whole Circle Bearing (WCB 0° - 360°) from p1 to p2.
 * 0° = North (+Y), 90° = East (+X), 180° = South (-Y), 270° = West (-X).
 */
export function computeBearingWCB(p1: CadPoint, p2: CadPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Number(deg.toFixed(2));
}

/**
 * Convert WCB to Quadrantal Bearing (e.g., N 45° 30' E)
 */
export function toQuadrantalBearing(wcbDeg: number): string {
  const wcb = ((wcbDeg % 360) + 360) % 360;
  let prefix = 'N';
  let suffix = 'E';
  let angle = wcb;

  if (wcb >= 0 && wcb <= 90) {
    prefix = 'N';
    suffix = 'E';
    angle = wcb;
  } else if (wcb > 90 && wcb <= 180) {
    prefix = 'S';
    suffix = 'E';
    angle = 180 - wcb;
  } else if (wcb > 180 && wcb <= 270) {
    prefix = 'S';
    suffix = 'W';
    angle = wcb - 180;
  } else {
    prefix = 'N';
    suffix = 'W';
    angle = 360 - wcb;
  }

  const deg = Math.floor(angle);
  const min = Math.round((angle - deg) * 60);
  return `${prefix} ${deg}° ${min.toString().padStart(2, '0')}' ${suffix}`;
}

/**
 * COGO Forward Computation: Given starting point, bearing, and distance, compute new point.
 */
export function computeCogoForward(start: CadPoint, bearingDeg: number, distance: number, label?: string): CadPoint {
  const rad = (bearingDeg * Math.PI) / 180;
  // dx = dist * sin(bearing), dy = dist * cos(bearing)
  const x = start.x + distance * Math.sin(rad);
  const y = start.y + distance * Math.cos(rad);
  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
    label,
  };
}

/**
 * COGO Inverse Computation: Given two points, compute distance, bearing, delta X, delta Y.
 */
export function computeCogoInverse(p1: CadPoint, p2: CadPoint): {
  distance: number;
  bearingDeg: number;
  deltaX: number;
  deltaY: number;
  quadBearing: string;
} {
  const distance = Number(computeSegmentLength(p1, p2).toFixed(4));
  const bearingDeg = computeBearingWCB(p1, p2);
  const deltaX = Number((p2.x - p1.x).toFixed(4));
  const deltaY = Number((p2.y - p1.y).toFixed(4));
  const quadBearing = toQuadrantalBearing(bearingDeg);

  return {
    distance,
    bearingDeg,
    deltaX,
    deltaY,
    quadBearing,
  };
}

/**
 * AutoCAD Object Snap (OSNAP) detector.
 * Snaps to endpoints, midpoints, perpendicular drops, and polygon centroid.
 */
export function findOsnapTarget(
  cursor: CadPoint,
  boundaryPoints: CadPoint[],
  thresholdMeters: number = 1.2
): OsnapResult | null {
  if (!boundaryPoints || boundaryPoints.length === 0) return null;

  let bestSnap: OsnapResult | null = null;
  let bestDist = thresholdMeters;

  // 1. Endpoint Osnap
  for (let i = 0; i < boundaryPoints.length; i++) {
    const p = boundaryPoints[i];
    const d = computeSegmentLength(cursor, p);
    if (d < bestDist) {
      bestDist = d;
      bestSnap = {
        point: { x: p.x, y: p.y, label: p.label },
        type: 'endpoint',
        sourceSegmentIdx: i,
      };
    }
  }

  // 2. Midpoint Osnap
  if (boundaryPoints.length >= 2) {
    for (let i = 0; i < boundaryPoints.length; i++) {
      const p1 = boundaryPoints[i];
      const p2 = boundaryPoints[(i + 1) % boundaryPoints.length];
      const mid: CadPoint = {
        x: Number(((p1.x + p2.x) / 2).toFixed(3)),
        y: Number(((p1.y + p2.y) / 2).toFixed(3)),
        label: `Mid-${i + 1}`,
      };
      const d = computeSegmentLength(cursor, mid);
      if (d < bestDist) {
        bestDist = d;
        bestSnap = {
          point: mid,
          type: 'midpoint',
          sourceSegmentIdx: i,
        };
      }
    }
  }

  // 3. Centroid Osnap
  if (boundaryPoints.length >= 3) {
    const c = computeCentroid(boundaryPoints);
    const d = computeSegmentLength(cursor, c);
    if (d < bestDist) {
      bestDist = d;
      bestSnap = {
        point: c,
        type: 'center',
      };
    }
  }

  return bestSnap;
}

export interface ParsedCadCommand {
  command: string;
  args: string[];
  raw: string;
  isCoordinate?: boolean;
  coord?: { x: number; y: number };
  relative?: boolean;
}

/**
 * AutoCAD Command Prompt Parser.
 * Supports:
 * - Direct commands: L (LINE), PL (POLYLINE), C (CIRCLE), REC (RECT), OFFSET (O), TRIM (TR), EXTEND (EX), SPLIT, AREA (AA), DIST (DI), ERASE (E), UNDO (U), FIT (Z E), CLEAR
 * - Coordinate input: "10,20", "@15,0" (relative dx, dy), "@25<45" (polar relative dist<angle)
 */
export function parseCadCommand(input: string, lastPoint?: CadPoint): ParsedCadCommand {
  const raw = input.trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const head = parts[0]?.toUpperCase() || '';
  const args = parts.slice(1);

  // Check for polar relative "@dist<angle" (e.g. "@25<45")
  const polarMatch = raw.match(/^@?([0-9.]+)<([0-9.]+)$/);
  if (polarMatch) {
    const dist = parseFloat(polarMatch[1]);
    const angDeg = parseFloat(polarMatch[2]);
    const rad = (angDeg * Math.PI) / 180;
    const base = lastPoint || { x: 0, y: 0 };
    return {
      command: 'COORD',
      args: [raw],
      raw,
      isCoordinate: true,
      coord: {
        x: Number((base.x + dist * Math.cos(rad)).toFixed(3)),
        y: Number((base.y + dist * Math.sin(rad)).toFixed(3)),
      },
      relative: true,
    };
  }

  // Check for Cartesian "@dx,dy" or "x,y"
  const cartMatch = raw.match(/^(@?)(-?[0-9.]+),(-?[0-9.]+)$/);
  if (cartMatch) {
    const isRel = cartMatch[1] === '@';
    const xVal = parseFloat(cartMatch[2]);
    const yVal = parseFloat(cartMatch[3]);
    const base = isRel && lastPoint ? lastPoint : { x: 0, y: 0 };
    return {
      command: 'COORD',
      args: [raw],
      raw,
      isCoordinate: true,
      coord: {
        x: Number((isRel ? base.x + xVal : xVal).toFixed(3)),
        y: Number((isRel ? base.y + yVal : yVal).toFixed(3)),
      },
      relative: isRel,
    };
  }

  return {
    command: head,
    args,
    raw,
  };
}

/**
 * Compute Centroid of 2D polygon.
 */
export function computeCentroid(points: CadPoint[]): CadPoint {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = points[i].x * points[j].y - points[j].x * points[i].y;
    signedArea += a;
    cx += (points[i].x + points[j].x) * a;
    cy += (points[i].y + points[j].y) * a;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-9) {
    // Fallback simple arithmetic mean
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / n, y: sum.y / n };
  }

  cx = cx / (6 * signedArea);
  cy = cy / (6 * signedArea);

  return { x: Number(cx.toFixed(3)), y: Number(cy.toFixed(3)) };
}

/**
 * Split a convex/simple polygon by an infinite line passing through lineP1 and lineP2.
 * Returns two clean sub-polygons with their calculated areas and area ratio.
 */
export function splitPolygonByLine(
  polygonPoints: CadPoint[],
  lineP1: CadPoint,
  lineP2: CadPoint
): CadSubdivisionResult | null {
  if (polygonPoints.length < 3) return null;

  // Line equation: A*x + B*y + C = 0
  const A = lineP2.y - lineP1.y;
  const B = lineP1.x - lineP2.x;
  const C = lineP2.x * lineP1.y - lineP1.x * lineP2.y;

  const side = (p: CadPoint) => A * p.x + B * p.y + C;

  const part1: CadPoint[] = [];
  const part2: CadPoint[] = [];
  const intersectionPoints: CadPoint[] = [];

  const n = polygonPoints.length;

  for (let i = 0; i < n; i++) {
    const pCurrent = polygonPoints[i];
    const pNext = polygonPoints[(i + 1) % n];

    const sCurrent = side(pCurrent);
    const sNext = side(pNext);

    if (sCurrent >= -1e-7) {
      part1.push({ x: pCurrent.x, y: pCurrent.y, label: pCurrent.label });
    }
    if (sCurrent <= 1e-7) {
      part2.push({ x: pCurrent.x, y: pCurrent.y, label: pCurrent.label });
    }

    // Check if segment crosses the splitting line
    if ((sCurrent > 1e-7 && sNext < -1e-7) || (sCurrent < -1e-7 && sNext > 1e-7)) {
      // Find intersection point
      const t = sCurrent / (sCurrent - sNext);
      const ix = pCurrent.x + t * (pNext.x - pCurrent.x);
      const iy = pCurrent.y + t * (pNext.y - pCurrent.y);
      const interPt: CadPoint = {
        x: Number(ix.toFixed(4)),
        y: Number(iy.toFixed(4)),
        label: `Div-${intersectionPoints.length + 1}`,
      };
      part1.push(interPt);
      part2.push(interPt);
      intersectionPoints.push(interPt);
    }
  }

  if (part1.length < 3 || part2.length < 3 || intersectionPoints.length < 2) {
    return null;
  }

  const part1Area = computePolygonArea(part1);
  const part2Area = computePolygonArea(part2);
  const totalArea = computePolygonArea(polygonPoints);

  if (part1Area <= 0.01 || part2Area <= 0.01) return null;

  return {
    part1,
    part2,
    part1Area: Number(part1Area.toFixed(3)),
    part2Area: Number(part2Area.toFixed(3)),
    totalArea: Number(totalArea.toFixed(3)),
    ratio: Number((part1Area / (part1Area + part2Area)).toFixed(4)),
    splitLine: [intersectionPoints[0], intersectionPoints[1]],
  };
}

/**
 * Generate parallel inward or outward offset line or boundary buffer.
 * Positive offset = inward (setback), Negative offset = outward (expansion / road right-of-way).
 */
export function computeParallelOffset(
  points: CadPoint[],
  offsetDistanceMeters: number,
  isClosed = true
): CadPoint[] {
  if (points.length < 2) return [];

  const n = points.length;
  const offsetSegments: { p1: CadPoint; p2: CadPoint }[] = [];

  // 1. Shift each segment perpendicularly
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (!isClosed && i === n - 1) break;

    const p1 = points[i];
    const p2 = points[j];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;

    // Normal vector pointing inward (right of traversal if clockwise)
    const nx = -dy / len;
    const ny = dx / len;

    offsetSegments.push({
      p1: { x: p1.x + nx * offsetDistanceMeters, y: p1.y + ny * offsetDistanceMeters },
      p2: { x: p2.x + nx * offsetDistanceMeters, y: p2.y + ny * offsetDistanceMeters },
    });
  }

  if (offsetSegments.length === 0) return [];
  if (!isClosed && offsetSegments.length === 1) {
    return [offsetSegments[0].p1, offsetSegments[0].p2];
  }

  // 2. Intersect adjacent offset lines to form vertices
  const result: CadPoint[] = [];
  const count = offsetSegments.length;

  for (let i = 0; i < count; i++) {
    const prevSeg = isClosed
      ? offsetSegments[(i - 1 + count) % count]
      : i > 0
      ? offsetSegments[i - 1]
      : null;
    const currSeg = offsetSegments[i];

    if (!prevSeg) {
      result.push(currSeg.p1);
      continue;
    }

    // Intersect prevSeg and currSeg
    const inter = lineIntersection(prevSeg.p1, prevSeg.p2, currSeg.p1, currSeg.p2);
    if (inter) {
      result.push({
        x: Number(inter.x.toFixed(4)),
        y: Number(inter.y.toFixed(4)),
      });
    } else {
      result.push(currSeg.p1);
    }
  }

  if (!isClosed && count > 0) {
    result.push(offsetSegments[count - 1].p2);
  }

  return result;
}

function lineIntersection(p1: CadPoint, p2: CadPoint, p3: CadPoint, p4: CadPoint): CadPoint | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/**
 * FMB (Field Measurement Book) Ladder Offset Reconstruction:
 * In Indian cadastral surveying (AP, Telangana, Tamil Nadu, Karnataka, etc.),
 * an FMB sketch is anchored along a base traverse line (G-Line).
 * Perpendicular tie offsets left (L) and right (R) define boundary stones.
 */
export function computeFmbPoints(
  gLineStart: CadPoint,
  gLineBearingDeg: number,
  gLineLengthMeters: number,
  offsets: CadFmbOffset[]
): {
  gLineStart: CadPoint;
  gLineEnd: CadPoint;
  boundaryPoints: CadPoint[];
  tieLines: { base: CadPoint; offset: CadPoint; label: string }[];
} {
  const gLineEnd = computeCogoForward(gLineStart, gLineBearingDeg, gLineLengthMeters, 'G-End');

  const gRad = (gLineBearingDeg * Math.PI) / 180;
  const ux = Math.sin(gRad); // Unit vector along G-line
  const uy = Math.cos(gRad);

  // Perpendicular normal (Right = +90°, Left = -90°)
  const rx = uy;
  const ry = -ux;

  const tieLines: { base: CadPoint; offset: CadPoint; label: string }[] = [];
  const leftPoints: CadPoint[] = [];
  const rightPoints: CadPoint[] = [];

  for (const item of offsets) {
    // Point on G-line
    const baseX = gLineStart.x + item.distanceAlongGLine * ux;
    const baseY = gLineStart.y + item.distanceAlongGLine * uy;
    const basePoint: CadPoint = {
      x: Number(baseX.toFixed(3)),
      y: Number(baseY.toFixed(3)),
      label: `G@${item.distanceAlongGLine}m`,
    };

    // Direction factor for Left or Right
    const dir = item.side === 'R' ? 1 : -1;
    const offX = baseX + dir * item.offsetDistance * rx;
    const offY = baseY + dir * item.offsetDistance * ry;
    const offsetPoint: CadPoint = {
      x: Number(offX.toFixed(3)),
      y: Number(offY.toFixed(3)),
      label: item.pointLabel || (item.side === 'L' ? `L${item.distanceAlongGLine}` : `R${item.distanceAlongGLine}`),
    };

    tieLines.push({
      base: basePoint,
      offset: offsetPoint,
      label: `${item.offsetDistance}m ${item.side}`,
    });

    if (item.side === 'L') {
      leftPoints.push(offsetPoint);
    } else {
      rightPoints.push(offsetPoint);
    }
  }

  // Sort left points by ascending distance, right points descending to create boundary polygon loop
  leftPoints.sort((a, b) => a.x - b.x);
  rightPoints.sort((a, b) => b.x - a.x);

  const boundaryPoints = [gLineStart, ...leftPoints, gLineEnd, ...rightPoints];

  return {
    gLineStart,
    gLineEnd,
    boundaryPoints,
    tieLines,
  };
}

/**
 * Generate a standard AutoCAD ASCII DXF (R12 / 2000 compliant).
 * Creates distinct layers for BOUNDARY, SUBDIVISION, SETBACK, DIMENSIONS, STATIONS, and TEXT.
 */
export function generateCadDxf(data: {
  boundary?: CadPoint[];
  subDivisions?: CadPoint[][];
  setback?: CadPoint[];
  dimensions?: CadDimension[];
  stations?: CadStation[];
  surveyNumber?: string;
  state?: string;
}): string {
  const lines: string[] = [];

  // DXF Header
  lines.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC');

  // DXF Tables & Layers
  lines.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '6');

  // Layer 0_BOUNDARY (Green, Color 3)
  lines.push('0', 'LAYER', '2', '0_BOUNDARY', '70', '0', '62', '3', '6', 'CONTINUOUS');
  // Layer 0_SUBDIVISION (Magenta, Color 6)
  lines.push('0', 'LAYER', '2', '0_SUBDIVISION', '70', '0', '62', '6', '6', 'DASHED');
  // Layer 0_SETBACK (Yellow, Color 2)
  lines.push('0', 'LAYER', '2', '0_SETBACK', '70', '0', '62', '2', '6', 'DASHED');
  // Layer 0_DIMENSIONS (Cyan, Color 4)
  lines.push('0', 'LAYER', '2', '0_DIMENSIONS', '70', '0', '62', '4', '6', 'CONTINUOUS');
  // Layer 0_STATIONS (Red, Color 1)
  lines.push('0', 'LAYER', '2', '0_STATIONS', '70', '0', '62', '1', '6', 'CONTINUOUS');
  // Layer 0_TEXT (White, Color 7)
  lines.push('0', 'LAYER', '2', '0_TEXT', '70', '0', '62', '7', '6', 'CONTINUOUS');

  lines.push('0', 'ENDTAB', '0', 'ENDSEC');

  // DXF Entities
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // 1. Boundary Polyline
  if (data.boundary && data.boundary.length >= 3) {
    const pts = data.boundary;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      lines.push('0', 'LINE', '8', '0_BOUNDARY');
      lines.push('10', pts[i].x.toFixed(4), '20', pts[i].y.toFixed(4), '30', '0.0');
      lines.push('11', next.x.toFixed(4), '21', next.y.toFixed(4), '31', '0.0');
    }
  }

  // 2. Sub-Division Polygons
  if (data.subDivisions) {
    for (const subPoly of data.subDivisions) {
      if (subPoly.length >= 3) {
        for (let i = 0; i < subPoly.length; i++) {
          const next = subPoly[(i + 1) % subPoly.length];
          lines.push('0', 'LINE', '8', '0_SUBDIVISION');
          lines.push('10', subPoly[i].x.toFixed(4), '20', subPoly[i].y.toFixed(4), '30', '0.0');
          lines.push('11', next.x.toFixed(4), '21', next.y.toFixed(4), '31', '0.0');
        }
      }
    }
  }

  // 3. Setback Lines
  if (data.setback && data.setback.length >= 2) {
    const sb = data.setback;
    for (let i = 0; i < sb.length; i++) {
      const next = sb[(i + 1) % sb.length];
      lines.push('0', 'LINE', '8', '0_SETBACK');
      lines.push('10', sb[i].x.toFixed(4), '20', sb[i].y.toFixed(4), '30', '0.0');
      lines.push('11', next.x.toFixed(4), '21', next.y.toFixed(4), '31', '0.0');
    }
  }

  // 4. Stations / Boundary Stones (Circles & Labels)
  if (data.stations) {
    for (const stn of data.stations) {
      lines.push('0', 'CIRCLE', '8', '0_STATIONS');
      lines.push('10', stn.point.x.toFixed(4), '20', stn.point.y.toFixed(4), '30', '0.0');
      lines.push('40', '0.5'); // 0.5m radius station symbol

      // Label text
      lines.push('0', 'TEXT', '8', '0_TEXT');
      lines.push('10', (stn.point.x + 0.8).toFixed(4), '20', (stn.point.y + 0.8).toFixed(4), '30', '0.0');
      lines.push('40', '1.0'); // 1.0m text height
      lines.push('1', stn.label || 'STN');
    }
  }

  // 5. Dimensions
  if (data.dimensions) {
    for (const dim of data.dimensions) {
      lines.push('0', 'LINE', '8', '0_DIMENSIONS');
      lines.push('10', dim.p1.x.toFixed(4), '20', dim.p1.y.toFixed(4), '30', '0.0');
      lines.push('11', dim.p2.x.toFixed(4), '21', dim.p2.y.toFixed(4), '31', '0.0');

      const midX = (dim.p1.x + dim.p2.x) / 2;
      const midY = (dim.p1.y + dim.p2.y) / 2;
      lines.push('0', 'TEXT', '8', '0_DIMENSIONS');
      lines.push('10', midX.toFixed(4), '20', (midY + 0.6).toFixed(4), '30', '0.0');
      lines.push('40', '0.8');
      lines.push('1', `${dim.value} ${dim.unitLabel}`);
    }
  }

  // 6. Cadastral Metadata Stamp
  const metaX = data.boundary?.[0]?.x ?? 0;
  const metaY = (data.boundary?.[0]?.y ?? 0) - 5;
  lines.push('0', 'TEXT', '8', '0_TEXT');
  lines.push('10', metaX.toFixed(4), '20', metaY.toFixed(4), '30', '0.0');
  lines.push('40', '1.2');
  lines.push('1', `Sthal Measure CAD - Survey #${data.surveyNumber || 'Plot'} (${data.state || 'All-India'})`);

  lines.push('0', 'ENDSEC', '0', 'EOF');

  return lines.join('\n');
}

/**
 * Generate high-precision Scalable Vector Graphics (SVG) plot drawing
 * with scale bar, North arrow, and survey metadata block.
 */
export function generateCadSvg(data: {
  boundary: CadPoint[];
  subDivisions?: CadPoint[][];
  dimensions?: CadDimension[];
  stations?: CadStation[];
  setback?: CadPoint[];
  surveyNumber?: string;
  state?: string;
  unitLabel?: string;
  width?: number;
  height?: number;
}): string {
  const w = data.width || 800;
  const h = data.height || 600;
  const padding = 60;

  if (!data.boundary || data.boundary.length < 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><text x="50%" y="50%" text-anchor="middle" fill="#666">No valid plot geometry</text></svg>`;
  }

  // Determine bbox
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of data.boundary) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;

  const scale = Math.min((w - padding * 2) / dx, (h - padding * 2) / dy);

  // Transform world (m) to SVG pixel coordinates (invert Y for screen space)
  const toSvgX = (x: number) => padding + (x - minX) * scale;
  const toSvgY = (y: number) => h - (padding + (y - minY) * scale);

  const polyPath =
    data.boundary.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`).join(' ') +
    ' Z';

  const area = computePolygonArea(data.boundary);
  const perimeter = computePolygonPerimeter(data.boundary);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background-color: #0b1519; font-family: monospace;">
  <defs>
    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#163138" stroke-width="0.5"/>
    </pattern>
  </defs>

  <!-- Grid -->
  <rect width="${w}" height="${h}" fill="url(#cadGrid)" />

  <!-- Main Cadastral Boundary -->
  <path d="${polyPath}" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" stroke-width="2.5" />
`;

  // Draw Setback Buffer if present
  if (data.setback && data.setback.length >= 3) {
    const sbPath =
      data.setback.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`).join(' ') +
      ' Z';
    svg += `  <path d="${sbPath}" fill="none" stroke="#eab308" stroke-width="1.5" stroke-dasharray="4,4" />\n`;
  }

  // Draw Sub-divisions if present
  if (data.subDivisions) {
    for (const sub of data.subDivisions) {
      if (sub.length >= 3) {
        const subPath =
          sub.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`).join(' ') +
          ' Z';
        svg += `  <path d="${subPath}" fill="rgba(217, 70, 239, 0.08)" stroke="#d946ef" stroke-width="1.5" stroke-dasharray="3,3" />\n`;
      }
    }
  }

  // Stations / Vertex Markers
  data.boundary.forEach((p, idx) => {
    const sx = toSvgX(p.x);
    const sy = toSvgY(p.y);
    svg += `  <circle cx="${sx}" cy="${sy}" r="4" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />\n`;
    svg += `  <text x="${sx + 6}" y="${sy - 6}" font-size="11" font-weight="bold" fill="#6ee7b7">${p.label || String.fromCharCode(65 + idx)}</text>\n`;
  });

  // North Arrow
  svg += `
  <!-- North Arrow -->
  <g transform="translate(${w - 50}, 50)">
    <circle cx="0" cy="0" r="20" fill="#061c22" stroke="#10b981" stroke-width="1.5" />
    <path d="M 0 -14 L 6 8 L 0 4 L -6 8 Z" fill="#10b981" />
    <text x="0" y="-18" font-size="10" font-weight="bold" fill="#10b981" text-anchor="middle">N</text>
  </g>
`;

  // Title Block Metadata
  svg += `
  <!-- Title Block -->
  <g transform="translate(20, ${h - 55})">
    <rect width="${w - 40}" height="40" rx="6" fill="#061c22" stroke="#10b981" stroke-width="1" />
    <text x="15" y="24" font-size="12" font-weight="bold" fill="#ffffff">STHAL MEASURE CAD - Survey #${data.surveyNumber || '101/A'} (${data.state || 'India'})</text>
    <text x="${w - 60}" y="24" font-size="11" font-weight="bold" fill="#10b981" text-anchor="end">Area: ${area.toFixed(2)} m² | Perim: ${perimeter.toFixed(2)} m</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Export Cadastral polygon to GeoJSON FeatureCollection.
 */
export function exportCadGeoJson(boundary: CadPoint[], properties: Record<string, any> = {}): GeoJSON.FeatureCollection {
  if (!boundary || boundary.length < 3) {
    return { type: 'FeatureCollection', features: [] };
  }

  const coords = boundary.map((p) => [p.x, p.y]);
  // Close the loop
  coords.push([boundary[0].x, boundary[0].y]);

  const feature: GeoJSON.Feature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {
      areaSqMeters: Number(computePolygonArea(boundary).toFixed(3)),
      perimeterMeters: Number(computePolygonPerimeter(boundary).toFixed(3)),
      vertexCount: boundary.length,
      software: 'Sthal Measure CAD Studio',
      timestamp: new Date().toISOString(),
      ...properties,
    },
  };

  return {
    type: 'FeatureCollection',
    features: [feature],
  };
}
