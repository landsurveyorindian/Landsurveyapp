import proj4 from 'proj4';
import * as turf from '@turf/turf';
import DxfParser from 'dxf-parser';
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import shp from 'shpjs';
import { convertArea, AreaBreakdown } from './units';

import {
  getUtmZoneForLngLat,
  projectWgs84ToUtm,
  unprojectUtmToWgs84,
  UtmZoneInfo,
} from './geometryValidation';

export { getUtmZoneForLngLat, projectWgs84ToUtm, unprojectUtmToWgs84 };
export type { UtmZoneInfo };

// Define UTM Zone 44N (covers central & eastern India, AP, Telangana, etc.)
proj4.defs('EPSG:32644', '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

/**
 * Convert WGS84 [lng, lat] to UTM Zone 44N [Easting, Northing] in meters (legacy backwards compatibility)
 */
export function wgs84ToUtm44N(lng: number, lat: number): { easting: number; northing: number } {
  try {
    const [easting, northing] = proj4('EPSG:4326', 'EPSG:32644', [lng, lat]);
    return {
      easting: Number(easting.toFixed(2)),
      northing: Number(northing.toFixed(2)),
    };
  } catch {
    return { easting: 0, northing: 0 };
  }
}

/**
 * Auto-detect UTM Zone for any coordinate in India/Worldwide and project to meters (Zones 42N - 46N)
 */
export function wgs84ToUtmAuto(
  lng: number,
  lat: number
): { easting: number; northing: number; epsg: string; zoneName: string; zoneNumber: number; zone: number; success: boolean } {
  const zone = getUtmZoneForLngLat(lng, lat);
  const proj = projectWgs84ToUtm(lng, lat, zone.epsgCode);
  return {
    easting: proj.easting,
    northing: proj.northing,
    epsg: proj.epsg,
    zoneName: proj.zoneName,
    zoneNumber: zone.zoneNumber,
    zone: zone.zoneNumber,
    success: proj.success,
  };
}

/**
 * Convert UTM Zone 44N [Easting, Northing] to WGS84 [lng, lat]
 */
export function utm44NToWgs84(easting: number, northing: number): [number, number] | null {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
  try {
    const [lng, lat] = proj4('EPSG:32644', 'EPSG:4326', [easting, northing]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  } catch {
    return null;
  }
}

export interface PolygonMetrics {
  areaSqm: number;
  perimeterMeters: number;
  breakdown: AreaBreakdown;
  edgeLengths: { index: number; lengthMeters: number; lengthFeet: number; midPoint: [number, number] }[];
  centroid: [number, number];
}

/**
 * Calculate geodesic metrics for a list of [lng, lat] vertices forming a polygon
 */
export function calculatePolygonMetrics(coordinates: [number, number][]): PolygonMetrics | null {
  if (!coordinates || coordinates.length < 3) return null;

  // Filter consecutive identical points or verify distinct positions
  const distinct = coordinates.filter((c, i) => {
    if (i === 0) return true;
    const prev = coordinates[i - 1];
    return Math.abs(c[0] - prev[0]) > 1e-7 || Math.abs(c[1] - prev[1]) > 1e-7;
  });

  if (distinct.length < 3) return null;

  // Ensure closed ring
  const closedCoords = [...distinct];
  const first = closedCoords[0];
  const last = closedCoords[closedCoords.length - 1];
  if (Math.abs(first[0] - last[0]) > 1e-7 || Math.abs(first[1] - last[1]) > 1e-7) {
    closedCoords.push([first[0], first[1]]);
  }

  if (closedCoords.length < 4) return null;

  try {
    const poly = turf.polygon([closedCoords]);
    const areaSqm = turf.area(poly);
    const breakdown = convertArea(areaSqm);

    // Calculate edge lengths
    const edgeLengths: { index: number; lengthMeters: number; lengthFeet: number; midPoint: [number, number] }[] = [];
    let perimeterMeters = 0;

    for (let i = 0; i < closedCoords.length - 1; i++) {
      const p1 = closedCoords[i];
      const p2 = closedCoords[i + 1];
      const distKm = turf.distance(turf.point(p1), turf.point(p2), { units: 'kilometers' });
      const distM = distKm * 1000;
      perimeterMeters += distM;

      const mid = turf.midpoint(turf.point(p1), turf.point(p2));
      const midCoords = mid.geometry.coordinates as [number, number];

      edgeLengths.push({
        index: i + 1,
        lengthMeters: Number(distM.toFixed(2)),
        lengthFeet: Number((distM * 3.28084).toFixed(2)),
        midPoint: midCoords,
      });
    }

    const centroidFeature = turf.centroid(poly);
    const centroid = centroidFeature.geometry.coordinates as [number, number];

    return {
      areaSqm: Number(areaSqm.toFixed(2)),
      perimeterMeters: Number(perimeterMeters.toFixed(2)),
      breakdown,
      edgeLengths,
      centroid,
    };
  } catch (err) {
    console.error('Error calculating polygon metrics', err);
    return null;
  }
}

/**
 * Parse Shapefile from ArrayBuffer (zip or individual .shp buffer)
 */
export async function parseShapefile(buffer: ArrayBuffer): Promise<GeoJSON.FeatureCollection> {
  const result = await shp(buffer);
  if (Array.isArray(result)) {
    return result[0];
  }
  return result as GeoJSON.FeatureCollection;
}

/**
 * Parse KML string to GeoJSON FeatureCollection
 */
export function parseKml(kmlString: string): GeoJSON.FeatureCollection {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
  return kmlToGeoJson(xmlDoc) as unknown as GeoJSON.FeatureCollection;
}

export type DxfCrsMode = 'utm_auto' | 'utm44n' | 'utm43n' | 'wgs84' | 'local_offset';

/**
 * Parse DXF AutoCAD string to GeoJSON FeatureCollection with dynamic or state-aware UTM CRS
 */
export function parseDxf(
  dxfString: string,
  crsMode: DxfCrsMode = 'utm_auto',
  anchorCenter: [number, number] = [80.6480, 16.5062] // default anchor
): GeoJSON.FeatureCollection {
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfString);
  const features: GeoJSON.Feature[] = [];

  if (!dxf || !dxf.entities) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Determine EPSG for UTM conversion based on anchor or mode
  const autoZone = getUtmZoneForLngLat(anchorCenter[0], anchorCenter[1]);
  let targetEpsg = autoZone.epsgCode;
  if (crsMode === 'utm43n') targetEpsg = 'EPSG:32643';
  if (crsMode === 'utm44n') targetEpsg = 'EPSG:32644';

  // Helper to convert CAD (x, y) to WGS84 [lng, lat]
  const convertCoord = (x: number, y: number): [number, number] => {
    if (crsMode === 'utm_auto' || crsMode === 'utm44n' || crsMode === 'utm43n') {
      const pt = unprojectUtmToWgs84(x, y, targetEpsg);
      return pt || [x, y];
    } else if (crsMode === 'wgs84') {
      return [x, y];
    } else {
      // Local meters offset from anchorCenter:
      const latOffset = y / 111320;
      const lngOffset = x / (111320 * Math.cos((anchorCenter[1] * Math.PI) / 180));
      return [Number((anchorCenter[0] + lngOffset).toFixed(6)), Number((anchorCenter[1] + latOffset).toFixed(6))];
    }
  };

  const unsupportedEntities: Record<string, number> = {};

  for (const entity of dxf.entities) {
    const ent = entity as any;
    if (ent.type === 'LINE') {
      const p1 = convertCoord(ent.vertices[0].x, ent.vertices[0].y);
      const p2 = convertCoord(ent.vertices[1].x, ent.vertices[1].y);
      features.push({
        type: 'Feature',
        properties: { layer: ent.layer || 'Default', entityType: 'LINE', color: ent.color },
        geometry: {
          type: 'LineString',
          coordinates: [p1, p2],
        },
      });
    } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
      if (ent.vertices && ent.vertices.length >= 2) {
        const coords: [number, number][] = ent.vertices.map((v: any) => convertCoord(v.x, v.y));
        const isClosed = ent.shape || (ent.vertices[0].x === ent.vertices[ent.vertices.length - 1].x && ent.vertices[0].y === ent.vertices[ent.vertices.length - 1].y);
        
        if (isClosed && coords.length >= 3) {
          if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push([coords[0][0], coords[0][1]]);
          }
          features.push({
            type: 'Feature',
            properties: { layer: ent.layer || 'Default', entityType: 'POLYGON', color: ent.color },
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
          });
        } else {
          features.push({
            type: 'Feature',
            properties: { layer: ent.layer || 'Default', entityType: 'POLYLINE', color: ent.color },
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          });
        }
      }
    } else {
      const type = ent.type || 'UNKNOWN';
      unsupportedEntities[type] = (unsupportedEntities[type] || 0) + 1;
    }
  }

  const warnings: string[] = [];
  const unsupportedKeys = Object.keys(unsupportedEntities);
  if (unsupportedKeys.length > 0) {
    const detail = unsupportedKeys
      .map((k) => `${unsupportedEntities[k]} ${k}`)
      .join(', ');
    warnings.push(
      `Ignored unsupported DXF entities (${detail}). Only LINE and LWPOLYLINE/POLYLINE are converted to GIS boundaries.`
    );
  }

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };
  (fc as any).unsupportedEntities = unsupportedEntities;
  (fc as any).warnings = warnings;

  return fc;
}

