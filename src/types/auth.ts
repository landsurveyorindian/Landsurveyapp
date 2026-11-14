export type AppUserRole = 'owner' | 'developer' | 'user';
export type AppUserStatus = 'active' | 'suspended';

export type ProjectSyncState =
  | 'LOCAL_ONLY'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'SYNC_FAILED'
  | 'CONFLICT';

export interface PrivateSellerData {
  listingId: string;
  userId: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerContact?: string;
  identityDocUrls?: string[];
  verificationDocuments?: string[];
  internalNotes?: string;
  verificationNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AppUserRole;
  status: AppUserStatus;
  photoURL?: string | null;
  licenseNumber?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isLocalSurveyor?: boolean;
}

export interface DeveloperInvitation {
  id: string;
  email: string;
  token?: string; // Only presented upon generation
  tokenHash: string; // Stored securely
  invitedByEmail: string;
  invitedByUid: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked';
  acceptedAt?: string;
  acceptedByUid?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AppUserRole;
  action: string;
  targetType: 'user' | 'listing' | 'system' | 'developer' | 'bug';
  targetId: string;
  details?: Record<string, any>;
  result: 'success' | 'failure';
  ip?: string;
}

export interface SystemAnnouncement {
  active: boolean;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  updatedAt?: string;
  updatedBy?: string;
}

export interface SystemSettings {
  id?: string;
  announcement: SystemAnnouncement;
  featureFlags: {
    cadDraftingStudio: boolean;
    bhuvanCadastralWalk: boolean;
    aiAssistedAudit: boolean;
    landMarketplace: boolean;
    advancedTraverse: boolean;
    experimentalBetaTools: boolean;
  };
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type BugModule =
  | 'calculator'
  | 'bhuvan'
  | 'cadtools'
  | 'gis'
  | 'projects'
  | 'market'
  | 'gps'
  | 'auth'
  | 'other';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'new' | 'investigating' | 'resolved' | 'closed';

export interface BugReport {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  title: string;
  description: string;
  module: BugModule;
  severity: BugSeverity;
  status: BugStatus;
  technicalNotes?: string;
  browserInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthReport {
  timestamp: string;
  uptimeSeconds: number;
  firestoreStatus: 'healthy' | 'degraded' | 'down';
  firestoreLatencyMs: number;
  storageStatus: 'healthy' | 'degraded' | 'down';
  geminiApiStatus: 'healthy' | 'degraded' | 'down';
  geminiLatencyMs: number;
  bhuvanProxyStatus: 'healthy' | 'degraded' | 'down';
  activeErrorCount: number;
  memoryUsageMb: number;
  environment: string;
  version: string;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  severity: 'critical' | 'error' | 'warning';
  resolved?: boolean;
}
