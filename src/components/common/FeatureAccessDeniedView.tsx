import React from 'react';
import { ShieldX, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';
import { FeatureKey, APPLICATION_FEATURES } from '../../types/permissions';
import { useUserPermissions } from '../../context/PermissionsContext';

interface FeatureAccessDeniedViewProps {
  featureKey: FeatureKey;
  onGoHome?: () => void;
  customMessage?: string;
}

export const FeatureAccessDeniedView: React.FC<FeatureAccessDeniedViewProps> = ({
  featureKey,
  onGoHome,
  customMessage,
}) => {
  const { getFeatureDenialReason } = useUserPermissions();
  const feat = APPLICATION_FEATURES.find((f) => f.key === featureKey);
  const denialReason = getFeatureDenialReason(featureKey);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-slate-900/90 border border-amber-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldX className="w-9 h-9" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Access Restricted
        </h2>

        <p className="text-sm font-semibold text-amber-400/90 mb-4 uppercase tracking-wider">
          {feat?.label || 'Feature Locked'}
        </p>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              {customMessage || (
                <span>
                  This feature is currently not enabled for your account. Please contact the STHAL MEASURE administrator.
                </span>
              )}
              {denialReason && (
                <div className="mt-2 text-slate-400 border-t border-slate-800/80 pt-2 font-mono text-[11px]">
                  Reason: {denialReason}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>
          )}
          <a
            href="mailto:support@sthalmeasure.gov.in?subject=Feature Access Request: Sthal Measure"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
          >
            <Mail className="w-4 h-4" />
            Contact Administrator
          </a>
        </div>
      </div>
    </div>
  );
};
