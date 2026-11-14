import React, { useState } from 'react';
import {
  Calculator,
  Compass,
  DraftingCompass,
  Map,
  Layers,
  Table,
  Share2,
  ArrowRightLeft,
  Navigation2,
  FolderKanban,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  Maximize2,
  Globe,
  Wrench,
  ArrowRight,
  MonitorPlay,
  Play,
  Lock,
} from 'lucide-react';
import { STATE_CONFIGS, convertArea, convertFromUnitToSqm, SQM_PER_UNIT } from '../../utils/units';
import { getStateUnitConfig, convertSqmToStateUnits } from '../../utils/indianStateUnits';
import { LocationStatusBar } from '../location/LocationStatusBar';
import { UseGeolocationReturn } from '../../hooks/useGeolocation';
import { useAppMode } from '../../context/AppModeContext';
import { useUserPermissions } from '../../context/PermissionsContext';

export type NavigateTarget =
  | { tab: 'calc'; subTab?: 'area' | '4sided' | '4sided_nodiag' | 'triangle' | 'fraction' | 'traverse' | 'converter' }
  | { tab: 'cadtools' }
  | { tab: 'bhuvan'; initialWalkMode?: boolean }
  | { tab: 'cad' }
  | { tab: 'projects' }
  | { tab: 'market' };

interface TilesDashboardProps {
  selectedState: string;
  onNavigate: (target: NavigateTarget) => void;
  savedCount: number;
  geo?: UseGeolocationReturn;
  onOpenLocationModal?: () => void;
  onOpenQualityReport?: () => void;
  onOpenPointManager?: () => void;
  onOpenVideoTutorials?: (episodeId?: string) => void;
}

