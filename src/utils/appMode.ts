export type AppMode = 'simple' | 'advanced';

export interface DashboardTileItem {
  id: string;
  isCore: boolean; // Shown prominently in Simple mode
  title: string;
  simpleTitle?: string;
  subtitle: string;
  simpleSubtitle?: string;
}

export const DASHBOARD_TILES: DashboardTileItem[] = [
  {
    id: 'gps_walk',
    isCore: true,
    title: 'Measure My Land',
    simpleTitle: 'Measure My Land (Walk Perimeter)',
    subtitle: 'Walk Boundary & Auto-Measure',
    simpleSubtitle: 'Walk the boundary with your phone — auto-measures perimeter and computes exact area',
  },
  {
    id: 'area_calc',
    isCore: true,
    title: 'Calculate Land Area',
    simpleTitle: 'Calculate Land Area (4-Sided & Triangle)',
    subtitle: '4-Sided & Triangle Plots',
    simpleSubtitle: 'Enter your 4 boundary sides or 3 triangle sides to get instant area in local units',
  },
  {
    id: 'projects',
    isCore: true,
    title: 'My Saved Surveys',
    simpleTitle: 'My Saved Surveys & Reports',
    subtitle: 'Stored Surveys & Reports',
    simpleSubtitle: 'Access previously measured parcels, download certificates, or export reports',
  },
  {
    id: 'market',
    isCore: true,
    title: 'Land Marketplace',
    simpleTitle: 'Land Marketplace (Buy & Sell)',
    subtitle: 'Verified Land Listings',
    simpleSubtitle: 'Browse verified plots for sale or list your land with revenue documents',
  },
  {
    id: 'cadtools',
    isCore: false,
    title: 'Drafting Studio',
    subtitle: 'CAD Drafting, Sub-division, Setbacks & COGO',
  },
  {
    id: 'bhuvan',
    isCore: false,
    title: 'Bhuvan 2D NRSC Map',
    subtitle: 'ISRO Satellite & Cadastral Boundaries',
  },
  {
    id: 'cad',
    isCore: false,
    title: 'File Import / Export',
    subtitle: 'AutoCAD DXF, GIS Shapefile & KML',
  },
  {
    id: 'traverse',
    isCore: false,
    title: 'Closed Traverse (Bowditch)',
    subtitle: 'Compass traverse balancing & error distribution',
  },
  {
    id: 'survey_quality',
    isCore: false,
    title: 'Survey Quality & Confidence',
    subtitle: 'Legal admissibility audit & precision score',
  },
  {
    id: 'survey_points',
    isCore: false,
    title: 'Survey Stations & Benchmarks',
    subtitle: 'GCP calibration points & station database',
  },
  {
    id: 'fraction',
    isCore: false,
    title: 'Hissa Land Partition',
    subtitle: 'Inheritance and co-owner share calculator',
  },
  {
    id: 'converter',
    isCore: false,
    title: 'Unit Converter',
    subtitle: 'All-India revenue and cadastral conversion',
  },
];

/**
 * Filter tiles based on whether user is in Simple or Advanced mode
 */
export function getVisibleTiles(mode: AppMode) {
  if (mode === 'simple') {
    return {
      coreTiles: DASHBOARD_TILES.filter((t) => t.isCore),
      advancedTiles: DASHBOARD_TILES.filter((t) => !t.isCore),
    };
  }
  return {
    coreTiles: DASHBOARD_TILES,
    advancedTiles: [],
  };
}

export type GpsSignalRating = 'Good' | 'OK' | 'Poor' | 'No Signal';

/**
 * Return simple human-friendly signal rating
 * < 3m = Good, 3-8m = OK, > 8m = Poor
 */
export function getSimpleGpsRating(accuracyMeters?: number | null, gpsActive = false): GpsSignalRating {
  if (!gpsActive || accuracyMeters === null || accuracyMeters === undefined) {
    return 'No Signal';
  }
  if (accuracyMeters <= 3.0) return 'Good';
  if (accuracyMeters <= 8.0) return 'OK';
  return 'Poor';
}
