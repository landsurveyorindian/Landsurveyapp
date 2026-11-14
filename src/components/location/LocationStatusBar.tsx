import React from 'react';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2, ChevronRight, Satellite } from 'lucide-react';
import { UseGeolocationReturn } from '../../hooks/useGeolocation';

interface LocationStatusBarProps {
  geo: UseGeolocationReturn;
  onOpenModal: () => void;
  selectedState: string;
}

export const LocationStatusBar: React.FC<LocationStatusBarProps> = ({
  geo,
  onOpenModal,
  selectedState,
}) => {
  const isGranted = geo.permissionState === 'granted' && geo.coordinates;

  return (
    <div
      onClick={onOpenModal}
      className={`rounded-2xl border p-3 sm:p-3.5 transition-all cursor-pointer shadow-xs select-none ${
        isGranted
          ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-white dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-900 border-emerald-200/90 dark:border-emerald-800/80 hover:border-emerald-400'
          : geo.permissionState === 'denied'
          ? 'bg-gradient-to-r from-rose-50/90 via-white to-white dark:from-rose-950/60 dark:via-slate-900 dark:to-slate-900 border-rose-200 dark:border-rose-900 hover:border-rose-400'
          : 'bg-gradient-to-r from-amber-50/90 via-emerald-50/40 to-white dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-900 border-amber-200/90 dark:border-amber-900 hover:border-emerald-400'
      }`}
      title="Click to view GPS accuracy and configure location permissions"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isGranted
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : geo.permissionState === 'denied'
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-amber-500 text-white border-amber-600 shadow-xs'
            }`}
          >
            {isGranted ? (
              <Navigation className="w-4 h-4 text-white" />
            ) : (
              <Satellite className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                {isGranted ? (
                  <>
                    <span>Survey GPS: High Precision</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </>
                ) : geo.permissionState === 'denied' ? (
                  <>
                    <span>GPS Permission Blocked</span>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </>
                ) : (
                  <>
                    <span>Enable GPS Survey Location</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </>
                )}
              </span>

              {geo.coordinates?.isCalibrated && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700">
                  GCP Calibrated
                </span>
              )}

              {geo.accuracyRating && (
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  {geo.accuracyRating.label}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {isGranted ? (
                <span>
                  {geo.coordinates?.latitude.toFixed(6)}°N, {geo.coordinates?.longitude.toFixed(6)}°E
                  {geo.noiseReductionPercent > 0 && ` • ${geo.noiseReductionPercent}% Noise Filtered`}
                  {geo.detectedState && ` • Region: ${geo.detectedState}`}
                </span>
              ) : geo.permissionState === 'denied' ? (
                <span>Location access blocked in browser. Tap to view unblock guide.</span>
              ) : (
                <span>Tap to allow GPS for auto-boundary walk, Bhuvan map centering &amp; unit standards</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
            {isGranted ? 'GPS Settings' : 'Allow GPS'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 shadow-xs">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
