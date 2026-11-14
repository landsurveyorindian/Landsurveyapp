import React, { useEffect, useRef, useState, useCallback } from 'react';
import { maplibregl } from '../../utils/maplibreSetup';
import * as turf from '@turf/turf';
import {
  wgs84ToUtmAuto,
  calculatePolygonMetrics,
  PolygonMetrics,
  parseShapefile,
  parseDxf,
  parseKml,
  exportToDxf,
  exportToKml,
  exportFeatureCollectionToDxf,
  exportFeatureCollectionToKml,
  FourSidedDimensions,
  extractFourSidedDimensions,
  DxfCrsMode,
} from '../../utils/gis';
import { saveProject, SurveyProject } from '../../services/projectsService';
import { useAuth } from '../../firebase/AuthContext';
import {
  Crosshair,
  Navigation2,
  Plus,
  Layers,
  Upload,
  Download,
  BookmarkCheck,
  Eye,
  EyeOff,
  FolderOpen,
  Send,
  Sliders,
  Check,
  ChevronDown,
  Trash2,
  X,
  FileCode,
  TableProperties,
  Grid3X3,
  Sparkles,
} from 'lucide-react';
import { GpsKalmanFilter, GcpCalibrationManager } from '../../utils/gpsFilter';

export type BasemapId = 'google_hybrid' | 'bhuvan' | 'google_satellite' | 'esri' | 'osm';

interface BasemapDef {
  id: BasemapId;
  name: string;
  badge: string;
  tiles: string[];
}

