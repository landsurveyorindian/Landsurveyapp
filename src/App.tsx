import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider } from './firebase/AuthContext';
import { PermissionsProvider, useUserPermissions } from './context/PermissionsContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppModeProvider } from './context/AppModeContext';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { TilesDashboard, NavigateTarget } from './components/home/TilesDashboard';
import type { CalculatorSubTab } from './components/calculator/CalculatorTab';
import { SurveyProject, fetchUserProjects } from './services/projectsService';
import { FourSidedDimensions } from './utils/gis';
import { useAuth } from './firebase/AuthContext';
import { useGeolocation } from './hooks/useGeolocation';

import { SystemAnnouncementBanner } from './components/common/SystemAnnouncementBanner';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { BugReportModal } from './components/bug/BugReportModal';
import { FeatureAccessDeniedView } from './components/common/FeatureAccessDeniedView';

// Resilient lazy loader that retries on network hiccups or dev server restarts
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name: string
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      console.warn(`[LazyRetry] Dynamic import failed for ${name}, retrying...`, err);
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        return await factory();
      } catch (retryErr: any) {
        // If chunk failed to load (e.g. following dev server restart or bundle update),
        // trigger a clean reload once per session so browser picks up new modules
        const reloadKey = `sthal_chunk_reload_${name}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, 'true');
          window.location.reload();
        }
        throw retryErr;
      }
    }
  });
}

// Lazy-loaded tabs and heavy views with retry resilience
const CalculatorTab = lazyWithRetry(
  () => import('./components/calculator/CalculatorTab').then((m) => ({ default: m.CalculatorTab })),
  'CalculatorTab'
);
const BhuvanMapTab = lazyWithRetry(
  () => import('./components/bhuvan/BhuvanMapTab').then((m) => ({ default: m.BhuvanMapTab })),
  'BhuvanMapTab'
);
const CadGisTab = lazyWithRetry(
  () => import('./components/cad/CadGisTab').then((m) => ({ default: m.CadGisTab })),
  'CadGisTab'
);
const CadToolsTab = lazyWithRetry(
  () => import('./components/cadtools/CadToolsTab').then((m) => ({ default: m.CadToolsTab })),
  'CadToolsTab'
);
const ProjectsTab = lazyWithRetry(
  () => import('./components/projects/ProjectsTab').then((m) => ({ default: m.ProjectsTab })),
  'ProjectsTab'
);
const MarketplaceTab = lazyWithRetry(
  () => import('./components/market/MarketplaceTab').then((m) => ({ default: m.MarketplaceTab })),
  'MarketplaceTab'
);
const OwnerControlCenter = lazyWithRetry(
  () => import('./components/admin/owner/OwnerControlCenter').then((m) => ({ default: m.OwnerControlCenter })),
  'OwnerControlCenter'
);
const DeveloperDashboard = lazyWithRetry(
  () => import('./components/admin/developer/DeveloperDashboard').then((m) => ({ default: m.DeveloperDashboard })),
  'DeveloperDashboard'
);
const SignInModal = lazyWithRetry(
  () => import('./components/auth/SignInModal').then((m) => ({ default: m.SignInModal })),
  'SignInModal'
);
const LocationPermissionModal = lazyWithRetry(
  () => import('./components/location/LocationPermissionModal').then((m) => ({ default: m.LocationPermissionModal })),
  'LocationPermissionModal'
);
const GpsAccuracyModal = lazyWithRetry(
  () => import('./components/location/GpsAccuracyModal').then((m) => ({ default: m.GpsAccuracyModal })),
  'GpsAccuracyModal'
);
const VideoTutorialModal = lazyWithRetry(
  () => import('./components/tutorials/VideoTutorialModal').then((m) => ({ default: m.VideoTutorialModal })),
  'VideoTutorialModal'
);

import { ShieldAlert } from 'lucide-react';

export function requireOwner(role?: string): boolean {
  return role === 'owner';
}

export function requireDeveloper(role?: string): boolean {
  return role === 'owner' || role === 'developer';
}

export function requireAuthenticatedUser(user: any): boolean {
  return user !== null && user !== undefined;
}

function AccessDeniedView({
  requiredRole,
  userRole,
  onReturnHome,
}: {
  requiredRole: string;
  userRole: string;
  onReturnHome: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#071317] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-xl">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-xl sm:text-2xl font-black text-white mb-2">Access Denied</h1>
      <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
        This administration console requires <span className="font-bold text-amber-300">{requiredRole}</span> authorization.
        Your current role is <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase text-xs">{userRole || 'GUEST'}</span>.
      </p>
      <button
        type="button"
        onClick={onReturnHome}
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
      >
        Return to Survey Application
      </button>
    </div>
  );
}

function TabLoadingFallback({ message = 'Loading module...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{message}</span>
    </div>
  );
}

function AppContent() {
  const { user, isSignInModalOpen, closeSignInModal, role, loading: authLoading, activeView, setActiveView } = useAuth();
  const { hasPermission } = useUserPermissions();
  const geo = useGeolocation();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isGpsAccuracyModalOpen, setIsGpsAccuracyModalOpen] = useState<boolean>(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [selectedVideoEpisodeId, setSelectedVideoEpisodeId] = useState<string>('ep-01');

  const handleOpenVideoTutorials = (episodeId?: string) => {
    if (!hasPermission('video_academy')) {
      return;
    }
    if (episodeId) {
      setSelectedVideoEpisodeId(episodeId);
    }
    setIsVideoModalOpen(true);
  };

  // App starting index looks like tiles as requested by user
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedState, setSelectedState] = useState<string>('Andhra Pradesh');
  const [savedCount, setSavedCount] = useState<number>(0);
  const [prefillMarketProject, setPrefillMarketProject] = useState<SurveyProject | null>(null);
  const [calculatorSubTab, setCalculatorSubTab] = useState<CalculatorSubTab>('4sided');
  const [calcPrefillDimensions, setCalcPrefillDimensions] = useState<FourSidedDimensions | null>(null);

  const [bhuvanWalkMode, setBhuvanWalkMode] = useState<boolean>(false);

  // Browser history back navigation support: return to Home Dashboard when pressing Back from a tool tab
  useEffect(() => {
    if (activeTab !== 'home' && activeTab !== 'tiles') {
      window.history.pushState({ sthalTab: activeTab }, '');
    }
    const handlePopState = () => {
      if (activeTab !== 'home' && activeTab !== 'tiles') {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab]);

  // Initialize and sync badge count with real project list length
  useEffect(() => {
    let isMounted = true;
    fetchUserProjects(user?.uid).then((projects) => {
      if (isMounted) {
        setSavedCount(projects.length);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleProjectSaved = (_proj: SurveyProject) => {
    fetchUserProjects(user?.uid).then((projects) => {
      setSavedCount(projects.length);
    });
  };

  const handleSendToCalculator = (dims: FourSidedDimensions) => {
    setCalcPrefillDimensions(dims);
    setCalculatorSubTab('4sided');
    setActiveTab('calc');
  };

  const handlePublishToMarket = (project: SurveyProject) => {
    setPrefillMarketProject(project);
    setActiveTab('market');
  };

  const handleNavigateFromTiles = (target: NavigateTarget) => {
    if (target.tab === 'calc') {
      if (target.subTab) {
        setCalculatorSubTab(target.subTab);
      }
      setActiveTab('calc');
    } else if (target.tab === 'bhuvan') {
      setBhuvanWalkMode(Boolean(target.initialWalkMode));
      if (target.initialWalkMode && geo.permissionState !== 'granted') {
        setIsLocationModalOpen(true);
      }
      setActiveTab('bhuvan');
    } else {
      setActiveTab(target.tab);
    }
  };

  // If user is routed to Owner Control Center - strictly guarded by requireOwner
  if (activeView === 'owner') {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#071317] flex items-center justify-center">
          <TabLoadingFallback message="Verifying Owner authorization claims..." />
        </div>
      );
    }

    if (!requireOwner(role)) {
      return (
        <AccessDeniedView
          requiredRole="Super Admin Owner"
          userRole={role}
          onReturnHome={() => setActiveView('app')}
        />
      );
    }

    return (
      <Suspense fallback={<TabLoadingFallback message="Loading Owner Control Center..." />}>
        <OwnerControlCenter />
        <BugReportModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} />
        <SignInModal isOpen={isSignInModalOpen} onClose={closeSignInModal} />
      </Suspense>
    );
  }

  // If user is routed to Developer Dashboard - strictly guarded by requireDeveloper
  if (activeView === 'developer') {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#071317] flex items-center justify-center">
          <TabLoadingFallback message="Verifying Developer credentials..." />
        </div>
      );
    }

    if (!requireDeveloper(role)) {
      return (
        <AccessDeniedView
          requiredRole="Technical Administrator (Developer)"
          userRole={role}
          onReturnHome={() => setActiveView('app')}
        />
      );
    }

    return (
      <Suspense fallback={<TabLoadingFallback message="Loading Developer Dashboard..." />}>
        <DeveloperDashboard />
        <BugReportModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} />
        <SignInModal isOpen={isSignInModalOpen} onClose={closeSignInModal} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071317] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors duration-200">
      {/* System Announcement Banner (Admin Broadcast) */}
      <SystemAnnouncementBanner />

      {/* Subtle Ambient Accents */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Fixed Header with direct Home Dashboard shortcut & GPS location controls */}
      <Header
        selectedState={selectedState}
        onSelectState={setSelectedState}
        onGoHome={() => setActiveTab('home')}
        gpsActive={Boolean(geo.coordinates)}
        gpsAccuracy={geo.coordinates?.accuracy}
        geoPermissionState={geo.permissionState}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenAccuracyEngine={() => setIsGpsAccuracyModalOpen(true)}
        onOpenBugReport={() => setIsBugModalOpen(true)}
        onOpenVideoTutorials={handleOpenVideoTutorials}
      />

      {/* Offline Field Mode Connectivity Indicator */}
      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {(activeTab === 'home' || activeTab === 'tiles') && (
          <TilesDashboard
            selectedState={selectedState}
            onNavigate={handleNavigateFromTiles}
            savedCount={savedCount}
            geo={geo}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onOpenQualityReport={() => {
              setCalculatorSubTab('4sided');
              setActiveTab('calc');
            }}
            onOpenPointManager={() => {
              setActiveTab('bhuvan');
            }}
            onOpenVideoTutorials={handleOpenVideoTutorials}
          />
        )}

        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'calc' && (
            !hasPermission('land_measurement') ? (
              <FeatureAccessDeniedView
                featureKey="land_measurement"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <CalculatorTab
                selectedState={selectedState}
                initialSubTab={calculatorSubTab}
                initialDimensions={calcPrefillDimensions}
                onProjectSaved={handleProjectSaved}
              />
            )
          )}

          {activeTab === 'bhuvan' && (
            !hasPermission('bhuvan_map') ? (
              <FeatureAccessDeniedView
                featureKey="bhuvan_map"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <BhuvanMapTab
                selectedState={selectedState}
                initialWalkMode={bhuvanWalkMode}
                onProjectSaved={handleProjectSaved}
                onSendToCalculator={handleSendToCalculator}
                geo={geo}
              />
            )
          )}

          {activeTab === 'cadtools' && (
            !hasPermission('cad_tools') ? (
              <FeatureAccessDeniedView
                featureKey="cad_tools"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <CadToolsTab
                selectedState={selectedState}
                onProjectSaved={handleProjectSaved}
                onSendToCalculator={handleSendToCalculator}
              />
            )
          )}

          {activeTab === 'cad' && (
            !hasPermission('dxf_exchange') && !hasPermission('gis_shapefile') ? (
              <FeatureAccessDeniedView
                featureKey="dxf_exchange"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <CadGisTab
                selectedState={selectedState}
                onProjectSaved={handleProjectSaved}
                onSendToCalculator={handleSendToCalculator}
              />
            )
          )}

          {activeTab === 'projects' && (
            !hasPermission('survey_projects') ? (
              <FeatureAccessDeniedView
                featureKey="survey_projects"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <ProjectsTab
                selectedState={selectedState}
                onPublishToMarket={handlePublishToMarket}
                onProjectsCountChange={(count) => setSavedCount(count)}
              />
            )
          )}

          {activeTab === 'market' && (
            !hasPermission('marketplace_browse') ? (
              <FeatureAccessDeniedView
                featureKey="marketplace_browse"
                onGoHome={() => setActiveTab('home')}
              />
            ) : (
              <MarketplaceTab
                selectedState={selectedState}
                prefillProject={prefillMarketProject}
                onClearPrefill={() => setPrefillMarketProject(null)}
              />
            )
          )}
        </Suspense>
      </main>

      {/* Fixed Bottom Navigation Bar with Tiles Home tab */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        savedCount={savedCount}
      />

      <Suspense fallback={null}>
        {/* User Bug Report & Feedback Modal */}
        <BugReportModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} />

        {/* Branded Sign In Modal */}
        <SignInModal isOpen={isSignInModalOpen} onClose={closeSignInModal} />

        {/* GPS Location & Permissions Modal */}
        <LocationPermissionModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          geo={geo}
          onSelectState={setSelectedState}
          currentState={selectedState}
          onOpenAccuracyEngine={() => setIsGpsAccuracyModalOpen(true)}
        />

        {/* High-Precision GPS Engine Modal (Kalman Filter, Static Averaging, GCP Calibration) */}
        <GpsAccuracyModal
          isOpen={isGpsAccuracyModalOpen}
          onClose={() => setIsGpsAccuracyModalOpen(false)}
          geo={geo}
        />

        {/* In-App Video Tutorial Academy & Interactive Player */}
        <VideoTutorialModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          initialEpisodeId={selectedVideoEpisodeId}
          onNavigateToTool={handleNavigateFromTiles}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <AppModeProvider>
            <AppContent />
          </AppModeProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
