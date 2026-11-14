import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  DraftingCompass,
  PenTool,
  Scissors,
  Split,
  Maximize2,
  Compass,
  Ruler,
  Layers,
  Download,
  BookmarkCheck,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Share2,
  Move,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Grid3X3,
  FileCode,
  FileText,
  MapPin,
  Sparkles,
  Info,
  Circle as CircleIcon,
  Square as SquareIcon,
  Terminal,
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Maximize,
  Sliders,
} from 'lucide-react';
import {
  CadPoint,
  CadDimension,
  CadStation,
  CadSubdivisionResult,
  CadFmbOffset,
  CadLayerDef,
  OsnapResult,
  computePolygonArea,
  computePolygonPerimeter,
  computeSegmentLength,
  computeCentroid,
  computeBearingWCB,
  toQuadrantalBearing,
  computeCogoForward,
  computeCogoInverse,
  splitPolygonByLine,
  computeParallelOffset,
  computeFmbPoints,
  generateCadDxf,
  generateCadSvg,
  exportCadGeoJson,
  findOsnapTarget,
  parseCadCommand,
} from '../../utils/cadEngine';
import { convertArea, convertFromUnitToSqm, DimensionUnit, LinkType } from '../../utils/units';
import { getStateUnitConfig, convertSqmToStateUnits } from '../../utils/indianStateUnits';
import { saveProject, SurveyProject } from '../../services/projectsService';
import { useAuth } from '../../firebase/AuthContext';
import { FourSidedDimensions } from '../../utils/gis';

export type CadToolMode = 'draft' | 'subdivision' | 'setback' | 'cogo' | 'fmb';

interface CadToolsTabProps {
  selectedState: string;
  onProjectSaved?: (project: SurveyProject) => void;
  onSendToCalculator?: (dimensions: FourSidedDimensions) => void;
}

