import { ALL_INDIAN_STATES_DATA } from './indianStateUnits';

// Indian Land Unit Conversion Standards & Constants
export interface StateUnitConfig {
  state: string;
  primaryUnits: string[];
  notes?: string;
  code?: string;
  region?: string;
}

// Comprehensive registry of all 28 Indian States, 8 Union Territories, and All-India
export const STATE_CONFIGS: Record<string, StateUnitConfig> = Object.entries(
  ALL_INDIAN_STATES_DATA
).reduce((acc, [stateKey, info]) => {
  acc[stateKey] = {
    state: info.state,
    primaryUnits: info.primaryUnits,
    notes: info.notes,
    code: info.code,
    region: info.region,
  };
  return acc;
}, {} as Record<string, StateUnitConfig>);

// Base unit: 1 Square Meter (sqm)
// 1 Acre = 4046.8564224 sqm
// 1 Hectare = 10000 sqm = 2.47105 Acres
// 1 Acre = 100 Cents => 1 Cent = 40.468564224 sqm = 48.4 sq yards = 435.6 sq ft
// 1 Acre = 40 Guntas => 1 Gunta = 101.17141056 sqm = 121 sq yards = 1089 sq ft
// 1 Ankanam = 72 sq feet = 8 sq yards = 6.68901888 sqm
// 1 Ground = 2400 sq feet = 222.967 sqm
// 1 Sq Yard = 9 sq feet = 0.836127 sqm
// 1 Sq Foot = 0.092903 sqm
// 1 Bigha (Standard pucca) = 1600 sq yards = 14400 sq feet = 1337.8 sqm

export const SQM_PER_UNIT = {
  sqm: 1,
  sqft: 0.09290304,
  sqyd: 0.83612736,
  cent: 40.468564224,
  gunta: 101.17141056,
  acre: 4046.8564224,
  hectare: 10000,
  are: 100, // 1 Are = 100 sqm
  ankanam: 6.68901888, // 72 sq ft
  ground: 222.967296, // 2400 sq ft
  bigha: 1337.803776, // ~1600 sq yd
  sq_metric_link: 0.04, // 1 metric link = 0.20m (20 cm) => 0.04 sqm (IS 1492 standard)
  sq_gunter_link: 0.040468564224, // 1 gunter link = 0.66 ft = 0.201168m => 0.040468564224 sqm (100,000 sq links = 1 acre, 1000 sq links = 1 cent)
  sq_metric_chain: 400.0, // 1 metric chain = 20m => 400 sqm = 4 Ares = 10,000 sq metric links
  sq_gunter_chain: 404.68564224, // 1 gunter chain = 66 ft = 20.1168m => 404.68564224 sqm = 0.1 Acre = 10 Cents = 10,000 sq gunter links
};

export type DimensionUnit = 'm' | 'ft' | 'links' | 'chains';
export type LinkType = 'gunter' | 'metric';

// Linear distance conversion factors to meters
export const METERS_PER_LINEAR_UNIT = {
  m: 1.0,
  ft: 0.3048,
  metric_link: 0.20, // 20 cm
  gunter_link: 0.201168, // 66 ft / 100 = 0.66 ft = 7.92 in
  metric_chain: 20.0, // 100 metric links = 20 m (IS 1492)
  gunter_chain: 20.1168, // 100 gunter links = 66 ft = 20.1168 m
} as const;

// Area conversion multiplier from square of linear input unit to square meters
export const SQM_PER_LINEAR_SQ_UNIT = {
  m: 1.0,
  ft: 0.09290304, // 0.3048^2
  metric_link: 0.04, // 0.20^2
  gunter_link: 0.040468564224, // 0.201168^2
  metric_chain: 400.0, // 20.0^2
  gunter_chain: 404.68564224, // 20.1168^2 (1 sq chain = 10 Cents = 0.1 Acre)
} as const;

