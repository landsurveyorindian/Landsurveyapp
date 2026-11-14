import * as turf from '@turf/turf';
import proj4 from 'proj4';

// Register standard Indian UTM Projection zones (WGS84 UTM zones 42N to 46N)
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:32642', '+proj=utm +zone=42 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32645', '+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32646', '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs');

export interface UtmZoneInfo {
  zoneNumber: number;
  hemisphere: 'N' | 'S';
  epsgCode: string;
  name: string;
  description: string;
}

/**
 * Determine the standard UTM Zone for any longitude in India/Worldwide.
 * Standard UTM zone width = 6 degrees.
 */
export function getUtmZoneForLngLat(lng: number, lat: number): UtmZoneInfo {
  // Clamp longitude to valid -180 to 180
  const normLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  const zoneNumber = Math.floor((normLng + 180) / 6) + 1;
  const hemisphere = lat >= 0 ? 'N' : 'S';
  const epsgCode = `EPSG:${hemisphere === 'N' ? 32600 + zoneNumber : 32700 + zoneNumber}`;

  let description = `UTM Zone ${zoneNumber}${hemisphere}`;
  if (zoneNumber === 42) description += ' (Western India: Gujarat, W. Rajasthan)';
  else if (zoneNumber === 43) description += ' (West-Central India: Maharashtra, Goa, Karnataka, Kerala, MP)';
  else if (zoneNumber === 44) description += ' (Central/Eastern India: AP, Telangana, Odisha, Tamil Nadu, UP)';
  else if (zoneNumber === 45) description += ' (Eastern India: West Bengal, Bihar, Jharkhand)';
  else if (zoneNumber === 46) description += ' (North-East India: Assam, Meghalaya, etc.)';

  return {
    zoneNumber,
    hemisphere,
    epsgCode,
    name: `UTM Zone ${zoneNumber}${hemisphere}`,
    description,
  };
}

/**
 * Transform [lng, lat] (WGS84) to Projected Metres in the specified or auto-detected UTM zone.
 */
export interface ProjectionResult {
  easting: number;
  northing: number;
  epsg: string;
  zoneName: string;
  success: boolean;
  error?: string;
}

/**
 * Transform [lng, lat] (WGS84) to Projected Metres in the specified or auto-detected UTM zone.
 * Never silently returns [0, 0] on failure.
 */
export function projectWgs84ToUtm(
  lng: number,
  lat: number,
  forcedEpsg?: string
): ProjectionResult {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      easting: NaN,
      northing: NaN,
      epsg: forcedEpsg || 'EPSG:4326',
      zoneName: 'Invalid Coordinate',
      success: false,
      error: `Invalid WGS84 coordinates: lng=${lng}, lat=${lat}`,
    };
  }

  const zoneInfo = forcedEpsg ? null : getUtmZoneForLngLat(lng, lat);
  const targetEpsg = forcedEpsg || zoneInfo?.epsgCode || 'EPSG:32644';

  try {
    const [easting, northing] = proj4('EPSG:4326', targetEpsg, [lng, lat]);
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
      throw new Error('Projection produced non-finite coordinates');
    }
    return {
      easting: Number(easting.toFixed(2)),
      northing: Number(northing.toFixed(2)),
      epsg: targetEpsg,
      zoneName: zoneInfo?.name || targetEpsg,
      success: true,
    };
  } catch (err: any) {
    console.warn(`Projection from WGS84 to ${targetEpsg} failed:`, err);
    return {
      easting: NaN,
      northing: NaN,
      epsg: targetEpsg,
      zoneName: 'Projection Failed',
      success: false,
      error: err?.message || 'Projection transformation error',
    };
  }
}

/**
 * Transform Projected Metres [easting, northing] in a given UTM zone back to WGS84 [lng, lat].
 * Returns null instead of silently returning [0, 0] on failure.
 */
export function unprojectUtmToWgs84(
  easting: number,
  northing: number,
  epsgCode = 'EPSG:32644'
): [number, number] | null {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    return null;
  }
  try {
    const [lng, lat] = proj4(epsgCode, 'EPSG:4326', [easting, northing]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  } catch {
    return null;
  }
}

export interface GeometryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanVertices: [number, number][]; // distinct vertices without redundant closing duplicate
  closedRing: [number, number][]; // properly closed ring (cleanVertices + cleanVertices[0])
  vertexCount: number;
  hasSelfIntersection: boolean;
  estimatedAreaSqm: number;
  estimatedPerimeterMeters: number;
}

