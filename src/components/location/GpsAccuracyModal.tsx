import React, { useState } from 'react';
import {
  Satellite,
  Compass,
  MapPin,
  CheckCircle2,
  X,
  Sparkles,
  Sliders,
  Target,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UseGeolocationReturn } from '../../hooks/useGeolocation';
import { toDms } from '../../utils/geoUtils';
import { useAppMode } from '../../context/AppModeContext';
import { getSimpleGpsRating } from '../../utils/appMode';
import { ChevronDown, ChevronUp, Wrench, Navigation2, Info } from 'lucide-react';

interface GpsAccuracyModalProps {
  isOpen: boolean;
  onClose: () => void;
  geo: UseGeolocationReturn;
  onAddPointToMap?: (coords: [number, number]) => void;
}

export const GpsAccuracyModal: React.FC<GpsAccuracyModalProps> = ({
  isOpen,
  onClose,
  geo,
  onAddPointToMap,
}) => {
  const { isSimple, isAdvanced } = useAppMode();
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stationary' | 'calibration'>('overview');
  const [copied, setCopied] = useState<boolean>(false);
  const [targetEpochs, setTargetEpochs] = useState<number>(20);

  // Calibration input states
  const [calKnownLat, setCalKnownLat] = useState<string>('');
  const [calKnownLng, setCalKnownLng] = useState<string>('');
  const [calBenchmarkName, setCalBenchmarkName] = useState<string>('Boundary Stone #1');
  const [calSuccessNotice, setCalSuccessNotice] = useState<string | null>(null);
  const [calErrorNotice, setCalErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const coords = geo.coordinates;
  const raw = geo.rawCoordinates;
  const simpleRating = getSimpleGpsRating(coords?.accuracy, !!coords);

  const handleCopyCoords = () => {
    if (!coords) return;
    const text = `${coords.latitude.toFixed(7)}, ${coords.longitude.toFixed(7)} (Acc: ±${coords.accuracy.toFixed(1)}m)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setCalErrorNotice(null);
    const lat = parseFloat(calKnownLat);
    const lng = parseFloat(calKnownLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCalErrorNotice('Please enter valid decimal latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    const cal = geo.calibrateAtKnownPoint(lat, lng, calBenchmarkName || 'Survey Benchmark');
    setCalSuccessNotice(
      `Calibrated successfully! Offset: ${cal.offsetMeters}m applied to all survey coordinates.`
    );
    setTimeout(() => setCalSuccessNotice(null), 4000);
  };

  const handleApplyStationaryPointToMap = () => {
    if (!coords) return;
    if (onAddPointToMap) {
      onAddPointToMap([coords.longitude, coords.latitude]);
      onClose();
    }
  };

  const showProfessionalTabs = isAdvanced || showAdvancedTools;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-accuracy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              {isSimple && !showAdvancedTools ? (
                <Navigation2 className="w-5 h-5 text-emerald-200" />
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="gps-accuracy-title" className="text-base sm:text-lg font-extrabold text-white">
                  {isSimple && !showAdvancedTools ? 'GPS Signal & Accuracy' : 'High-Precision GPS Engine'}
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  simpleRating === 'Good'
                    ? 'bg-emerald-400 text-slate-950'
                    : simpleRating === 'OK'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-rose-400 text-slate-950'
                }`}>
                  {isSimple && !showAdvancedTools ? `GPS: ${simpleRating}` : 'Sub-Meter Filter'}
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                {isSimple && !showAdvancedTools
                  ? 'Real-time location status and boundary walk readiness'
                  : 'Kalman 2D Geodetic Filter • Static Epoch Averaging • Benchmark Calibration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GPS modal"
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs - Shown when in Advanced mode or when user expands Advanced GPS Tools */}
        {showProfessionalTabs ? (
          <div>
            {isSimple && (
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <span className="font-semibold">Showing Advanced Surveyor Tools</span>
                <button
                  type="button"
                  onClick={() => setShowAdvancedTools(false)}
                  className="font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Back to Simple Summary
                </button>
              </div>
            )}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live Filter & Stats</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stationary')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'stationary'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Stationary Averaging</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calibration')}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'calibration'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>GCP Calibration</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          {/* ================= SIMPLE MODE OVERVIEW ================= */}
          {!showProfessionalTabs && (
            <div className="space-y-4">
              {/* Primary Signal Indicator Card */}
              <div className={`p-4 rounded-2xl border ${
                simpleRating === 'Good'
                  ? 'bg-emerald-50/90 border-emerald-300'
                  : simpleRating === 'OK'
                  ? 'bg-amber-50/90 border-amber-300'
                  : 'bg-rose-50/90 border-rose-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Satellite Accuracy
                  </span>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                    simpleRating === 'Good'
                      ? 'bg-emerald-600 text-white'
                      : simpleRating === 'OK'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    Signal: {simpleRating}
                  </span>
                </div>

                <div className="text-2xl font-black text-slate-900 font-mono">
                  {coords?.accuracy ? `±${coords.accuracy.toFixed(1)} meters` : 'Searching for satellites...'}
                </div>

                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  {simpleRating === 'Good' && 'Your GPS signal is strong! Excellent for walking perimeter boundaries and calculating acreage.'}
                  {simpleRating === 'OK' && 'Signal is acceptable. For higher precision, hold your phone flat away from tall trees or metal roofs.'}
                  {simpleRating === 'Poor' && 'Signal is weak. Step into an open area with clear sky view to improve accuracy before walking.'}
                  {simpleRating === 'No Signal' && 'Allow location access and move outdoors to acquire satellite connection.'}
                </p>
              </div>

              {/* Coordinates Card */}
              {coords && (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-sans font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Current Coordinates
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="text-xs font-sans font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Latitude</span>
                      <span className="text-emerald-300 font-bold">{coords.latitude.toFixed(6)}° N</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Longitude</span>
                      <span className="text-emerald-300 font-bold">{coords.longitude.toFixed(6)}° E</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advice card for walking land */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>How to measure your land boundary:</span>
                </div>
                <p>1. Tap <strong>Measure My Land</strong> from the home screen.</p>
                <p>2. Walk steadily along your plot borders, pausing at each corner stone.</p>
                <p>3. Tap <strong>Close Boundary</strong> when back at your starting corner to get exact area.</p>
              </div>

              {/* Advanced GPS Tools Disclosure Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedTools(true)}
                className="w-full p-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-between text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>Advanced GPS Tools (Kalman Filter, Averaging &amp; GCP Calibration)</span>
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
          {/* TAB 1: OVERVIEW & COMPARISON */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Raw Device GNSS Box */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Device Raw GPS
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Unfiltered
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-800 font-mono">
                      ±{raw?.accuracy ? Math.round(raw.accuracy) : '--'}m
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Standard smartphone antenna jitter, multipath noise, atmospheric delay.
                    </p>
                    <div className="pt-2 text-[11px] font-mono text-slate-600 truncate">
                      {raw ? `${raw.latitude.toFixed(6)}°, ${raw.longitude.toFixed(6)}°` : 'Searching...'}
                    </div>
                  </div>
                </div>

                {/* Enhanced High-Precision GNSS Box */}
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Enhanced Precision
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                      {geo.noiseReductionPercent > 0 ? `${geo.noiseReductionPercent}% Quieter` : 'Optimal'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-emerald-800 font-mono flex items-center gap-2">
                      <span>±{coords?.accuracy ? coords.accuracy.toFixed(1) : '--'}m</span>
                      {coords?.accuracy && coords.accuracy <= 2.5 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                          Survey Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      2D Kalman smoothed, velocity gated, multipath spike rejection.
                    </p>
                    <div className="pt-2 text-[11px] font-mono text-emerald-900 font-bold truncate">
                      {coords ? `${coords.latitude.toFixed(6)}°, ${coords.longitude.toFixed(6)}°` : 'Ready'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Algorithm Mode Switcher */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Active Real-Time Enhancement Filter
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => geo.setFilterMode('kalman')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      geo.filterMode === 'kalman'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>Kalman 2D</span>
                      {geo.filterMode === 'kalman' && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Best for walking perimeter
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      geo.setFilterMode('stationary');
                      setActiveTab('stationary');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      geo.filterMode === 'stationary'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>Static Epoch</span>
                      {geo.filterMode === 'stationary' && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Best for corner stones
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => geo.setFilterMode('raw')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      geo.filterMode === 'raw'
                        ? 'border-slate-800 bg-slate-100 text-slate-900 ring-1 ring-slate-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1">
                      <span>Raw GNSS</span>
                      {geo.filterMode === 'raw' && <Check className="w-3 h-3 text-slate-800" />}
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Device default bypass
                    </div>
                  </button>
                </div>
              </div>

              {/* Live Coordinates Detail Card */}
              {coords && (
                <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Enhanced High-Precision Fix
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="text-[11px] font-sans font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">DECIMAL COORDS</span>
                      <span className="text-emerald-300 font-bold">
                        {coords.latitude.toFixed(7)}°N
                      </span>
                      <br />
                      <span className="text-emerald-300 font-bold">
                        {coords.longitude.toFixed(7)}°E
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DMS NOTATION</span>
                      <span>{toDms(coords.latitude, true)}</span>
                      <br />
                      <span>{toDms(coords.longitude, false)}</span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-sans border-t border-slate-800">
                    <span>
                      Total Fixes Filtered: <strong>{geo.sampleCount}</strong>
                    </span>
                    <span>
                      Mode: <strong className="text-emerald-300 uppercase">{coords.filterMode}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STATIONARY BOUNDARY STONE AVERAGING */}
          {activeTab === 'stationary' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-emerald-900">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>Stationary Waypoint Averaging (Static Epoch Integration)</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  In cadastral land surveying, holding your device still over a boundary stone or corner peg
                  for 15 to 30 seconds allows the Central Limit Theorem to eliminate uncorrelated satellite
                  jitter. The app calculates the inverse-variance weighted mean, reducing uncertainty down to
                  sub-meter precision!
                </p>
              </div>

              {/* Averaging Controls & Progress */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Target Observation Epochs</span>
                    <span className="text-[11px] text-slate-500">More samples = tighter precision</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[10, 20, 30, 60].map((count) => (
                      <button
                        key={count}
                        type="button"
                        disabled={geo.isStationaryAveraging}
                        onClick={() => setTargetEpochs(count)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                          targetEpochs === count
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {count}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">
                      Epochs Collected:{' '}
                      <strong className="text-slate-900 font-mono">
                        {geo.stationaryProgress.count} / {targetEpochs}
                      </strong>
                    </span>
                    <span className="font-mono text-emerald-700">
                      Converged: ±{geo.stationaryProgress.convergedAccuracy.toFixed(2)}m
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (geo.stationaryProgress.count / targetEpochs) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  {geo.stationaryProgress.stdDevMeters > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                      <span>Spatial Spread: ±{geo.stationaryProgress.stdDevMeters}m</span>
                      <span>
                        Status: {geo.stationaryProgress.isComplete ? 'Target Reached' : 'Collecting...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {!geo.isStationaryAveraging ? (
                    <button
                      type="button"
                      onClick={() => geo.startStationaryAveraging(targetEpochs)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Start Boundary Stone Averaging</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => geo.stopStationaryAveraging()}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lock Point (±{geo.stationaryProgress.convergedAccuracy.toFixed(1)}m)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => geo.resetStationaryAveraging()}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
                        title="Reset Averaging"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {onAddPointToMap && coords && geo.stationaryProgress.count >= 5 && (
                  <button
                    type="button"
                    onClick={handleApplyStationaryPointToMap}
                    className="w-full py-2 px-3 rounded-lg border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Locked Vertex Directly to Field Boundary</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GROUND CONTROL POINT (GCP) CALIBRATION */}
          {activeTab === 'calibration' && (
            <div className="space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3.5 text-xs text-cyan-950 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-cyan-900">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  <span>Ground Control Point (GCP) Differential Calibration</span>
                </div>
                <p className="text-cyan-800 leading-relaxed">
                  Eliminates systematic local datum shift or ionospheric bias by tying your device to a known
                  FMB boundary stone, cadastral benchmark, or surveyed ground truth coordinate.
                </p>
              </div>

              {/* Active Calibration Status */}
              {geo.calibration ? (
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Calibration Active: {geo.calibration.benchmarkName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => geo.clearCalibration()}
                      className="text-xs font-bold text-rose-700 hover:text-rose-800 underline"
                    >
                      Clear Offset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-emerald-700 block text-[10px]">CORRECTION VECTOR</span>
                      <span>ΔLat: {geo.calibration.deltaLat > 0 ? '+' : ''}{geo.calibration.deltaLat.toFixed(7)}°</span>
                      <br />
                      <span>ΔLng: {geo.calibration.deltaLng > 0 ? '+' : ''}{geo.calibration.deltaLng.toFixed(7)}°</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[10px]">TOTAL DISPLACEMENT</span>
                      <span className="font-bold text-emerald-900">{geo.calibration.offsetMeters} meters</span>
                      <br />
                      <span className="text-[10px] text-emerald-600">Applied to all readings</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  No active calibration offset. GPS coordinates are using unshifted WGS84 ellipsoid.
                </div>
              )}

              {/* Calibration Form */}
              <form onSubmit={handleApplyCalibration} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-800 block">
                  Calibrate at Known Survey Benchmark
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Benchmark / Stone Name
                    </label>
                    <input
                      type="text"
                      value={calBenchmarkName}
                      onChange={(e) => setCalBenchmarkName(e.target.value)}
                      placeholder="e.g. Village FMB Stone #12"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Known True Latitude (°N)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={calKnownLat}
                        onChange={(e) => setCalKnownLat(e.target.value)}
                        placeholder={coords ? coords.latitude.toFixed(6) : '16.506200'}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Known True Longitude (°E)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={calKnownLng}
                        onChange={(e) => setCalKnownLng(e.target.value)}
                        placeholder={coords ? coords.longitude.toFixed(6) : '80.648000'}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {calErrorNotice && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{calErrorNotice}</span>
                  </div>
                )}

                {calSuccessNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{calSuccessNotice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Compute & Apply Differential Offset</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enhanced Geodetic WGS84 Precision</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