export const TilesDashboard: React.FC<TilesDashboardProps> = ({
  selectedState,
  onNavigate,
  savedCount,
  geo,
  onOpenLocationModal,
  onOpenQualityReport,
  onOpenPointManager,
  onOpenVideoTutorials,
}) => {
  const { isSimple, isAdvanced } = useAppMode();
  const { hasPermission } = useUserPermissions();
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);

  // Mini quick-converter on tiles home
  const [quickValue, setQuickValue] = useState<number>(1);
  const [quickUnit, setQuickUnit] = useState<keyof typeof SQM_PER_UNIT>('acre');

  const sqm = convertFromUnitToSqm(quickValue, quickUnit);
  const quickBreakdown = convertArea(sqm);

  const stateConfig = STATE_CONFIGS[selectedState] || STATE_CONFIGS['All-India'];

  // Core 4 actions for everyday landowners
  const coreActions = [
    {
      id: 'gps_walk',
      title: 'Measure My Land',
      badge: 'Walk Perimeter',
      actionText: 'Start Walking Boundary',
      desc: 'Walk your boundary with your phone — auto-measures distance and computes exact area in local units.',
      icon: Navigation2,
      border: 'border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500',
      bg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
      action: () => onNavigate({ tab: 'bhuvan', initialWalkMode: true }),
    },
    {
      id: 'area_calc',
      title: 'Calculate Land Area',
      badge: '4-Sided & Triangle',
      actionText: 'Enter Plot Sides',
      desc: 'Measure your 4 boundaries or 3 triangle sides and get exact land area in your state’s local units.',
      icon: Maximize2,
      border: 'border-blue-300 dark:border-blue-800/80 hover:border-blue-500',
      bg: 'bg-gradient-to-br from-blue-50/90 via-teal-50/30 to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900',
      iconBg: 'bg-blue-600 text-white shadow-blue-500/20',
      action: () => onNavigate({ tab: 'calc', subTab: '4sided' }),
    },
    {
      id: 'projects',
      title: 'My Saved Surveys & Reports',
      badge: `${savedCount} Stored`,
      actionText: 'View Saved Surveys',
      desc: 'Access your previously measured land parcels, view certificates, and download or print survey reports.',
      icon: FolderKanban,
      border: 'border-violet-300 dark:border-violet-800/80 hover:border-violet-500',
      bg: 'bg-gradient-to-br from-violet-50/90 via-purple-50/30 to-white dark:from-violet-950/40 dark:via-slate-900 dark:to-slate-900',
      iconBg: 'bg-violet-600 text-white shadow-violet-500/20',
      action: () => onNavigate({ tab: 'projects' }),
    },
    {
      id: 'market',
      title: 'Land Marketplace',
      badge: 'Verified Land',
      actionText: 'Browse Plots for Sale',
      desc: 'Browse verified land plots for sale or list your property with verified survey records and revenue documents.',
      icon: ShoppingBag,
      border: 'border-amber-300 dark:border-amber-800/80 hover:border-amber-500',
      bg: 'bg-gradient-to-br from-amber-50/90 via-emerald-50/30 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900',
      iconBg: 'bg-emerald-700 text-white shadow-emerald-700/20',
      action: () => onNavigate({ tab: 'market' }),
    },
  ];

  // Professional / Advanced survey modules
  const advancedTiles = [
    {
      id: 'cadtools',
      title: 'Drafting Studio',
      subtitle: 'CAD Drafting, Sub-division, Setbacks & COGO',
      tag: 'AutoCAD Engine',
      icon: DraftingCompass,
      badge: 'Drafting CAD',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      action: () => onNavigate({ tab: 'cadtools' }),
    },
    {
      id: 'cad',
      title: 'File Import / Export',
      subtitle: 'AutoCAD DXF, GIS Shapefile & KML',
      tag: 'File Exchange',
      icon: Layers,
      badge: 'DXF / GIS',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-500',
      iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
      action: () => onNavigate({ tab: 'cad' }),
    },
    {
      id: 'bhuvan',
      title: 'Bhuvan 2D NRSC Map',
      subtitle: 'ISRO Satellite & Cadastral Boundaries',
      tag: 'NRSC ISRO',
      icon: Map,
      badge: 'Bhuvan Map',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-cyan-500',
      iconBg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
      action: () => onNavigate({ tab: 'bhuvan' }),
    },
    {
      id: 'traverse',
      title: 'Closed Traverse (Bowditch)',
      subtitle: 'Multi-sided plots with bearing & distance',
      tag: 'Field Survey',
      icon: Table,
      badge: 'Bowditch',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-rose-500',
      iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      action: () => onNavigate({ tab: 'calc', subTab: 'traverse' }),
    },
    {
      id: 'survey_quality',
      title: 'Survey Quality & Confidence',
      subtitle: 'Legal admissibility audit & precision score',
      tag: 'Audit Report',
      icon: ShieldCheck,
      badge: 'Audit Pro',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-teal-500',
      iconBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
      action: () => (onOpenQualityReport ? onOpenQualityReport() : onNavigate({ tab: 'calc', subTab: 'area' })),
    },
    {
      id: 'survey_points',
      title: 'Survey Stations & Benchmarks',
      subtitle: 'Capture & export WGS84/UTM stations',
      tag: 'Field Stations',
      icon: MapPin,
      badge: 'Stations',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-blue-500',
      iconBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      action: () => (onOpenPointManager ? onOpenPointManager() : onNavigate({ tab: 'bhuvan' })),
    },
    {
      id: 'fraction',
      title: 'Hissa Land Partition',
      subtitle: 'Calculate inheritance and legal co-owner shares',
      tag: 'Partition',
      icon: Share2,
      badge: 'Hissa Shares',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-lime-500',
      iconBg: 'bg-lime-50 text-lime-700 dark:bg-lime-950/80 dark:text-lime-300 border border-lime-200 dark:border-lime-800',
      action: () => onNavigate({ tab: 'calc', subTab: 'fraction' }),
    },
    {
      id: 'converter',
      title: 'Unit Converter',
      subtitle: 'All-India revenue and cadastral conversion',
      tag: 'Standards',
      icon: ArrowRightLeft,
      badge: 'Units',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-teal-500',
      iconBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
      action: () => onNavigate({ tab: 'calc', subTab: 'converter' }),
    },
  ];

  const stateDetails = getStateUnitConfig(selectedState);
  const stateUnitBreakdown = convertSqmToStateUnits(sqm, selectedState);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 py-2 sm:py-3.5 pb-24 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* State Standards Active Banner with Greenery Accents */}
      <div className="rounded-xl p-2.5 sm:p-3 mb-3 border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50/80 dark:from-emerald-950/50 dark:via-[#092920]/40 dark:to-emerald-950/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wider">
            {selectedState} Cadastral Standards
          </span>
          <span className="text-[9px] bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 px-2 py-0.5 rounded-full font-mono font-bold shadow-xs">
            {stateDetails.region} Zone
          </span>
          {stateDetails.code && (
            <span className="text-[9px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-mono font-bold">
              Code: {stateDetails.code}
            </span>
          )}
        </div>
        <p className="text-[10.5px] text-emerald-900 dark:text-emerald-200 font-medium leading-tight">
          {stateDetails.notes}
        </p>
      </div>

      {/* GPS Location & Permissions Status Bar */}
      {geo && onOpenLocationModal && (
        <div className="mb-3">
          <LocationStatusBar
            geo={geo}
            onOpenModal={onOpenLocationModal}
            selectedState={selectedState}
          />
        </div>
      )}

      {/* Featured Video Tutorial Academy Banner */}
      {onOpenVideoTutorials && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Open Sthal Measure Video Academy"
          onClick={() => onOpenVideoTutorials()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenVideoTutorials();
            }
          }}
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-[#07241c] via-[#093526] to-[#062018] p-3.5 sm:p-4 mb-4 text-white shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:border-emerald-400"
        >
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-[#051a13] rounded-[14px] flex items-center justify-center">
                  <MonitorPlay className="w-5 h-5 text-lime-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    STHAL MEASURE Video Academy
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider text-lime-300 font-mono">
                    18 Episodes
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Real-time screen recordings, audio narration &amp; interactive survey training.
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs shadow-md transition group-hover:from-emerald-300 group-hover:to-teal-300 shrink-0">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch</span>
            </span>
          </div>
        </div>
      )}

      {/* ================= SIMPLE MODE: 4 DOMINANT CARDS ================= */}
      {isSimple ? (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-600 rounded-full" />
                Land Measurement Tools
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose an action below to measure or calculate your plot
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Simple Mode
            </span>
          </div>

          {/* 4 Large Visually Dominant Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {coreActions.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5 ${item.bg} ${item.border}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${item.iconBg}`}>
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsible Advanced / Professional Tools Section */}
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Advanced / Professional Tools
                    </h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      8 Tools
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For licensed surveyors, civil engineers, and CAD professionals
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>{showAdvancedTools ? 'Hide' : 'Show All'}</span>
                {showAdvancedTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showAdvancedTools && (
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                  {advancedTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <div
                        key={tile.id}
                        onClick={tile.action}
                        className={`group relative rounded-xl border p-3 transition-all duration-150 cursor-pointer bg-slate-50/70 dark:bg-slate-800/60 ${tile.border} hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tile.iconBg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                              {tile.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-1">
                            {tile.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {tile.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ADVANCED MODE: FULL PROFESSIONAL GRID ================= */
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                Cadastral Surveying &amp; GIS Modules (Advanced)
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Full professional suite with CAD Drafting, Bowditch Traverse, and GIS interchange
              </p>
            </div>
            <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg shadow-xs">
              12 Active Modules
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[...coreActions.map((c) => ({
              id: c.id,
              title: c.title,
              subtitle: c.desc,
              badge: c.badge,
              icon: c.icon,
              border: 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-500',
              iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
              action: c.action,
            })), ...advancedTiles].map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.id}
                  onClick={tile.action}
                  className={`group relative overflow-hidden rounded-xl border p-3 transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900/90 ${tile.border} hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${tile.iconBg}`}>
                        <Icon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {tile.badge}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-1">
                      {tile.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {tile.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Land Conversion Cheat Bar featuring State-Specific Standards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs mb-6 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {selectedState} Local Unit Standards &amp; Instant Converter
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ tab: 'calc', subTab: 'converter' })}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 underline underline-offset-2"
          >
            <span>All State Standards</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              step="any"
              value={quickValue}
              onChange={(e) => setQuickValue(parseFloat(e.target.value) || 0)}
              className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={quickUnit}
              onChange={(e) => setQuickUnit(e.target.value as keyof typeof SQM_PER_UNIT)}
              aria-label="Select land measurement unit"
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none"
            >
              <option value="acre">Acres</option>
              <option value="cent">Cents (1/100 Ac)</option>
              <option value="gunta">Guntas (1/40 Ac)</option>
              <option value="bigha">Pucca Bigha</option>
              <option value="ankanam">Ankanams (72 sq ft)</option>
              <option value="ground">Grounds (2400 sq ft)</option>
              <option value="sqyd">Sq. Yards (Gaj)</option>
              <option value="sqft">Sq. Feet</option>
              <option value="sqm">Sq. Meters</option>
              <option value="hectare">Hectares</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            converted to official {selectedState} cadastral units:
          </span>
        </div>

        {/* Dynamic state-specific units grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {stateUnitBreakdown.slice(0, 6).map((item) => (
            <div
              key={item.unit.key}
              className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-xs"
            >
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block truncate" title={item.unit.name}>
                {item.unit.name}
              </span>
              <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {item.formatted}
              </span>
              {item.unit.localName && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate">
                  {item.unit.localName}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