export const CadToolsTab: React.FC<CadToolsTabProps> = ({
  selectedState,
  onProjectSaved,
  onSendToCalculator,
}) => {
  const { user } = useAuth();

  // Active Tool Mode - Clean 3-tab simplicity: Draw / Split / More Tools
  const [activeMode, setActiveMode] = useState<CadToolMode>('draft');
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);

  // Drawing state - starts completely empty for free user drafting
  const [boundaryPoints, setBoundaryPoints] = useState<CadPoint[]>([]);
  const [stations, setStations] = useState<CadStation[]>([]);

  // Selected vertex index for interactive dragging
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
  const [hoveredVertexIdx, setHoveredVertexIdx] = useState<number | null>(null);

  // Viewport Pan & Zoom (centered on origin 0,0)
  const [zoom, setZoom] = useState<number>(10); // pixels per meter
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 280, y: 240 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drafting settings
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(5); // 5m grid
  const [orthoMode, setOrthoMode] = useState<boolean>(false);
  const [displayUnit, setDisplayUnit] = useState<DimensionUnit>('m');

  // AutoCAD OSNAP (Object Snap) state
  const [osnapEnabled, setOsnapEnabled] = useState<boolean>(true);
  const [activeOsnap, setActiveOsnap] = useState<OsnapResult | null>(null);

  // AutoCAD Command Prompt State
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'AutoCAD Cadastral Engine Initialized. Type commands below (L, PL, REC, O, DI, AA, U, FIT) or click canvas.',
  ]);

  // AutoCAD Layer Manager State
  const [layers, setLayers] = useState<CadLayerDef[]>([
    { id: '0_BOUNDARY', name: '0_BOUNDARY', color: '#10b981', visible: true, locked: false, lineWeight: 2.5 },
    { id: '0_DIMENSIONS', name: '0_DIMENSIONS', color: '#38bdf8', visible: true, locked: false, lineWeight: 1.0 },
    { id: '0_SUBDIVISION', name: '0_SUBDIVISION', color: '#c084fc', visible: true, locked: false, lineWeight: 2.0 },
    { id: '0_SETBACK', name: '0_SETBACK', color: '#f59e0b', visible: true, locked: false, lineWeight: 1.5 },
    { id: '0_STATIONS', name: '0_STATIONS', color: '#34d399', visible: true, locked: false, lineWeight: 1.5 },
  ]);
  const [showLayerManager, setShowLayerManager] = useState<boolean>(false);

  // Active Drawing Tool (AutoCAD-like)
  const [cadTool, setCadTool] = useState<'line' | 'polyline' | 'rectangle' | 'circle' | 'dimension'>('polyline');

  // Mouse cursor coordinate HUD
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Notification message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Survey project details
  const [surveyNumber, setSurveyNumber] = useState<string>('CAD-01');

  // ---------------- SUBDIVISION / PLOT SPLITTING STATE ----------------
  const [splitMethod, setSplitMethod] = useState<'line' | 'ratio'>('ratio');
  const [splitLineP1, setSplitLineP1] = useState<{ x: number; y: number }>({ x: 20, y: 0 });
  const [splitLineP2, setSplitLineP2] = useState<{ x: number; y: number }>({ x: 20, y: 50 });
  const [targetSplitRatio, setTargetSplitRatio] = useState<number>(0.5); // 50/50 split

  // ---------------- ROAD SETBACK & BOUNDARY OFFSET STATE ----------------
  const [setbackDistance, setSetbackDistance] = useState<number>(3.0); // 3m building setback
  const [roadWideningOffset, setRoadWideningOffset] = useState<number>(5.0); // 5m road widening
  const [activeSetbackSide, setActiveSetbackSide] = useState<'all' | 'front'>('all');

  // ---------------- COGO (COORDINATE GEOMETRY) TRAVERSE STATE ----------------
  const [cogoStartPoint, setCogoStartPoint] = useState<CadPoint>({ x: 0, y: 0 });
  const [cogoBearing, setCogoBearing] = useState<number>(45);
  const [cogoDistance, setCogoDistance] = useState<number>(30);
  const [cogoInverseP1Idx, setCogoInverseP1Idx] = useState<number>(0);
  const [cogoInverseP2Idx, setCogoInverseP2Idx] = useState<number>(1);

  // ---------------- FMB LADDER SKETCHER STATE ----------------
  const [fmbGLength, setFmbGLength] = useState<number>(50);
  const [fmbGBearing, setFmbGBearing] = useState<number>(90);
  const [fmbOffsets, setFmbOffsets] = useState<CadFmbOffset[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const commandHistoryEndRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss status messages
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Auto-scroll AutoCAD command history to bottom
  useEffect(() => {
    commandHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commandHistory]);

  // Check layer visibility
  const isLayerVisible = useCallback(
    (layerId: string) => {
      const lyr = layers.find((l) => l.id === layerId);
      return lyr ? lyr.visible : true;
    },
    [layers]
  );

  // World to SVG Screen coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        sx: pan.x + wx * zoom,
        sy: pan.y - wy * zoom, // Invert Y so North is UP
      };
    },
    [pan, zoom]
  );

  // SVG Screen to World coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      let wx = (sx - pan.x) / zoom;
      let wy = (pan.y - sy) / zoom;

      if (snapToGrid) {
        wx = Math.round(wx / gridSize) * gridSize;
        wy = Math.round(wy / gridSize) * gridSize;
      }

      return {
        wx: Number(wx.toFixed(2)),
        wy: Number(wy.toFixed(2)),
      };
    },
    [pan, zoom, snapToGrid, gridSize]
  );

  // Fit plot to canvas
  const handleFitToScreen = useCallback(() => {
    if (boundaryPoints.length === 0) return;
    const xs = boundaryPoints.map((p) => p.x);
    const ys = boundaryPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const spanX = maxX - minX || 20;
    const spanY = maxY - minY || 20;

    const canvasWidth = svgRef.current?.clientWidth || 700;
    const canvasHeight = svgRef.current?.clientHeight || 450;

    const newZoom = Math.min((canvasWidth - 100) / spanX, (canvasHeight - 100) / spanY, 18);
    const safeZoom = Math.max(3, Math.min(newZoom, 25));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(safeZoom);
    setPan({
      x: canvasWidth / 2 - centerX * safeZoom,
      y: canvasHeight / 2 + centerY * safeZoom,
    });
    setStatusMessage('Viewport centered & scaled to boundary bounds');
  }, [boundaryPoints]);

  // Polygon area & state cadastral units
  const currentAreaSqm = useMemo(() => computePolygonArea(boundaryPoints), [boundaryPoints]);
  const currentPerimeter = useMemo(() => computePolygonPerimeter(boundaryPoints), [boundaryPoints]);
  const currentCentroid = useMemo(() => computeCentroid(boundaryPoints), [boundaryPoints]);

  const areaBreakdown = useMemo(() => convertArea(currentAreaSqm), [currentAreaSqm]);
  const stateCadastralUnits = useMemo(
    () => convertSqmToStateUnits(currentAreaSqm, selectedState),
    [currentAreaSqm, selectedState]
  );
  const stateDetails = useMemo(() => getStateUnitConfig(selectedState), [selectedState]);

  // Computed Sub-division
  const subdivisionResult: CadSubdivisionResult | null = useMemo(() => {
    if (boundaryPoints.length < 3) return null;
    return splitPolygonByLine(boundaryPoints, splitLineP1, splitLineP2);
  }, [boundaryPoints, splitLineP1, splitLineP2]);

  // Computed Setback Offset
  const setbackBoundary: CadPoint[] = useMemo(() => {
    if (boundaryPoints.length < 3 || setbackDistance <= 0) return [];
    return computeParallelOffset(boundaryPoints, setbackDistance, true);
  }, [boundaryPoints, setbackDistance]);

  // Computed Road Widening Buffer
  const roadBufferBoundary: CadPoint[] = useMemo(() => {
    if (boundaryPoints.length < 2 || roadWideningOffset <= 0) return [];
    return computeParallelOffset(boundaryPoints, -roadWideningOffset, true);
  }, [boundaryPoints, roadWideningOffset]);

  // Computed FMB Result
  const fmbResult = useMemo(() => {
    return computeFmbPoints({ x: 0, y: 0 }, fmbGBearing, fmbGLength, fmbOffsets);
  }, [fmbGBearing, fmbGLength, fmbOffsets]);

  // Apply FMB to active boundary
  const handleApplyFmbToBoundary = () => {
    if (fmbResult.boundaryPoints.length >= 3) {
      setBoundaryPoints(fmbResult.boundaryPoints);
      setStatusMessage('FMB Field Measurement Book ladder applied to CAD canvas!');
      setTimeout(handleFitToScreen, 100);
    }
  };

  // Add vertex to boundary
  const handleAddVertexAtCursor = () => {
    const nextLabel = String.fromCharCode(65 + (boundaryPoints.length % 26));
    setBoundaryPoints([...boundaryPoints, { x: cursorWorld.x, y: cursorWorld.y, label: nextLabel }]);
    setStatusMessage(`Vertex ${nextLabel} placed at (${cursorWorld.x}m, ${cursorWorld.y}m)`);
  };

  // Pre-built Cadastral Templates
  const handleLoadTemplate = (type: 'rectangle_30x40' | '1_acre' | 'triangle' | 'l_shape') => {
    if (type === 'rectangle_30x40') {
      // 30m x 40m plot (1200 m² = ~29.65 cents)
      setBoundaryPoints([
        { x: 10, y: 10, label: 'A' },
        { x: 50, y: 10, label: 'B' },
        { x: 50, y: 40, label: 'C' },
        { x: 10, y: 40, label: 'D' },
      ]);
      setStatusMessage('Loaded 30m × 40m Cadastral Parcel Template');
    } else if (type === '1_acre') {
      // Exactly 1 Acre = 4046.86 m² (~63.6m x 63.6m square parcel)
      const s = 63.615;
      setBoundaryPoints([
        { x: 10, y: 10, label: 'P1' },
        { x: 10 + s, y: 10, label: 'P2' },
        { x: 10 + s, y: 10 + s, label: 'P3' },
        { x: 10, y: 10 + s, label: 'P4' },
      ]);
      setStatusMessage('Loaded Standard 1.00 Acre Cadastral Parcel (4,046.86 m²)');
    } else if (type === 'triangle') {
      setBoundaryPoints([
        { x: 10, y: 10, label: 'T1' },
        { x: 60, y: 15, label: 'T2' },
        { x: 35, y: 55, label: 'T3' },
      ]);
      setStatusMessage('Loaded Triangulation Boundary Template');
    } else if (type === 'l_shape') {
      setBoundaryPoints([
        { x: 10, y: 10, label: 'A' },
        { x: 60, y: 10, label: 'B' },
        { x: 60, y: 30, label: 'C' },
        { x: 35, y: 30, label: 'D' },
        { x: 35, y: 55, label: 'E' },
        { x: 10, y: 55, label: 'F' },
      ]);
      setStatusMessage('Loaded L-Shaped Sub-Division Template');
    }
    setTimeout(handleFitToScreen, 100);
  };

  // Send Boundary to Area Calculator
  const handleSendToCalculator = () => {
    if (!onSendToCalculator || boundaryPoints.length < 4) {
      setStatusMessage('Plot must have at least 4 vertices to send to 4-sided Calculator');
      return;
    }
    const p = boundaryPoints;
    const sA = Number(computeSegmentLength(p[0], p[1]).toFixed(2));
    const sB = Number(computeSegmentLength(p[1], p[2]).toFixed(2));
    const sC = Number(computeSegmentLength(p[2], p[3]).toFixed(2));
    const sD = Number(computeSegmentLength(p[3], p[0]).toFixed(2));
    const diag = Number(computeSegmentLength(p[0], p[2]).toFixed(2));

    onSendToCalculator({
      sideA: sA,
      sideB: sB,
      sideC: sC,
      sideD: sD,
      diagonal: diag,
    });
    setStatusMessage('Transferred boundary dimensions to Area Calculator Tab!');
  };

  // Export AutoCAD DXF
  const handleExportDxf = () => {
    const dxfString = generateCadDxf({
      boundary: boundaryPoints,
      subDivisions: subdivisionResult ? [subdivisionResult.part1, subdivisionResult.part2] : undefined,
      setback: setbackBoundary.length >= 3 ? setbackBoundary : undefined,
      stations,
      surveyNumber,
      state: selectedState,
    });

    const blob = new Blob([dxfString], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sthal_CAD_Survey_${surveyNumber.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded AutoCAD R12 ASCII DXF drawing file!');
  };

  // Export Scalable Vector Graphics (SVG)
  const handleExportSvg = () => {
    const svgString = generateCadSvg({
      boundary: boundaryPoints,
      subDivisions: subdivisionResult ? [subdivisionResult.part1, subdivisionResult.part2] : undefined,
      setback: setbackBoundary.length >= 3 ? setbackBoundary : undefined,
      stations,
      surveyNumber,
      state: selectedState,
      unitLabel: displayUnit,
    });

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sthal_CAD_Plot_${surveyNumber.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded Scalable Vector Graphics (SVG) Cadastral Plot!');
  };

  // Export GeoJSON
  const handleExportGeoJson = () => {
    const fc = exportCadGeoJson(boundaryPoints, {
      surveyNumber,
      state: selectedState,
      notes: `Exported from Sthal Measure CAD Studio (${selectedState})`,
    });
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sthal_CAD_${surveyNumber.replace(/[^a-zA-Z0-9]/g, '_')}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded Cadastral GeoJSON file!');
  };

  // Save Project
  const handleSaveCadProject = async () => {
    const proj: SurveyProject = {
      id: `cad-proj-${Date.now()}`,
      userId: user?.uid || 'guest',
      name: `CAD Survey No. ${surveyNumber}`,
      state: selectedState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'cad_import',
      notes: `CAD Vector Drafting: ${boundaryPoints.length} stations, Area: ${currentAreaSqm.toFixed(2)} m² (${selectedState})`,
      calculations: {
        mode: 'CAD Vector Studio',
        dimensionUnit: displayUnit,
        inputs: {
          points: boundaryPoints,
          stations,
        },
        results: {
          areaSqm: currentAreaSqm,
          perimeterMeters: currentPerimeter,
          acres: areaBreakdown.acres,
          cents: areaBreakdown.cents,
          guntas: areaBreakdown.guntas,
          formatted: areaBreakdown.formattedAcreString,
        },
      },
    };

    await saveProject(proj);
    if (onProjectSaved) onProjectSaved(proj);
    setStatusMessage(`Saved "${proj.name}" to Survey Projects!`);
  };

  // Mouse & Touch interaction on canvas
  const isDraggingVertexRef = useRef<boolean>(false);
  const mouseDownWorldPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      mouseDownWorldPosRef.current = { x: world.wx, y: world.wy };
    }

    if (e.button === 1 || e.shiftKey) {
      // Middle click or shift+drag -> Pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    let world = screenToWorld(sx, sy);

    // AutoCAD Object Snap (OSNAP) check
    if (osnapEnabled && boundaryPoints.length > 0) {
      const snap = findOsnapTarget({ x: world.wx, y: world.wy }, boundaryPoints, 1.8);
      setActiveOsnap(snap);
      if (snap) {
        world = { wx: snap.point.x, wy: snap.point.y };
      }
    } else {
      setActiveOsnap(null);
    }

    // Ortho Mode constraints relative to last placed vertex
    if (orthoMode && boundaryPoints.length > 0 && selectedVertexIdx === null) {
      const last = boundaryPoints[boundaryPoints.length - 1];
      const dx = Math.abs(world.wx - last.x);
      const dy = Math.abs(world.wy - last.y);
      if (dx > dy) {
        world = { wx: world.wx, wy: last.y };
      } else {
        world = { wx: last.x, wy: world.wy };
      }
    }

    setCursorWorld({ x: world.wx, y: world.wy });

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (selectedVertexIdx !== null) {
      // Drag vertex
      isDraggingVertexRef.current = true;
      const updated = [...boundaryPoints];
      updated[selectedVertexIdx] = {
        ...updated[selectedVertexIdx],
        x: world.wx,
        y: world.wy,
      };
      setBoundaryPoints(updated);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    // If user clicked (not dragged and not panned) on the canvas in drafting mode, add vertex at click position
    if (!isPanning && !isDraggingVertexRef.current && selectedVertexIdx === null && e.button === 0 && activeMode === 'draft') {
      const targetPoint = activeOsnap ? activeOsnap.point : { x: cursorWorld.x, y: cursorWorld.y };
      const nextLabel = String.fromCharCode(65 + (boundaryPoints.length % 26));
      setBoundaryPoints((prev) => [...prev, { x: targetPoint.x, y: targetPoint.y, label: nextLabel }]);
      setCommandHistory((prev) => [
        ...prev.slice(-8),
        `POINT ${nextLabel} placed at (${targetPoint.x.toFixed(2)}, ${targetPoint.y.toFixed(2)})${activeOsnap ? ` [OSNAP: ${activeOsnap.type.toUpperCase()}]` : ''}`,
      ]);
      setStatusMessage(`Station ${nextLabel} placed at (${targetPoint.x}m, ${targetPoint.y}m)`);
    }

    setIsPanning(false);
    setSelectedVertexIdx(null);
    isDraggingVertexRef.current = false;
  };

  // AutoCAD Command Execution
  const handleExecuteCommand = (cmdText?: string) => {
    const textToRun = cmdText || commandInput;
    if (!textToRun || !textToRun.trim()) return;

    const lastPt = boundaryPoints.length > 0 ? boundaryPoints[boundaryPoints.length - 1] : undefined;
    const parsed = parseCadCommand(textToRun, lastPt);
    const cmd = parsed.command;

    let response = '';

    if (parsed.isCoordinate && parsed.coord) {
      const nextLabel = String.fromCharCode(65 + (boundaryPoints.length % 26));
      setBoundaryPoints((prev) => [...prev, { x: parsed.coord!.x, y: parsed.coord!.y, label: nextLabel }]);
      response = `Command: POINT ${nextLabel} -> (${parsed.coord.x}, ${parsed.coord.y})`;
    } else if (cmd === 'L' || cmd === 'LINE' || cmd === 'PL' || cmd === 'POLYLINE') {
      setActiveMode('draft');
      setCadTool('polyline');
      response = 'Command: POLYLINE. Click on screen or type coordinates (e.g. 20,30 or @15<45)';
    } else if (cmd === 'REC' || cmd === 'RECT' || cmd === 'RECTANGLE') {
      handleLoadTemplate('rectangle_30x40');
      response = 'Command: RECTANGLE. Placed standard 30x40 parcel.';
    } else if (cmd === 'C' || cmd === 'CIRCLE') {
      setCadTool('circle');
      response = 'Command: CIRCLE mode enabled.';
    } else if (cmd === 'O' || cmd === 'OFFSET') {
      setActiveMode('setback');
      setShowAdvancedTools(true);
      response = 'Command: OFFSET. Road & Building setback mode activated.';
    } else if (cmd === 'SPLIT' || cmd === 'PARTITION') {
      setActiveMode('subdivision');
      setShowAdvancedTools(false);
      response = 'Command: SPLIT. Parcel sub-division tool activated.';
    } else if (cmd === 'U' || cmd === 'UNDO') {
      if (boundaryPoints.length > 0) {
        setBoundaryPoints((prev) => prev.slice(0, -1));
        response = 'Command: UNDO. Last vertex removed.';
      } else {
        response = 'Command: UNDO. Nothing to undo.';
      }
    } else if (cmd === 'E' || cmd === 'ERASE' || cmd === 'CLEAR') {
      handleClearCanvas();
      response = 'Command: ERASE. Canvas cleared to blank drawing board.';
    } else if (cmd === 'Z' || cmd === 'ZOOM' || cmd === 'FIT') {
      handleFitToScreen();
      response = 'Command: ZOOM EXTENTS. Screen fitted to boundary bounds.';
    } else if (cmd === 'DI' || cmd === 'DIST' || cmd === 'DISTANCE') {
      if (boundaryPoints.length >= 2) {
        const d = computeSegmentLength(boundaryPoints[0], boundaryPoints[boundaryPoints.length - 1]);
        response = `Command: DISTANCE between Station 1 and last = ${d.toFixed(3)} m`;
      } else {
        response = 'Command: DISTANCE requires at least 2 vertices.';
      }
    } else if (cmd === 'AA' || cmd === 'AREA') {
      response = `Command: AREA = ${currentAreaSqm.toFixed(2)} m² (${areaBreakdown.formattedAcreString}), Perimeter = ${currentPerimeter.toFixed(2)} m`;
    } else if (cmd === 'DXF') {
      handleExportDxf();
      response = 'Command: EXPORT DXF. Generated AutoCAD ASCII drawing file.';
    } else {
      response = `Unknown command "${parsed.raw}". Available: L, PL, REC, O, SPLIT, DI, AA, U, E, Z, DXF or type coordinates (x,y or @dist<ang).`;
    }

    setCommandHistory((prev) => [...prev.slice(-8), response]);
    setCommandInput('');
    setStatusMessage(response);
  };

  const handleClearCanvas = () => {
    setBoundaryPoints([]);
    setStations([]);
    setSelectedVertexIdx(null);
    setHoveredVertexIdx(null);
    setStatusMessage('Canvas cleared. Click anywhere or enter coordinates to draft your parcel.');
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(2, Math.min(zoom * zoomFactor, 40));
    setZoom(newZoom);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 pb-24 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Streamlined Clean Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <DraftingCompass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>CAD Plot Drafting</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {selectedState}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click anywhere on the canvas to draw plot boundaries and calculate area
            </p>
          </div>
        </div>

        {/* Survey No. & Clean Quick Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-bold">Plot #:</span>
            <input
              type="text"
              value={surveyNumber}
              onChange={(e) => setSurveyNumber(e.target.value)}
              placeholder="Plot #"
              className="w-16 bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleFitToScreen}
            disabled={boundaryPoints.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit</span>
          </button>

          <button
            type="button"
            onClick={handleClearCanvas}
            disabled={boundaryPoints.length === 0}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-30 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-2 mb-3 shadow-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* AutoCAD Ribbon Style Toolbar */}
      <div className="bg-[#121f24] border border-[#1e3b44] rounded-2xl p-2 mb-3 shadow-md text-white">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Ribbon Draw Group */}
          <div className="flex items-center gap-1 bg-[#0a1519] p-1 rounded-xl border border-[#1b343d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1 hidden sm:inline">Draw:</span>
            <button
              type="button"
              onClick={() => {
                setActiveMode('draft');
                setCadTool('polyline');
                setShowAdvancedTools(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeMode === 'draft' && cadTool === 'polyline' && !showAdvancedTools
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-[#183138]'
              }`}
              title="Polyline (PL) - Draw connected cadastral boundary"
            >
              <PenTool className="w-3.5 h-3.5 text-emerald-400" />
              <span>Polyline (PL)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleLoadTemplate('rectangle_30x40');
                setActiveMode('draft');
                setShowAdvancedTools(false);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-[#183138] transition flex items-center gap-1.5"
              title="Rectangle (REC) - Draw 30x40 site"
            >
              <SquareIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Rect (REC)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('subdivision');
                setShowAdvancedTools(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeMode === 'subdivision' && !showAdvancedTools
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-[#183138]'
              }`}
              title="Partition / Split (SPLIT) — divide land into two plots by ratio or line"
            >
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              <span>Split (SPLIT)</span>
            </button>
          </div>

          {/* Ribbon Modify & Geomatics Group */}
          <div className="flex items-center gap-1 bg-[#0a1519] p-1 rounded-xl border border-[#1b343d]">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1 hidden sm:inline">Tools:</span>
            <button
              type="button"
              onClick={() => {
                setActiveMode('setback');
                setShowAdvancedTools(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeMode === 'setback'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-[#183138]'
              }`}
              title="Offset (O) — building setbacks and road widening clearances"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              <span>Offset (O)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('cogo');
                setShowAdvancedTools(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeMode === 'cogo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-[#183138]'
              }`}
              title="COGO Bearing & Distance (DI) — enter exact coordinates or bearing & distance for each corner"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>COGO (DI)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('fmb');
                setShowAdvancedTools(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeMode === 'fmb'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-[#183138]'
              }`}
              title="FMB Ladder Sketch — Field Measurement Book offset sketching"
            >
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>FMB Ladder</span>
            </button>
          </div>

          {/* Ribbon AutoCAD Controls: OSNAP, Ortho, Layers */}
          <div className="flex items-center gap-1.5">
            {/* OSNAP Toggle */}
            <button
              type="button"
              onClick={() => {
                setOsnapEnabled(!osnapEnabled);
                setStatusMessage(`AutoCAD OSNAP: ${!osnapEnabled ? 'ON (Endpoint/Midpoint/Centroid)' : 'OFF'}`);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                osnapEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'bg-[#0a1519] text-slate-400 border-[#1b343d]'
              }`}
              title="Object Snap (F3 / OSNAP) - Snap to Endpoints, Midpoints, Centroids"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>OSNAP {osnapEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Ortho Toggle */}
            <button
              type="button"
              onClick={() => {
                setOrthoMode(!orthoMode);
                setStatusMessage(`AutoCAD ORTHO: ${!orthoMode ? 'ON (90° Lock)' : 'OFF'}`);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                orthoMode
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-[#0a1519] text-slate-400 border-[#1b343d]'
              }`}
              title="Ortho Mode (F8) - Lock movements to horizontal and vertical axes"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>ORTHO {orthoMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Layers Manager Button */}
            <button
              type="button"
              onClick={() => setShowLayerManager(!showLayerManager)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                showLayerManager
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-[#0a1519] text-slate-300 border-[#1b343d] hover:bg-[#183138]'
              }`}
              title="AutoCAD Layer Manager"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Layers</span>
            </button>
          </div>
        </div>

        {/* Expandable Layer Manager Bar */}
        {showLayerManager && (
          <div className="mt-2 pt-2 border-t border-[#1b343d] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {layers.map((lyr) => (
              <div
                key={lyr.id}
                className="bg-[#0a1519] p-2 rounded-xl border border-[#1e3b44] flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lyr.color }} />
                  <span className="truncate text-slate-200 text-[11px] font-bold">{lyr.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLayers(layers.map((l) => (l.id === lyr.id ? { ...l, visible: !l.visible } : l)));
                    }}
                    className="p-1 hover:text-white text-slate-400"
                    title={lyr.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {lyr.visible ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLayers(layers.map((l) => (l.id === lyr.id ? { ...l, locked: !l.locked } : l)));
                    }}
                    className="p-1 hover:text-white text-slate-400"
                    title={lyr.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {lyr.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-slate-600" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: CAD Canvas (Left/Top) + Interactive Geomatics Panel (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        {/* CAD Vector Drafting Viewport (8 Columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Canvas HUD Header */}
          <div className="px-3 py-2 bg-[#0c181d] border-b border-[#1b343d] flex items-center justify-between gap-2 flex-wrap text-xs text-white">
            {/* Coordinate readout & Osnap indicator */}
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Crosshair className="w-3.5 h-3.5" />
                <span>X: <strong>{cursorWorld.x.toFixed(2)}m</strong></span>
                <span className="text-slate-500">|</span>
                <span>Y: <strong>{cursorWorld.y.toFixed(2)}m</strong></span>
              </span>
              {activeOsnap && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <Magnet className="w-3 h-3" />
                  <span>SNAP: {activeOsnap.type.toUpperCase()}</span>
                </span>
              )}
              <span className="hidden sm:inline text-slate-500">|</span>
              <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">
                Grid: {gridSize}m
              </span>
            </div>

            {/* Quick Drafting Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  snapToGrid
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#121f24] text-slate-400 border-[#1e3b44]'
                }`}
                title="Snap to Grid (F9)"
              >
                GRID {snapToGrid ? `${gridSize}m` : 'OFF'}
              </button>

              <button
                type="button"
                onClick={handleClearCanvas}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#121f24] text-rose-400 border border-[#1e3b44] hover:bg-rose-950/40 transition flex items-center gap-1"
                title="Clear Canvas (ERASE)"
              >
                <Trash2 className="w-3 h-3" />
                <span>ERASE</span>
              </button>

              <div className="flex items-center bg-[#121f24] border border-[#1e3b44] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z * 1.25, 40))}
                  className="p-1 hover:bg-[#1a323a] rounded text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z * 0.8, 2))}
                  className="p-1 hover:bg-[#1a323a] rounded text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG CAD Canvas */}
          <div className="relative w-full h-[380px] sm:h-[480px] bg-[#0c181d] cursor-crosshair select-none overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
            >
              <defs>
                <pattern id="cadGridSmall" width={zoom * gridSize} height={zoom * gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${zoom * gridSize} 0 L 0 0 0 ${zoom * gridSize}`} fill="none" stroke="#173138" strokeWidth="0.8" />
                </pattern>
                <pattern id="cadGridMajor" width={zoom * gridSize * 5} height={zoom * gridSize * 5} patternUnits="userSpaceOnUse">
                  <path d={`M ${zoom * gridSize * 5} 0 L 0 0 0 ${zoom * gridSize * 5}`} fill="none" stroke="#234852" strokeWidth="1.2" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect width="100%" height="100%" fill="#0a1519" />
              <rect width="100%" height="100%" fill="url(#cadGridSmall)" />
              <rect width="100%" height="100%" fill="url(#cadGridMajor)" />

              {/* Origin Axis Marker (0,0) */}
              <g transform={`translate(${pan.x}, ${pan.y})`}>
                <line x1="-15" y1="0" x2="15" y2="0" stroke="#0ea5e9" strokeWidth="1.5" />
                <line x1="0" y1="-15" x2="0" y2="15" stroke="#10b981" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3" fill="#0ea5e9" />
                <text x="5" y="-5" fontSize="10" fill="#94a3b8" fontFamily="monospace">0,0</text>
              </g>

              {/* Road Widening / Outward Buffer */}
              {isLayerVisible('0_SETBACK') && activeMode === 'setback' && roadBufferBoundary.length >= 3 && (
                <polygon
                  points={roadBufferBoundary.map((p) => `${worldToScreen(p.x, p.y).sx},${worldToScreen(p.x, p.y).sy}`).join(' ')}
                  fill="rgba(56, 189, 248, 0.08)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              )}

              {/* Inward Setback Clearance Zone */}
              {isLayerVisible('0_SETBACK') && activeMode === 'setback' && setbackBoundary.length >= 3 && (
                <polygon
                  points={setbackBoundary.map((p) => `${worldToScreen(p.x, p.y).sx},${worldToScreen(p.x, p.y).sy}`).join(' ')}
                  fill="rgba(234, 179, 8, 0.08)"
                  stroke="#eab308"
                  strokeWidth="1.8"
                  strokeDasharray="5,3"
                />
              )}

              {/* Sub-division Split Line and Resulting Polygons */}
              {isLayerVisible('0_SUBDIVISION') && activeMode === 'subdivision' && subdivisionResult && (
                <>
                  <polygon
                    points={subdivisionResult.part1.map((p) => `${worldToScreen(p.x, p.y).sx},${worldToScreen(p.x, p.y).sy}`).join(' ')}
                    fill="rgba(168, 85, 247, 0.15)"
                    stroke="#a855f7"
                    strokeWidth="2"
                  />
                  <polygon
                    points={subdivisionResult.part2.map((p) => `${worldToScreen(p.x, p.y).sx},${worldToScreen(p.x, p.y).sy}`).join(' ')}
                    fill="rgba(236, 72, 153, 0.15)"
                    stroke="#ec4899"
                    strokeWidth="2"
                  />
                  {/* Cutting Line */}
                  <line
                    x1={worldToScreen(splitLineP1.x, splitLineP1.y).sx}
                    y1={worldToScreen(splitLineP1.x, splitLineP1.y).sy}
                    x2={worldToScreen(splitLineP2.x, splitLineP2.y).sx}
                    y2={worldToScreen(splitLineP2.x, splitLineP2.y).sy}
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                  />
                </>
              )}

              {/* Main Cadastral Boundary Polygon */}
              {isLayerVisible('0_BOUNDARY') && boundaryPoints.length >= 2 && (
                <polygon
                  points={boundaryPoints.map((p) => `${worldToScreen(p.x, p.y).sx},${worldToScreen(p.x, p.y).sy}`).join(' ')}
                  fill="rgba(16, 185, 129, 0.12)"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
              )}

              {/* FMB Tie Lines & Perpendicular Offsets */}
              {activeMode === 'fmb' && (
                <>
                  {/* Base G-Line */}
                  <line
                    x1={worldToScreen(fmbResult.gLineStart.x, fmbResult.gLineStart.y).sx}
                    y1={worldToScreen(fmbResult.gLineStart.x, fmbResult.gLineStart.y).sy}
                    x2={worldToScreen(fmbResult.gLineEnd.x, fmbResult.gLineEnd.y).sx}
                    y2={worldToScreen(fmbResult.gLineEnd.x, fmbResult.gLineEnd.y).sy}
                    stroke="#38bdf8"
                    strokeWidth="3"
                  />
                  {/* Tie offset lines */}
                  {fmbResult.tieLines.map((tie, idx) => {
                    const s1 = worldToScreen(tie.base.x, tie.base.y);
                    const s2 = worldToScreen(tie.offset.x, tie.offset.y);
                    return (
                      <g key={idx}>
                        <line x1={s1.sx} y1={s1.sy} x2={s2.sx} y2={s2.sy} stroke="#fb923c" strokeWidth="1.5" strokeDasharray="3,3" />
                        <circle cx={s2.sx} cy={s2.sy} r="3" fill="#fb923c" />
                        <text x={(s1.sx + s2.sx) / 2 + 4} y={(s1.sy + s2.sy) / 2} fill="#fdba74" fontSize="10" fontFamily="monospace">
                          {tie.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* Boundary Side Dimensions & Segment Lengths */}
              {isLayerVisible('0_DIMENSIONS') &&
                boundaryPoints.length >= 2 &&
                boundaryPoints.map((p, idx) => {
                  const next = boundaryPoints[(idx + 1) % boundaryPoints.length];
                  if (idx === boundaryPoints.length - 1 && boundaryPoints.length < 3) return null;
                  const s1 = worldToScreen(p.x, p.y);
                  const s2 = worldToScreen(next.x, next.y);
                  const midX = (s1.sx + s2.sx) / 2;
                  const midY = (s1.sy + s2.sy) / 2;
                  const dist = computeSegmentLength(p, next);
                  const bearing = computeBearingWCB(p, next);

                  return (
                    <g key={`side-${idx}`}>
                      <rect x={midX - 32} y={midY - 14} width="64" height="18" rx="4" fill="#071b20" stroke="#164e5c" strokeWidth="1" />
                      <text x={midX} y={midY} textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        {dist.toFixed(1)}m
                      </text>
                      <text x={midX} y={midY + 12} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                        {bearing}°
                      </text>
                    </g>
                  );
                })}

              {/* Vertices & Station Marker Handles */}
              {isLayerVisible('0_STATIONS') &&
                boundaryPoints.map((p, idx) => {
                  const { sx, sy } = worldToScreen(p.x, p.y);
                  const isSelected = selectedVertexIdx === idx;
                  const isHovered = hoveredVertexIdx === idx;

                  return (
                    <g
                      key={`vertex-${idx}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedVertexIdx(idx);
                      }}
                      onMouseEnter={() => setHoveredVertexIdx(idx)}
                      onMouseLeave={() => setHoveredVertexIdx(null)}
                      className="cursor-move"
                    >
                      <circle
                        cx={sx}
                        cy={sy}
                        r={isSelected ? 8 : isHovered ? 7 : 5}
                        fill={isSelected ? '#38bdf8' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={sx + 8}
                        y={sy - 8}
                        fontSize="12"
                        fontWeight="bold"
                        fill="#ffffff"
                        fontFamily="monospace"
                        filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                      >
                        {p.label || String.fromCharCode(65 + idx)}
                      </text>
                    </g>
                  );
                })}

              {/* Centroid Marker */}
              {isLayerVisible('0_STATIONS') && boundaryPoints.length >= 3 && (
                <g transform={`translate(${worldToScreen(currentCentroid.x, currentCentroid.y).sx}, ${worldToScreen(currentCentroid.x, currentCentroid.y).sy})`}>
                  <circle cx="0" cy="0" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                  <text x="6" y="3" fontSize="9" fill="#fcd34d" fontFamily="monospace" fontWeight="bold">
                    Centroid
                  </text>
                </g>
              )}

              {/* AutoCAD Full-length Hairline Crosshair & Pickbox */}
              {(() => {
                const cur = worldToScreen(cursorWorld.x, cursorWorld.y);
                return (
                  <g pointerEvents="none" opacity="0.6">
                    <line x1="0" y1={cur.sy} x2="100%" y2={cur.sy} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4,4" />
                    <line x1={cur.sx} y1="0" x2={cur.sx} y2="100%" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4,4" />
                    <rect x={cur.sx - 5} y={cur.sy - 5} width="10" height="10" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                  </g>
                );
              })()}

              {/* AutoCAD OSNAP Indicator Marker on Canvas */}
              {activeOsnap && (
                <g pointerEvents="none">
                  {(() => {
                    const snapScreen = worldToScreen(activeOsnap.point.x, activeOsnap.point.y);
                    return (
                      <>
                        {activeOsnap.type === 'endpoint' && (
                          <rect
                            x={snapScreen.sx - 6}
                            y={snapScreen.sy - 6}
                            width="12"
                            height="12"
                            fill="rgba(34, 197, 94, 0.2)"
                            stroke="#22c55e"
                            strokeWidth="2"
                          />
                        )}
                        {activeOsnap.type === 'midpoint' && (
                          <polygon
                            points={`${snapScreen.sx},${snapScreen.sy - 7} ${snapScreen.sx - 7},${snapScreen.sy + 6} ${snapScreen.sx + 7},${snapScreen.sy + 6}`}
                            fill="rgba(6, 182, 212, 0.2)"
                            stroke="#06b6d4"
                            strokeWidth="2"
                          />
                        )}
                        {activeOsnap.type === 'center' && (
                          <>
                            <circle
                              cx={snapScreen.sx}
                              cy={snapScreen.sy}
                              r="7"
                              fill="rgba(245, 158, 11, 0.2)"
                              stroke="#f59e0b"
                              strokeWidth="2"
                            />
                            <line x1={snapScreen.sx - 9} y1={snapScreen.sy} x2={snapScreen.sx + 9} y2={snapScreen.sy} stroke="#f59e0b" strokeWidth="1.5" />
                            <line x1={snapScreen.sx} y1={snapScreen.sy - 9} x2={snapScreen.sx} y2={snapScreen.sy + 9} stroke="#f59e0b" strokeWidth="1.5" />
                          </>
                        )}

                        {/* OSNAP Tooltip Tag */}
                        <g transform={`translate(${snapScreen.sx + 10}, ${snapScreen.sy - 12})`}>
                          <rect
                            x="0"
                            y="-12"
                            width={activeOsnap.type === 'endpoint' ? 62 : activeOsnap.type === 'midpoint' ? 58 : 54}
                            height="16"
                            rx="3"
                            fill="#06181d"
                            stroke={activeOsnap.type === 'endpoint' ? '#22c55e' : activeOsnap.type === 'midpoint' ? '#06b6d4' : '#f59e0b'}
                            strokeWidth="1"
                          />
                          <text
                            x="5"
                            y="0"
                            fontSize="9"
                            fontWeight="bold"
                            fill={activeOsnap.type === 'endpoint' ? '#4ade80' : activeOsnap.type === 'midpoint' ? '#67e8f9' : '#fcd34d'}
                            fontFamily="monospace"
                          >
                            {activeOsnap.type.charAt(0).toUpperCase() + activeOsnap.type.slice(1)}
                          </text>
                        </g>
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* Empty Canvas Guidance Overlay */}
            {boundaryPoints.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                <div className="max-w-md bg-[#06181d]/90 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-2xl text-slate-200">
                  <DraftingCompass className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-90" />
                  <h4 className="text-sm font-bold text-white mb-1">Clean CAD Drafting Canvas</h4>
                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                    Click anywhere on the grid to place your first station or use <strong className="text-emerald-400">Add Vertex</strong>.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>• Left Click: Place Station</span>
                    <span>• Shift+Drag: Pan</span>
                    <span>• Scroll: Zoom</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Canvas Action Overlays */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[#06181d]/90 backdrop-blur-md p-1.5 rounded-xl border border-emerald-900/60 shadow-lg">
              <button
                type="button"
                onClick={handleAddVertexAtCursor}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                title="Add Station Vertex at Cursor Position"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vertex</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (boundaryPoints.length > 0) {
                    setBoundaryPoints(boundaryPoints.slice(0, -1));
                    setStatusMessage('Removed last vertex from boundary');
                  }
                }}
                disabled={boundaryPoints.length === 0}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 disabled:opacity-30 border border-slate-700 text-xs transition"
                title="Undo Last Vertex"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClearCanvas}
                disabled={boundaryPoints.length === 0}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-rose-300 disabled:opacity-30 border border-slate-700 text-xs transition flex items-center gap-1"
                title="Clear All Vertices"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={handleFitToScreen}
                disabled={boundaryPoints.length === 0}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 border border-slate-700 text-xs transition"
                title="Reset Fit"
              >
                Fit
              </button>
            </div>

            {/* Area Floating HUD */}
            <div className="absolute top-3 right-3 bg-[#06181d]/90 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/40 text-right shadow-lg text-white">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Cadastral Planar Area
              </span>
              <p className="text-base font-black font-mono text-white leading-tight">
                {areaBreakdown.formattedAcreString}
              </p>
              <span className="text-[10px] text-slate-300 font-mono block">
                {currentAreaSqm.toFixed(2)} m² • {currentPerimeter.toFixed(1)}m Perim
              </span>
            </div>
          </div>

          {/* AutoCAD Command Line Console */}
          <div className="bg-[#050e11] border-t border-[#173138] p-2 flex flex-col gap-1.5 font-mono">
            {/* Terminal command history */}
            <div className="max-h-20 overflow-y-auto space-y-0.5 text-[11px] text-slate-300 pr-1 select-text">
              {commandHistory.map((line, idx) => (
                <div key={idx} className="leading-tight text-slate-300 flex items-start gap-1">
                  <span className="text-emerald-500 font-bold select-none">&gt;</span>
                  <span>{line}</span>
                </div>
              ))}
              <div ref={commandHistoryEndRef} />
            </div>

            {/* Command Input Prompt */}
            <div className="flex items-center gap-2 bg-[#0c1a1f] px-2.5 py-1.5 rounded-lg border border-[#21434c] focus-within:border-emerald-500 transition">
              <span className="text-emerald-400 font-bold text-xs shrink-0 select-none flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Command:</span>
              </span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteCommand();
                  } else if (e.key === 'Escape') {
                    setCommandInput('');
                  }
                }}
                placeholder="Type command (L, PL, REC, O, SPLIT, DI, AA, U, E, FIT, DXF) or coords (e.g. 25,35 or @10<45)"
                className="flex-1 bg-transparent text-xs text-emerald-200 font-mono focus:outline-none placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => handleExecuteCommand()}
                disabled={!commandInput.trim()}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-[11px] font-bold transition"
              >
                Run
              </button>
            </div>

            {/* AutoCAD Quick Command Bar */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-400 pt-0.5">
              <span className="text-slate-500 font-bold shrink-0">Command Aliases:</span>
              {[
                { label: 'PL (Polyline)', cmd: 'PL' },
                { label: 'REC (30x40)', cmd: 'REC' },
                { label: 'O (Offset)', cmd: 'O' },
                { label: 'SPLIT', cmd: 'SPLIT' },
                { label: 'DI (Dist)', cmd: 'DI' },
                { label: 'AA (Area)', cmd: 'AA' },
                { label: 'U (Undo)', cmd: 'U' },
                { label: 'E (Erase)', cmd: 'E' },
                { label: 'FIT', cmd: 'FIT' },
                { label: 'DXF', cmd: 'DXF' },
              ].map((btn) => (
                <button
                  key={btn.cmd}
                  type="button"
                  onClick={() => handleExecuteCommand(btn.cmd)}
                  className="px-2 py-0.5 rounded bg-[#102329] hover:bg-[#1a3842] text-slate-300 hover:text-emerald-300 border border-[#1b343d] shrink-0 font-mono transition"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Templates Bar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Cadastral Presets:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLoadTemplate('rectangle_30x40')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
              >
                30×40 Plot (1200 m²)
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('1_acre')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
              >
                1.00 Acre Parcel
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('triangle')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
              >
                Heron Triangle
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('l_shape')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
              >
                L-Shaped Parcel
              </button>
            </div>
          </div>
        </div>

        {/* CAD Tool Options & Controls Panel (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Mode 1: Vector Drafting Panel */}
          {activeMode === 'draft' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  <span>Boundary Vertex Manager</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  {boundaryPoints.length} Vertices
                </span>
              </div>

              {/* Vertex Coordinates Table */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                {boundaryPoints.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-xs font-sans">No vertices drafted yet.</p>
                    <p className="text-[11px] font-sans text-slate-400 mt-0.5">
                      Click the canvas or use the presets below to start drafting freely.
                    </p>
                  </div>
                ) : (
                  boundaryPoints.map((p, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 w-6">
                        {p.label || String.fromCharCode(65 + idx)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">X: {p.x.toFixed(1)}m</span>
                        <span className="text-slate-600 dark:text-slate-400">Y: {p.y.toFixed(1)}m</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBoundaryPoints(boundaryPoints.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Vertex"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Grid Snap & Unit controls */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grid Spacing</label>
                  <select
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value={1}>1.0 Meter</option>
                    <option value={2}>2.0 Meters</option>
                    <option value={5}>5.0 Meters</option>
                    <option value={10}>10.0 Meters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Linear Unit</label>
                  <select
                    value={displayUnit}
                    onChange={(e) => setDisplayUnit(e.target.value as DimensionUnit)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="m">Meters (m)</option>
                    <option value="ft">Feet (ft)</option>
                    <option value="links">Links (Cadastral Link)</option>
                    <option value="chains">Chains (Cadastral Chain / Gunter)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Parcel Subdivision & Splitter Tool */}
          {activeMode === 'subdivision' && (
            <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-purple-600" />
                  <span>Parcel Sub-Division Splitter</span>
                </h3>
                <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  2-Lot Partition
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Slice parcel across cutting line to calculate exact partition extents for inheritance or sale.
                </p>

                {/* Simple 1-Click Split Actions */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Quick Split Direction</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const xs = boundaryPoints.map((p) => p.x);
                        const ys = boundaryPoints.map((p) => p.y);
                        const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
                        const minY = Math.min(...ys) - 10;
                        const maxY = Math.max(...ys) + 10;
                        setSplitLineP1({ x: midX, y: minY });
                        setSplitLineP2({ x: midX, y: maxY });
                        setStatusMessage('Applied Vertical Split down the middle');
                      }}
                      disabled={boundaryPoints.length < 3}
                      className="py-1.5 px-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 disabled:opacity-40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-300 font-bold text-xs transition"
                    >
                      Vertical Cut (50/50)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const xs = boundaryPoints.map((p) => p.x);
                        const ys = boundaryPoints.map((p) => p.y);
                        const minX = Math.min(...xs) - 10;
                        const maxX = Math.max(...xs) + 10;
                        const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
                        setSplitLineP1({ x: minX, y: midY });
                        setSplitLineP2({ x: maxX, y: midY });
                        setStatusMessage('Applied Horizontal Split across the middle');
                      }}
                      disabled={boundaryPoints.length < 3}
                      className="py-1.5 px-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 disabled:opacity-40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-300 font-bold text-xs transition"
                    >
                      Horizontal Cut (50/50)
                    </button>
                  </div>
                </div>

                {/* Sub-division Results Card */}
                {subdivisionResult ? (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-purple-950 dark:text-purple-200">Lot A (Part 1):</span>
                      <span className="font-mono font-black text-purple-800 dark:text-purple-300">
                        {subdivisionResult.part1Area.toFixed(2)} m² ({(subdivisionResult.ratio * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-pink-950 dark:text-pink-200">Lot B (Part 2):</span>
                      <span className="font-mono font-black text-pink-800 dark:text-pink-300">
                        {subdivisionResult.part2Area.toFixed(2)} m² ({((1 - subdivisionResult.ratio) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 border-t border-purple-200 dark:border-purple-800 pt-1.5 flex justify-between">
                      <span>Cut Length: {computeSegmentLength(subdivisionResult.splitLine[0], subdivisionResult.splitLine[1]).toFixed(1)}m</span>
                      <span>Total: {subdivisionResult.totalArea.toFixed(1)} m²</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                    Cut line does not intersect boundary. Adjust X/Y to slice through parcel.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 3: Road Setback & Buffer Tool */}
          {activeMode === 'setback' && (
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-amber-600" />
                    <span>Road Setback &amp; Buffer Offset</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    — building setbacks and road widening clearances
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Building Clearance Setback (Inward):</label>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{setbackDistance}m</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={setbackDistance}
                    onChange={(e) => setSetbackDistance(parseFloat(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>0m (None)</span>
                    <span>Buildable Area: {computePolygonArea(setbackBoundary).toFixed(1)} m²</span>
                    <span>15m</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Road Widening Reserve (Outward):</label>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">{roadWideningOffset}m</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={roadWideningOffset}
                    onChange={(e) => setRoadWideningOffset(parseFloat(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>0m</span>
                    <span>Right of Way: {computePolygonArea(roadBufferBoundary).toFixed(1)} m²</span>
                    <span>20m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 4: COGO & Inversing Tool */}
          {activeMode === 'cogo' && (
            <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>COGO (Coordinate Geometry)</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    — enter exact coordinates or bearing &amp; distance for each corner
                  </p>
                </div>
              </div>

              {/* COGO 2-Point Inversing */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Inverse Traverse Between Stations:</span>
                {boundaryPoints.length < 2 ? (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-300 text-xs">
                    Draft at least 2 stations on the canvas or load a preset to compute inverse traverse bearings.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={cogoInverseP1Idx}
                        onChange={(e) => setCogoInverseP1Idx(Number(e.target.value))}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        {boundaryPoints.map((p, i) => (
                          <option key={i} value={i}>
                            Station {p.label || String.fromCharCode(65 + i)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={cogoInverseP2Idx}
                        onChange={(e) => setCogoInverseP2Idx(Number(e.target.value))}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        {boundaryPoints.map((p, i) => (
                          <option key={i} value={i}>
                            Station {p.label || String.fromCharCode(65 + i)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {boundaryPoints[cogoInverseP1Idx] && boundaryPoints[cogoInverseP2Idx] && (
                      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1 font-mono text-xs">
                    {(() => {
                      const inv = computeCogoInverse(boundaryPoints[cogoInverseP1Idx], boundaryPoints[cogoInverseP2Idx]);
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Horizontal Dist:</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">{inv.distance.toFixed(3)} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">WCB Azimuth:</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">{inv.bearingDeg.toFixed(2)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Quad Bearing:</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">{inv.quadBearing}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-blue-200 dark:border-blue-800">
                            <span>ΔX: {inv.deltaX > 0 ? `+${inv.deltaX}` : inv.deltaX}m</span>
                            <span>ΔY: {inv.deltaY > 0 ? `+${inv.deltaY}` : inv.deltaY}m</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Mode 5: FMB Ladder Sketcher Panel */}
          {activeMode === 'fmb' && (
            <div className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-teal-100 dark:border-teal-900/40 pb-2">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>FMB G-Line Ladder Offsets</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    — Field Measurement Book offset sketching
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">G-Line Length (m)</label>
                    <input
                      type="number"
                      value={fmbGLength}
                      onChange={(e) => setFmbGLength(parseFloat(e.target.value) || 10)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">G-Line Bearing (°)</label>
                    <input
                      type="number"
                      value={fmbGBearing}
                      onChange={(e) => setFmbGBearing(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {fmbOffsets.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">
                      No ladder offsets added yet.
                    </div>
                  ) : (
                    fmbOffsets.map((off, idx) => (
                      <div key={off.id} className="p-2 flex items-center justify-between font-mono text-[11px]">
                        <span>{off.pointLabel}: @{off.distanceAlongGLine}m</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-teal-700 dark:text-teal-300">{off.offsetDistance}m {off.side}</span>
                          <button
                            type="button"
                            onClick={() => setFmbOffsets(fmbOffsets.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Remove Offset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const dist = Math.min(fmbGLength, (fmbOffsets.length + 1) * 10);
                    const newOffset: CadFmbOffset = {
                      id: `off-${Date.now()}`,
                      distanceAlongGLine: dist,
                      offsetDistance: 15,
                      side: fmbOffsets.length % 2 === 0 ? 'L' : 'R',
                      pointLabel: `F${fmbOffsets.length + 1}`,
                    };
                    setFmbOffsets([...fmbOffsets, newOffset]);
                  }}
                  className="w-full py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add G-Line Offset Point</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyFmbToBoundary}
                  className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <DraftingCompass className="w-3.5 h-3.5" />
                  <span>Plot FMB Ladder to Canvas</span>
                </button>
              </div>
            </div>
          )}

          {/* State Cadastral Summary Box */}
          <div className="bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-tight flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{selectedState} Cadastral Units</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{stateDetails.region}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              {stateCadastralUnits.slice(0, 4).map((item) => (
                <div key={item.unit.key} className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-100 dark:border-slate-700">
                  <span className="text-[9.5px] text-slate-500 block truncate">{item.unit.name}</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">{item.formatted}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Action Hub: Export & Save */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Save &amp; Export CAD Plan
            </span>

            <button
              type="button"
              onClick={handleSaveCadProject}
              disabled={boundaryPoints.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Save Plot to Projects</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleExportDxf}
                disabled={boundaryPoints.length === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
                title="Download AutoCAD (.DXF)"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>AutoCAD (.DXF)</span>
              </button>

              <button
                type="button"
                onClick={handleExportSvg}
                disabled={boundaryPoints.length === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
                title="Download Vector SVG"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Vector (.SVG)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleSendToCalculator}
                disabled={boundaryPoints.length < 4}
                className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 disabled:opacity-40 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                title="Send dimensions to Area Calculator Tab"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
                <span>To Calculator</span>
              </button>

              <button
                type="button"
                onClick={handleExportGeoJson}
                disabled={boundaryPoints.length === 0}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                title="Export GeoJSON FeatureCollection"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>GeoJSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
