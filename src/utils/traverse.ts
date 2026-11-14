// Closed Traverse Computation and Bowditch Adjustment Sheet
import { convertArea, AreaBreakdown } from './units';

export interface TraverseStation {
  id: string;
  lineId: string; // e.g. "Stn 1 - 2"
  bearingDeg: number; // Whole Circle Bearing (0 to 360)
  distanceMeters: number; // Length in meters
}

export interface ComputedTraverseLine {
  id: string;
  lineId: string;
  bearingDeg: number;
  distanceMeters: number;
  // Raw unadjusted values
  latitude: number; // +North, -South
  departure: number; // +East, -West
  unadjustedNorthing: number;
  unadjustedEasting: number;
  // Bowditch corrections
  corrLat: number; // Bowditch correction to Latitude
  corrDep: number; // Bowditch correction to Departure
  // Adjusted values
  adjLat: number; // Adjusted Latitude
  adjDep: number; // Adjusted Departure
  northing: number; // Cumulative Adjusted Northing
  easting: number; // Cumulative Adjusted Easting
}

export type TraverseQualityGrade =
  | 'First-Order'
  | 'Second-Order'
  | 'Third-Order'
  | 'Sub-Standard'
  | 'Invalid';

export type TraverseStatus =
  | 'INVALID'
  | 'INCOMPLETE'
  | 'OPEN'
  | 'CLOSED'
  | 'ADJUSTED';

export interface TraverseSummary {
  isValid: boolean;
  status: TraverseStatus;
  validationErrors: string[];
  explanation?: string;
  totalPerimeter: number;
  sumLatitude: number;
  sumDeparture: number;
  linearClosingError: number;
  relativePrecision: string; // e.g. "1 in 4,820"
  precisionRatio: number;
  qualityGrade: TraverseQualityGrade;
  lines: ComputedTraverseLine[];
  isClosedGood: boolean; // Precision >= 1:1000 for standard land boundary survey
  areaSqm: number;
  areaBreakdown: AreaBreakdown;
  points: { x: number; y: number; label: string }[];
  unadjustedPoints: { x: number; y: number; label: string }[];
}

/**
 * Normalizes an angle in degrees into the standard Whole Circle Bearing range [0, 360).
 */
export function normalizeBearing(bearingDeg: number): number {
  if (!Number.isFinite(bearingDeg)) return 0;
  let normalized = bearingDeg % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  // Avoid -0
  return normalized === 0 ? 0 : Number(normalized.toFixed(4));
}

/**
 * Validates traverse input stations and flags non-finite, negative, or degenerate legs.
 */
export function validateTraverseStations(stations: TraverseStation[]): {
  isValid: boolean;
  errors: string[];
  cleanStations: TraverseStation[];
} {
  const errors: string[] = [];

  if (!stations || !Array.isArray(stations) || stations.length === 0) {
    return {
      isValid: false,
      errors: ['No traverse stations provided.'],
      cleanStations: [],
    };
  }

  if (stations.length < 3) {
    errors.push(`A closed polygon traverse requires at least 3 stations (found ${stations.length}).`);
  }

  const cleanStations: TraverseStation[] = [];

  for (let i = 0; i < stations.length; i++) {
    const stn = stations[i];
    const prefix = `Station #${i + 1} (${stn?.lineId || 'unnamed'}):`;

    if (!stn) {
      errors.push(`${prefix} Missing station data.`);
      continue;
    }

    if (!Number.isFinite(stn.distanceMeters)) {
      errors.push(`${prefix} Distance must be a valid finite number (received ${stn.distanceMeters}).`);
      continue;
    }

    if (stn.distanceMeters < 0) {
      errors.push(`${prefix} Distance cannot be negative (${stn.distanceMeters}m).`);
      continue;
    }

    if (stn.distanceMeters === 0) {
      errors.push(`${prefix} Distance cannot be zero.`);
      continue;
    }

    if (!Number.isFinite(stn.bearingDeg)) {
      errors.push(`${prefix} Bearing must be a valid finite number (received ${stn.bearingDeg}).`);
      continue;
    }

    const normBearing = normalizeBearing(stn.bearingDeg);

    cleanStations.push({
      id: stn.id || `stn-${i + 1}`,
      lineId: stn.lineId || `Stn ${i + 1} - ${i + 2}`,
      bearingDeg: normBearing,
      distanceMeters: stn.distanceMeters,
    });
  }

  const totalDist = cleanStations.reduce((sum, s) => sum + s.distanceMeters, 0);
  if (totalDist <= 0) {
    errors.push('Total measured perimeter is zero or invalid.');
  }

  return {
    isValid: errors.length === 0 && cleanStations.length >= 3,
    errors,
    cleanStations,
  };
}

