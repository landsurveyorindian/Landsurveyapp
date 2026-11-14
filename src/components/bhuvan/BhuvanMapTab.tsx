import React, { useEffect, useRef, useState, useCallback } from 'react';
import { maplibregl } from '../../utils/maplibreSetup';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import {
  wgs84ToUtmAuto,
  calculatePolygonMetrics,
  PolygonMetrics,
  parseShapefile,
  parseDxf,
  parseKml,
  exportToKml,
  extractFourSidedDimensions,
  FourSidedDimensions,
} from '../../utils/gis';
import { saveProject, SurveyProject } from '../../services/projectsService';
import { useAuth } from '../../firebase/AuthContext';
import {
  Crosshair,
  Navigation2,
  Plus,
  Undo2,
  Trash2,
  Layers,
  Upload,
  BookmarkCheck,
  Check,
  Compass,
  MapPin,
  ChevronDown,
  X,
  Maximize2,
  Play,
  Square,
  Pause,
  RotateCcw,
  ExternalLink,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  Footprints,
  Grid3X3,
  Target,
  Sliders,
  Zap,
} from 'lucide-react';
import { UseGeolocationReturn, useGeolocation } from '../../hooks/useGeolocation';
import { GpsAccuracyModal } from '../location/GpsAccuracyModal';
import { SurveyPointManagerModal } from '../survey/SurveyPointManagerModal';
import { useAppMode } from '../../context/AppModeContext';
import { getSimpleGpsRating } from '../../utils/appMode';
import {
  StaticEpochAccumulator,
  GcpCalibrationManager,
} from '../../utils/gpsFilter';

export type BasemapId = 'bhuvan' | 'google_hybrid' | 'google_satellite' | 'esri' | 'osm';

interface BasemapDef {
  id: BasemapId;
  name: string;
  badge: string;
  tiles: string[];
}

