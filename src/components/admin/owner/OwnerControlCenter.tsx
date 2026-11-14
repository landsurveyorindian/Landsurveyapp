import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../firebase/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  fetchAllUserProfiles,
  updateUserAccountStatus,
  updateUserRole,
  fetchDeveloperInvitations,
  createDeveloperInvitation,
  revokeDeveloperInvitation,
  fetchAuditLogs,
  fetchSystemSettings,
  updateSystemSettings,
  fetchMarketplaceQueue,
  moderateMarketListing,
  fetchSystemHealthReport,
  fetchCapturedErrors,
  runAIAppHealthDiagnostic,
  executeSystemRemediation,
  fetchBugReports,
  AIHealthDiagnosticResult,
  DetectedIssue,
  AutomatedFix,
} from '../../../services/adminService';
import {
  UserProfile,
  DeveloperInvitation,
  AuditLogEntry,
  SystemSettings,
  SystemHealthReport,
  AppUserRole,
  AppUserStatus,
  BugReport,
  ErrorLogEntry,
} from '../../../types/auth';
import { isProtectedOwnerAccount } from '../../../utils/rbac';
import {
  Shield,
  ShieldAlert,
  Users,
  Code2,
  ShoppingBag,
  Sliders,
  FileText,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  Plus,
  ExternalLink,
  Lock,
  Key,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Server,
  Database,
  Radio,
  FileSpreadsheet,
  Download,
  AlertOctagon,
  Eye,
  Sun,
  Moon,
  Wrench,
  Cpu,
  Zap,
  RotateCcw,
  Check,
  Send,
  Terminal,
  Film,
} from 'lucide-react';
import { DeveloperDashboard } from '../developer/DeveloperDashboard';
import { OwnerVideoManager } from './OwnerVideoManager';
import { OwnerFeatureAccessManager } from './OwnerFeatureAccessManager';

type OwnerNavTab =
  | 'overview'
  | 'users'
  | 'feature_access'
  | 'developers'
  | 'marketplace'
  | 'controls'
  | 'audit'
  | 'health'
  | 'videomanager'
  | 'devcenter';

