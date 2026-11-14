import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  Satellite,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UseGeolocationReturn } from '../../hooks/useGeolocation';
import { useAppMode } from '../../context/AppModeContext';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  geo: UseGeolocationReturn;
  onSelectState?: (stateName: string) => void;
  currentState?: string;
  onOpenAccuracyEngine?: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  geo,
  onSelectState,
  currentState,
  onOpenAccuracyEngine,
}) => {
  const { isSimple } = useAppMode();
  const [highAccuracy, setHighAccuracy] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleGrant = async () => {
    await geo.requestLocation(highAccuracy);
  };

  const handleApplyDetectedState = () => {
    if (geo.detectedState && onSelectState) {
      onSelectState(geo.detectedState);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Satellite className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-base sm:text-lg font-extrabold text-white">
                GPS Location & Permissions
              </h2>
              <p className="text-xs text-emerald-100">
                {isSimple
                  ? 'Enable location to measure land boundaries and center your map'
                  : 'Precision Field Survey & Bhuvan Cadastral Alignment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location modal"
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
          {/* Permission Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status:
              </span>
              {geo.permissionState === 'granted' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active & Granted
                </span>
              )}
              {geo.permissionState === 'prompt' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Permission Required
                </span>
              )}
              {geo.permissionState === 'denied' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Location Blocked
                </span>
              )}
              {geo.permissionState === 'unsupported' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                  Unsupported Browser
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleGrant}
              disabled={geo.isLoading}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${geo.isLoading ? 'animate-spin' : ''}`} />
              <span>{geo.coordinates ? 'Re-calibrate' : 'Test Fix'}</span>
            </button>
          </div>

          {/* Rationale description */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Why Sthal Measure uses device location:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-emerald-800">
              <li>
                <strong>GPS Walk Area:</strong> Auto-records boundary points as you walk the perimeter of your plot.
              </li>
              <li>
                <strong>ISRO Bhuvan Maps:</strong> Automatically centers satellite and cadastral survey numbers on your exact field.
              </li>
              <li>
                <strong>State Jurisdiction:</strong> Auto-selects regional revenue units (Cents, Guntas, Ankanams).
              </li>
            </ul>
          </div>

          {/* Error Message if any */}
          {geo.errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{geo.errorMessage}</p>
                {geo.permissionState === 'denied' && (
                  <p className="text-[11px] text-rose-700">
                    To allow: Tap the lock or tune icon (🔒) beside the website URL in your browser, tap <strong>Permissions</strong>, and turn on <strong>Location</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Live Coordinates Card when Available */}
          {geo.coordinates && (
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Live GPS Fix
                </span>
                {geo.accuracyRating && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      geo.accuracyRating.level === 'excellent'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : geo.accuracyRating.level === 'good'
                        ? 'bg-teal-950 text-teal-300 border border-teal-700'
                        : 'bg-amber-950 text-amber-300 border border-amber-700'
                    }`}
                  >
                    {geo.accuracyRating.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px] font-sans">Latitude:</span>
                  <span className="text-emerald-300 font-bold">{geo.coordinates.latitude.toFixed(6)}°</span>
                  {!isSimple && geo.dmsCoords && (
                    <span className="block text-[9px] text-slate-400 mt-0.5">{geo.dmsCoords.latDms}</span>
                  )}
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px] font-sans">Longitude:</span>
                  <span className="text-emerald-300 font-bold">{geo.coordinates.longitude.toFixed(6)}°</span>
                  {!isSimple && geo.dmsCoords && (
                    <span className="block text-[9px] text-slate-400 mt-0.5">{geo.dmsCoords.lngDms}</span>
                  )}
                </div>
              </div>

              {!isSimple && geo.coordinates.altitude !== null && geo.coordinates.altitude !== undefined && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Elevation / Altitude:</span>
                  <span className="text-white font-bold">{Math.round(geo.coordinates.altitude)} meters MSL</span>
                </div>
              )}
            </div>
          )}

          {/* Auto-detected Indian State Banner */}
          {geo.detectedState && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Detected State: {geo.detectedState}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Current active units: {currentState || 'Andhra Pradesh'}
                  </span>
                </div>
              </div>

              {currentState !== geo.detectedState && onSelectState && (
                <button
                  type="button"
                  onClick={handleApplyDetectedState}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition"
                >
                  Adopt {geo.detectedState}
                </button>
              )}
            </div>
          )}

          {/* High-Precision GPS Engine Promotion Card - Advanced Mode Only */}
          {!isSimple && onOpenAccuracyEngine && (
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>High-Precision GPS Engine</span>
                    <span className="text-[9px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                      Sub-Meter
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    Kalman 2D Filter, Static Epoch Averaging & GCP Benchmark Calibration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccuracyEngine();
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-xs transition"
              >
                Open Engine
              </button>
            </div>
          )}

          {/* High accuracy toggle */}
          <div className="flex items-center justify-between pt-1">
            <label htmlFor="high-accuracy-toggle" className="text-xs text-slate-600 cursor-pointer select-none">
              <span className="font-bold text-slate-800 block">High Accuracy GPS Hardware</span>
              <span className="text-[11px] text-slate-500">Uses device GNSS chips (GPS/NavIC/GLONASS) for sub-5m boundary fix</span>
            </label>
            <input
              id="high-accuracy-toggle"
              type="checkbox"
              checked={highAccuracy}
              onChange={(e) => setHighAccuracy(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleGrant}
            disabled={geo.isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
          >
            {geo.isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Acquiring Satellite Lock...</span>
              </>
            ) : geo.permissionState === 'granted' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Calibrate & Lock GPS</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span>Allow Location Access</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