const BASEMAP_LIST: BasemapDef[] = [
  {
    id: 'bhuvan',
    name: 'ISRO Bhuvan 2D NRSC Map',
    badge: 'NRSC 2D Hybrid',
    tiles: ['bhuvan://{z}/{x}/{y}'],
  },
  {
    id: 'google_hybrid',
    name: 'Google Hybrid',
    badge: 'Roads + Sat',
    tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
  },
  {
    id: 'google_satellite',
    name: 'Google Satellite',
    badge: 'High Res',
    tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
  },
  {
    id: 'esri',
    name: 'Esri World Imagery',
    badge: 'Satellite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    badge: 'Vector/Street',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  },
];

interface BhuvanMapTabProps {
  selectedState: string;
  initialWalkMode?: boolean;
  onProjectSaved?: (project: SurveyProject) => void;
  onSendToCalculator?: (dims: FourSidedDimensions) => void;
  geo?: UseGeolocationReturn;
}

export const BhuvanMapTab: React.FC<BhuvanMapTabProps> = ({
  selectedState,
  initialWalkMode = false,
  onProjectSaved,
  onSendToCalculator,
  geo,
}) => {
  const { user } = useAuth();
  const { isSimple } = useAppMode();
  const fallbackGeo = useGeolocation();
  const activeGeo = geo || fallbackGeo;

  const [gpsAccuracyModalOpen, setGpsAccuracyModalOpen] = useState<boolean>(false);
  const [isAveragingCorner, setIsAveragingCorner] = useState<boolean>(false);
  const [averagingProgress, setAveragingProgress] = useState<{ count: number; target: number; acc: number }>({
    count: 0,
    target: 10,
    acc: 0,
  });

  const cornerAccumulatorRef = useRef<StaticEpochAccumulator>(new StaticEpochAccumulator(10));

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  // Center state coordinates default to Vijayawada / Andhra Pradesh (or AP/Telangana area)
  const [centerCoords, setCenterCoords] = useState<{ lng: number; lat: number }>({
    lng: 80.6480,
    lat: 16.5062,
  });
  const [utmCoords, setUtmCoords] = useState<{ easting: number; northing: number; zone: number }>({
    easting: 462371,
    northing: 1825120,
    zone: 44,
  });

  // Current active basemap (default is ISRO Bhuvan per user request)
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>('bhuvan');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);

  // Vertices for polygon measurement: array of [lng, lat]
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [metrics, setMetrics] = useState<PolygonMetrics | null>(null);

  // --------------------------------------------------------------------------
  // REDESIGNED: GPS WALK AREA STATE & CONTROLS
  // --------------------------------------------------------------------------
  const [walkModeActive, setWalkModeActive] = useState<boolean>(Boolean(initialWalkMode));
  const [walkStatus, setWalkStatus] = useState<'idle' | 'walking' | 'paused' | 'completed'>('idle');
  const [autoRecord, setAutoRecord] = useState<boolean>(true); // Auto-log vertices as you walk
  const [walkDistanceMeters, setWalkDistanceMeters] = useState<number>(0);
  const [walkTrack, setWalkTrack] = useState<[number, number][]>([]); // Full breadcrumb path
  const [gpsPos, setGpsPos] = useState<{ lng: number; lat: number; accuracy: number } | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [walkSummaryOpen, setWalkSummaryOpen] = useState(false);

  const cornerWatchIdRef = useRef<number | null>(null);
  const surveyorMarkerRef = useRef<maplibregl.Marker | null>(null);
  const myLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const edgeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lastRecordedPtRef = useRef<[number, number] | null>(null);

  // Imported overlay features
  const [overlayLayers, setOverlayLayers] = useState<{ name: string; featureCount: number }[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isPointManagerOpen, setIsPointManagerOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const bhuvanModeRef = useRef<'proxy' | 'direct' | 'esri_fallback'>('proxy');

  // React to initialWalkMode prop changes (e.g. navigation from Tiles Dashboard)
  useEffect(() => {
    if (initialWalkMode) {
      setWalkModeActive(true);
      setStatusNotice('GPS WALK AREA mode activated. Tap "Start Walking" to begin.');
      setTimeout(() => setStatusNotice(null), 3500);
    }
  }, [initialWalkMode]);

  // Cadastral Boundaries & Survey Numbers layer state (enabled by default per NRSC Bhuvan standards)
  const [showCadastral, setShowCadastral] = useState<boolean>(true);

  const getBhuvanTiles = useCallback((): string[] => {
    return ['bhuvan://{z}/{x}/{y}'];
  }, []);

  // Helper to construct MapLibre style from basemap tiles
  const createMapStyle = useCallback((basemapId: BasemapId): maplibregl.StyleSpecification => {
    const def = BASEMAP_LIST.find((b) => b.id === basemapId) || BASEMAP_LIST[0];
    const tiles = basemapId === 'bhuvan' ? getBhuvanTiles() : def.tiles;
    return {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'basemap-source': {
          type: 'raster',
          tiles,
          tileSize: 256,
          attribution: def.name,
        },
        'cadastral-source': {
          type: 'raster',
          tiles: ['bhuvan-cadastral://{z}/{x}/{y}'],
          tileSize: 256,
          attribution: 'ISRO / NRSC Cadastral (FMB / Survey Nos)',
        },
      },

      layers: [
        {
          id: 'basemap-layer',
          type: 'raster',
          source: 'basemap-source',
          minzoom: 0,
          maxzoom: 22,
        },
        {
          id: 'cadastral-layer',
          type: 'raster',
          source: 'cadastral-source',
          minzoom: 11,
          maxzoom: 22,
          layout: {
            visibility: showCadastral ? 'visible' : 'none',
          },
          paint: {
            'raster-opacity': 1.0,
          },
        },
      ],
    };
  }, [getBhuvanTiles, showCadastral]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createMapStyle(activeBasemap),
      center: [centerCoords.lng, centerCoords.lat],
      zoom: 16,
      maxZoom: 22,
      attributionControl: false,
    });

    (window as any).__map = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('move', () => {
      const center = map.getCenter();
      const lng = Number(center.lng.toFixed(6));
      const lat = Number(center.lat.toFixed(6));
      setCenterCoords({ lng, lat });
      setUtmCoords(wgs84ToUtmAuto(lng, lat));
    });

    map.on('load', () => {
      // 1. Walked Breadcrumbs Path Line (cyan/emerald trail)
      map.addSource('walk-track', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'walk-track-line',
        type: 'line',
        source: 'walk-track',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 4,
          'line-dasharray': [1.5, 1.5],
        },
      });

      // 2. Custom boundary polygon & closed area layers
      map.addSource('boundary-polygon', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'boundary-polygon-fill',
        type: 'fill',
        source: 'boundary-polygon',
        paint: {
          'fill-color': '#10B981',
          'fill-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'boundary-polygon-stroke',
        type: 'line',
        source: 'boundary-polygon',
        paint: {
          'line-color': '#10B981',
          'line-width': 3,
        },
      });

      // 3. Imported overlay layer
      map.addSource('imported-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'imported-overlay-fill',
        type: 'fill',
        source: 'imported-overlay',
        paint: {
          'fill-color': '#38BDF8',
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'imported-overlay-line',
        type: 'line',
        source: 'imported-overlay',
        paint: {
          'line-color': '#0284C7',
          'line-width': 2,
        },
      });
    });

    mapInstanceRef.current = map;

    return () => {
      activeGeo.stopWatching();
      if (cornerWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(cornerWatchIdRef.current);
        cornerWatchIdRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [createMapStyle]);

  // Switch basemap
  const handleSwitchBasemap = (id: BasemapId) => {
    setActiveBasemap(id);
    setShowBasemapMenu(false);
    if (id === 'bhuvan') {
      bhuvanModeRef.current = 'proxy';
    }
    const map = mapInstanceRef.current;
    if (!map) return;

    const source = map.getSource('basemap-source') as maplibregl.RasterTileSource;
    const def = BASEMAP_LIST.find((b) => b.id === id);
    if (source && def) {
      map.setStyle(createMapStyle(id), {
        transformStyle: (previousStyle, nextStyle) => {
          return {
            ...nextStyle,
            sources: {
              ...nextStyle.sources,
              'walk-track': previousStyle?.sources?.['walk-track'] || {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              },
              'boundary-polygon': previousStyle?.sources?.['boundary-polygon'] || {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              },
              'imported-overlay': previousStyle?.sources?.['imported-overlay'] || {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              },
            },
            layers: [
              ...nextStyle.layers,
              {
                id: 'walk-track-line',
                type: 'line',
                source: 'walk-track',
                paint: { 'line-color': '#06b6d4', 'line-width': 4, 'line-dasharray': [1.5, 1.5] },
              },
              {
                id: 'boundary-polygon-fill',
                type: 'fill',
                source: 'boundary-polygon',
                paint: { 'fill-color': '#10B981', 'fill-opacity': 0.35 },
              },
              {
                id: 'boundary-polygon-stroke',
                type: 'line',
                source: 'boundary-polygon',
                paint: { 'line-color': '#10B981', 'line-width': 3 },
              },
              {
                id: 'imported-overlay-fill',
                type: 'fill',
                source: 'imported-overlay',
                paint: { 'fill-color': '#38BDF8', 'fill-opacity': 0.3 },
              },
              {
                id: 'imported-overlay-line',
                type: 'line',
                source: 'imported-overlay',
                paint: { 'line-color': '#0284C7', 'line-width': 2 },
              },
            ],
          };
        },
      });
    }
  };

  // Toggle Cadastral boundary & Survey Number layer visibility
  const handleToggleCadastral = () => {
    const next = !showCadastral;
    setShowCadastral(next);
    const map = mapInstanceRef.current;
    if (map && map.getLayer('cadastral-layer')) {
      map.setLayoutProperty('cadastral-layer', 'visibility', next ? 'visible' : 'none');
    }
    setStatusNotice(next ? 'Cadastral Boundaries & Survey Numbers: Active' : 'Cadastral Boundaries: Hidden');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      if (map.getLayer('cadastral-layer')) {
        map.setLayoutProperty('cadastral-layer', 'visibility', showCadastral ? 'visible' : 'none');
      }
    } catch {
      // pass
    }
  }, [showCadastral]);

  // Re-render polygon layers, walk tracks, and markers whenever vertices or walkTrack update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing vertex & edge markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    edgeMarkersRef.current.forEach((m) => m.remove());
    edgeMarkersRef.current = [];

    // Calculate metrics if vertices >= 3
    if (vertices.length >= 3) {
      const polyMetrics = calculatePolygonMetrics(vertices);
      setMetrics(polyMetrics);

      // Add edge length badge markers along boundary lines
      if (polyMetrics) {
        polyMetrics.edgeLengths.forEach((edge) => {
          const el = document.createElement('div');
          el.className =
            'bg-slate-950/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/60 rounded px-1.5 py-0.5 shadow-md pointer-events-none select-none';
          el.innerText = `${edge.lengthMeters}m (${edge.lengthFeet}ft)`;
          const m = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(edge.midPoint)
            .addTo(map);
          edgeMarkersRef.current.push(m);
        });
      }
    } else {
      setMetrics(null);
    }

    // Add numbered vertex corner markers
    vertices.forEach((v, index) => {
      const el = document.createElement('div');
      const isStart = index === 0;
      el.className = `w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg cursor-grab active:cursor-grabbing border-2 ${
        isStart
          ? 'bg-emerald-400 text-slate-950 border-white ring-2 ring-emerald-500'
          : 'bg-emerald-600 text-white border-slate-950'
      }`;
      el.innerText = isStart ? 'P1' : String(index + 1);
      el.title = isStart ? 'Starting Point' : `Corner Point #${index + 1}`;

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(v)
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setVertices((prev) => {
          const next = [...prev];
          next[index] = [Number(lngLat.lng.toFixed(6)), Number(lngLat.lat.toFixed(6))];
          return next;
        });
      });

      markersRef.current.push(marker);
    });

    // Update GeoJSON boundary source
    const boundarySource = map.getSource('boundary-polygon') as maplibregl.GeoJSONSource;
    if (boundarySource) {
      if (vertices.length >= 3) {
        const closed = [...vertices, vertices[0]];
        boundarySource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [closed],
              },
            },
          ],
        });
      } else if (vertices.length === 2) {
        boundarySource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: vertices,
              },
            },
          ],
        });
      } else {
        boundarySource.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Update GeoJSON walk-track line source
    const trackSource = map.getSource('walk-track') as maplibregl.GeoJSONSource;
    if (trackSource) {
      if (walkTrack.length >= 2) {
        trackSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: walkTrack,
              },
            },
          ],
        });
      } else {
        trackSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [vertices, walkTrack]);

  // Update surveyor live beacon marker
  const updateSurveyorMarker = useCallback((lng: number, lat: number, accuracy: number, heading: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!surveyorMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-emerald-500/20 animate-ping absolute"></div>
        <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg ring-2 ring-emerald-600 flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `;
      surveyorMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      surveyorMarkerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  // --------------------------------------------------------------------------
  // GPS WALK AREA: START WALKING (UNIFIED KALMAN FILTERED VIA USEGEOLOCATION)
  // --------------------------------------------------------------------------
  const handleStartWalk = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatusNotice('Geolocation is not supported by your browser or device.');
      return;
    }

    setWalkStatus('walking');
    setWalkSummaryOpen(false);
    setStatusNotice('Walk started! 2D Kalman smoothing & multipath rejection active.');

    const map = mapInstanceRef.current;

    activeGeo.startWatching(true, (enhanced) => {
      const latitude = enhanced.latitude;
      const longitude = enhanced.longitude;
      const accuracy = enhanced.accuracy;
      const heading = enhanced.heading;

      const currentPt: [number, number] = [
        Number(longitude.toFixed(6)),
        Number(latitude.toFixed(6)),
      ];

      setGpsPos({ lng: longitude, lat: latitude, accuracy });
      setGpsHeading(heading ?? null);
      updateSurveyorMarker(longitude, latitude, accuracy, heading ?? null);

      // Center map smoothly on surveyor
      if (map) {
        map.easeTo({ center: [longitude, latitude], zoom: 19, duration: 600 });
      }

      // Add to continuous breadcrumb walkTrack
      setWalkTrack((prev) => [...prev, currentPt]);

      // Accuracy Filtering: Skip auto-recording corner vertices if accuracy > 15m
      if (accuracy > 15) {
        setStatusNotice(`GPS Warning: Current accuracy ±${Math.round(accuracy)}m exceeds 15m threshold. Point recording paused.`);
        return;
      }

      // If this is the very first point of the walk, log it as Point 1
      setVertices((prevVertices) => {
        if (prevVertices.length === 0) {
          lastRecordedPtRef.current = currentPt;
          return [currentPt];
        }

        // If autoRecord is active, check distance from last logged corner vertex
        if (autoRecord && lastRecordedPtRef.current) {
          const fromPt = turf.point(lastRecordedPtRef.current);
          const toPt = turf.point(currentPt);
          const distMeters = turf.distance(fromPt, toPt, { units: 'kilometers' }) * 1000;

          // Auto-log a corner vertex if moved by >= 4.0 meters
          if (distMeters >= 4.0) {
            lastRecordedPtRef.current = currentPt;
            setWalkDistanceMeters((prevDist) => Math.round(prevDist + distMeters));
            return [...prevVertices, currentPt];
          }
        }

        return prevVertices;
      });
    });
  };

  // --------------------------------------------------------------------------
  // GPS WALK AREA: STOP & CLOSE POLYGON
  // --------------------------------------------------------------------------
  const handleStopAndCloseWalk = () => {
    activeGeo.stopWatching();

    if (vertices.length < 3) {
      setWalkStatus('paused');
      setStatusNotice('Perimeter requires at least 3 corner points to form an enclosed area.');
      return;
    }

    setWalkStatus('completed');
    setWalkSummaryOpen(true);
    setStatusNotice(`Perimeter Walk Closed! Total Area: ${metrics?.breakdown.formattedAcreString || ''}`);

    // Fit map bounds to show complete walked plot
    const map = mapInstanceRef.current;
    if (map && vertices.length >= 3) {
      const bounds = vertices.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(vertices[0], vertices[0])
      );
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  };

  // Pause Walk
  const handlePauseWalk = () => {
    activeGeo.stopWatching();
    setWalkStatus('paused');
    setStatusNotice('GPS Walk paused. Tap "Resume" to continue perimeter tracking.');
  };

  // Resume Walk
  const handleResumeWalk = () => {
    handleStartWalk();
  };

  // Manual Mark Corner Point (surveyor taps when at an exact boundary stone)
  const handleMarkCornerPoint = () => {
    if (!gpsPos) {
      setStatusNotice('Waiting for GPS satellite lock. Please ensure location is enabled.');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }
    const currentPt: [number, number] = [
      Number(gpsPos.lng.toFixed(6)),
      Number(gpsPos.lat.toFixed(6)),
    ];
    lastRecordedPtRef.current = currentPt;
    setVertices((prev) => [...prev, currentPt]);
    setStatusNotice(`Boundary Corner #${vertices.length + 1} marked (±${(Math.round(gpsPos.accuracy * 10) / 10).toFixed(1)}m)`);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // High-Precision Stationary Averaging for Boundary Stone (Static Epochs)
  const handleStartCornerAveraging = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatusNotice('Geolocation is not supported by your browser or device.');
      return;
    }

    if (cornerWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(cornerWatchIdRef.current);
      cornerWatchIdRef.current = null;
    }

    cornerAccumulatorRef.current.reset();
    const TARGET = 10;
    cornerAccumulatorRef.current.setTargetCount(TARGET);
    setIsAveragingCorner(true);
    setAveragingProgress({ count: 0, target: TARGET, acc: gpsPos?.accuracy || 10 });
    setStatusNotice(`Hold device steady over boundary stone... Averaging ${TARGET} satellite epochs.`);

    let rawAttempts = 0;
    const MAX_RAW_ATTEMPTS = 30;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: rLat, longitude: rLng, accuracy: rAcc } = pos.coords;
        cornerAccumulatorRef.current.addSample(rLat, rLng, rAcc);
        rawAttempts++;
        const acceptedCount = cornerAccumulatorRef.current.getCount();

        // Drive progress purely from accepted sample count
        setAveragingProgress({
          count: acceptedCount,
          target: TARGET,
          acc: rAcc,
        });

        if (cornerAccumulatorRef.current.isComplete()) {
          if (cornerWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(cornerWatchIdRef.current);
            cornerWatchIdRef.current = null;
          }
          setIsAveragingCorner(false);
          const res = cornerAccumulatorRef.current.computeResult();
          if (res) {
            const calPt = GcpCalibrationManager.getInstance().apply(res.lat, res.lng);
            const pt: [number, number] = [Number(calPt.lng.toFixed(6)), Number(calPt.lat.toFixed(6))];
            setVertices((prev) => [...prev, pt]);
            lastRecordedPtRef.current = pt;
            setStatusNotice(
              `Boundary Stone #${vertices.length + 1} locked with Sub-Meter Precision (±${res.convergedAccuracy}m)!`
            );
            setTimeout(() => setStatusNotice(null), 4000);
          } else {
            setStatusNotice('GPS signal too noisy here — move to open sky and try again');
            setTimeout(() => setStatusNotice(null), 4000);
          }
        } else if (rawAttempts >= MAX_RAW_ATTEMPTS) {
          if (cornerWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(cornerWatchIdRef.current);
            cornerWatchIdRef.current = null;
          }
          setIsAveragingCorner(false);
          if (acceptedCount === 0) {
            setStatusNotice('GPS signal too noisy here — move to open sky and try again');
          } else {
            const res = cornerAccumulatorRef.current.computeResult();
            if (res) {
              const calPt = GcpCalibrationManager.getInstance().apply(res.lat, res.lng);
              const pt: [number, number] = [Number(calPt.lng.toFixed(6)), Number(calPt.lat.toFixed(6))];
              setVertices((prev) => [...prev, pt]);
              lastRecordedPtRef.current = pt;
              setStatusNotice(
                `Boundary Stone #${vertices.length + 1} locked with ${acceptedCount}/${TARGET} epochs (±${res.convergedAccuracy}m)!`
              );
            } else {
              setStatusNotice('GPS signal too noisy here — move to open sky and try again');
            }
          }
          setTimeout(() => setStatusNotice(null), 4000);
        }
      },
      (err) => {
        if (cornerWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(cornerWatchIdRef.current);
          cornerWatchIdRef.current = null;
        }
        setIsAveragingCorner(false);
        const acceptedCount = cornerAccumulatorRef.current.getCount();
        if (acceptedCount === 0) {
          setStatusNotice('GPS signal too noisy here — move to open sky and try again');
        } else {
          setStatusNotice(`Averaging interrupted: ${err.message}`);
        }
        setTimeout(() => setStatusNotice(null), 4000);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    cornerWatchIdRef.current = watchId;
  };

  // Re-capture last corner vertex with refined GPS fix
  const handleRecaptureLastCorner = () => {
    if (vertices.length === 0 || !gpsPos) return;
    if (gpsPos.accuracy > 15) {
      setStatusNotice(`Cannot re-capture: current GPS accuracy ±${Math.round(gpsPos.accuracy)}m exceeds 15m. Move to open sky.`);
      setTimeout(() => setStatusNotice(null), 3500);
      return;
    }
    const currentPt: [number, number] = [
      Number(gpsPos.lng.toFixed(6)),
      Number(gpsPos.lat.toFixed(6)),
    ];
    const updated = [...vertices];
    updated[updated.length - 1] = currentPt;
    lastRecordedPtRef.current = currentPt;
    setVertices(updated);
    setStatusNotice(`Corner #${vertices.length} re-captured with refined GPS (±${(Math.round(gpsPos.accuracy * 10) / 10).toFixed(1)}m)`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Reset Walk
  const handleResetWalk = () => {
    activeGeo.stopWatching();
    if (cornerWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(cornerWatchIdRef.current);
      cornerWatchIdRef.current = null;
    }
    if (surveyorMarkerRef.current) {
      surveyorMarkerRef.current.remove();
      surveyorMarkerRef.current = null;
    }
    setVertices([]);
    setWalkTrack([]);
    setWalkDistanceMeters(0);
    setMetrics(null);
    setWalkStatus('idle');
    setWalkSummaryOpen(false);
    lastRecordedPtRef.current = null;
    setStatusNotice('GPS Walk Area reset. Ready to start new walk.');
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // Add Center Point (+)
  const handleAddCenterPoint = () => {
    const newPt: [number, number] = [centerCoords.lng, centerCoords.lat];
    setVertices((prev) => [...prev, newPt]);
    setStatusNotice(`Point #${vertices.length + 1} added at crosshair`);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // Find and fly to user's real GPS position (Kalman filtered & GCP calibrated via activeGeo)
  const handleFindMyLocation = async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatusNotice('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsLocating(true);
    setStatusNotice('Acquiring high-accuracy GPS position...');

    try {
      const enhanced = await activeGeo.requestLocation(true);
      setIsLocating(false);

      if (!enhanced) {
        setStatusNotice('Could not acquire location. Please enable location permissions.');
        setTimeout(() => setStatusNotice(null), 4000);
        return;
      }

      const lng = Number(enhanced.longitude.toFixed(6));
      const lat = Number(enhanced.latitude.toFixed(6));
      const accuracy = enhanced.accuracy;

      setCenterCoords({ lng, lat });
      setUtmCoords(wgs84ToUtmAuto(lng, lat));
      setGpsPos({ lng, lat, accuracy });

      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo({ center: [lng, lat], zoom: 18, essential: true, speed: 1.5 });

        if (!myLocationMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'relative flex items-center justify-center';
          el.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-emerald-500/25 animate-ping absolute"></div>
            <div class="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-xl ring-4 ring-emerald-500/30 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          `;
          myLocationMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          myLocationMarkerRef.current.setLngLat([lng, lat]);
        }
      }

      setStatusNotice(`Location found: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E (±${accuracy.toFixed(1)}m precision)`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setIsLocating(false);
      setStatusNotice(`GPS: ${err?.message || 'Location error'}`);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  // Undo Last Point
  const handleUndo = () => {
    setVertices((prev) => prev.slice(0, -1));
  };

  // Clear All Points
  const handleClear = () => {
    handleResetWalk();
  };

  // File Overlay Importer (Shapefile, DXF, KML, GeoJSON)
  const handleFileOverlay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let geojson: GeoJSON.FeatureCollection | null = null;

      if (ext === 'zip' || ext === 'shp') {
        const buffer = await file.arrayBuffer();
        geojson = await parseShapefile(buffer);
      } else if (ext === 'kml') {
        const text = await file.text();
        geojson = parseKml(text);
      } else if (ext === 'dxf') {
        const text = await file.text();
        geojson = parseDxf(text, 'utm44n', [centerCoords.lng, centerCoords.lat]);
      } else if (ext === 'geojson' || ext === 'json') {
        const text = await file.text();
        geojson = JSON.parse(text);
      }

      if (geojson && mapInstanceRef.current) {
        const source = mapInstanceRef.current.getSource('imported-overlay') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(geojson);
          setOverlayLayers((prev) => [
            ...prev,
            { name: file.name, featureCount: geojson?.features?.length || 0 },
          ]);
          setStatusNotice(`Overlay "${file.name}" loaded (${geojson.features.length} features)`);
          setTimeout(() => setStatusNotice(null), 3000);
        }
      }
    } catch (err: any) {
      setStatusNotice('Error importing file: ' + err.message);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  // Save Polygon to Projects
  const handleSaveProject = async () => {
    if (vertices.length < 3 || !metrics) return;
    const name = projectNameInput.trim() || `GPS Walk Survey (${metrics.breakdown.formattedAcreString})`;

    const newProject: SurveyProject = {
      id: `proj-${Date.now()}`,
      userId: user?.uid || 'guest',
      name,
      state: selectedState,
      type: 'map_polygon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Walked via GPS Walk Area on ISRO Bhuvan 2.0 (${selectedState})`,
      polygon: {
        coordinates: vertices,
        areaSqm: metrics.areaSqm,
        areaCents: metrics.breakdown.cents,
        areaAcres: metrics.breakdown.acres,
        edgeLengths: metrics.edgeLengths.map((e) => ({
          index: e.index,
          lengthMeters: e.lengthMeters,
          lengthFeet: e.lengthFeet,
        })),
      },
    };

    await saveProject(newProject);
    if (onProjectSaved) onProjectSaved(newProject);
    setSaveModalOpen(false);
    setWalkSummaryOpen(false);
    setStatusNotice(`Project "${name}" saved to Saved Projects!`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Export KML file
  const handleDownloadKml = () => {
    if (vertices.length < 3) return;
    const kml = exportToKml(vertices, projectNameInput || 'GPS Walk Survey Parcel');
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gps-walk-survey-${Date.now()}.kml`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('KML file downloaded for Google Earth / GIS.');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Send to Area Calculator
  const handleSendToAreaCalculator = () => {
    if (vertices.length < 3 || !onSendToCalculator) return;
    const dims = extractFourSidedDimensions(vertices);
    if (dims) {
      onSendToCalculator(dims);
      setStatusNotice('Sent 4 boundary sides to Area Calculator!');
    } else {
      // Create approximate 4 sides from perimeter
      const avgSide = (metrics?.perimeterMeters || 100) / 4;
      onSendToCalculator({
        sideA: Number(avgSide.toFixed(2)),
        sideB: Number(avgSide.toFixed(2)),
        sideC: Number(avgSide.toFixed(2)),
        sideD: Number(avgSide.toFixed(2)),
        diagonal: Number((avgSide * 1.414).toFixed(2)),
      });
      setStatusNotice('Sent boundary sides to Area Calculator!');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-60px-64px)] overflow-hidden bg-slate-100">
      {/* Top HUD Bar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-2 rounded-xl shadow-md text-xs text-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 font-mono text-emerald-800">
            <Crosshair className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs">
              {centerCoords.lat.toFixed(6)}°N, {centerCoords.lng.toFixed(6)}°E
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-cyan-800 font-mono text-[11px] border-l border-slate-200 pl-3">
            <span className="text-slate-500 font-sans">UTM {utmCoords.zone}N:</span>
            <span>E {utmCoords.easting.toLocaleString()}m</span>
            <span>N {utmCoords.northing.toLocaleString()}m</span>
          </div>

          {/* Official ISRO Bhuvan 2D NRSC Link Badge */}
          <a
            href="https://bhuvanmaps.nrsc.gov.in/ngmaps?mode=Hybrid"
            target="_blank"
            rel="noopener noreferrer"
            title="Open official ISRO Bhuvan 2D NRSC portal (ngmaps Hybrid)"
            className="flex items-center gap-1 text-[10px] font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded-lg transition shadow-xs"
          >
            <span>Bhuvan 2D NRSC</span>
            <ExternalLink className="w-3 h-3 text-cyan-600" />
          </a>
        </div>

        {/* Status notice */}
        {statusNotice && (
          <div className="text-[11px] font-bold text-emerald-800 animate-pulse bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
            {statusNotice}
          </div>
        )}

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5">
          {/* Cadastral Boundaries (Survey Numbers) Toggle */}
          <button
            type="button"
            onClick={handleToggleCadastral}
            title={showCadastral ? 'Cadastral Boundaries & Survey Numbers visible. Tap to toggle.' : 'Show Cadastral Boundaries & Survey Numbers'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition shadow-xs ${
              showCadastral
                ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-fuchsia-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cadastral / FMB</span>
            <span className="sm:hidden">FMB</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              showCadastral ? 'bg-fuchsia-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {showCadastral ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Toggle GPS WALK AREA Button */}
          <button
            type="button"
            onClick={() => setWalkModeActive(!walkModeActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition shadow-xs ${
              walkModeActive
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Footprints className={`w-3.5 h-3.5 ${walkStatus === 'walking' ? 'animate-bounce text-emerald-200' : ''}`} />
            <span>GPS WALK AREA</span>
            {walkStatus === 'walking' && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            )}
          </button>

          {/* Basemap Switcher Icon */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBasemapMenu(!showBasemapMenu)}
              title={`Basemap: ${BASEMAP_LIST.find((b) => b.id === activeBasemap)?.name} (Tap to switch)`}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-700 hover:text-emerald-700 transition shadow-xs"
              aria-label="Switch Basemap"
            >
              <Layers className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Basemap Dropdown menu */}
            {showBasemapMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30 space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100 flex items-center justify-between">
                  <span>Basemap Layer</span>
                  <a
                    href="https://bhuvanmaps.nrsc.gov.in/ngmaps?mode=Hybrid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-cyan-600 hover:underline flex items-center gap-0.5"
                  >
                    Bhuvan Link <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                {BASEMAP_LIST.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSwitchBasemap(b.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition ${
                      activeBasemap === b.id
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {b.badge}
                    </span>
                  </button>
                ))}

                {/* Cadastral Boundary Layer Toggle */}
                <div className="pt-2 pb-1 px-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Grid3X3 className="w-3.5 h-3.5 text-fuchsia-600" />
                    <span>Cadastral Survey Numbers</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleCadastral}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
                      showCadastral ? 'bg-fuchsia-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {showCadastral ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Target Reticle (+) in exact viewport center (only when not actively walking) */}
      {!walkModeActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse" />
            <div className="absolute w-6 h-[2px] bg-emerald-400 rounded-full" />
            <div className="absolute h-6 w-[2px] bg-emerald-400 rounded-full" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white ring-2 ring-emerald-500" />
          </div>
        </div>
      )}

      {/* Floating Action Controls (Right side) */}
      <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
        {/* Toggle GPS WALK AREA mode */}
        <button
          type="button"
          onClick={() => setWalkModeActive(!walkModeActive)}
          title={walkModeActive ? 'Close GPS Walk Area' : 'Open GPS Walk Area'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md transition-all ${
            walkModeActive
              ? 'bg-emerald-600 border-emerald-500 text-white font-bold scale-105 shadow-emerald-500/20'
              : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Footprints className="w-5 h-5" />
        </button>
        {/* Small Find My Location button in floating panel */}
        <button
          type="button"
          onClick={handleFindMyLocation}
          disabled={isLocating}
          title="Find My Location (GPS)"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center shadow-md transition disabled:opacity-50"
        >
          <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>

        {/* GPS Engine / Signal Status */}
        {isSimple ? (
          <button
            type="button"
            onClick={() => setGpsAccuracyModalOpen(true)}
            title={`GPS Signal: ${getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos)} (Tap to view details)`}
            className={`h-10 px-2.5 rounded-xl border flex items-center gap-1.5 shadow-md transition font-bold text-xs ${
              getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos) === 'Good'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos) === 'OK'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos) === 'Poor'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-white/95 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos) === 'Good'
                  ? 'bg-emerald-500 animate-pulse'
                  : getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos) === 'OK'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-[11px]">{getSimpleGpsRating(gpsPos?.accuracy, !!gpsPos)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setGpsAccuracyModalOpen(true)}
            title="High-Precision GPS Engine (Sub-Meter Kalman Filter, Static Epoch Averaging, GCP Calibration)"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-300 text-emerald-800 hover:border-emerald-500 hover:shadow-emerald-500/20 flex items-center justify-center shadow-md transition group"
          >
            <Sparkles className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Toggle Cadastral Boundaries & Survey Numbers */}
        <button
          type="button"
          onClick={handleToggleCadastral}
          title={showCadastral ? 'Cadastral Survey Numbers: Active (Tap to hide)' : 'Show Cadastral Survey Numbers'}
          className={`w-10 h-10 rounded-xl border shadow-md flex items-center justify-center transition ${
            showCadastral
              ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-fuchsia-500/20'
              : 'bg-white/95 border-slate-200 text-slate-700 hover:text-fuchsia-600 hover:bg-slate-50'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>

        {/* Survey Point & Station Manager */}
        <button
          type="button"
          onClick={() => setIsPointManagerOpen(true)}
          title="Survey Point & Station Manager (Capture WGS84/UTM stations, Export CSV/GeoJSON)"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-teal-700 hover:text-teal-800 hover:bg-teal-50 flex items-center justify-center shadow-md transition"
        >
          <MapPin className="w-5 h-5" />
        </button>

        {/* Undo last point */}
        <button
          type="button"
          disabled={vertices.length === 0}
          onClick={handleUndo}
          title="Undo Last Boundary Vertex"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-slate-900 disabled:opacity-40 flex items-center justify-center shadow-md transition"
        >
          <Undo2 className="w-5 h-5" />
        </button>

        {/* Clear all */}
        <button
          type="button"
          disabled={vertices.length === 0}
          onClick={handleClear}
          title="Clear Boundary Vertices"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-rose-600 disabled:opacity-40 flex items-center justify-center shadow-md transition"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* File Overlay Upload */}
        <label
          title="Import Shapefile / DXF / KML Overlay"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:text-emerald-700 cursor-pointer flex items-center justify-center shadow-md transition"
        >
          <Upload className="w-5 h-5" />
          <input
            type="file"
            accept=".zip,.shp,.dxf,.kml,.geojson,.json"
            onChange={handleFileOverlay}
            className="hidden"
          />
        </label>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* REDESIGNED: DEDICATED GPS WALK AREA DOCKED CONTROLLER                   */}
      {/* ---------------------------------------------------------------------- */}
      {walkModeActive ? (
        <div className="absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-20 max-w-xl mx-auto flex flex-col gap-2">
          {/* Main GPS WALK AREA Floating Card */}
          <div className="bg-white/95 backdrop-blur-md border-2 border-emerald-500 rounded-2xl p-3.5 shadow-2xl text-slate-900 space-y-3">
            {/* Header: Title, Status Badge & GPS Accuracy */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Footprints className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 leading-none">
                    <span>GPS WALK AREA</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        walkStatus === 'walking'
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : walkStatus === 'completed'
                          ? 'bg-teal-600 text-white'
                          : walkStatus === 'paused'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {walkStatus === 'walking'
                        ? 'WALKING ACTIVE'
                        : walkStatus === 'completed'
                        ? 'WALK COMPLETED'
                        : walkStatus === 'paused'
                        ? 'PAUSED'
                        : 'READY'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Walk around your land boundary. Measures area in real-time.
                  </p>
                </div>
              </div>

              {/* Accuracy Pill - Interactive to open High Precision GPS Engine or Simple Signal */}
              <div className="flex items-center gap-1.5">
                {gpsPos ? (
                  <button
                    type="button"
                    onClick={() => setGpsAccuracyModalOpen(true)}
                    title={
                      isSimple
                        ? `GPS Signal: ${getSimpleGpsRating(gpsPos.accuracy, true)} (Tap for details)`
                        : 'Open High-Precision GPS Engine (Kalman Filter & Benchmark Calibration)'
                    }
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 hover:brightness-95 transition cursor-pointer ${
                      getSimpleGpsRating(gpsPos.accuracy, true) === 'Good'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : getSimpleGpsRating(gpsPos.accuracy, true) === 'OK'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    {isSimple ? (
                      <>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            getSimpleGpsRating(gpsPos.accuracy, true) === 'Good'
                              ? 'bg-emerald-500 animate-pulse'
                              : getSimpleGpsRating(gpsPos.accuracy, true) === 'OK'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span>GPS: {getSimpleGpsRating(gpsPos.accuracy, true)}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>±{gpsPos.accuracy.toFixed(1)}m GPS</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    Awaiting GPS Lock
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setWalkModeActive(false)}
                  title="Close Walk Mode"
                  className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real-time stats during walking or after walk */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center font-mono">
              <div>
                <span className="text-[9px] uppercase text-slate-500 font-sans block">Enclosed Area</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 block truncate">
                  {metrics ? metrics.breakdown.formattedAcreString : '0.00 Ac'}
                </span>
                <span className="text-[9px] text-slate-400 block truncate">
                  {metrics ? `${metrics.breakdown.sqyd.toLocaleString()} Sq Yd` : '0 Sq Yd'}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 font-sans block">Distance Walked</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                  {walkDistanceMeters > 0
                    ? `${walkDistanceMeters} m`
                    : metrics
                    ? `${metrics.perimeterMeters} m`
                    : '0 m'}
                </span>
                <span className="text-[9px] text-slate-400 block truncate">
                  {Math.round((walkDistanceMeters || metrics?.perimeterMeters || 0) * 3.28084)} ft
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 font-sans block">Corner Vertices</span>
                <span className="text-xs sm:text-sm font-black text-cyan-700 block">
                  {vertices.length} Points
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {vertices.length >= 3 ? 'Polygon Closed' : 'Need >= 3'}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons: START, STOP, PAUSE, MARK CORNER, AVERAGE STONE */}
            <div className="space-y-2">
              {isAveragingCorner && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      <span>Stationary Boundary Stone Averaging</span>
                    </span>
                    <span className="font-mono text-teal-700 font-bold">
                      {averagingProgress.count} / {averagingProgress.target} epochs ({Math.round((averagingProgress.count / averagingProgress.target) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-teal-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (averagingProgress.count / averagingProgress.target) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-teal-600">
                    <span>Multipath filtered (&le; 25m accepted)</span>
                    <span>Accuracy: &plusmn;{(Math.round(averagingProgress.acc * 10) / 10).toFixed(1)}m</span>
                  </div>
                </div>
              )}

              {walkStatus === 'idle' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleStartWalk}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>START WALKING BOUNDARY</span>
                  </button>
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRecord}
                        onChange={(e) => setAutoRecord(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Auto-trace boundary (drops point every 4m)</span>
                    </label>
                  </div>
                </div>
              )}

              {walkStatus === 'walking' && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {/* Mark Corner Point button */}
                  <button
                    type="button"
                    onClick={handleMarkCornerPoint}
                    className="bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs py-2.5 px-1.5 rounded-xl shadow flex items-center justify-center gap-1 transition"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Corner</span>
                  </button>

                  {/* Average Corner Stone button (Static Epoch Integration) */}
                  <button
                    type="button"
                    onClick={handleStartCornerAveraging}
                    disabled={isAveragingCorner}
                    title="Perform 10-epoch stationary averaging on this boundary stone"
                    className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-xs py-2.5 px-1.5 rounded-xl shadow flex items-center justify-center gap-1 transition disabled:opacity-50"
                  >
                    <Target className={`w-3.5 h-3.5 ${isAveragingCorner ? 'animate-spin text-teal-200' : ''}`} />
                    <span>{isAveragingCorner ? `Averaging (${averagingProgress.count}/10)` : 'Avg Stone'}</span>
                  </button>

                  {/* Re-capture Last Corner button (Part 1, Item 5) */}
                  <button
                    type="button"
                    disabled={vertices.length === 0}
                    onClick={handleRecaptureLastCorner}
                    title="Re-sample last corner with current refined GPS fix"
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-1.5 rounded-xl shadow flex items-center justify-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-sample</span>
                  </button>

                  {/* Pause button */}
                  <button
                    type="button"
                    onClick={handlePauseWalk}
                    className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-xs py-2.5 px-1.5 rounded-xl shadow flex items-center justify-center gap-1 transition"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>

                  {/* Stop & Close Walk */}
                  <button
                    type="button"
                    onClick={handleStopAndCloseWalk}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2.5 px-1.5 rounded-xl shadow flex items-center justify-center gap-1 transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop & Close</span>
                  </button>
                </div>
              )}

              {walkStatus === 'paused' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleResumeWalk}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Walking</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAndCloseWalk}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Finish & Close Area</span>
                  </button>
                </div>
              )}

              {walkStatus === 'completed' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkSummaryOpen(true)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View Area Results</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetWalk}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Walk</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Floating Center Point Drop Bar (When Walk Mode is OFF) */
        <div className="absolute bottom-4 left-3 right-3 z-20 flex flex-col gap-2 max-w-lg mx-auto">
          {metrics && (
            <div className="bg-white/95 backdrop-blur-md border border-emerald-300 rounded-2xl p-3 shadow-lg flex items-center justify-between text-slate-900">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                  Live Geodesic Extent ({vertices.length} Vertices)
                </span>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {metrics.breakdown.formattedAcreString}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {metrics.breakdown.sqyd.toLocaleString()} Sq. Yds • {metrics.perimeterMeters}m perimeter
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProjectNameInput(`Survey Parcel - ${metrics.breakdown.formattedAcreString}`);
                  setSaveModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Save</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center">
            {/* Add Corner button */}
            <button
              type="button"
              onClick={handleAddCenterPoint}
              title={`Add Point at Reticle Crosshair (Vertex #${vertices.length + 1})`}
              className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 hover:text-emerald-700 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Add Corner #{vertices.length + 1}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* WALK COMPLETED RESULTS SUMMARY MODAL                                   */}
      {/* ---------------------------------------------------------------------- */}
      {walkSummaryOpen && metrics && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Perimeter Walk Completed!</h3>
                  <p className="text-xs text-slate-500">Certified Geodesic Polygon Area</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalkSummaryOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extent Breakdown */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Total Enclosed Land Area
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                {metrics.breakdown.formattedAcreString}
              </div>
              <div className="text-xs text-slate-600 font-mono flex items-center justify-center gap-3 pt-1">
                <span>{metrics.breakdown.sqyd.toLocaleString()} Sq Yards</span>
                <span>•</span>
                <span>{Math.round(metrics.areaSqm).toLocaleString()} Sq Meters</span>
              </div>
            </div>

            {/* Perimeter and Corner details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-sans block text-[10px] uppercase">Perimeter</span>
                <span className="font-bold text-slate-800">{metrics.perimeterMeters} m</span>
                <span className="text-slate-400 text-[10px] block">
                  ({Math.round(metrics.perimeterMeters * 3.28084)} ft)
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[10px] uppercase">Corners Logged</span>
                <span className="font-bold text-slate-800">{vertices.length} Vertices</span>
                <span className="text-emerald-700 text-[10px] block font-sans">Closed Ring</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProjectNameInput(`GPS Walk Parcel - ${metrics.breakdown.formattedAcreString}`);
                    setSaveModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Save to Projects</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToAreaCalculator}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Send to Area Calc</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadKml}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download KML</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetWalk}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start New Walk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Project Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-emerald-600" />
                <span>Save Survey Project</span>
              </h3>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project / Parcel Title
              </label>
              <input
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. Field Survey - North Plot"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Extent:</span>
                <span className="text-emerald-700 font-bold">{metrics?.breakdown.formattedAcreString}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Perimeter:</span>
                <span>{metrics?.perimeterMeters} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Jurisdiction:</span>
                <span>{selectedState}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Precision GPS Engine Modal */}
      <GpsAccuracyModal
        isOpen={gpsAccuracyModalOpen}
        onClose={() => setGpsAccuracyModalOpen(false)}
        geo={activeGeo}
        onAddPointToMap={(pt) => {
          setVertices((prev) => [...prev, pt]);
          setStatusNotice(`High-precision vertex #${vertices.length + 1} added to plot!`);
          setTimeout(() => setStatusNotice(null), 3000);
        }}
      />

      {/* Survey Point & Station Manager Modal */}
      <SurveyPointManagerModal
        isOpen={isPointManagerOpen}
        onClose={() => setIsPointManagerOpen(false)}
        currentGpsLat={gpsPos?.lat}
        currentGpsLng={gpsPos?.lng}
        currentGpsAccuracy={gpsPos?.accuracy}
        onPointsUpdated={(updated) => {
          setStatusNotice(`Survey stations updated (${updated.length} stations active)`);
          setTimeout(() => setStatusNotice(null), 3000);
        }}
      />
    </div>
  );
};