/**
 * Reusable, rigorous validation utility for survey and GIS polygons.
 * Checks vertex counts, finite values, consecutive duplicates, zero-length edges,
 * self-intersections (kinks), and collinearity.
 */
export function validateSurveyPolygon(rawCoords: [number, number][]): GeometryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length === 0) {
    return {
      isValid: false,
      errors: ['No coordinate vertices provided.'],
      warnings: [],
      cleanVertices: [],
      closedRing: [],
      vertexCount: 0,
      hasSelfIntersection: false,
      estimatedAreaSqm: 0,
      estimatedPerimeterMeters: 0,
    };
  }

  // 1. Check for non-finite or out-of-range coordinates
  const sanitized: [number, number][] = [];
  for (let i = 0; i < rawCoords.length; i++) {
    const pt = rawCoords[i];
    if (
      !Array.isArray(pt) ||
      pt.length < 2 ||
      !Number.isFinite(pt[0]) ||
      !Number.isFinite(pt[1])
    ) {
      errors.push(`Vertex #${i + 1} has non-finite or invalid coordinates: ${JSON.stringify(pt)}`);
      continue;
    }
    const [lng, lat] = pt;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push(`Vertex #${i + 1} coordinates out of range (Lng: ${lng}, Lat: ${lat}). Expected Lng in [-180, 180], Lat in [-90, 90].`);
      continue;
    }
    sanitized.push([lng, lat]);
  }

  if (sanitized.length < 3) {
    errors.push(`Polygon must have at least 3 valid coordinates. Found ${sanitized.length}.`);
    return {
      isValid: false,
      errors,
      warnings,
      cleanVertices: sanitized,
      closedRing: [],
      vertexCount: sanitized.length,
      hasSelfIntersection: false,
      estimatedAreaSqm: 0,
      estimatedPerimeterMeters: 0,
    };
  }

  // 2. Remove consecutive duplicate points (and handle closing vertex if present)
  const deduped: [number, number][] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const cur = sanitized[i];
    if (deduped.length === 0) {
      deduped.push(cur);
    } else {
      const prev = deduped[deduped.length - 1];
      const distDeg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      if (distDeg < 1e-8) {
        warnings.push(`Filtered consecutive duplicate point at vertex index ${i + 1}.`);
      } else {
        deduped.push(cur);
      }
    }
  }

  // If the last point duplicates the first point (closed ring in GeoJSON), strip it for vertex list
  if (
    deduped.length > 3 &&
    Math.hypot(deduped[0][0] - deduped[deduped.length - 1][0], deduped[0][1] - deduped[deduped.length - 1][1]) < 1e-8
  ) {
    deduped.pop();
  }

  if (deduped.length < 3) {
    errors.push('Polygon collapsed to fewer than 3 distinct vertices after removing duplicates.');
    return {
      isValid: false,
      errors,
      warnings,
      cleanVertices: deduped,
      closedRing: [],
      vertexCount: deduped.length,
      hasSelfIntersection: false,
      estimatedAreaSqm: 0,
      estimatedPerimeterMeters: 0,
    };
  }

  // 3. Construct clean closed ring
  const closedRing: [number, number][] = [...deduped, deduped[0]];

  // 4. Check for self-intersections using Turf
  let hasSelfIntersection = false;
  let estimatedAreaSqm = 0;
  let estimatedPerimeterMeters = 0;

  try {
    const poly = turf.polygon([closedRing]);
    const kinks = turf.kinks(poly);
    if (kinks.features.length > 0) {
      hasSelfIntersection = true;
      errors.push(`Polygon boundary self-intersects at ${kinks.features.length} location(s). Cadastral boundaries must be simple non-self-intersecting rings.`);
    }

    estimatedAreaSqm = turf.area(poly);
    if (estimatedAreaSqm <= 0.01) {
      errors.push('Polygon has zero or near-zero enclosed area (degenerate collinear vertices).');
    }

    // Geodesic perimeter
    const line = turf.lineString(closedRing);
    estimatedPerimeterMeters = turf.length(line, { units: 'kilometers' }) * 1000;
  } catch (err: any) {
    errors.push(`Geometry topological evaluation error: ${err?.message || String(err)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanVertices: deduped,
    closedRing,
    vertexCount: deduped.length,
    hasSelfIntersection,
    estimatedAreaSqm: Number(estimatedAreaSqm.toFixed(2)),
    estimatedPerimeterMeters: Number(estimatedPerimeterMeters.toFixed(2)),
  };
}
