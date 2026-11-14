import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  User,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  Clock,
  History,
  AlertTriangle,
  Info,
  Check,
  Ban,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppUserRole, UserProfile } from '../../../types/auth';
import {
  FeatureKey,
  FeaturePermissionState,
  FEATURE_CATEGORIES,
  APPLICATION_FEATURES,
  UserFeaturePermissionsDoc,
  EffectiveUserPermissions,
  PermissionAuditEntry,
} from '../../../types/permissions';
import {
  searchUsersByEmail,
  fetchUserFeaturePermissions,
  saveUserFeaturePermissions,
  restoreUserDefaultPermissions,
} from '../../../services/adminService';
import { resolveSingleFeaturePermission } from '../../../utils/permissionResolver';

interface OwnerFeatureAccessManagerProps {
  actor: {
    uid: string;
    email: string;
    role: AppUserRole;
  };
}

export const OwnerFeatureAccessManager: React.FC<OwnerFeatureAccessManagerProps> = ({ actor }) => {
  // Search and selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // User permission data
  const [userDoc, setUserDoc] = useState<UserFeaturePermissionsDoc | null>(null);
  const [effectivePerms, setEffectivePerms] = useState<EffectiveUserPermissions | null>(null);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditEntry[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Local draft state for permissions
  const [draftPermissions, setDraftPermissions] = useState<Record<FeatureKey, FeaturePermissionState>>({} as any);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dialogs
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    measurement: true,
    surveying: true,
    mapping: true,
    cad_gis: true,
    projects: true,
    ai_tools: true,
    marketplace: true,
    learning: true,
    developer_tools: true,
  });

  // Debounced search for registered accounts
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsersByEmail(searchQuery);
        if (active) {
          setSearchResults(results);
          // If no user selected yet and results exist, default to the first or matching
          if (!selectedUser && results.length > 0 && !searchQuery) {
            handleSelectUser(results[0]);
          }
        }
      } catch (err) {
        console.warn('User search error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Load user permissions when selected
  const loadUserData = useCallback(async (user: UserProfile) => {
    setIsLoadingDetails(true);
    setStatusMessage(null);
    try {
      const data = await fetchUserFeaturePermissions(user.uid, actor);
      if (data) {
        setUserDoc(data.permissionDoc);
        setEffectivePerms(data.effectivePermissions);
        setAuditLogs(data.auditLogs);

        // Populate local draft
        const initialDraft: Record<FeatureKey, FeaturePermissionState> = {} as any;
        for (const feat of APPLICATION_FEATURES) {
          initialDraft[feat.key] = data.permissionDoc.permissions?.[feat.key] || 'inherited';
        }
        setDraftPermissions(initialDraft);
      } else {
        // No custom record yet, populate all with 'inherited'
        const initialDraft: Record<FeatureKey, FeaturePermissionState> = {} as any;
        for (const feat of APPLICATION_FEATURES) {
          initialDraft[feat.key] = 'inherited';
        }
        setDraftPermissions(initialDraft);
        setUserDoc(null);
        setEffectivePerms(null);
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load user permissions:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [actor]);

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    loadUserData(user);
  };

  // Detect dirty changes
  const hasChanges = useMemo(() => {
    if (!selectedUser) return false;
    for (const feat of APPLICATION_FEATURES) {
      const orig = userDoc?.permissions?.[feat.key] || 'inherited';
      const curr = draftPermissions[feat.key] || 'inherited';
      if (orig !== curr) return true;
    }
    return false;
  }, [selectedUser, userDoc, draftPermissions]);

  // List of modified features
  const changedFeaturesList = useMemo(() => {
    const list: { feat: typeof APPLICATION_FEATURES[0]; from: FeaturePermissionState; to: FeaturePermissionState }[] = [];
    for (const feat of APPLICATION_FEATURES) {
      const orig = userDoc?.permissions?.[feat.key] || 'inherited';
      const curr = draftPermissions[feat.key] || 'inherited';
      if (orig !== curr) {
        list.push({ feat, from: orig, to: curr });
      }
    }
    return list;
  }, [userDoc, draftPermissions]);

  // Toggle single feature state
  const handleSetState = (featureKey: FeatureKey, newState: FeaturePermissionState) => {
    if (!selectedUser) return;

    // Guard role boundary: standard user cannot be given 'on' for developer tools
    const feat = APPLICATION_FEATURES.find((f) => f.key === featureKey);
    if (feat?.category === 'developer_tools' && selectedUser.role === 'user' && newState === 'on') {
      setStatusMessage({
        text: `Role Boundary Notice: "${feat.label}" cannot be enabled for standard User accounts. Promote to Developer first.`,
        type: 'error',
      });
      return;
    }

    setDraftPermissions((prev) => ({
      ...prev,
      [featureKey]: newState,
    }));
  };

  // Commit save
  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveUserFeaturePermissions(
        {
          targetUid: selectedUser.uid,
          targetEmail: selectedUser.email,
          targetDisplayName: selectedUser.displayName,
          targetRole: selectedUser.role,
          permissions: draftPermissions,
        },
        actor
      );

      if (res.ok) {
        setStatusMessage({
          text: `Permissions successfully updated (v${res.permissionDoc?.permissionVersion || 1}) for ${selectedUser.email}.`,
          type: 'success',
        });
        if (res.permissionDoc) setUserDoc(res.permissionDoc);
        if (res.effectivePermissions) setEffectivePerms(res.effectivePermissions);
        setShowConfirmSave(false);
        // Refresh audit logs
        await loadUserData(selectedUser);
      } else {
        setStatusMessage({ text: res.message || 'Failed to update permissions.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error occurred during save.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Restore defaults
  const handleRestoreDefaults = async () => {
    if (!selectedUser) return;
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const res = await restoreUserDefaultPermissions(
        {
          targetUid: selectedUser.uid,
          targetEmail: selectedUser.email,
        },
        actor
      );

      if (res.ok) {
        setStatusMessage({
          text: `All overrides reset to inherited defaults for ${selectedUser.email}.`,
          type: 'success',
        });
        setShowConfirmRestore(false);
        await loadUserData(selectedUser);
      } else {
        setStatusMessage({ text: res.message || 'Failed to restore defaults.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error during restore.', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Guidance */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/80 border border-emerald-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Individual User Feature Access Management
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Owner Restricted
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Search registered accounts by email to selectively enable or disable individual application features with 6-tier precedence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Role Boundary Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Account Search & Selector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
          Search Registered Accounts by Email
        </label>
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type email address (e.g., surveyor@sthalmeasure.gov.in)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
          />
          {isSearching && (
            <div className="absolute right-3.5 top-3.5 text-xs text-slate-500 animate-pulse">
              Searching...
            </div>
          )}
        </div>

        {/* Results Chips / Quick Selector */}
        {searchResults.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {searchResults.map((u) => {
              const isSelected = selectedUser?.uid === u.uid;
              return (
                <button
                  key={u.uid}
                  onClick={() => handleSelectUser(u)}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-medium text-slate-200 truncate max-w-[200px]">
                      {u.email}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>{u.displayName || 'Surveyor'}</span>
                      <span className="text-slate-600">•</span>
                      <span className={`uppercase font-mono ${
                        u.role === 'owner' ? 'text-amber-400' : u.role === 'developer' ? 'text-cyan-400' : 'text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Account Profile Card */}
      {selectedUser && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                {(selectedUser.displayName || selectedUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {selectedUser.displayName || 'Surveyor Account'}
                  </h3>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                    selectedUser.role === 'owner'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : selectedUser.role === 'developer'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}>
                    Role: {selectedUser.role}
                  </span>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                    selectedUser.status === 'suspended'
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}>
                    Status: {selectedUser.status}
                  </span>
                  {userDoc?.permissionVersion && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                      Permissions v{userDoc.permissionVersion}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Email: <strong className="text-slate-200 font-mono">{selectedUser.email}</strong></span>
                  <span>UID: <strong className="text-slate-400 font-mono text-[11px]">{selectedUser.uid}</strong></span>
                  {userDoc?.updatedAt && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Last updated {new Date(userDoc.updatedAt).toLocaleDateString()} by {userDoc.updatedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                onClick={() => setShowConfirmRestore(true)}
                disabled={isRestoring || isSaving}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Restore Defaults
              </button>

              <button
                onClick={() => setShowConfirmSave(true)}
                disabled={!hasChanges || isSaving || isRestoring}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg ${
                  hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 animate-pulse'
                    : 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes {hasChanges ? `(${changedFeaturesList.length})` : ''}
              </button>
            </div>
          </div>

          {/* Feedback status message */}
          {statusMessage && (
            <div
              className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/50 border-red-500/40 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Owner Role Clearance Notice */}
          {selectedUser.role === 'owner' && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Super Admin Owner Account:</strong> Under Tier 2 administrative protection, Owner accounts maintain universal clearance across all features and cannot be locked out.
              </div>
            </div>
          )}

          {/* Suspended Status Notice */}
          {selectedUser.status === 'suspended' && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong>Account Suspended:</strong> Under Tier 1 account security, this account cannot access any application features regardless of individual overrides until reactivated.
              </div>
            </div>
          )}

          {/* Feature Matrix by Category */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Feature Permission Matrix ({APPLICATION_FEATURES.length} features)
              </h4>
              <span className="text-[11px] text-slate-400">
                Click ON/OFF to override or INHERITED to use role default
              </span>
            </div>

            {FEATURE_CATEGORIES.map((cat) => {
              const catFeatures = APPLICATION_FEATURES.filter((f) => f.category === cat.id);
              if (catFeatures.length === 0) return null;
              const isExpanded = expandedCategories[cat.id] ?? true;

              return (
                <div
                  key={cat.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl overflow-hidden transition"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategoryExpand(cat.id)}
                    className="w-full px-4 py-3 bg-slate-900/60 hover:bg-slate-900/90 flex items-center justify-between text-left transition border-b border-slate-800/60"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        {cat.label}
                        <span className="text-[11px] font-normal text-slate-400 font-mono">
                          ({catFeatures.length})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {cat.description}
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Feature Rows */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-850">
                      {catFeatures.map((feat) => {
                        const currentState = draftPermissions[feat.key] || 'inherited';
                        const origState = userDoc?.permissions?.[feat.key] || 'inherited';
                        const isDirty = currentState !== origState;

                        // Calculate effective preview
                        const single = resolveSingleFeaturePermission(
                          feat.key,
                          {
                            uid: selectedUser.uid,
                            role: selectedUser.role,
                            status: selectedUser.status,
                          },
                          currentState
                        );

                        const isDevTool = feat.category === 'developer_tools';
                        const isStandardUser = selectedUser.role === 'user';
                        const isProhibited = isDevTool && isStandardUser;

                        return (
                          <div
                            key={feat.key}
                            className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition ${
                              isDirty ? 'bg-emerald-950/20' : ''
                            }`}
                          >
                            <div className="flex-1 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-slate-200">
                                  {feat.label}
                                </span>
                                {isDirty && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Modified
                                  </span>
                                )}
                                {isDevTool && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    Dev Only
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                {feat.description}
                              </p>

                              {/* Effective State Explanatory Reason */}
                              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                                <span className="text-slate-400">Effective:</span>
                                {single.allowed ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> ALLOWED
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> BLOCKED
                                  </span>
                                )}
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-400 text-[10px]">{single.reason}</span>
                              </div>
                            </div>

                            {/* 3-State Controls */}
                            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-start md:self-center">
                              {/* ON Button */}
                              <button
                                type="button"
                                disabled={isProhibited}
                                onClick={() => handleSetState(feat.key, 'on')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                  currentState === 'on'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                } ${isProhibited ? 'opacity-40 cursor-not-allowed' : ''}`}
                                title={
                                  isProhibited
                                    ? 'Role boundary prevents enabling developer features for standard User accounts'
                                    : 'Explicitly enable for this user'
                                }
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ON
                              </button>

                              {/* INHERITED Button */}
                              <button
                                type="button"
                                onClick={() => handleSetState(feat.key, 'inherited')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                  currentState === 'inherited'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title="Inherit standard role defaults"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                INHERITED
                              </button>

                              {/* OFF Button */}
                              <button
                                type="button"
                                onClick={() => handleSetState(feat.key, 'off')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                  currentState === 'off'
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title="Explicitly disable for this user"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                OFF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Audit Trail Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-indigo-400" />
              Permission Change Audit Trail ({auditLogs.length} events recorded)
            </h4>

            {auditLogs.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-400 font-mono">
                No past permission modifications logged for this account.
              </div>
            ) : (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Owner / Author</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-emerald-400">
                          {log.ownerEmail || log.actorEmail || 'Owner'}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-indigo-300">
                          v{log.permissionVersion || (log.details as any)?.permissionVersion || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 max-w-xs truncate">
                          {log.details?.newPermissions
                            ? `Updated ${Object.keys(log.details.newPermissions).length} features`
                            : 'Permissions adjusted'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Save Changes */}
      {showConfirmSave && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Save className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Confirm Permission Update
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              You are about to modify access permissions for account{' '}
              <strong className="text-white font-mono">{selectedUser.email}</strong>.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto mb-5 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Changes to be committed ({changedFeaturesList.length}):
              </div>
              {changedFeaturesList.map(({ feat, from, to }) => (
                <div key={feat.key} className="text-xs flex items-center justify-between text-slate-300 py-0.5">
                  <span className="font-medium">{feat.label}:</span>
                  <span className="font-mono text-[11px]">
                    <span className="text-slate-400">{from.toUpperCase()}</span> →{' '}
                    <span className={to === 'on' ? 'text-emerald-400' : to === 'off' ? 'text-red-400' : 'text-blue-400'}>
                      {to.toUpperCase()}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/60"
              >
                {isSaving ? 'Committing...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Restore Defaults */}
      {showConfirmRestore && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Reset to Role Defaults?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This will remove all custom individual overrides for{' '}
              <strong className="text-white font-mono">{selectedUser.email}</strong> and revert every feature to{' '}
              <span className="text-blue-400 font-bold">INHERITED</span> (standard {selectedUser.role.toUpperCase()} defaults).
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmRestore(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleRestoreDefaults}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/60"
              >
                {isRestoring ? 'Resetting...' : 'Yes, Reset Overrides'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