export function getLinearUnitMultiplier(unit: DimensionUnit, linkType: LinkType = 'gunter'): number {
  if (unit === 'm') return SQM_PER_LINEAR_SQ_UNIT.m;
  if (unit === 'ft') return SQM_PER_LINEAR_SQ_UNIT.ft;
  if (unit === 'chains') {
    return linkType === 'metric' ? SQM_PER_LINEAR_SQ_UNIT.metric_chain : SQM_PER_LINEAR_SQ_UNIT.gunter_chain;
  }
  return linkType === 'metric' ? SQM_PER_LINEAR_SQ_UNIT.metric_link : SQM_PER_LINEAR_SQ_UNIT.gunter_link;
}

export interface AreaBreakdown {
  sqm: number;
  sqft: number;
  sqyd: number;
  acres: number;
  cents: number;
  guntas: number;
  hectares: number;
  ankanams: number;
  grounds: number;
  metricLinks: number; // area in Sq. Metric Links (20cm x 20cm = 0.04 m²)
  gunterLinks: number; // area in Sq. Gunter's Links (7.92in x 7.92in = 0.04046856 m²)
  metricChains: number; // area in Sq. Metric Chains (20m x 20m = 400 m² = 10,000 sq metric links)
  gunterChains: number; // area in Sq. Gunter's Chains (1 sq chain = 10 Cents = 0.1 Acre = 10,000 sq links)
  formattedAcreString: string; // e.g. "2 Acres 45.2 Cents" or "10.00 Cents"
}

export function convertArea(sqMeters: number): AreaBreakdown {
  const safeSqm = Math.max(0, sqMeters);
  const sqft = safeSqm / SQM_PER_UNIT.sqft;
  const sqyd = safeSqm / SQM_PER_UNIT.sqyd;
  const acres = safeSqm / SQM_PER_UNIT.acre;
  const cents = safeSqm / SQM_PER_UNIT.cent;
  const guntas = safeSqm / SQM_PER_UNIT.gunta;
  const hectares = safeSqm / SQM_PER_UNIT.hectare;
  const ankanams = safeSqm / SQM_PER_UNIT.ankanam;
  const grounds = safeSqm / SQM_PER_UNIT.ground;
  const metricLinks = safeSqm / SQM_PER_UNIT.sq_metric_link;
  const gunterLinks = safeSqm / SQM_PER_UNIT.sq_gunter_link;
  const metricChains = safeSqm / SQM_PER_UNIT.sq_metric_chain;
  const gunterChains = safeSqm / SQM_PER_UNIT.sq_gunter_chain;

  // Clean rounding for Acres and Cents
  const roundedAcres = Math.round(acres * 1000000) / 1000000;
  const wholeAcres = Math.floor(roundedAcres);
  let remainingCents = Math.round((roundedAcres - wholeAcres) * 100 * 100) / 100;
  let finalWholeAcres = wholeAcres;
  if (remainingCents >= 100) {
    finalWholeAcres += 1;
    remainingCents = 0;
  }

  const formattedAcreString = finalWholeAcres > 0 
    ? (remainingCents > 0.001 
        ? `${finalWholeAcres} Ac ${remainingCents.toFixed(2)} Cents` 
        : `${finalWholeAcres} Ac`)
    : `${remainingCents.toFixed(2)} Cents`;

  return {
    sqm: Number(safeSqm.toFixed(3)),
    sqft: Number(sqft.toFixed(2)),
    sqyd: Number(sqyd.toFixed(2)),
    acres: Number(acres.toFixed(4)),
    cents: Number(cents.toFixed(2)),
    guntas: Number(guntas.toFixed(2)),
    hectares: Number(hectares.toFixed(4)),
    ankanams: Number(ankanams.toFixed(2)),
    grounds: Number(grounds.toFixed(2)),
    metricLinks: Number(metricLinks.toFixed(2)),
    gunterLinks: Number(gunterLinks.toFixed(2)),
    metricChains: Number(metricChains.toFixed(4)),
    gunterChains: Number(gunterChains.toFixed(4)),
    formattedAcreString,
  };
}

export function convertFromUnitToSqm(value: number, unit: keyof typeof SQM_PER_UNIT): number {
  const factor = SQM_PER_UNIT[unit] || 1;
  return value * factor;
}