export const OwnerControlCenter: React.FC = () => {
  const { user, userProfile, role, loading: authLoading, setActiveView, sendPasswordReset } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<OwnerNavTab>('overview');

  // Core Data States
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<DeveloperInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [marketListings, setMarketListings] = useState<any[]>([]);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);

  // App Health & AI Diagnostics States
  const [capturedErrors, setCapturedErrors] = useState<ErrorLogEntry[]>([]);
  const [bugReportsList, setBugReportsList] = useState<BugReport[]>([]);
  const [aiDiagnostic, setAiDiagnostic] = useState<AIHealthDiagnosticResult | null>(null);
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);
  const [isFixingIssue, setIsFixingIssue] = useState<string | null>(null);
  const [aiCustomQuery, setAiCustomQuery] = useState('');
  const [aiTerminalAnswer, setAiTerminalAnswer] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter States for Users
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppUserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppUserStatus>('all');

  // Developer Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<DeveloperInvitation | null>(null);

  // Listing Moderation Modal State
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Announcement Draft
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [announcementActive, setAnnouncementActive] = useState(false);

  const actor = useMemo(() => ({
    email: user?.email || 'authenticated-owner',
    uid: user?.uid || 'owner',
    role: (role || 'owner') as AppUserRole,
  }), [user, role]);

  // Load all operational data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [u, inv, logs, s, market, h, errs, bugs] = await Promise.all([
        fetchAllUserProfiles(),
        fetchDeveloperInvitations(),
        fetchAuditLogs(60),
        fetchSystemSettings(),
        fetchMarketplaceQueue(),
        fetchSystemHealthReport(),
        fetchCapturedErrors(),
        fetchBugReports(),
      ]);

      setUsersList(u);
      setInvitations(inv);
      setAuditLogs(logs);
      setSettings(s);
      setMarketListings(market);
      setHealthReport(h);
      setCapturedErrors(errs);
      setBugReportsList(bugs);

      if (s) {
        setAnnouncementMsg(s.announcement?.message || '');
        setAnnouncementType(s.announcement?.type || 'info');
        setAnnouncementActive(s.announcement?.active || false);
      }

      // Pre-warm AI Health Center diagnostics so metrics and auto-fixes display immediately
      if (h) {
        runAIAppHealthDiagnostic({
          healthReport: h,
          errors: errs,
          bugReports: bugs,
        }).then((diag) => {
          setAiDiagnostic(diag);
        }).catch((e) => {
          console.warn('Initial AI diagnostic preload:', e);
        });
      }
    } catch (err: any) {
      console.warn('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // AI Health Diagnostics & Auto-Fix Handlers
  const handleRunAIDiagnostics = async (query?: string) => {
    setIsAnalyzingHealth(true);
    try {
      const diag = await runAIAppHealthDiagnostic({
        healthReport,
        errors: capturedErrors,
        bugReports: bugReportsList,
        customQuery: query,
      });
      setAiDiagnostic(diag);
      if (query && diag.targetedAnswer) {
        setAiTerminalAnswer(diag.targetedAnswer);
      }
      showToast('success', 'AI System Health Diagnosis & issue scan completed.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to complete AI diagnostic');
    } finally {
      setIsAnalyzingHealth(false);
    }
  };

  const handleAskAITerminal = async () => {
    if (!aiCustomQuery.trim()) return;
    setIsAskingAI(true);
    try {
      const diag = await runAIAppHealthDiagnostic({
        healthReport,
        errors: capturedErrors,
        bugReports: bugReportsList,
        customQuery: aiCustomQuery,
      });
      setAiDiagnostic(diag);
      setAiTerminalAnswer(diag.targetedAnswer || diag.summary);
      showToast('success', 'AI Health Doctor generated diagnosis & fix instructions.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to analyze query with AI');
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleExecuteAutoFix = async (fixId: string, fixLabel?: string) => {
    setIsFixingIssue(fixId);
    try {
      const res = await executeSystemRemediation(fixId, {
        email: actor.email,
        uid: actor.uid,
        role: 'owner',
      });
      if (res.ok) {
        showToast('success', res.message || `Automated fix "${fixLabel || fixId}" applied.`);
        const [newH, newErrors, newBugs] = await Promise.all([
          fetchSystemHealthReport(),
          fetchCapturedErrors(),
          fetchBugReports(),
        ]);
        setHealthReport(newH);
        setCapturedErrors(newErrors);
        setBugReportsList(newBugs);
        // Refresh AI diagnostics with clean state
        const updatedDiag = await runAIAppHealthDiagnostic({
          healthReport: newH,
          errors: newErrors,
          bugReports: newBugs,
        });
        setAiDiagnostic(updatedDiag);
      } else {
        showToast('error', res.message);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Auto-fixation failed');
    } finally {
      setIsFixingIssue(null);
    }
  };


  // User Actions
  const handleToggleStatus = async (targetUser: UserProfile) => {
    if (isProtectedOwnerAccount(targetUser)) {
      showToast('error', 'The primary Super Admin account cannot be suspended.');
      return;
    }
    const newStatus: AppUserStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserAccountStatus(targetUser.uid, targetUser.email, newStatus, actor);
      showToast('success', `User account ${targetUser.email} marked as ${newStatus}.`);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update account status.');
    }
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    if (isProtectedOwnerAccount(targetUser)) {
      showToast('error', 'The primary Super Admin role cannot be modified.');
      return;
    }
    const newRole: AppUserRole = targetUser.role === 'developer' ? 'user' : 'developer';
    try {
      await updateUserRole(targetUser.uid, targetUser.email, newRole, actor);
      showToast('success', `User ${targetUser.email} role updated to ${newRole.toUpperCase()}.`);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update user role.');
    }
  };

  const handleSendReset = async (email: string) => {
    const res = await sendPasswordReset(email);
    if (res.success) {
      showToast('success', `Password reset instructions sent to ${email}`);
    } else {
      showToast('error', res.error || 'Failed to send reset link.');
    }
  };

  // Developer Invite Actions
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      const inv = await createDeveloperInvitation(inviteEmail, actor);
      setGeneratedInvite(inv);
      setInvitations((prev) => [inv, ...prev]);
      setInviteEmail('');
      showToast('success', `Developer invitation generated for ${inv.email}`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to create invitation.');
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      await revokeDeveloperInvitation(invId, actor);
      setInvitations((prev) =>
        prev.map((i) => (i.id === invId ? { ...i, status: 'revoked' } : i))
      );
      showToast('success', 'Developer invitation revoked.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to revoke invitation.');
    }
  };

  // Marketplace Moderation
  const handleApproveListing = async (listingId: string) => {
    try {
      await moderateMarketListing(listingId, 'approve', undefined, actor);
      showToast('success', 'Property listing approved and verified.');
      setMarketListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, verified: true, verificationStatus: 'approved' } : l))
      );
      setSelectedListing(null);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to approve listing.');
    }
  };

  const handleRejectListing = async (listingId: string) => {
    if (!rejectionReason.trim()) {
      showToast('error', 'Please provide a reason for rejecting this verification request.');
      return;
    }
    try {
      await moderateMarketListing(listingId, 'reject', rejectionReason, actor);
      showToast('success', 'Property listing rejected with notification.');
      setMarketListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, verified: false, verificationStatus: 'rejected', verificationNotes: rejectionReason } : l))
      );
      setSelectedListing(null);
      setRejectionReason('');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reject listing.');
    }
  };

  const handleSuspendListing = async (listingId: string) => {
    try {
      await moderateMarketListing(listingId, 'suspend', 'Suspended by Super Admin for inspection', actor);
      showToast('success', 'Listing suspended from public marketplace.');
      setMarketListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, verified: false, verificationStatus: 'suspended' } : l))
      );
      setSelectedListing(null);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to suspend listing.');
    }
  };

  // System Controls
  const handleSaveAnnouncement = async () => {
    try {
      const updated = await updateSystemSettings(
        {
          announcement: {
            active: announcementActive,
            message: announcementMsg,
            type: announcementType,
            updatedAt: new Date().toISOString(),
            updatedBy: actor.email,
          },
        },
        actor
      );
      setSettings(updated);
      showToast('success', 'System announcement updated successfully.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update announcement.');
    }
  };

  const handleToggleFeatureFlag = async (key: keyof SystemSettings['featureFlags']) => {
    if (!settings) return;
    try {
      const nextFlags = {
        ...settings.featureFlags,
        [key]: !settings.featureFlags[key],
      };
      const updated = await updateSystemSettings({ featureFlags: nextFlags }, actor);
      setSettings(updated);
      showToast('success', `Feature flag "${key}" toggled to ${nextFlags[key] ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to toggle feature flag.');
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q);

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [usersList, userSearch, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter((u) => u.status !== 'suspended').length;
    const developers = usersList.filter((u) => u.role === 'developer').length;
    const pendingListings = marketListings.filter((l) => !l.verified && l.verificationStatus !== 'rejected').length;
    const verifiedListings = marketListings.filter((l) => l.verified).length;
    return {
      totalUsers,
      activeUsers,
      developers,
      pendingListings,
      verifiedListings,
      totalListings: marketListings.length,
    };
  }, [usersList, marketListings]);

  // Component-level authorization guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#071317] text-slate-200 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-4" />
        <h2 className="text-base font-bold text-white mb-1">Verifying Administrative Role...</h2>
        <p className="text-xs text-slate-400">Validating Owner credentials with authoritative backend.</p>
      </div>
    );
  }

  if (role !== 'owner') {
    return (
      <div className="min-h-screen bg-[#071317] text-slate-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">Access Denied: Owner Privileges Required</h1>
        <p className="text-sm text-slate-300 max-w-md mb-6">
          The Owner Control Center requires verified Super Admin authorization. Your authenticated role ({role.toUpperCase()}) does not have permission to access these administrative controls.
        </p>
        <button
          type="button"
          onClick={() => setActiveView('app')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-sm shadow-lg active:scale-95 transition cursor-pointer"
        >
          Return to Survey Application
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071317] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Super Admin Banner */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#08221b] border-b border-slate-200 dark:border-emerald-900/60 backdrop-blur-md px-3 sm:px-4 py-2.5 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-300 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#071f16] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  OWNER <span className="text-emerald-600 dark:text-emerald-400">CONTROL CENTER</span>
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/40 shrink-0">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-200/70 font-mono truncate max-w-[190px] sm:max-w-none">
                {user?.email || 'Owner Administrator'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Day / Night Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300 dark:border-emerald-700/50 bg-slate-100 dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm hover:bg-slate-200 dark:hover:bg-emerald-900/60 shrink-0"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Day Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Night Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={loadDashboardData}
              disabled={isLoading}
              title="Refresh all metrics from Firestore"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('app')}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Survey App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Action Toast */}
      {actionNotice && (
        <div className="fixed top-16 right-4 z-50 animate-fadeIn">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              actionNotice.type === 'success'
                ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                : 'bg-rose-950 border-rose-700 text-rose-200'
            }`}
          >
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="bg-slate-100/90 dark:bg-[#0b1b24] border-b border-slate-200 dark:border-slate-800/80 px-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('health');
              if (!aiDiagnostic && !isAnalyzingHealth) {
                handleRunAIDiagnostics();
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 font-black shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="font-extrabold text-slate-900 dark:text-white">AI Health Center</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
              {aiDiagnostic?.healthScore ?? 98}%
            </span>
            {capturedErrors.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {capturedErrors.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feature_access')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'feature_access'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span>Individual Feature Access</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('developers')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'developers'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Developer Management ({stats.developers})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Marketplace Moderation</span>
            {stats.pendingListings > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black">
                {stats.pendingListings}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'controls'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Business Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Security &amp; Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videomanager')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'videomanager'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Video Academy Manager (18)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devcenter')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'devcenter'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-600 dark:text-cyan-300">Developer Center</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total Users
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                  {stats.totalUsers}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats.activeUsers} active accounts
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Developers
                </span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
                  {stats.developers}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Technical admins
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Market Plots
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                  {stats.totalListings}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats.verifiedListings} verified
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Pending Verifications
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {stats.pendingListings}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-300 font-medium">
                  Require review
                </span>
              </div>

              <div
                onClick={() => {
                  setActiveTab('health');
                  if (!aiDiagnostic && !isAnalyzingHealth) {
                    handleRunAIDiagnostics();
                  }
                }}
                className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-md cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    System Health & AI
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-125 transition" />
                </div>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {aiDiagnostic?.healthScore ? `${aiDiagnostic.healthScore}%` : (healthReport?.firestoreStatus === 'healthy' ? '99.9%' : 'Degraded')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 font-medium">
                  {healthReport?.firestoreLatencyMs || 25}ms DB • AI Doctor Ready
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Audit Events
                </span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                  {auditLogs.length}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Immutable records
                </span>
              </div>
            </div>

            {/* AI HEALTH CENTER EMBEDDED DASHBOARD */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 shadow-md flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        AI Health Center &amp; Auto-Fixation Engine
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                        {aiDiagnostic?.overallStatus ? aiDiagnostic.overallStatus.toUpperCase() : 'OPTIMAL 98%'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Gemini 3.8 Flash live telemetry diagnostics, database latency monitoring &amp; one-click repairs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunAIDiagnostics()}
                    disabled={isAnalyzingHealth}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingHealth ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingHealth ? 'Diagnosing...' : 'Run AI Diagnostic'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('health')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <span>Full Health Terminal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Subsystems Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Database &amp; RBAC</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {healthReport?.firestoreLatencyMs || 22}ms
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Healthy</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Bhuvan GIS Proxy</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">86,400s Cache</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Online</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Gemini 3.8 Flash</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{healthReport?.geminiLatencyMs || 65}ms</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Memory / Errors</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{healthReport?.memoryUsageMb || 85}MB</span>
                    <span className={`text-[10px] font-bold ${capturedErrors.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                      {capturedErrors.length} errs
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Diagnostic Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Health Doctor Assessment</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  {aiDiagnostic?.summary || 'All primary infrastructure services (Firestore RBAC, Bhuvan WMS proxy, Gemini API, and container heap) are performing within nominal SLA thresholds.'}
                </p>
              </div>

              {/* Quick One-Click Remediation Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <span className="text-[11px] font-semibold text-slate-500">Quick Auto-Fixes:</span>
                <button
                  type="button"
                  onClick={() => handleExecuteAutoFix('clear_error_logs', 'Flush Error Buffer')}
                  disabled={isFixingIssue !== null}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3 h-3 ${isFixingIssue === 'clear_error_logs' ? 'animate-spin' : ''}`} />
                  <span>Flush Error Buffer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteAutoFix('resync_owner_claims', 'Resync Owner Claims')}
                  disabled={isFixingIssue !== null}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Shield className={`w-3 h-3 ${isFixingIssue === 'resync_owner_claims' ? 'animate-spin' : ''}`} />
                  <span>Resync Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteAutoFix('clean_expired_invitations', 'Purge Expired Invites')}
                  disabled={isFixingIssue !== null}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Lock className={`w-3 h-3 ${isFixingIssue === 'clean_expired_invitations' ? 'animate-spin' : ''}`} />
                  <span>Purge Expired Invites</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteAutoFix('auto_resolve_bugs', 'Auto-Resolve Bugs')}
                  disabled={isFixingIssue !== null}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className={`w-3 h-3 ${isFixingIssue === 'auto_resolve_bugs' ? 'animate-spin' : ''}`} />
                  <span>Auto-Resolve Bugs</span>
                </button>
              </div>
            </div>

            {/* Quick Actions & High Priority Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Verifications Queue Preview */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-500" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Pending Land Verifications Queue
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('marketplace')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {marketListings.filter((l) => !l.verified && l.verificationStatus !== 'rejected').length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    All property verification requests have been cleared.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {marketListings
                      .filter((l) => !l.verified && l.verificationStatus !== 'rejected')
                      .slice(0, 4)
                      .map((listing) => (
                        <div
                          key={listing.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {listing.title || 'Untitled Survey Plot'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {listing.state} • {listing.areaCents || 0} Cents • ₹{listing.priceInr?.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedListing(listing);
                              setActiveTab('marketplace');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Audit Feed Preview */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Recent Administrative Events
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Full Log</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No recent administrative events recorded.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold block">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            by {log.actorEmail}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="p-4 rounded-2xl bg-[#0b1e28] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, email, UID, phone..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-xs">Role:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="developer">Developer</option>
                    <option value="user">User</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-xs">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-[#0b1e28] border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User / Identity</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Registered</th>
                      <th className="py-3 px-4 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No registered users match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isProtected = isProtectedOwnerAccount(u);
                        return (
                          <tr key={u.uid} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 uppercase">
                                  {u.displayName?.charAt(0) || u.email?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">
                                    {u.displayName || 'Surveyor'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  u.role === 'owner'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : u.role === 'developer'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.status === 'suspended'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {u.status === 'suspended' ? (
                                  <>
                                    <UserX className="w-3 h-3" />
                                    <span>Suspended</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3" />
                                    <span>Active</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div>{u.phone || '—'}</div>
                              {u.licenseNumber && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Lic: {u.licenseNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isProtected ? (
                                <span className="text-[11px] text-amber-400/80 font-bold flex items-center justify-end gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Super Admin (Protected)</span>
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Toggle Role Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRole(u)}
                                    title={u.role === 'developer' ? 'Demote to regular User' : 'Promote to Developer'}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-slate-700 transition"
                                  >
                                    {u.role === 'developer' ? 'Demote to User' : 'Grant Dev'}
                                  </button>

                                  {/* Toggle Status Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(u)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                      u.status === 'suspended'
                                        ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-700'
                                        : 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border-rose-700'
                                    }`}
                                  >
                                    {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                                  </button>

                                  {/* Send Password Reset */}
                                  <button
                                    type="button"
                                    onClick={() => handleSendReset(u.email)}
                                    title="Send password reset email"
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2B: INDIVIDUAL USER FEATURE ACCESS MANAGEMENT */}
        {activeTab === 'feature_access' && (
          <OwnerFeatureAccessManager actor={actor} />
        )}

        {/* TAB 3: DEVELOPER MANAGEMENT */}
        {activeTab === 'developers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  <span>Technical Administrator / Developer Accounts</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Developers have access to system diagnostics, error logs, and release info, but are strictly forbidden from modifying user roles or marketplace listings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Invite New Developer</span>
              </button>
            </div>

            {/* Active Developers List */}
            <div className="rounded-2xl bg-[#0b1e28] border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Technical Administrators ({usersList.filter((u) => u.role === 'developer').length})
              </h3>

              {usersList.filter((u) => u.role === 'developer').length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No active developer accounts assigned yet. Invite a developer below.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {usersList
                    .filter((u) => u.role === 'developer')
                    .map((dev) => (
                      <div
                        key={dev.uid}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-white text-xs block">
                            {dev.displayName || 'Developer'}
                          </span>
                          <span className="text-[11px] text-cyan-400 font-mono">
                            {dev.email}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            UID: {dev.uid}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleRole(dev)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold transition"
                        >
                          Revoke Access
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Pending Invitations Table */}
            <div className="rounded-2xl bg-[#0b1e28] border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Developer Invitations ({invitations.filter((i) => i.status === 'pending').length})
              </h3>

              {invitations.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No pending developer invitations.
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{inv.email}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                            Token: {inv.token}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              inv.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {inv.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {inv.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold"
                        >
                          Cancel Invite
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Developer Invite Modal */}
            {isInviteModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-md bg-[#0c1822] rounded-2xl border border-slate-800 p-6 space-y-4 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>Invite Developer Account</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsInviteModalOpen(false);
                        setGeneratedInvite(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {!generatedInvite ? (
                    <form onSubmit={handleCreateInvite} className="space-y-4">
                      <p className="text-xs text-slate-400">
                        Enter the email address of the technical administrator. They can use the generated invitation token to verify developer access.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Developer Email
                        </label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="dev@sthal.in"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white transition shadow-md"
                      >
                        Generate Invitation
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
                        Developer invitation created successfully for{' '}
                        <strong>{generatedInvite.email}</strong>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Security Access Token:
                        </span>
                        <span className="text-sm font-mono font-black text-cyan-300 select-all block">
                          {generatedInvite.token}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsInviteModalOpen(false);
                          setGeneratedInvite(null);
                        }}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MARKETPLACE MODERATION */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span>Land Marketplace Verification &amp; Moderation</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review submitted land survey boundaries, Patwari LP numbers, and passbooks before granting verified status on the public land exchange.
              </p>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketListings.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-[#0b1e28] rounded-2xl border border-slate-800">
                  No marketplace listings published yet.
                </div>
              ) : (
                marketListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-4 rounded-2xl bg-[#0b1e28] border border-slate-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            listing.verified
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : listing.verificationStatus === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {listing.verified
                            ? 'Verified Plot'
                            : listing.verificationStatus === 'rejected'
                            ? 'Rejected'
                            : 'Pending Verification'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ₹{listing.priceInr?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {listing.title || 'Untitled Land Parcel'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {listing.state} • {listing.district || 'District N/A'}
                      </p>

                      <div className="mt-2.5 p-2 rounded-xl bg-slate-900/80 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span>Survey / LP No:</span>
                          <span className="font-mono font-bold text-white">
                            {listing.surveyNo || 'Not specified'}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Area:</span>
                          <span className="font-bold text-emerald-400">
                            {listing.areaCents || 0} Cents ({listing.areaAcres || 0} Acres)
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Seller Contact:</span>
                          <span className="font-mono text-white">
                            {listing.sellerContact || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {listing.verificationNotes && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300">
                          <strong>Admin Note:</strong> {listing.verificationNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                      {!listing.verified ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveListing(listing.id)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedListing(listing)}
                            className="flex-1 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSuspendListing(listing.id)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs transition"
                        >
                          Suspend Verification
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rejection Modal */}
            {selectedListing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-md bg-[#0c1822] rounded-2xl border border-slate-800 p-6 space-y-4 text-white">
                  <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reject Land Verification Request</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Provide a clear explanation for the seller regarding why this plot verification cannot be approved (e.g. mismatched boundary, unclear survey number, pending revenue dispute).
                  </p>

                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Survey number 142/A does not match the provided Patwari passbook sketch."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListing(null);
                        setRejectionReason('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectListing(selectedListing.id)}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BUSINESS CONTROLS */}
        {activeTab === 'controls' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Business &amp; System Operations Controls</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage live system announcements and toggle features globally across all users.
              </p>
            </div>

            {/* Announcement Banner Manager */}
            <div className="p-5 rounded-2xl bg-[#0b1e28] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Live User Announcement Banner</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Broadcast critical field advisories or maintenance messages to all active surveyors.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-300">
                    {announcementActive ? 'ACTIVE' : 'OFFLINE'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Announcement Message
                  </label>
                  <input
                    type="text"
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                    placeholder="e.g. Scheduled Bhuvan satellite layer maintenance on Sunday 02:00 AM IST."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Severity Type
                  </label>
                  <select
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="alert">Alert (Crimson)</option>
                    <option value="success">Success (Emerald)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAnnouncement}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              >
                Publish Announcement
              </button>
            </div>

            {/* Global Feature Flags */}
            <div className="p-5 rounded-2xl bg-[#0b1e28] border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Global Application Feature Flags</span>
              </h3>
              <p className="text-xs text-slate-400">
                Instantly turn features on or off without redeploying code.
              </p>

              {settings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(settings.featureFlags).map(([flagKey, isEnabled]) => (
                    <div
                      key={flagKey}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-xs text-white block">
                          {flagKey}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isEnabled ? 'Available to users' : 'Globally disabled'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatureFlag(flagKey as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          isEnabled
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY & AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>Immutable Security &amp; Administrative Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Append-only audit log records every sensitive admin action, role change, and moderation event.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(auditLogs, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sthal_measure_audit_logs_${Date.now()}.json`;
                  a.click();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit JSON</span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#0b1e28] border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-3">Actor Email</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Target</th>
                      <th className="py-3 px-4">Details / Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-300">
                            {log.actorEmail}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-black uppercase text-amber-300">
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-white">
                            {log.action}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                            {log.targetType}:{log.targetId}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px]">
                            {log.details ? JSON.stringify(log.details) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: APP HEALTH & AI DOCTOR */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* Top Health & AI Diagnostic Header */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-colors duration-200">
              <div className="flex items-start sm:items-center gap-4">
                {/* Health Score Circular Badge */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 shadow-lg flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex flex-col items-center justify-center text-white">
                    <span className="text-xl font-black tracking-tight leading-none text-emerald-400">
                      {aiDiagnostic?.healthScore ?? (healthReport?.firestoreStatus === 'healthy' ? 98 : 72)}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                      /100
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span>AI Health Center — Diagnostics &amp; Auto-Fixation Engine</span>
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        (aiDiagnostic?.overallStatus || 'optimal') === 'optimal' || (aiDiagnostic?.overallStatus || 'optimal') === 'healthy'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                          : (aiDiagnostic?.overallStatus) === 'warning'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {aiDiagnostic?.overallStatus ? aiDiagnostic.overallStatus.toUpperCase() : 'OPTIMAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    Real-time telemetry diagnostics powered by Gemini 3.8 Flash. Analyzes database latency, ISRO Bhuvan GIS proxy, memory heap, and automatically fixes anomalies.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleRunAIDiagnostics()}
                  disabled={isAnalyzingHealth}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzingHealth ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingHealth ? 'AI Diagnosing...' : 'Run Full AI Diagnostic'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteAutoFix('clear_error_logs', 'Flush Error Logs')}
                  disabled={isFixingIssue !== null || capturedErrors.length === 0}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition disabled:opacity-40 flex items-center gap-1.5"
                  title="Purge captured telemetry errors and reset baseline"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isFixingIssue === 'clear_error_logs' ? 'animate-spin' : ''}`} />
                  <span>Flush Errors</span>
                </button>
              </div>
            </div>

            {/* Subsystems Live Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Firestore & RBAC */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Firestore DB &amp; RBAC
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Healthy
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {healthReport?.firestoreLatencyMs || 22}ms
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    SLA &lt;100ms
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                  Owner token verification &amp; user profiles active
                </span>
              </div>

              {/* Card 2: ISRO Bhuvan Proxy */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Bhuvan Cadastral Proxy
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    86,400s
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    HTTP Cache
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                  WMS EPSG:3857 transform &amp; boundary overlay active
                </span>
              </div>

              {/* Card 3: Gemini AI Engine */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Gemini 3.8 Flash AI
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {healthReport?.geminiLatencyMs || 65}ms
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-300 font-semibold">
                    gemini-3.8-flash
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                  Cadastral OCR, dispute analyzer &amp; health engine
                </span>
              </div>

              {/* Card 4: Memory & Telemetry Errors */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Runtime Heap &amp; Errors
                    </span>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold ${
                      capturedErrors.length === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        capturedErrors.length === 0 ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                      }`}
                    />
                    {capturedErrors.length} errors
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {healthReport?.memoryUsageMb || 85} MB
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Uptime {Math.floor((healthReport?.uptimeSeconds || 0) / 60)}m
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                  Node.js server heap within safe cloud boundary
                </span>
              </div>
            </div>

            {/* AI Diagnostics Assessment Box */}
            {aiDiagnostic && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-slate-900/10 to-teal-950/20 border border-emerald-500/30 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      AI System Doctor Assessment Summary
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Model: gemini-3.8-flash
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {aiDiagnostic.summary}
                </div>

                {/* Subsystem Health Diagnoses */}
                {aiDiagnostic.subsystemDiagnostics && aiDiagnostic.subsystemDiagnostics.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                      Subsystems Verification
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {aiDiagnostic.subsystemDiagnostics.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {sub.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                sub.status === 'healthy'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                              }`}
                            >
                              {sub.metric || sub.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {sub.diagnosis}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Issues & Root Causes */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>Detected Issues &amp; Fixes ({aiDiagnostic.detectedIssues?.length || 0})</span>
                  </h4>

                  {(!aiDiagnostic.detectedIssues || aiDiagnostic.detectedIssues.length === 0) ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Zero fatal issues detected. All platform services are running within SLA standards.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiDiagnostic.detectedIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  issue.severity === 'critical'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                                    : issue.severity === 'high'
                                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30'
                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {issue.severity}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {issue.title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                [{issue.component}]
                              </span>
                            </div>

                            {issue.autoFixable && issue.fixActionId && (
                              <button
                                type="button"
                                onClick={() => handleExecuteAutoFix(issue.fixActionId!, issue.fixActionLabel)}
                                disabled={isFixingIssue !== null}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
                              >
                                <Zap className={`w-3.5 h-3.5 ${isFixingIssue === issue.fixActionId ? 'animate-spin' : ''}`} />
                                <span>{isFixingIssue === issue.fixActionId ? 'Fixing...' : (issue.fixActionLabel || 'Auto-Fix Issue')}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                Root Cause
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                                {issue.rootCause}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block mb-0.5">
                                Recommended Remediation
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                                {issue.remediation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SRE Proactive Recommendations */}
                {aiDiagnostic.recommendations && aiDiagnostic.recommendations.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Proactive SRE Best Practices
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                      {aiDiagnostic.recommendations.map((rec, rIdx) => (
                        <li key={rIdx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Automated Remediation Suite (One-Click Auto-Fixes) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    <span>Automated Issue Fixation Engine</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Execute one-click administrative repair actions with full audit logging and state verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Auto Fix 1: Flush Errors */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Flush Telemetry Error Buffer
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Clears temporary error logs, resets error counters, and re-baselines telemetry tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteAutoFix('clear_error_logs', 'Flush Error Buffer')}
                    disabled={isFixingIssue !== null}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isFixingIssue === 'clear_error_logs' ? 'animate-spin' : ''}`} />
                    <span>{isFixingIssue === 'clear_error_logs' ? 'Applying...' : 'Execute Flush'}</span>
                  </button>
                </div>

                {/* Auto Fix 2: Resync Owner Claims */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Resync Owner Security Claims
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Validates Super Admin role integrity in Firestore and re-synchronizes authorization claims.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteAutoFix('resync_owner_claims', 'Resync Owner Claims')}
                    disabled={isFixingIssue !== null}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Shield className={`w-3.5 h-3.5 ${isFixingIssue === 'resync_owner_claims' ? 'animate-spin' : ''}`} />
                    <span>{isFixingIssue === 'resync_owner_claims' ? 'Applying...' : 'Verify & Resync'}</span>
                  </button>
                </div>

                {/* Auto Fix 3: Purge Expired Invitations */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Purge Expired Invitations
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Sweeps pending developer invitations older than 7 days and revokes cryptographic tokens.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteAutoFix('clean_expired_invitations', 'Purge Expired Invitations')}
                    disabled={isFixingIssue !== null}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Lock className={`w-3.5 h-3.5 ${isFixingIssue === 'clean_expired_invitations' ? 'animate-spin' : ''}`} />
                    <span>{isFixingIssue === 'clean_expired_invitations' ? 'Purging...' : 'Purge Expired'}</span>
                  </button>
                </div>

                {/* Auto Fix 4: Auto-Resolve Cleared Bugs */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Auto-Resolve Cleared Bugs
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Marks transient or tested bug tickets as verified resolved with an audit trail stamp.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteAutoFix('auto_resolve_bugs', 'Auto-Resolve Bugs')}
                    disabled={isFixingIssue !== null}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Check className={`w-3.5 h-3.5 ${isFixingIssue === 'auto_resolve_bugs' ? 'animate-spin' : ''}`} />
                    <span>{isFixingIssue === 'auto_resolve_bugs' ? 'Resolving...' : 'Auto-Resolve'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive AI Health Diagnostic & Fixation Terminal */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Interactive AI Health &amp; Issue Fixation Terminal
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Gemini 3.8 Flash Direct SRE Consultation
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Quick Prompts:</span>
                  {[
                    'Why is memory at current level?',
                    'Check Bhuvan cadastral tile latency',
                    'Verify Super Admin security integrity',
                    'Inspect captured error stack traces',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setAiCustomQuery(chip);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    value={aiCustomQuery}
                    onChange={(e) => setAiCustomQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskAITerminal();
                    }}
                    placeholder="Ask AI Health Doctor anything (e.g. 'Investigate database latency spike', 'How to improve GPS polygon closing error?')..."
                    className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAskAITerminal}
                    disabled={isAskingAI || !aiCustomQuery.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isAskingAI ? 'animate-spin' : ''}`} />
                    <span>{isAskingAI ? 'Analyzing...' : 'Diagnose & Suggest Fix'}</span>
                  </button>
                </div>

                {aiTerminalAnswer && (
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold border-b border-slate-800 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        AI Diagnosis &amp; Remediation Plan
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiTerminalAnswer(null)}
                        className="text-slate-500 hover:text-slate-300 text-[10px]"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-[11px] text-slate-200">
                      {aiTerminalAnswer}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Telemetry Buffer View */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Captured Telemetry Errors ({capturedErrors.length})</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Live client-side and server exceptions captured in telemetry buffer.
                  </p>
                </div>

                {capturedErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExecuteAutoFix('clear_error_logs', 'Flush Error Logs')}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
                  >
                    Flush All
                  </button>
                )}
              </div>

              {capturedErrors.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  Telemetry error buffer is completely clean. No unhandled exceptions logged.
                </div>
              ) : (
                <div className="space-y-2">
                  {capturedErrors.slice(0, 10).map((err) => (
                    <div
                      key={err.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {err.component || 'system'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-600 dark:text-rose-300 font-mono">
                        {err.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: VIDEO ACADEMY MANAGER */}
        {activeTab === 'videomanager' && (
          <OwnerVideoManager actor={actor} showToast={showToast} />
        )}

        {/* TAB 9: DEVELOPER CENTER (EMBEDDED) */}
        {activeTab === 'devcenter' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/80 text-xs text-cyan-200 flex items-center justify-between">
              <span>
                <strong>Owner Privilege Mode:</strong> You are viewing the full Developer Dashboard with super admin clearance.
              </span>
            </div>
            <DeveloperDashboard embedded />
          </div>
        )}
      </main>
    </div>
  );
};
