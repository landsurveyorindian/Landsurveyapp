import React from 'react';
import { Home, Calculator, DraftingCompass, Map, Layers, FolderKanban, ShoppingBag, Lock } from 'lucide-react';
import { useUserPermissions } from '../context/PermissionsContext';
import { FeatureKey } from '../types/permissions';

export type TabType = 'home' | 'tiles' | 'calc' | 'cadtools' | 'bhuvan' | 'cad' | 'projects' | 'market';

const TAB_FEATURE_MAP: Partial<Record<TabType, FeatureKey>> = {
  calc: 'land_measurement',
  cadtools: 'cad_tools',
  bhuvan: 'bhuvan_map',
  cad: 'dxf_exchange',
  projects: 'survey_projects',
  market: 'marketplace_browse',
};

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  savedCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  savedCount = 0,
}) => {
  const { hasPermission } = useUserPermissions();
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Home',
      sublabel: 'Dashboard & Tools',
      icon: Home,
    },
    {
      id: 'calc' as TabType,
      label: 'Calculator',
      sublabel: 'Triangulation & Patwari',
      icon: Calculator,
    },
    {
      id: 'cadtools' as TabType,
      label: 'Drafting Studio',
      sublabel: 'AutoCAD, Subdivide & COGO',
      icon: DraftingCompass,
      highlight: true,
    },
    {
      id: 'bhuvan' as TabType,
      label: 'Bhuvan 2D',
      sublabel: 'NRSC Satellite & GPS Walk',
      icon: Map,
    },
    {
      id: 'cad' as TabType,
      label: 'Import / Export',
      sublabel: 'DXF, Shapefile & KML Files',
      icon: Layers,
    },
    {
      id: 'projects' as TabType,
      label: 'Projects',
      sublabel: 'Surveys & Reports',
      icon: FolderKanban,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'market' as TabType,
      label: 'Market',
      sublabel: 'Verified Plots',
      icon: ShoppingBag,
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#06181d]/95 backdrop-blur-md border-t border-slate-200 dark:border-emerald-950/80 text-slate-600 dark:text-slate-400 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.4)] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-1 sm:px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'home' && activeTab === 'tiles');
            const featKey = TAB_FEATURE_MAP[tab.id];
            const isRestricted = featKey ? !hasPermission(featKey) : false;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center min-h-[44px] h-full py-1 transition-colors group ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                    : isRestricted
                    ? 'text-slate-400/60 dark:text-slate-500 hover:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-emerald-300'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 dark:bg-emerald-400 rounded-b-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400 stroke-[2.4]' : 'group-hover:scale-105'
                    }`}
                  />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2.5 bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                  {isRestricted && (
                    <span className="absolute -top-1 -left-2 bg-amber-500/90 text-slate-950 font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs" title="Feature Restricted">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-1 w-full px-0.5 text-center truncate sm:overflow-visible">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