export function parseDxfWithWarnings(
  dxfString: string,
  crsMode: DxfCrsMode = 'utm_auto',
  anchorCenter: [number, number] = [80.6480, 16.5062]
): {
  featureCollection: GeoJSON.FeatureCollection;
  unsupportedEntities: Record<string, number>;
  warnings: string[];
} {
  const fc = parseDxf(dxfString, crsMode, anchorCenter);
  return {
    featureCollection: fc,
    unsupportedEntities: (fc as any).unsupportedEntities || {},
    warnings: (fc as any).warnings || [],
  };
}

/**
 * Generate DXF string from GeoJSON polygon coordinates for export in the appropriate UTM zone
 */
export function exportToDxf(coordinates: [number, number][], layerName = 'STHAL_SURVEY'): string {
  let dxf = `0\nSECTION\n2\nENTITIES\n`;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = projectWgs84ToUtm(coordinates[i][0], coordinates[i][1]);
    const p2 = projectWgs84ToUtm(coordinates[i + 1][0], coordinates[i + 1][1]);
    dxf += `0\nLINE\n8\n${layerName}\n10\n${p1.easting}\n20\n${p1.northing}\n30\n0.0\n11\n${p2.easting}\n21\n${p2.northing}\n31\n0.0\n`;
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Generate DXF string from a GeoJSON FeatureCollection
 */
export function exportFeatureCollectionToDxf(fc: GeoJSON.FeatureCollection, layerName = 'GIS_EXPORT'): string {
  let dxf = `0\nSECTION\n2\nENTITIES\n`;

  const addLineSegment = (p1LngLat: [number, number], p2LngLat: [number, number]) => {
    const p1 = projectWgs84ToUtm(p1LngLat[0], p1LngLat[1]);
    const p2 = projectWgs84ToUtm(p2LngLat[0], p2LngLat[1]);
    dxf += `0\nLINE\n8\n${layerName}\n10\n${p1.easting}\n20\n${p1.northing}\n30\n0.0\n11\n${p2.easting}\n21\n${p2.northing}\n31\n0.0\n`;
  };

  const processRings = (rings: number[][][]) => {
    rings.forEach((ring) => {
      for (let i = 0; i < ring.length - 1; i++) {
        addLineSegment([ring[i][0], ring[i][1]], [ring[i + 1][0], ring[i + 1][1]]);
      }
    });
  };

  for (const feature of fc.features) {
    if (!feature.geometry) continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      processRings((geom as GeoJSON.Polygon).coordinates);
    } else if (geom.type === 'MultiPolygon') {
      (geom as GeoJSON.MultiPolygon).coordinates.forEach(processRings);
    } else if (geom.type === 'LineString') {
      const coords = (geom as GeoJSON.LineString).coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        addLineSegment([coords[i][0], coords[i][1]], [coords[i + 1][0], coords[i + 1][1]]);
      }
    } else if (geom.type === 'MultiLineString') {
      (geom as GeoJSON.MultiLineString).coordinates.forEach((coords) => {
        for (let i = 0; i < coords.length - 1; i++) {
          addLineSegment([coords[i][0], coords[i][1]], [coords[i + 1][0], coords[i + 1][1]]);
        }
      });
    }
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Generate standard GeoJSON string from coordinates
 */
export function exportToGeoJson(
  coordinates: [number, number][],
  name = 'Sthal Survey Parcel',
  properties: Record<string, any> = {}
): string {
  // Ensure closed ring
  const ring = [...coordinates];
  if (
    ring.length > 2 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name,
          source: 'Sthal Measure Cadastral Tool',
          exportedAt: new Date().toISOString(),
          ...properties,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      },
    ],
  };

  return JSON.stringify(featureCollection, null, 2);
}