const BASEMAP_LIST: BasemapDef[] = [
  {
    id: 'google_hybrid',
    name: 'Google Hybrid',
    badge: 'Roads + Sat',
    tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
  },
  {
    id: 'bhuvan',
    name: 'ISRO Bhuvan WMS',
    badge: 'Official NRSC',
    tiles: ['bhuvan://{z}/{x}/{y}'],
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

interface CadGisTabProps {
  selectedState: string;
  onProjectSaved?: (project: SurveyProject) => void;
  onSendToCalculator?: (dimensions: FourSidedDimensions) => void;
}

interface GisLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  color: string;
  opacity: number;
  data: GeoJSON.FeatureCollection;
}

export const CadGisTab: React.FC<CadGisTabProps> = ({
  selectedState,
  onProjectSaved,
  onSendToCalculator,
}) => {
  const { user } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const [centerCoords, setCenterCoords] = useState<{ lng: number; lat: number }>({
    lng: 80.6480,
    lat: 16.5062,
  });
  const [utmCoords, setUtmCoords] = useState<{ easting: number; northing: number; zone: number }>({
    easting: 462371,
    northing: 1825120,
    zone: 44,
  });

  const [activeBasemap, setActiveBasemap] = useState<BasemapId>('google_hybrid');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);

  // Vertices for polygon measurement
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [metrics, setMetrics] = useState<PolygonMetrics | null>(null);

  // Layers list
  const [layers, setLayers] = useState<GisLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);

  // Selected Feature for Attribute Inspector
  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, any>;
    geometry: any;
    layerName: string;
  } | null>(null);

  // DXF Import Modal
  const [dxfModalOpen, setDxfModalOpen] = useState(false);
  const [pendingDxfText, setPendingDxfText] = useState<string>('');
  const [dxfCrsMode, setDxfCrsMode] = useState<DxfCrsMode>('utm_auto');
  const [dxfFileName, setDxfFileName] = useState<string>('survey_drawing.dxf');

  // Export dropdown
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // GPS state
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPos, setGpsPos] = useState<{ lng: number; lat: number; accuracy: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const gpsMarkerRef = useRef<maplibregl.Marker | null>(null);
  const cadKalmanRef = useRef<GpsKalmanFilter>(new GpsKalmanFilter(2.5));

  const markersRef = useRef<maplibregl.Marker[]>([]);
  const bhuvanModeRef = useRef<'proxy' | 'direct' | 'esri_fallback'>('proxy');

  const [showCadastral, setShowCadastral] = useState<boolean>(true);
  const showCadastralRef = useRef<boolean>(true);

  const toggleCadastral = () => {
    const next = !showCadastral;
    setShowCadastral(next);
    showCadastralRef.current = next;
    const map = mapInstanceRef.current;
    if (map && map.getLayer('cadastral-layer')) {
      map.setLayoutProperty('cadastral-layer', 'visibility', next ? 'visible' : 'none');
    }
  };

  const getTilesForBasemap = useCallback((id: BasemapId): string[] => {
    if (id === 'bhuvan') {
      if (bhuvanModeRef.current === 'direct') {
        return [
          'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetMap&layers=india3&styles=&format=image/jpeg&transparent=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256',
        ];
      }
      if (bhuvanModeRef.current === 'esri_fallback') {
        return [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ];
      }
      return ['bhuvan://{z}/{x}/{y}'];
    }
    const def = BASEMAP_LIST.find((b) => b.id === id);
    return def ? def.tiles : ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'];
  }, []);

  // Create basemap style
  const getStyleForBasemap = useCallback((id: BasemapId): maplibregl.StyleSpecification => {
    return {
      version: 8,
      sources: {
        'cad-basemap': {
          type: 'raster',
          tiles: getTilesForBasemap(id),
          tileSize: 256,
          attribution: 'Basemap',
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
          id: 'cad-basemap-layer',
          type: 'raster',
          source: 'cad-basemap',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-fade-duration': 0,
          },
        },
        {
          id: 'cadastral-layer',
          type: 'raster',
          source: 'cadastral-source',
          minzoom: 11,
          maxzoom: 22,
          layout: {
            visibility: showCadastralRef.current ? 'visible' : 'none',
          },
          paint: {
            'raster-opacity': 1.0,
            'raster-fade-duration': 0,
          },
        },
      ],
    };
  }, [getTilesForBasemap]);

  // Switch basemap handler
  const handleSwitchBasemap = (id: BasemapId) => {
    setActiveBasemap(id);
    setShowBasemapMenu(false);
    if (id === 'bhuvan') {
      bhuvanModeRef.current = 'proxy';
    }
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setStyle(getStyleForBasemap(id), {
      transformStyle: (previousStyle, nextStyle) => ({
        ...nextStyle,
        sources: {
          ...nextStyle.sources,
          ...(previousStyle?.sources || {}),
        },
        layers: [
          ...(nextStyle.layers || []),
          ...(previousStyle?.layers?.filter((l) => l.id !== 'cad-basemap-layer' && l.id !== 'cadastral-layer') || []),
        ],
      }),
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getStyleForBasemap(activeBasemap),
      center: [centerCoords.lng, centerCoords.lat],
      zoom: 16,
      maxZoom: 22,
      attributionControl: false,
      transformRequest: (url) => {
        if (url.includes('bhuvan-vec1.nrsc.gov.in') && window.location.hostname === 'localhost' && !url.includes('bbox={bbox-epsg-3857}')) {
          const match = url.match(/bbox=([^&]+)/);
          const bbox = match ? match[1] : '';
          return {
            url: `/api/bhuvan-proxy?bbox=${bbox}&width=256&height=256`,
          };
        }
        return { url };
      },
    });

    // Tile error fallback listener
    map.on('error', (e) => {
      if (activeBasemap === 'bhuvan') {
        const errorMsg = String((e as any)?.error?.message || (e as any)?.error || '');
        const errorUrl = String((e as any)?.error?.url || (e as any)?.sourceId || '');
        if (errorMsg.includes('404') || errorMsg.includes('Failed to fetch') || errorUrl.includes('bhuvan') || (e as any)?.dataType === 'tile') {
          if (bhuvanModeRef.current === 'proxy') {
            bhuvanModeRef.current = 'direct';
            setStatusMessage('Connected to direct ISRO Bhuvan WMS');
            setTimeout(() => setStatusMessage(null), 3500);
            const source = map.getSource('cad-basemap') as any;
            if (source && source.setTiles) {
              source.setTiles(getTilesForBasemap('bhuvan'));
            }
          } else if (bhuvanModeRef.current === 'direct') {
            bhuvanModeRef.current = 'esri_fallback';
            setStatusMessage('Direct Bhuvan unreachable: Activated Esri Satellite');
            setTimeout(() => setStatusMessage(null), 4000);
            const source = map.getSource('cad-basemap') as any;
            if (source && source.setTiles) {
              source.setTiles(getTilesForBasemap('bhuvan'));
            }
          }
        }
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('move', () => {
      const c = map.getCenter();
      const lng = Number(c.lng.toFixed(6));
      const lat = Number(c.lat.toFixed(6));
      setCenterCoords({ lng, lat });
      setUtmCoords(wgs84ToUtmAuto(lng, lat));
    });

    map.on('load', () => {
      // User drawn polygon source
      map.addSource('cad-drawn-poly', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'cad-drawn-poly-fill',
        type: 'fill',
        source: 'cad-drawn-poly',
        paint: { 'fill-color': '#10B981', 'fill-opacity': 0.35 },
      });

      map.addLayer({
        id: 'cad-drawn-poly-line',
        type: 'line',
        source: 'cad-drawn-poly',
        paint: { 'line-color': '#10B981', 'line-width': 2.5 },
      });
    });

    mapInstanceRef.current = map;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
        gpsMarkerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [getStyleForBasemap]);

  // Update drawn vertices
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (vertices.length >= 3) {
      setMetrics(calculatePolygonMetrics(vertices));
    } else {
      setMetrics(null);
    }

    vertices.forEach((v, idx) => {
      const el = document.createElement('div');
      el.className =
        'w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 text-[9px] font-black shadow cursor-grab';
      el.innerText = String(idx + 1);

      const m = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(v).addTo(map);

      m.on('dragend', () => {
        const pos = m.getLngLat();
        setVertices((prev) => {
          const next = [...prev];
          next[idx] = [Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))];
          return next;
        });
      });

      markersRef.current.push(m);
    });

    const source = map.getSource('cad-drawn-poly') as maplibregl.GeoJSONSource;
    if (source) {
      if (vertices.length >= 3) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: [[...vertices, vertices[0]]] },
            },
          ],
        });
      } else if (vertices.length === 2) {
        source.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: vertices } }],
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [vertices]);

  // Sync Layers to MapLibre Map
  const syncLayerToMap = (layer: GisLayer) => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = `src-${layer.id}`;
    const fillLayerId = `fill-${layer.id}`;
    const lineLayerId = `line-${layer.id}`;

    let source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (!source) {
      map.addSource(sourceId, { type: 'geojson', data: layer.data });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': layer.color,
          'fill-opacity': layer.visible ? layer.opacity : 0,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': layer.color,
          'line-width': 2,
          'line-opacity': layer.visible ? 1 : 0,
        },
      });

      // Click to open Attribute Inspector
      map.on('click', fillLayerId, (e) => {
        if (e.features && e.features[0]) {
          const f = e.features[0];
          setSelectedFeature({
            properties: f.properties || {},
            geometry: f.geometry,
            layerName: layer.name,
          });
        }
      });
    } else {
      source.setData(layer.data);
      if (map.getLayer(fillLayerId)) {
        map.setPaintProperty(fillLayerId, 'fill-color', layer.color);
        map.setPaintProperty(fillLayerId, 'fill-opacity', layer.visible ? layer.opacity : 0);
      }
      if (map.getLayer(lineLayerId)) {
        map.setPaintProperty(lineLayerId, 'line-color', layer.color);
        map.setPaintProperty(lineLayerId, 'line-opacity', layer.visible ? 1 : 0);
      }
    }
  };

  // Add Layer Helper
  const addGisLayer = (name: string, data: GeoJSON.FeatureCollection) => {
    const layerId = `layer-${Date.now()}`;
    const colors = ['#38BDF8', '#F59E0B', '#EC4899', '#A855F7', '#10B981'];
    const chosenColor = colors[layers.length % colors.length];

    const newLayer: GisLayer = {
      id: layerId,
      name,
      type: 'Vector/CAD',
      visible: true,
      color: chosenColor,
      opacity: 0.35,
      data,
    };

    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(layerId);
    setLayerDrawerOpen(true);

    setTimeout(() => {
      syncLayerToMap(newLayer);
      zoomToGeoJson(data);
    }, 100);

    setStatusMessage(`Loaded "${name}" (${data.features.length} entities)`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const zoomToGeoJson = (data: GeoJSON.FeatureCollection) => {
    const map = mapInstanceRef.current;
    if (!map || !data.features || data.features.length === 0) return;
    try {
      const bbox = turf.bbox(data);
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, maxZoom: 19 });
    } catch (e) {
      console.warn('Could not zoom to layer bounds', e);
    }
  };

  // Universal File Upload Handler
  const handleUniversalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'zip' || ext === 'shp') {
        const buffer = await file.arrayBuffer();
        const geojson = await parseShapefile(buffer);
        addGisLayer(file.name, geojson);
      } else if (ext === 'kml') {
        const text = await file.text();
        const geojson = parseKml(text);
        addGisLayer(file.name, geojson);
      } else if (ext === 'geojson' || ext === 'json') {
        const text = await file.text();
        const geojson = JSON.parse(text);
        addGisLayer(file.name, geojson);
      } else if (ext === 'dxf') {
        const text = await file.text();
        setPendingDxfText(text);
        setDxfFileName(file.name);
        setDxfModalOpen(true);
      }
    } catch (err: any) {
      setStatusMessage(`Failed to parse ${file.name}: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Confirm DXF import with chosen CRS
  const confirmDxfImport = () => {
    if (!pendingDxfText) return;
    try {
      const geojson = parseDxf(pendingDxfText, dxfCrsMode, [centerCoords.lng, centerCoords.lat]);
      addGisLayer(dxfFileName, geojson);
      setDxfModalOpen(false);
      setPendingDxfText('');
      const warnings = (geojson as any).warnings || [];
      if (warnings.length > 0) {
        setStatusMessage(warnings[0]);
        setTimeout(() => setStatusMessage(null), 6000);
      } else {
        setStatusMessage(`Successfully imported ${dxfFileName} (${geojson.features.length} features)`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      setStatusMessage(`DXF Parsing failed: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Toggle Layer Visibility
  const toggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          const updated = { ...l, visible: !l.visible };
          syncLayerToMap(updated);
          return updated;
        }
        return l;
      })
    );
  };

  // Send selected polygon coordinates to Calculator Tab
  const handleSendPolygonToCalc = () => {
    if (!selectedFeature) return;
    try {
      let coords: [number, number][] = [];
      if (selectedFeature.geometry.type === 'Polygon') {
        coords = selectedFeature.geometry.coordinates[0];
      } else if (selectedFeature.geometry.type === 'MultiPolygon') {
        coords = selectedFeature.geometry.coordinates[0][0];
      }

      if (coords.length >= 4 && onSendToCalculator) {
        const dims = extractFourSidedDimensions(coords);
        if (dims) {
          onSendToCalculator(dims);
          setSelectedFeature(null);
          setStatusMessage(`Dimensions sent to Calculator: A=${dims.sideA}m, B=${dims.sideB}m, C=${dims.sideC}m, D=${dims.sideD}m, Diag=${dims.diagonal}m`);
          setTimeout(() => setStatusMessage(null), 4000);
          return;
        }
      }
      setStatusMessage('Selected polygon must have at least 4 corner points to extract side dimensions.');
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (e: any) {
      setStatusMessage('Could not extract polygon boundary coordinates: ' + e?.message);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  const getActiveLayer = () => {
    return layers.find((l) => l.id === activeLayerId) || layers[layers.length - 1] || null;
  };

  // Export handlers (exports active layer if present, otherwise drawn vertices)
  const handleExportGeoJson = () => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      downloadBlob(
        JSON.stringify(activeLayer.data, null, 2),
        `${activeLayer.name.replace(/\.[^/.]+$/, '')}_export.geojson`,
        'application/json'
      );
      return;
    }
    if (vertices.length >= 3) {
      const closed = [...vertices, vertices[0]];
      const gj: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              title: 'Sthal Measure Survey Boundary',
              areaSqm: metrics?.areaSqm,
              areaCents: metrics?.breakdown.cents,
              state: selectedState,
            },
            geometry: { type: 'Polygon', coordinates: [closed] },
          },
        ],
      };
      downloadBlob(JSON.stringify(gj, null, 2), 'survey_boundary.geojson', 'application/json');
    }
  };

  const handleExportKml = () => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      const kml = exportFeatureCollectionToKml(activeLayer.data, activeLayer.name);
      downloadBlob(kml, `${activeLayer.name.replace(/\.[^/.]+$/, '')}_export.kml`, 'application/vnd.google-earth.kml+xml');
      return;
    }
    if (vertices.length >= 3) {
      const closed = [...vertices, vertices[0]];
      const kml = exportToKml(closed, 'Sthal Measure Cadastral Boundary');
      downloadBlob(kml, 'survey_boundary.kml', 'application/vnd.google-earth.kml+xml');
    }
  };

  const handleExportDxf = () => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      const dxf = exportFeatureCollectionToDxf(activeLayer.data, 'CAD_LAYER');
      downloadBlob(dxf, `${activeLayer.name.replace(/\.[^/.]+$/, '')}_export.dxf`, 'application/dxf');
      return;
    }
    if (vertices.length >= 3) {
      const closed = [...vertices, vertices[0]];
      const dxf = exportToDxf(closed, 'STHAL_PARCEL');
      downloadBlob(dxf, 'survey_boundary.dxf', 'application/dxf');
    }
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // Live Device Geolocation Handler
  const handleShowLiveLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatusMessage('Geolocation is not supported by your browser');
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    setGpsLoading(true);
    setStatusMessage('Acquiring high-accuracy device live location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rawLat = position.coords.latitude;
        const rawLng = position.coords.longitude;
        const rawAcc = position.coords.accuracy;

        const kFix = cadKalmanRef.current.update(rawLat, rawLng, rawAcc);
        const cal = GcpCalibrationManager.getInstance().apply(kFix.lat, kFix.lng);
        const lng = Number(cal.lng.toFixed(6));
        const lat = Number(cal.lat.toFixed(6));
        const accuracy = Math.round(kFix.estimatedAccuracy);

        setGpsPos({ lng, lat, accuracy });
        setGpsActive(true);
        setGpsLoading(false);
        setCenterCoords({ lng, lat });
        setUtmCoords(wgs84ToUtmAuto(lng, lat));

        const map = mapInstanceRef.current;
        if (map) {
          // Smoothly fly to live device coordinates
          map.flyTo({
            center: [lng, lat],
            zoom: 18,
            essential: true,
            speed: 1.4,
          });

          // Show pulsing live device pin on map
          if (!gpsMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'relative flex items-center justify-center cursor-pointer';
            el.innerHTML = `
              <div class="w-12 h-12 rounded-full bg-cyan-400/30 animate-ping absolute pointer-events-none"></div>
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/60 absolute pointer-events-none"></div>
              <div class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-xl flex items-center justify-center z-10">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            `;
            const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(
              `<div style="font-family: sans-serif; font-size: 11px; padding: 4px; color: #0f172a; font-weight: bold;">
                <div style="color: #0284c7; margin-bottom: 2px;">📍 High-Precision Live Location</div>
                <div>Lat: ${lat.toFixed(6)}°</div>
                <div>Lng: ${lng.toFixed(6)}°</div>
                <div style="font-size: 9px; color: #64748b;">Precision: ±${accuracy}m (Kalman Filtered)</div>
              </div>`
            );
            gpsMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .setPopup(popup)
              .addTo(map);
          } else {
            gpsMarkerRef.current.setLngLat([lng, lat]);
            gpsMarkerRef.current.getPopup()?.setHTML(
              `<div style="font-family: sans-serif; font-size: 11px; padding: 4px; color: #0f172a; font-weight: bold;">
                <div style="color: #0284c7; margin-bottom: 2px;">📍 High-Precision Live Location</div>
                <div>Lat: ${lat.toFixed(6)}°</div>
                <div>Lng: ${lng.toFixed(6)}°</div>
                <div style="font-size: 9px; color: #64748b;">Precision: ±${accuracy}m (Kalman Filtered)</div>
              </div>`
            );
          }
        }

        setStatusMessage(`Live location centered on map! (±${accuracy}m accuracy, Kalman smoothed)`);
        setTimeout(() => setStatusMessage(null), 4000);

        // Keep updating device position as user moves
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (updatePos) => {
            const uRawLat = updatePos.coords.latitude;
            const uRawLng = updatePos.coords.longitude;
            const uRawAcc = updatePos.coords.accuracy;

            const uKFix = cadKalmanRef.current.update(uRawLat, uRawLng, uRawAcc);
            const uCal = GcpCalibrationManager.getInstance().apply(uKFix.lat, uKFix.lng);
            const uLng = Number(uCal.lng.toFixed(6));
            const uLat = Number(uCal.lat.toFixed(6));
            const uAcc = Math.round(uKFix.estimatedAccuracy);

            setGpsPos({ lng: uLng, lat: uLat, accuracy: uAcc });
            if (gpsMarkerRef.current) {
              gpsMarkerRef.current.setLngLat([uLng, uLat]);
            }
          },
          (err) => console.warn('Live location watch error:', err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
        );
      },
      (error) => {
        setGpsLoading(false);
        let msg = 'Failed to retrieve device location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Device location is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please retry.';
        }
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(null), 4500);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-60px-64px)] overflow-hidden bg-slate-100">
      {/* Top HUD */}
      <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-2 rounded-xl shadow-md text-xs text-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-emerald-800">
            <Crosshair className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">
              {centerCoords.lat.toFixed(6)}°N, {centerCoords.lng.toFixed(6)}°E
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-cyan-800 font-mono text-[11px] border-l border-slate-200 pl-3">
            <span>UTM {utmCoords.zone}N: E {utmCoords.easting.toLocaleString()}m, N {utmCoords.northing.toLocaleString()}m</span>
          </div>
        </div>

        {statusMessage && (
          <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded shadow-xs">
            {statusMessage}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Basemap Switcher Dropdown (matching BhuvanMapTab) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBasemapMenu(!showBasemapMenu)}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-800 font-bold transition text-xs shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{BASEMAP_LIST.find((b) => b.id === activeBasemap)?.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showBasemapMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30 space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  Satellite & WMS Basemaps
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
              </div>
            )}
          </div>

          {/* Cadastral / FMB Boundary Overlay Toggle */}
          <button
            type="button"
            onClick={toggleCadastral}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition text-xs shadow-xs border ${
              showCadastral
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle ISRO NRSC Cadastral Parcel Boundaries and Survey Numbers"
          >
            <Grid3X3 className={`w-3.5 h-3.5 ${showCadastral ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Cadastral {showCadastral ? 'ON' : 'OFF'}</span>
          </button>

          {/* Layer Manager Drawer Toggle */}
          <button
            type="button"
            onClick={() => setLayerDrawerOpen(!layerDrawerOpen)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-800 font-bold transition text-xs shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Layers ({layers.length})</span>
          </button>

          {/* Export Menu */}
          <div className="relative">
            <button
              type="button"
              disabled={layers.length === 0}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-300 px-2.5 py-1 rounded-lg text-emerald-800 font-bold transition text-xs shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={handleExportGeoJson}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-800 flex items-center justify-between"
                >
                  <span>GeoJSON (.geojson)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportKml}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-800 flex items-center justify-between"
                >
                  <span>Google Earth (.kml)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDxf}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-800 flex items-center justify-between"
                >
                  <span>AutoCAD (.dxf)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Reticle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse" />
          <div className="absolute w-6 h-[2px] bg-emerald-400 rounded-full" />
          <div className="absolute h-6 w-[2px] bg-emerald-400 rounded-full" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-white ring-2 ring-emerald-500" />
        </div>
      </div>

      {/* Floating Action Controls */}
      <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
        {/* Universal Importer */}
        <label
          title="Import Shapefile (.zip), AutoCAD (.dxf), KML, or GeoJSON"
          className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200 text-emerald-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center shadow-md transition"
        >
          <Upload className="w-5 h-5" />
          <input
            type="file"
            accept=".zip,.shp,.dxf,.kml,.geojson,.json"
            onChange={handleUniversalImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Bottom HUD / Actions */}
      <div className="absolute bottom-4 left-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
        {metrics && (
          <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur-md border border-emerald-300 rounded-2xl p-3 shadow-lg flex items-center justify-between text-slate-900 pointer-events-auto">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                CAD Parcel Extent ({vertices.length} Vertices)
              </span>
              <div className="text-lg font-black text-slate-900 font-mono">
                {metrics.breakdown.formattedAcreString}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {metrics.breakdown.cents} Cents • {metrics.breakdown.sqyd.toLocaleString()} Sq. Yds
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const newProject: SurveyProject = {
                  id: `proj-${Date.now()}`,
                  userId: user?.uid || 'guest',
                  name: `CAD Measured Parcel (${metrics.breakdown.formattedAcreString})`,
                  state: selectedState,
                  type: 'cad_import',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  polygon: {
                    coordinates: vertices,
                    areaSqm: metrics.areaSqm,
                    areaCents: metrics.breakdown.cents,
                    areaAcres: metrics.breakdown.acres,
                  },
                };
                await saveProject(newProject);
                if (onProjectSaved) onProjectSaved(newProject);
                setStatusMessage('Saved to Projects!');
                setTimeout(() => setStatusMessage(null), 3000);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
            >
              <BookmarkCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Save</span>
            </button>
          </div>
        )}

        {/* Small Live Location Icon Button on Right Side (Shifted left of zoom controls) */}
        <button
          type="button"
          onClick={handleShowLiveLocation}
          title={gpsLoading ? 'Acquiring GPS...' : gpsActive ? 'Update Device Live Location' : 'Show Device Live Location'}
          aria-label="Show Device Live Location"
          className="pointer-events-auto mr-12 sm:mr-14 mb-1 w-11 h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/30 transition-all active:scale-95 border border-cyan-300/50"
        >
          {gpsLoading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Navigation2 className={`w-5 h-5 text-slate-950 fill-slate-950 stroke-[2] ${gpsActive ? 'animate-pulse' : ''}`} />
          )}
        </button>
      </div>

      {/* Layer Manager Drawer */}
      {layerDrawerOpen && (
        <div className="absolute top-16 left-3 w-80 max-h-[70vh] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-4 z-30 flex flex-col gap-3 overflow-hidden animate-fade-in text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>GIS Layers ({layers.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => setLayerDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-2 max-h-[45vh] pr-1">
            {layers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No GIS or CAD files imported yet.
                <br />
                Click <Upload className="w-3.5 h-3.5 inline text-emerald-600 mx-1" /> to load a .zip Shapefile, .dxf, or .kml.
              </div>
            ) : (
              layers.map((layer) => (
                <div
                  key={layer.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {layer.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className="text-slate-500 hover:text-slate-800 p-1"
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => zoomToGeoJson(layer.data)}
                        className="text-slate-500 hover:text-cyan-600 p-1"
                        title="Zoom to Layer Bounds"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLayers(layers.filter((l) => l.id !== layer.id));
                        }}
                        className="text-slate-500 hover:text-rose-600 p-1"
                        title="Remove Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{layer.data.features.length} features</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={layer.opacity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLayers(
                          layers.map((l) => (l.id === layer.id ? { ...l, opacity: val } : l))
                        );
                        syncLayerToMap({ ...layer, opacity: val });
                      }}
                      className="w-20 accent-emerald-600"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Attribute Inspector Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-emerald-600" />
                <span>Cadastral Attribute Inspector</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Layer: <span className="text-emerald-800 font-semibold">{selectedFeature.layerName}</span> • Geometry: <span className="text-cyan-800 font-mono">{selectedFeature.geometry.type}</span>
            </div>

            {/* Properties Table */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto p-2">
              <table className="w-full text-xs text-left">
                <tbody className="divide-y divide-slate-200 font-mono">
                  {Object.entries(selectedFeature.properties).length === 0 ? (
                    <tr>
                      <td className="p-2 text-slate-500 font-sans">No attribute tags in entity.</td>
                    </tr>
                  ) : (
                    Object.entries(selectedFeature.properties).map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-1 px-2 text-slate-600 font-semibold">{k}</td>
                        <td className="py-1 px-2 text-slate-900">{String(v)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSendPolygonToCalc}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Send to Calculator</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DXF Import CRS Selector Modal */}
      {dxfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <span>AutoCAD DXF Coordinate System</span>
              </h3>
              <button
                type="button"
                onClick={() => setDxfModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select how drawing units and coordinates in <span className="text-slate-900 font-mono font-bold">{dxfFileName}</span> should be projected:
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <input
                  type="radio"
                  name="dxfCrs"
                  value="utm_auto"
                  checked={dxfCrsMode === 'utm_auto'}
                  onChange={() => setDxfCrsMode('utm_auto')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Auto-Detect UTM Zone (Recommended)</span>
                  <span className="text-[10px] text-slate-500">Auto-detects Zone 43N/44N based on current map center &amp; state</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <input
                  type="radio"
                  name="dxfCrs"
                  value="utm43n"
                  checked={dxfCrsMode === 'utm43n'}
                  onChange={() => setDxfCrsMode('utm43n')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">UTM Zone 43N (EPSG:32643)</span>
                  <span className="text-[10px] text-slate-500">West-Central India: Karnataka, Maharashtra, Goa, Kerala, MP</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <input
                  type="radio"
                  name="dxfCrs"
                  value="utm44n"
                  checked={dxfCrsMode === 'utm44n'}
                  onChange={() => setDxfCrsMode('utm44n')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">UTM Zone 44N (EPSG:32644)</span>
                  <span className="text-[10px] text-slate-500">Central-Eastern India: Andhra Pradesh, Telangana, Tamil Nadu, Odisha</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <input
                  type="radio"
                  name="dxfCrs"
                  value="wgs84"
                  checked={dxfCrsMode === 'wgs84'}
                  onChange={() => setDxfCrsMode('wgs84')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">WGS84 Lat/Lng Degrees</span>
                  <span className="text-[10px] text-slate-500">Unprojected geographic latitude/longitude</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-emerald-500 transition">
                <input
                  type="radio"
                  name="dxfCrs"
                  value="local_offset"
                  checked={dxfCrsMode === 'local_offset'}
                  onChange={() => setDxfCrsMode('local_offset')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Local CAD Meters (Anchor to Map Center)</span>
                  <span className="text-[10px] text-slate-500">Origin (0,0) pinned to current crosshair</span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDxfModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDxfImport}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition"
              >
                Import & Plot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
