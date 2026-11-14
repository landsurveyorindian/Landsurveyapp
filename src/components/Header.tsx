import React from 'react';
import {
  ShieldCheck,
  User as UserIcon,
  LogOut,
  LogIn,
  Navigation2,
  Home,
  Sun,
  Moon,
  MapPin,
  Sparkles,
  Shield,
  Code2,
  Bug,
  MonitorPlay,
} from 'lucide-react';
import { useAuth } from '../firebase/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppMode } from '../context/AppModeContext';
import { useUserPermissions } from '../context/PermissionsContext';
import { getSimpleGpsRating } from '../utils/appMode';
import { getAllIndianStates, IndianRegion } from '../utils/indianStateUnits';

interface HeaderProps {
  selectedState: string;
  onSelectState: (state: string) => void;
  onGoHome?: () => void;
  gpsActive?: boolean;
  gpsAccuracy?: number | null;
  onOpenLocationModal?: () => void;
  onOpenAccuracyEngine?: () => void;
  geoPermissionState?: string;
  onOpenBugReport?: () => void;
  onOpenVideoTutorials?: (episodeId?: string) => void;
}

const REGION_ORDER: IndianRegion[] = [
  'National',
  'South',
  'North',
  'West',
  'East',
  'Central',
  'North-East',
  'Union Territory',
];

const REGION_LABELS: Record<IndianRegion, string> = {
  National: 'National Standard',
  South: 'South India (AP, TS, KA, TN, KL)',
  North: 'North India (UP, PB, HR, RJ, HP, UK)',
  West: 'West India (MH, GJ, GA)',
  East: 'East India (BR, JH, WB, OD)',
  Central: 'Central India (MP, CG)',
  'North-East': 'North-East India (AS, TR, ML, MN, MZ, NL, AR, SK)',
  'Union Territory': 'Union Territories (DL, CH, JK, LA, PY, AN, DN, LD)',
};

