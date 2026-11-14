import * as turf from '@turf/turf';
import { projectWgs84ToUtm } from './gis';

export interface CadastralLocationInfo {
  surveyNo: string;
  subDivision: string;
  fullSurveyNumber: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  revenueBlock: string;
  estimatedExtentCents: number;
  estimatedExtentAcres: number;
  landClassification: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
  utmEasting: number;
  utmNorthing: number;
  utmZoneName: string;
  source: 'cadastral_layer' | 'user_defined' | 'revenue_grid_estimator';
  layerName?: string;
  officialPortalName: string;
  officialPortalUrl: string;
  coordinates?: [number, number][];
  isSynthetic: true; // Explicitly marked as synthetic demo/simulation data
  disclaimer: string;
}

export interface StatePortalInfo {
  name: string;
  portalName: string;
  url: string;
  description: string;
}

export const STATE_CADASTRAL_PORTALS: Record<string, StatePortalInfo> = {
  'Andhra Pradesh': {
    name: 'Andhra Pradesh',
    portalName: 'AP Meebhoomi',
    url: 'https://meebhoomi.ap.gov.in/',
    description: 'Official AP Revenue Dept 1-B Adangal & Village Cadastral FMB Maps',
  },
  'Telangana': {
    name: 'Telangana',
    portalName: 'TS Dharani',
    url: 'https://dharani.telangana.gov.in/',
    description: 'Telangana Integrated Land Records & Cadastral Bhu Bharati',
  },
  'Karnataka': {
    name: 'Karnataka',
    portalName: 'KA Bhoomi',
    url: 'https://bhoomojini.karnataka.gov.in/',
    description: 'Karnataka Revenue Land Records & Survey Settlement Maps',
  },
  'Tamil Nadu': {
    name: 'Tamil Nadu',
    portalName: 'TN e-Services',
    url: 'https://eservices.tn.gov.in/eservicesnew/land/chitta.html',
    description: 'Tamil Nadu Patta Chitta & FMB Sketch Portal',
  },
  'Maharashtra': {
    name: 'Maharashtra',
    portalName: 'MahaBhulekh',
    url: 'https://mahabhunakasha.mahabhumi.gov.in/',
    description: 'Maharashtra BhuNaksha Cadastral Parcel Portal',
  },
  'Uttar Pradesh': {
    name: 'Uttar Pradesh',
    portalName: 'UP Bhulekh',
    url: 'https://upbhulekh.gov.in/',
    description: 'Uttar Pradesh Board of Revenue Bhulekh & Khasra Maps',
  },
  'Gujarat': {
    name: 'Gujarat',
    portalName: 'AnyRoR Gujarat',
    url: 'https://anyror.gujarat.gov.in/',
    description: 'Gujarat Revenue Dept 7/12 & Rural Cadastral Maps',
  },
  'Kerala': {
    name: 'Kerala',
    portalName: 'E-Rekha Kerala',
    url: 'http://erekha.kerala.gov.in/',
    description: 'Kerala Survey & Land Records Resurvey Portal',
  },
};

export function getOfficialPortalForState(stateName: string): StatePortalInfo {
  return (
    STATE_CADASTRAL_PORTALS[stateName] || {
      name: stateName,
      portalName: 'ISRO Bhuvan Panchayat',
      url: 'https://bhuvan-panchayat.nrsc.gov.in/',
      description: 'ISRO NRSC National Cadastral & Panchayat GIS Boundary Portal',
    }
  );
}

const CADASTRAL_DISCLAIMER =
  'Illustrative example / simulation only — NOT an official government revenue record. Consult state land records portal for certified cadastral data.';

/**
 * Generates synthetic Cadastral Survey Parcels for UI demonstration purposes.
 * Every parcel is explicitly tagged with isSynthetic: true.
 */