/**
 * Generate standard GeoJSON string from FeatureCollection
 */
export function exportFeatureCollectionToGeoJson(fc: GeoJSON.FeatureCollection): string {
  return JSON.stringify(fc, null, 2);
}

/**
 * Generate simple KML string from GeoJSON polygon coordinates
 */
export function exportToKml(coordinates: [number, number][], name = 'Sthal Survey Parcel'): string {
  const coordString = coordinates.map((c) => `${c[0]},${c[1]},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <Placemark>
      <name>${name}</name>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

/**
 * Generate KML string from a GeoJSON FeatureCollection
 */
export function exportFeatureCollectionToKml(fc: GeoJSON.FeatureCollection, name = 'Sthal GIS Layer'): string {
  let placemarks = '';

  for (let i = 0; i < fc.features.length; i++) {
    const f = fc.features[i];
    if (!f.geometry) continue;
    const pName = f.properties?.name || f.properties?.title || `Feature ${i + 1}`;
    const geom = f.geometry;

    if (geom.type === 'Polygon') {
      const ring = (geom as GeoJSON.Polygon).coordinates[0];
      const coordStr = ring.map((c) => `${c[0]},${c[1]},0`).join(' ');
      placemarks += `    <Placemark>
      <name>${pName}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>\n`;
    } else if (geom.type === 'LineString') {
      const coords = (geom as GeoJSON.LineString).coordinates;
      const coordStr = coords.map((c) => `${c[0]},${c[1]},0`).join(' ');
      placemarks += `    <Placemark>
      <name>${pName}</name>
      <LineString>
        <coordinates>${coordStr}</coordinates>
      </LineString>
    </Placemark>\n`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
${placemarks}  </Document>
</kml>`;
}

export interface FourSidedDimensions {
  sideA: number;
  sideB: number;
  sideC: number;
  sideD: number;
  diagonal: number;
}

/**
 * Calculate the 4 boundary sides (A, B, C, D) and A-C diagonal in meters from polygon coordinates
 */
export function extractFourSidedDimensions(coords: [number, number][]): FourSidedDimensions | null {
  if (!coords || coords.length < 4) return null;

  // Clone coords
  const pts = coords.map((c) => [c[0], c[1]] as [number, number]);

  // Strip closing coordinate if identical to first
  if (
    pts.length > 3 &&
    Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-7 &&
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-7
  ) {
    pts.pop();
  }

  if (pts.length < 4) return null;

  // First 4 vertices
  const [p0, p1, p2, p3] = pts;

  const distM = (ptA: [number, number], ptB: [number, number]): number => {
    const km = turf.distance(turf.point(ptA), turf.point(ptB), { units: 'kilometers' });
    return Number((km * 1000).toFixed(2));
  };

  const sideA = distM(p0, p1);
  const sideB = distM(p1, p2);
  const sideC = distM(p2, p3);
  const sideD = distM(p3, p0);
  const diagonal = distM(p0, p2); // A to C diagonal

  return {
    sideA,
    sideB,
    sideC,
    sideD,
    diagonal,
  };
}

/**
 * Generate standard GeoJSON string from polygon coordinates with legal disclaimer
 */
export function exportPolygonToGeoJson(
  coordinates: [number, number][],
  properties: Record<string, any> = {}
): string {
  const closed = [...coordinates];
  if (
    closed.length > 0 &&
    (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1])
  ) {
    closed.push([closed[0][0], closed[0][1]]);
  }

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          app: 'Sthal Measure',
          disclaimer: 'Informational survey summary — not an official government survey record.',
          ...properties,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [closed],
        },
      },
    ],
  };

  return JSON.stringify(fc, null, 2);
}

