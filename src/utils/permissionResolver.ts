import type { AppUserRole, AppUserStatus, SystemSettings } from '../types/auth.ts';
import type {
  FeatureKey,
  FeaturePermissionState,
  UserFeaturePermissionsDoc,
  EffectiveUserPermissions,
} from '../types/permissions.ts';
import { APPLICATION_FEATURES } from '../types/permissions.ts';

/**
 * Gets the standard role default for a feature.
 * Developer tools default to true only for developer/owner roles.
 * Standard tools default to true for all active authenticated roles.
 */
export function getDefaultPermissionForRole(
  featureKey: FeatureKey,
  role: AppUserRole = 'user'
): boolean {
  if (role === 'owner') return true;

  const def = APPLICATION_FEATURES.find((f) => f.key === featureKey);
  if (!def) return false;

  if (def.category === 'developer_tools') {
    return role === 'developer';
  }

  return true;
}

export type PermissionResolutionSource =
  | 'security'
  | 'owner_lock'
  | 'global_shutdown'
  | 'role_boundary'
  | 'individual_override'
  | 'role_default';

export interface SinglePermissionResult {
  allowed: boolean;
  state: FeaturePermissionState;
  reason: string;
  source: PermissionResolutionSource;
}

/**
 * Resolves a single feature permission against the strict 6-tier precedence hierarchy.
 */
export function resolveSingleFeaturePermission(
  featureKey: FeatureKey,
  user: {
    uid?: string;
    role?: AppUserRole;
    status?: AppUserStatus;
  } | null,
  overrideState?: FeaturePermissionState,
  systemSettings?: SystemSettings | null
): SinglePermissionResult {
  const role: AppUserRole = user?.role || 'user';
  const status: AppUserStatus = user?.status || 'active';
  const effectiveState: FeaturePermissionState = overrideState || 'inherited';

  // TIER 1: Authentication and account security restrictions
  if (status === 'suspended') {
    return {
      allowed: false,
      state: effectiveState,
      reason: 'Account is suspended by administrator.',
      source: 'security',
    };
  }

  // TIER 2: Owner-only administrative protections
  // Super Admin Owner cannot be locked out of features
  if (role === 'owner') {
    return {
      allowed: true,
      state: 'on',
      reason: 'Super Admin Owner universal clearance.',
      source: 'owner_lock',
    };
  }

  // TIER 3: Global emergency feature shutdown
  if (systemSettings?.maintenanceMode === true) {
    return {
      allowed: false,
      state: effectiveState,
      reason: 'Application is currently under global maintenance mode.',
      source: 'global_shutdown',
    };
  }

  const def = APPLICATION_FEATURES.find((f) => f.key === featureKey);
  if (def?.globalFlagKey && systemSettings?.featureFlags) {
    const isGlobalActive = systemSettings.featureFlags[def.globalFlagKey];
    if (isGlobalActive === false) {
      return {
        allowed: false,
        state: effectiveState,
        reason: `Feature disabled globally by emergency controls (${def.globalFlagKey}).`,
        source: 'global_shutdown',
      };
    }
  }

  // TIER 4: Role-level maximum permissions and restrictions
  // Individual permissions must NOT grant developer privileges to standard users
  if (def?.category === 'developer_tools' && role === 'user') {
    return {
      allowed: false,
      state: effectiveState,
      reason: 'Developer features are prohibited for standard User accounts. Role upgrade required.',
      source: 'role_boundary',
    };
  }

  // TIER 5: Individual account permissions (Owner overrides for this specific UID)
  if (effectiveState === 'off') {
    return {
      allowed: false,
      state: 'off',
      reason: 'Feature explicitly disabled for this individual account by Owner.',
      source: 'individual_override',
    };
  }

  if (effectiveState === 'on') {
    return {
      allowed: true,
      state: 'on',
      reason: 'Feature explicitly enabled for this individual account by Owner.',
      source: 'individual_override',
    };
  }

  // TIER 6: Default permissions for account's role
  const roleDefault = getDefaultPermissionForRole(featureKey, role);
  return {
    allowed: roleDefault,
    state: 'inherited',
    reason: roleDefault
      ? `Permitted under standard ${role.toUpperCase()} role defaults.`
      : `Restricted under standard ${role.toUpperCase()} role defaults.`,
    source: 'role_default',
  };
}

/**
 * Builds the complete dictionary of effective permissions across all application features.
 */
export function resolveEffectivePermissions(
  user: {
    uid?: string;
    role?: AppUserRole;
    status?: AppUserStatus;
  } | null,
  overridesDoc: UserFeaturePermissionsDoc | null,
  systemSettings?: SystemSettings | null
): EffectiveUserPermissions {
  const role: AppUserRole = user?.role || 'user';
  const permissions: Record<FeatureKey, boolean> = {} as any;
  const states: Record<FeatureKey, FeaturePermissionState> = {} as any;
  const reasons: Record<FeatureKey, string> = {} as any;

  for (const feat of APPLICATION_FEATURES) {
    const override = overridesDoc?.permissions ? overridesDoc.permissions[feat.key] : 'inherited';
    const res = resolveSingleFeaturePermission(feat.key, user, override, systemSettings);
    permissions[feat.key] = res.allowed;
    states[feat.key] = res.state;
    reasons[feat.key] = res.reason;
  }

  return {
    uid: user?.uid || 'anonymous',
    role,
    permissions,
    states,
    reasons,
    updatedAt: overridesDoc?.updatedAt || new Date().toISOString(),
  };
}
