import type { AppUserRole, AppUserStatus, SystemSettings } from './auth.ts';

export type FeatureCategory =
  | 'measurement'
  | 'surveying'
  | 'mapping'
  | 'cad_gis'
  | 'projects'
  | 'ai_tools'
  | 'marketplace'
  | 'learning'
  | 'developer_tools';

export type FeatureKey =
  // A. Measurement
  | 'land_measurement'
  | 'four_sided_plot'
  | 'land_unit_conversion'
  | 'hissa_partition'
  // B. Surveying
  | 'triangulation'
  | 'traverse_survey'
  | 'gps_boundary_survey'
  // C. Mapping
  | 'bhuvan_map'
  | 'boundary_visualization'
  // D. CAD & GIS
  | 'cad_tools'
  | 'dxf_exchange'
  | 'gis_shapefile'
  // E. Project Management
  | 'survey_projects'
  | 'pdf_reports'
  // F. AI Tools
  | 'ai_plot_advisor'
  | 'doc_scanner_ocr'
  // G. Marketplace
  | 'marketplace_browse'
  | 'marketplace_listing'
  // H. Learning
  | 'video_academy'
  // I. Developer Tools
  | 'developer_diagnostics'
  | 'developer_logs';

export type FeaturePermissionState = 'on' | 'off' | 'inherited';

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  category: FeatureCategory;
  categoryLabel: string;
  applicableRoles: AppUserRole[];
  globalFlagKey?: keyof SystemSettings['featureFlags'];
}

export const FEATURE_CATEGORIES: { id: FeatureCategory; label: string; description: string }[] = [
  { id: 'measurement', label: 'Measurement Calculators', description: 'Area calculators, Patwari, 4-sided plots and state units' },
  { id: 'surveying', label: 'Field Surveying & GPS', description: 'Triangulation, Bowditch closed traverse & GPS boundary walk' },
  { id: 'mapping', label: 'Geospatial & Bhuvan Maps', description: 'ISRO satellite basemaps and cadastral boundary layers' },
  { id: 'cad_gis', label: 'CAD Studio & GIS Exchange', description: 'AutoCAD vector drafting, DXF, Shapefile and KML files' },
  { id: 'projects', label: 'Survey Projects & Reports', description: 'Encrypted project vault, PDF survey reports and client deeds' },
  { id: 'ai_tools', label: 'AI Assistants & OCR Scanner', description: 'Geometry advisor, automated checks and revenue deed OCR' },
  { id: 'marketplace', label: 'Land Marketplace', description: 'Verified parcel listings, discovery and owner inquiries' },
  { id: 'learning', label: 'Video Academy & Tutorials', description: '18-episode video training platform and narration scripts' },
  { id: 'developer_tools', label: 'Developer Diagnostics & Telemetry', description: 'System health monitoring, error logs and remediation' },
];