export const Header: React.FC<HeaderProps> = ({
  selectedState,
  onSelectState,
  onGoHome,
  gpsActive = false,
  gpsAccuracy = null,
  onOpenLocationModal,
  onOpenAccuracyEngine,
  geoPermissionState = 'prompt',
  onOpenBugReport,
  onOpenVideoTutorials,
}) => {
  const { user, userProfile, role, activeView, setActiveView, openSignInModal, signOut } = useAuth();
  const { hasPermission } = useUserPermissions();
  const { theme, isDark, toggleTheme } = useTheme();
  const { mode, setMode, isSimple, isAdvanced } = useAppMode();

  const simpleGpsRating = getSimpleGpsRating(gpsAccuracy, gpsActive);

  const allStates = getAllIndianStates();

  // Group states by region for clean optgroup navigation
  const groupedStates = REGION_ORDER.reduce((acc, region) => {
    const statesInRegion = allStates.filter((s) => s.region === region);
    if (statesInRegion.length > 0) {
      acc[region] = statesInRegion;
    }
    return acc;
  }, {} as Record<IndianRegion, typeof allStates>);

  return (
    <header className="sticky top-0 z-40 select-none shadow-lg border-b border-emerald-900/40 backdrop-blur-sm transition-colors duration-200 bg-gradient-to-r from-[#0b4632] via-[#0e5c3e] to-[#083827] dark:from-[#052117] dark:via-[#093526] dark:to-[#041a12]">
      {/* Decorative subtle organic greenery contour lines overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-2.5 relative">
        {/* Main Header Container: 2-tier workstation layout on mobile & tablet, unified on wide desktop */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 sm:gap-2.5">
          {/* Top Row / Left Section: Brand Logo & Title + Tablet/Mobile Quick Utilities */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Clickable Brand Logo */}
            <div
              onClick={onGoHome}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group py-0.5 shrink-0"
              title="Return to Sthal Measure Home Dashboard"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-400 via-teal-300 to-lime-300 p-0.5 shadow-md flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-[#0a3928] rounded-[10px] flex items-center justify-center">
                  <span className="font-black text-emerald-300 text-base sm:text-lg tracking-tighter">S</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-base sm:text-lg tracking-tight text-white drop-shadow-xs whitespace-nowrap">
                    STHAL <span className="text-emerald-300">MEASURE</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 shadow-xs shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-lime-300" />
                    PRO GIS
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-100/80 font-medium hidden xs:block truncate max-w-[220px] sm:max-w-none">
                  All-India Cadastral Geomatics &amp; Precision Survey
                </p>
              </div>
            </div>

            {/* Mobile & Tablet Header Right Utilities: Theme Toggle, Bug Report, Admin Console & User Profile (Hidden on XL desktop to avoid duplication) */}
            <div className="flex items-center gap-1.5 sm:gap-2 xl:hidden shrink-0">
              {/* Day / Night Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Greenery Mode' : 'Switch to Dark Forest Mode'}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 flex items-center justify-center transition active:scale-95 shadow-xs shrink-0"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : (
                  <Moon className="w-4 h-4 text-emerald-200" />
                )}
              </button>

              {/* In-App Video Tutorial Academy Button (Mobile/Tablet) */}
              {onOpenVideoTutorials && hasPermission('video_academy') && (
                <button
                  type="button"
                  onClick={() => onOpenVideoTutorials()}
                  title="Open STHAL MEASURE Video Tutorial Academy (18 Episodes)"
                  aria-label="Open Video Tutorials"
                  className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/60 text-white flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0 cursor-pointer"
                >
                  <MonitorPlay className="w-4 h-4 text-lime-300" />
                  <span className="hidden xs:inline text-xs font-black">Videos</span>
                </button>
              )}

              {/* Bug Report Button */}
              {onOpenBugReport && (
                <button
                  type="button"
                  onClick={onOpenBugReport}
                  title="Report a bug / issue"
                  aria-label="Report a bug"
                  className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-500/40 text-amber-300 flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0"
                >
                  <Bug className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold text-emerald-100">Report</span>
                </button>
              )}

              {/* Owner / Developer Console Switcher */}
              {role === 'owner' && (
                <button
                  type="button"
                  onClick={() => setActiveView(activeView === 'owner' ? 'app' : 'owner')}
                  title="Toggle Owner Control Center"
                  className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-md active:scale-95 transition shrink-0"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{activeView === 'owner' ? 'App' : 'Owner'}</span>
                </button>
              )}

              {role === 'developer' && (
                <button
                  type="button"
                  onClick={() => setActiveView(activeView === 'developer' ? 'app' : 'developer')}
                  title="Toggle Developer Dashboard"
                  className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-md active:scale-95 transition shrink-0"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{activeView === 'developer' ? 'App' : 'Dev'}</span>
                </button>
              )}

              {/* User Sign In / Profile */}
              {user ? (
                <div className="h-9 sm:h-10 flex items-center gap-1 sm:gap-1.5 bg-[#072d1f]/90 border border-emerald-600/50 rounded-xl px-2 sm:px-2.5 text-xs shadow-xs text-white shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Surveyor'}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full ring-1 ring-emerald-400 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-950 shrink-0">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col hidden sm:flex max-w-[80px] md:max-w-[120px]">
                    <span className="truncate text-emerald-100 font-bold text-[11px] leading-tight">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        role === 'owner'
                          ? 'text-amber-300'
                          : role === 'developer'
                          ? 'text-cyan-300'
                          : 'text-emerald-300/80'
                      }`}
                    >
                      {role === 'owner' ? 'Admin' : role === 'developer' ? 'Dev' : 'User'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    title="Sign out"
                    aria-label="Sign out"
                    className="text-emerald-300 hover:text-rose-300 p-1 rounded transition-colors ml-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openSignInModal}
                  title="Sign in to Sthal Measure"
                  className="h-9 sm:h-10 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs px-2.5 sm:px-3 rounded-xl transition shadow-sm flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Bar: Mode Switch, State Selector, GPS Status, Home Dashboard & Desktop Theme/Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
            {/* Simple / Advanced Mode Toggle Switch */}
            <div
              role="radiogroup"
              aria-label="Application Interface Mode"
              className="flex items-center bg-[#052318] border border-emerald-500/60 rounded-xl p-0.5 shadow-inner shrink-0"
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSimple}
                onClick={() => setMode('simple')}
                className={`min-h-[36px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  isSimple
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
                title="Simple Mode: Easy land measurement for landowners (Measure Land, Calculate Area, Saved Projects, Market)"
              >
                <span>Simple</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isAdvanced}
                onClick={() => setMode('advanced')}
                className={`min-h-[36px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  isAdvanced
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
                title="Advanced Mode: Full professional CAD drafting, COGO traverse, Bowditch balancing, and GIS tools"
              >
                <span>Advanced</span>
              </button>
            </div>

            {/* Home Shortcut Button */}
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                title="Return to Home Dashboard"
                className="min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-100 flex items-center gap-1.5 text-xs font-bold transition shadow-xs active:scale-95 shrink-0"
              >
                <Home className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            {/* All-India State Cadastral Jurisdiction Selector */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px] sm:min-w-[180px] md:min-w-[210px] max-w-[280px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-300">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <select
                id="state-jurisdiction-select"
                aria-label="Select Indian State Cadastral Standard"
                value={selectedState}
                onChange={(e) => onSelectState(e.target.value)}
                className="w-full min-h-[36px] sm:min-h-[38px] bg-[#072d1f]/90 hover:bg-[#093a28] focus:bg-[#083324] text-xs sm:text-sm font-extrabold text-white border border-emerald-500/60 focus:border-emerald-300 rounded-xl pl-8 pr-7 py-1.5 focus:outline-none transition-colors cursor-pointer appearance-none shadow-inner truncate"
              >
                {REGION_ORDER.map((region) => {
                  const statesInReg = groupedStates[region];
                  if (!statesInReg || statesInReg.length === 0) return null;
                  return (
                    <optgroup
                      key={region}
                      label={REGION_LABELS[region]}
                      className="bg-[#0b3827] text-emerald-300 font-bold"
                    >
                      {statesInReg.map((st) => (
                        <option
                          key={st.state}
                          value={st.state}
                          className="bg-[#08281c] text-white font-medium py-1"
                        >
                          {st.state} {st.code ? `(${st.code})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-300">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            {/* GPS Signal Status Pill (Simplified for Common Users, High-Precision for Advanced) */}
            {(onOpenLocationModal || onOpenAccuracyEngine) && (
              <button
                type="button"
                onClick={
                  isAdvanced && gpsActive && onOpenAccuracyEngine
                    ? onOpenAccuracyEngine
                    : onOpenLocationModal || onOpenAccuracyEngine
                }
                title={
                  isSimple
                    ? `GPS Signal: ${simpleGpsRating} (Tap to check location accuracy)`
                    : gpsActive
                    ? 'High-Precision GPS Engine (Kalman Filtered & Benchmark Calibrated)'
                    : 'GPS Accuracy & Location Permissions'
                }
                className={`min-h-[36px] sm:min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs border shrink-0 ${
                  gpsActive
                    ? simpleGpsRating === 'Good'
                      ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-400 text-emerald-100'
                      : simpleGpsRating === 'OK'
                      ? 'bg-teal-950/70 hover:bg-teal-900/80 border-teal-400 text-teal-200'
                      : 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-500 text-amber-200'
                    : geoPermissionState === 'denied'
                    ? 'bg-rose-950/70 hover:bg-rose-900/80 border-rose-600 text-rose-200'
                    : 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-500 text-amber-200'
                }`}
              >
                <Navigation2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    gpsActive
                      ? 'text-lime-300 animate-pulse'
                      : geoPermissionState === 'denied'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                />
                <span className="hidden xs:inline">
                  {isSimple ? (
                    gpsActive ? `GPS: ${simpleGpsRating}` : geoPermissionState === 'denied' ? 'GPS Blocked' : 'GPS Setup'
                  ) : (
                    gpsActive
                      ? `±${gpsAccuracy ? `${(Math.round(gpsAccuracy * 10) / 10).toFixed(1)}m` : 'OK'}`
                      : geoPermissionState === 'denied'
                      ? 'GPS Denied'
                      : 'GPS Setup'
                  )}
                </span>
                <span className="xs:hidden">
                  {isSimple ? (gpsActive ? simpleGpsRating : 'GPS') : gpsActive ? `±${(gpsAccuracy || 1).toFixed(0)}m` : 'GPS'}
                </span>
              </button>
            )}

            {/* Desktop Theme Toggle (Displayed only on XL screens where whole bar is single-row) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Greenery Mode' : 'Switch to Dark Forest Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="hidden xl:flex min-h-[38px] w-[38px] rounded-xl bg-[#072d1f]/90 hover:bg-[#093a28] border border-emerald-600/50 text-emerald-200 items-center justify-center transition active:scale-95 shadow-xs shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-200" />
              )}
            </button>

            {/* Desktop Video Tutorial Academy Button (Displayed on XL screens) */}
            {onOpenVideoTutorials && hasPermission('video_academy') && (
              <button
                type="button"
                onClick={() => onOpenVideoTutorials()}
                title="Open STHAL MEASURE Video Tutorial Academy (18 Complete Episodes)"
                className="hidden xl:flex min-h-[38px] px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/60 text-white items-center gap-1.5 text-xs font-black shadow-md transition active:scale-95 shrink-0 cursor-pointer"
              >
                <MonitorPlay className="w-4 h-4 text-lime-300" />
                <span>Tutorials</span>
                <span className="bg-emerald-950/70 text-lime-300 text-[10px] px-1.5 py-0.2 rounded font-mono">18</span>
              </button>
            )}

            {/* Desktop Bug Report Button (Displayed only on XL screens) */}
            {onOpenBugReport && (
              <button
                type="button"
                onClick={onOpenBugReport}
                title="Report a bug or problem to developers"
                className="hidden xl:flex min-h-[38px] px-2.5 rounded-xl bg-[#072d1f]/90 hover:bg-[#093a28] border border-emerald-600/50 text-amber-300 items-center gap-1.5 text-xs font-bold transition active:scale-95 shadow-xs shrink-0"
              >
                <Bug className="w-3.5 h-3.5" />
                <span className="text-emerald-200">Report</span>
              </button>
            )}

            {/* Desktop Owner Control Center Switcher (Displayed only on XL screens) */}
            {role === 'owner' && (
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'owner' ? 'app' : 'owner')}
                title="Toggle Owner Control Center"
                className="hidden xl:flex min-h-[38px] px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 items-center gap-1.5 text-xs font-black shadow-md transition active:scale-95 shrink-0"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{activeView === 'owner' ? 'Survey App' : 'Owner Center'}</span>
              </button>
            )}

            {/* Desktop Developer Dashboard Switcher (Displayed only on XL screens) */}
            {role === 'developer' && (
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'developer' ? 'app' : 'developer')}
                title="Toggle Developer Dashboard"
                className="hidden xl:flex min-h-[38px] px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 items-center gap-1.5 text-xs font-black shadow-md transition active:scale-95 shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{activeView === 'developer' ? 'Survey App' : 'Dev Dashboard'}</span>
              </button>
            )}

            {/* Desktop User Auth Pill (Displayed only on XL screens) */}
            <div className="hidden xl:flex items-center shrink-0">
              {(user || userProfile) ? (
                <div className="flex items-center gap-2 bg-[#072d1f]/90 border border-emerald-600/50 rounded-xl px-2.5 py-1.5 text-xs shadow-xs text-white">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || userProfile?.displayName || 'Surveyor'}
                      className="w-5 h-5 rounded-full ring-1 ring-emerald-400 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0">
                      {(userProfile?.displayName || user?.displayName || userProfile?.email || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="max-w-[100px] 2xl:max-w-[120px] truncate text-emerald-100 font-bold leading-tight">
                      {userProfile?.displayName || user?.displayName || userProfile?.email?.split('@')[0] || user?.email?.split('@')[0]}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        role === 'owner'
                          ? 'text-amber-300'
                          : role === 'developer'
                          ? 'text-cyan-300'
                          : 'text-emerald-300/80'
                      }`}
                    >
                      {role === 'owner' ? 'Super Admin' : role === 'developer' ? 'Developer' : 'Surveyor'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    title="Sign out"
                    aria-label="Sign out"
                    className="text-emerald-300 hover:text-rose-300 p-1 rounded transition-colors ml-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openSignInModal}
                  title="Sign in to Sthal Measure"
                  className="min-h-[38px] flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95"
                >
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