export function generateCadastralParcelsGeoJSON(
  centerLat: number,
  centerLng: number,
  stateName: string = 'Andhra Pradesh'
): GeoJSON.FeatureCollection {
  const portal = getOfficialPortalForState(stateName);

  const zoneLat = Math.floor(centerLat * 100) / 100;
  const zoneLng = Math.floor(centerLng * 100) / 100;
  const zoneSeed = Math.abs(Math.round(zoneLat * 1000 + zoneLng * 1000));

  let villageName = 'Sample Village';
  let mandalName = 'Sample Mandal';
  let districtName = 'Sample District';

  if (stateName.includes('Andhra')) {
    villageName = 'Sample AP Village (Demo)';
    mandalName = 'Mangalagiri Mandal';
    districtName = 'Guntur District';
  } else if (stateName.includes('Telangana')) {
    villageName = 'Sample TS Village (Demo)';
    mandalName = 'Serilingampally Mandal';
    districtName = 'Rangareddy District';
  } else if (stateName.includes('Karnataka')) {
    villageName = 'Sample KA Village (Demo)';
    mandalName = 'Bengaluru East Taluk';
    districtName = 'Bengaluru Urban';
  } else if (stateName.includes('Tamil')) {
    villageName = 'Sample TN Village (Demo)';
    mandalName = 'Tambaram Taluk';
    districtName = 'Chengalpattu';
  }

  const features: GeoJSON.Feature[] = [];
  const gridSize = 5;
  const stepLat = 0.0018;
  const stepLng = 0.0020;
  const startLat = centerLat - (gridSize * stepLat) / 2;
  const startLng = centerLng - (gridSize * stepLng) / 2;
  const baseSurveyNo = 101 + (zoneSeed % 280);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const pLat = startLat + row * stepLat;
      const pLng = startLng + col * stepLng;
      const parcelPoly: [number, number][] = [
        [pLng, pLat],
        [pLng + stepLng, pLat],
        [pLng + stepLng, pLat + stepLat],
        [pLng, pLat + stepLat],
        [pLng, pLat],
      ];

      const syNum = `${baseSurveyNo + row * gridSize + col}`;
      features.push({
        type: 'Feature',
        properties: {
          surveyNo: syNum,
          fullSurveyNumber: `Sy No. ${syNum} (Simulated)`,
          village: villageName,
          mandal: mandalName,
          district: districtName,
          state: stateName,
          isSynthetic: true,
          disclaimer: CADASTRAL_DISCLAIMER,
          officialPortalName: portal.portalName,
          officialPortalUrl: portal.url,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [parcelPoly],
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Resolves or identifies Cadastral Survey Number info for a coordinate.
 * Any synthetic fallback is marked with isSynthetic: true.
 */
export function resolvePresentSurveyNumber(
  lat: number,
  lng: number,
  accuracyMeters: number = 5,
  state: string = 'Andhra Pradesh',
  cadastralLayer?: GeoJSON.FeatureCollection
): CadastralLocationInfo {
  const pt = turf.point([lng, lat]);
  const utm = projectWgs84ToUtm(lng, lat);
  const portal = getOfficialPortalForState(state);

  if (cadastralLayer && cadastralLayer.features) {
    for (const feat of cadastralLayer.features) {
      if (
        !feat.properties?.isAdministrativeBoundary &&
        feat.geometry &&
        (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')
      ) {
        try {
          if (turf.booleanPointInPolygon(pt, feat as any)) {
            const props = feat.properties || {};
            const coords = (feat.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];

            return {
              surveyNo: String(props.majorSurveyNo || props.surveyNo || '101'),
              subDivision: String(props.subDivision || '1A'),
              fullSurveyNumber: String(props.fullSurveyNumber || `Sy No. ${props.surveyNo} (Simulated)`),
              village: String(props.village || 'Sample Village'),
              mandal: String(props.mandal || 'Sample Mandal'),
              district: String(props.district || 'Sample District'),
              state: String(props.state || state),
              revenueBlock: String(props.revenueBlock || 'Block 1'),
              estimatedExtentCents: Number(props.areaCents || 35),
              estimatedExtentAcres: Number(props.areaAcres || 0.35),
              landClassification: String(props.landClassification || 'Ryotwari Patta (Simulated)'),
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              accuracyMeters: Math.round(accuracyMeters),
              utmEasting: utm.easting,
              utmNorthing: utm.northing,
              utmZoneName: utm.zoneName,
              source: 'cadastral_layer',
              officialPortalName: portal.portalName,
              officialPortalUrl: portal.url,
              coordinates: coords,
              isSynthetic: true,
              disclaimer: CADASTRAL_DISCLAIMER,
            };
          }
        } catch {
          // continue
        }
      }
    }
  }

  return {
    surveyNo: '101',
    subDivision: '1A',
    fullSurveyNumber: 'Sy No. 101/1A (Simulated Sample)',
    village: 'Sample Village',
    mandal: 'Sample Mandal',
    district: 'Sample District',
    state,
    revenueBlock: 'Block 1',
    estimatedExtentCents: 40,
    estimatedExtentAcres: 0.4,
    landClassification: 'Ryotwari Patta (Simulated)',
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    accuracyMeters: Math.round(accuracyMeters),
    utmEasting: utm.easting,
    utmNorthing: utm.northing,
    utmZoneName: utm.zoneName,
    source: 'revenue_grid_estimator',
    officialPortalName: portal.portalName,
    officialPortalUrl: portal.url,
    isSynthetic: true,
    disclaimer: CADASTRAL_DISCLAIMER,
  };
}