export const APPLICATION_FEATURES: FeatureDefinition[] = [
  // A. Measurement
  {
    key: 'land_measurement',
    label: 'Land Measurement Calculator',
    description: 'General plot area and perimeter calculator with regional revenue unit conversions',
    category: 'measurement',
    categoryLabel: 'Measurement',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'four_sided_plot',
    label: 'Four-Sided Plot Calculator',
    description: 'Quadrilateral area computation using Heron diagonal and Brahmagupta formulas',
    category: 'measurement',
    categoryLabel: 'Measurement',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'land_unit_conversion',
    label: 'Land Unit Conversion',
    description: 'All-India state cadastral unit conversions (Acres, Cents, Guntas, Bigha, Ankanams)',
    category: 'measurement',
    categoryLabel: 'Measurement',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'hissa_partition',
    label: 'Hissa / Land Partition',
    description: 'Legal inheritance co-owner share division and sub-parcel proportioning',
    category: 'measurement',
    categoryLabel: 'Measurement',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // B. Surveying
  {
    key: 'triangulation',
    label: 'Triangulation & Heron Method',
    description: 'Multi-segment parcel division into non-overlapping triangles for exact area',
    category: 'surveying',
    categoryLabel: 'Surveying',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'traverse_survey',
    label: 'Closed Traverse (Bowditch)',
    description: 'Field bearings, distances, latitudes/departures and Bowditch rule error balancing',
    category: 'surveying',
    categoryLabel: 'Surveying',
    applicableRoles: ['user', 'developer', 'owner'],
    globalFlagKey: 'advancedTraverse',
  },
  {
    key: 'gps_boundary_survey',
    label: 'GPS Boundary Survey & Walk',
    description: 'Real-time GPS perimeter walking, multi-epoch station averaging and velocity filtering',
    category: 'surveying',
    categoryLabel: 'Surveying',
    applicableRoles: ['user', 'developer', 'owner'],
    globalFlagKey: 'bhuvanCadastralWalk',
  },

  // C. Mapping
  {
    key: 'bhuvan_map',
    label: 'ISRO Bhuvan Maps & Cadastral',
    description: 'NRSC satellite tiles, WMS cadastral layers and survey number overlays',
    category: 'mapping',
    categoryLabel: 'Mapping',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'boundary_visualization',
    label: 'Boundary Visualization & Stations',
    description: 'Plot contour visualization, benchmark points and UTM/WGS84 coordinate stations',
    category: 'mapping',
    categoryLabel: 'Mapping',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // D. CAD & GIS
  {
    key: 'cad_tools',
    label: 'Drafting Studio (AutoCAD COGO)',
    description: 'Vector parcel drafting, offset setbacks, snap-to-grid and boundary subdivisions',
    category: 'cad_gis',
    categoryLabel: 'CAD and GIS',
    applicableRoles: ['user', 'developer', 'owner'],
    globalFlagKey: 'cadDraftingStudio',
  },
  {
    key: 'dxf_exchange',
    label: 'AutoCAD DXF Import / Export',
    description: 'Direct ingestion and extraction of CAD DXF polyline geometry and dimensions',
    category: 'cad_gis',
    categoryLabel: 'CAD and GIS',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'gis_shapefile',
    label: 'GIS Vector Data (Shapefile / KML / GeoJSON)',
    description: 'Geospatial format ingestion compatible with QGIS, ArcGIS and Google Earth',
    category: 'cad_gis',
    categoryLabel: 'CAD and GIS',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // E. Project Management
  {
    key: 'survey_projects',
    label: 'Survey Projects Vault',
    description: 'Encrypted cloud archiving, offline 6-state sync and project history',
    category: 'projects',
    categoryLabel: 'Project Management',
    applicableRoles: ['user', 'developer', 'owner'],
  },
  {
    key: 'pdf_reports',
    label: 'Survey PDF Reports & Certificates',
    description: 'Court-admissible PDF survey certificates, boundary tables and deed documentation',
    category: 'projects',
    categoryLabel: 'Project Management',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // F. AI Tools
  {
    key: 'ai_plot_advisor',
    label: 'AI Land Plot Geometry Advisor',
    description: 'Automated geometric sanity checks, dispute detection and boundary optimization',
    category: 'ai_tools',
    categoryLabel: 'AI Tools',
    applicableRoles: ['user', 'developer', 'owner'],
    globalFlagKey: 'aiAssistedAudit',
  },
  {
    key: 'doc_scanner_ocr',
    label: 'Land Document Scanner & OCR',
    description: 'Computer vision extraction of survey numbers, bounds and deed text from revenue records',
    category: 'ai_tools',
    categoryLabel: 'AI Tools',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // G. Marketplace
  {
    key: 'marketplace_browse',
    label: 'Land Marketplace Directory',
    description: 'Search and browse verified agricultural, commercial and residential land parcels',
    category: 'marketplace',
    categoryLabel: 'Marketplace',
    applicableRoles: ['user', 'developer', 'owner'],
    globalFlagKey: 'landMarketplace',
  },
  {
    key: 'marketplace_listing',
    label: 'Marketplace Listing Creation & Management',
    description: 'Publish verified parcel listings with survey certificates and manage inquiries',
    category: 'marketplace',
    categoryLabel: 'Marketplace',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // H. Learning
  {
    key: 'video_academy',
    label: 'STHAL MEASURE Video Academy',
    description: '18 complete educational tutorial episodes with real-time video player and narration',
    category: 'learning',
    categoryLabel: 'Learning',
    applicableRoles: ['user', 'developer', 'owner'],
  },

  // I. Developer Tools (Only applicable to Developer or Owner role)
  {
    key: 'developer_diagnostics',
    label: 'Developer Diagnostics & Health Monitor',
    description: 'System health probes, Firestore latency benchmarks and automated remediation actions',
    category: 'developer_tools',
    categoryLabel: 'Developer Tools',
    applicableRoles: ['developer', 'owner'],
  },
  {
    key: 'developer_logs',
    label: 'Technical Error Logs & Telemetry',
    description: 'Inspection of real-time client exceptions, error stacktraces and diagnostic queries',
    category: 'developer_tools',
    categoryLabel: 'Developer Tools',
    applicableRoles: ['developer', 'owner'],
  },
];

export interface UserFeaturePermissionsDoc {
  uid: string;
  email: string;
  displayName: string;
  role: AppUserRole;
  permissions: Record<FeatureKey, FeaturePermissionState>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  permissionVersion: number;
}

export interface EffectiveUserPermissions {
  uid: string;
  role: AppUserRole;
  permissions: Record<FeatureKey, boolean>;
  states: Record<FeatureKey, FeaturePermissionState>;
  reasons: Record<FeatureKey, string>;
  updatedAt: string;
}

export interface PermissionAuditEntry {
  id: string;
  timestamp: string;
  targetUid?: string;
  targetEmail?: string;
  targetUsername?: string;
  featureKey?: string;
  previousPermissions?: Record<string, any>;
  newPermissions?: Record<string, any>;
  ownerUid?: string;
  ownerEmail?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  permissionVersion?: number;
  ip?: string;
  details?: {
    targetEmail?: string;
    targetRole?: string;
    permissionVersion?: number;
    previousPermissions?: Record<string, any>;
    newPermissions?: Record<string, any>;
    [key: string]: any;
  };
}