/**
 * Computes closed traverse and performs Bowditch (Compass Rule) balancing.
 * Mathematically handles:
 * 1. Strict input validation (rejects all-zero, negative, NaN, < 3 stations).
 * 2. Unadjusted latitudes and departures.
 * 3. Linear closing error and precision ratio.
 * 4. Bowditch corrections:
 *    Correction Lat = -Total Latitude Error * (Leg Length / Total Perimeter)
 *    Correction Dep = -Total Departure Error * (Leg Length / Total Perimeter)
 * 5. Adjusted coordinates and enclosed area via Shoelace formula.
 */
export function computeClosedTraverse(
  rawStations: TraverseStation[],
  baseNorthing = 1000,
  baseEasting = 1000
): TraverseSummary {
  // Step 1: Validate all inputs
  const validation = validateTraverseStations(rawStations);
  const emptyBreakdown = convertArea(0);

  if (!validation.isValid) {
    const isUnderflow = rawStations && rawStations.length > 0 && rawStations.length < 3;
    return {
      isValid: false,
      status: isUnderflow ? 'INCOMPLETE' : 'INVALID',
      validationErrors: validation.errors,
      explanation: validation.errors.join('; '),
      totalPerimeter: 0,
      sumLatitude: 0,
      sumDeparture: 0,
      linearClosingError: 0,
      relativePrecision: 'Invalid Data',
      precisionRatio: 0,
      qualityGrade: 'Invalid',
      lines: [],
      isClosedGood: false,
      areaSqm: 0,
      areaBreakdown: emptyBreakdown,
      points: [],
      unadjustedPoints: [],
    };
  }

  const stations = validation.cleanStations;
  let totalPerimeter = 0;
  let sumLatitude = 0;
  let sumDeparture = 0;

  // Step 2: Compute raw unadjusted Latitudes & Departures and construct unadjusted coordinates
  let unadjNorth = baseNorthing;
  let unadjEast = baseEasting;

  const unadjustedPoints: { x: number; y: number; label: string }[] = [];
  const startLabel = stations[0]?.lineId.split(/[-_]/)[0]?.trim() || 'A';
  unadjustedPoints.push({ x: baseEasting, y: baseNorthing, label: startLabel });

  const rawLines = stations.map((stn, idx) => {
    const rad = (stn.bearingDeg * Math.PI) / 180;
    const lat = stn.distanceMeters * Math.cos(rad);
    const dep = stn.distanceMeters * Math.sin(rad);

    totalPerimeter += stn.distanceMeters;
    sumLatitude += lat;
    sumDeparture += dep;

    unadjNorth += lat;
    unadjEast += dep;

    if (idx < stations.length - 1) {
      const label =
        stations[idx]?.lineId.split(/[-_]/)[1]?.trim() ||
        stations[idx + 1]?.lineId.split(/[-_]/)[0]?.trim() ||
        String.fromCharCode(66 + idx);
      unadjustedPoints.push({ x: unadjEast, y: unadjNorth, label });
    }

    return {
      ...stn,
      latitude: lat,
      departure: dep,
      unadjustedNorthing: unadjNorth,
      unadjustedEasting: unadjEast,
    };
  });

  // Step 3: Check unadjusted geometry and collinearity
  let unadjDoubleArea = 0;
  const numUnadj = unadjustedPoints.length;
  for (let i = 0; i < numUnadj; i++) {
    const j = (i + 1) % numUnadj;
    unadjDoubleArea += unadjustedPoints[i].x * unadjustedPoints[j].y - unadjustedPoints[j].x * unadjustedPoints[i].y;
  }
  const unadjAreaSqm = Math.abs(unadjDoubleArea) / 2;

  // Calculate closing error
  const closingError = Math.hypot(sumLatitude, sumDeparture);

  // Step 4: Check for degenerate or invalid geometry
  // If stations result in near-zero enclosed area (collinear or straight back-and-forth legs)
  if (unadjAreaSqm <= 0.05 || totalPerimeter <= 0) {
    const err = 'Traverse stations result in near-zero enclosed area (collinear or degenerate polygon).';
    return {
      isValid: false,
      status: 'INVALID',
      validationErrors: [err],
      explanation: err,
      totalPerimeter: Number(totalPerimeter.toFixed(3)),
      sumLatitude: Number(sumLatitude.toFixed(3)),
      sumDeparture: Number(sumDeparture.toFixed(3)),
      linearClosingError: Number(closingError.toFixed(4)),
      relativePrecision: 'Degenerate Geometry (Zero Area)',
      precisionRatio: 0,
      qualityGrade: 'Invalid',
      lines: [],
      isClosedGood: false,
      areaSqm: 0,
      areaBreakdown: emptyBreakdown,
      points: [],
      unadjustedPoints,
    };
  }

  // Check if closing error is greater than perimeter / 2 -> Open traverse, not closed!
  const isOpenTraverse = closingError > totalPerimeter * 0.5;

  // Step 5: Calculate relative precision only for valid polygon
  let precisionRatio = 0;
  let relativePrecision = 'N/A';
  let qualityGrade: TraverseQualityGrade = 'Sub-Standard';

  if (closingError < 1e-6) {
    // Mathematically exact closure on a real non-degenerate polygon
    precisionRatio = 100000;
    relativePrecision = '1 in 100,000+ (Exact Closure)';
    qualityGrade = 'First-Order';
  } else {
    precisionRatio = totalPerimeter / closingError;
    const roundedRatio = Math.round(precisionRatio);
    relativePrecision = `1 in ${roundedRatio.toLocaleString()}`;

    if (isOpenTraverse) {
      qualityGrade = 'Sub-Standard';
    } else if (precisionRatio >= 10000) {
      qualityGrade = 'First-Order';
    } else if (precisionRatio >= 5000) {
      qualityGrade = 'Second-Order';
    } else if (precisionRatio >= 1000) {
      qualityGrade = 'Third-Order';
    } else {
      qualityGrade = 'Sub-Standard';
    }
  }

  // Step 6: Apply Bowditch (Compass Rule) Adjustment
  // Correction Lat = -Total Latitude Error * (Leg Length / Total Perimeter)
  // Correction Dep = -Total Departure Error * (Leg Length / Total Perimeter)
  let currNorthing = baseNorthing;
  let currEasting = baseEasting;

  const lines: ComputedTraverseLine[] = rawLines.map((line) => {
    const proportion = totalPerimeter > 0 ? line.distanceMeters / totalPerimeter : 0;
    const corrLat = -sumLatitude * proportion;
    const corrDep = -sumDeparture * proportion;
    const adjLat = line.latitude + corrLat;
    const adjDep = line.departure + corrDep;

    currNorthing += adjLat;
    currEasting += adjDep;

    return {
      id: line.id,
      lineId: line.lineId,
      bearingDeg: line.bearingDeg,
      distanceMeters: Number(line.distanceMeters.toFixed(3)),
      latitude: Number(line.latitude.toFixed(3)),
      departure: Number(line.departure.toFixed(3)),
      unadjustedNorthing: Number(line.unadjustedNorthing.toFixed(3)),
      unadjustedEasting: Number(line.unadjustedEasting.toFixed(3)),
      corrLat: Number(corrLat.toFixed(4)),
      corrDep: Number(corrDep.toFixed(4)),
      adjLat: Number(adjLat.toFixed(3)),
      adjDep: Number(adjDep.toFixed(3)),
      northing: Number(currNorthing.toFixed(3)),
      easting: Number(currEasting.toFixed(3)),
    };
  });

  // Construct Adjusted Points
  const adjustedPoints: { x: number; y: number; label: string }[] = [];
  adjustedPoints.push({ x: baseEasting, y: baseNorthing, label: startLabel });

  for (let i = 0; i < lines.length - 1; i++) {
    const label =
      stations[i]?.lineId.split(/[-_]/)[1]?.trim() ||
      stations[i + 1]?.lineId.split(/[-_]/)[0]?.trim() ||
      String.fromCharCode(66 + i);

    adjustedPoints.push({
      x: lines[i].easting,
      y: lines[i].northing,
      label,
    });
  }

  // Compute Enclosed Area via Shoelace Formula on Adjusted Coordinates
  let doubleArea = 0;
  const numPts = adjustedPoints.length;
  for (let i = 0; i < numPts; i++) {
    const j = (i + 1) % numPts;
    doubleArea += adjustedPoints[i].x * adjustedPoints[j].y - adjustedPoints[j].x * adjustedPoints[i].y;
  }
  const areaSqm = Number((Math.abs(doubleArea) / 2).toFixed(2));
  const areaBreakdown = convertArea(areaSqm);

  const status: TraverseStatus = isOpenTraverse
    ? 'OPEN'
    : precisionRatio >= 1000
    ? 'ADJUSTED'
    : 'CLOSED';

  return {
    isValid: true,
    status,
    validationErrors: [],
    explanation: isOpenTraverse
      ? 'Traverse appears open or has excessive closing error.'
      : `Traverse balanced via Bowditch rule with ${relativePrecision} precision.`,
    totalPerimeter: Number(totalPerimeter.toFixed(3)),
    sumLatitude: Number(sumLatitude.toFixed(3)),
    sumDeparture: Number(sumDeparture.toFixed(3)),
    linearClosingError: Number(closingError.toFixed(4)),
    relativePrecision,
    precisionRatio: Number(precisionRatio.toFixed(1)),
    qualityGrade,
    lines,
    isClosedGood: !isOpenTraverse && precisionRatio >= 1000,
    areaSqm,
    areaBreakdown,
    points: adjustedPoints,
    unadjustedPoints,
  };
}
