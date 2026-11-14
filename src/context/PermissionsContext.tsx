import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { FeatureKey, FeaturePermissionState, EffectiveUserPermissions } from '../types/permissions';
import { resolveEffectivePermissions, getDefaultPermissionForRole, resolveSingleFeaturePermission } from '../utils/permissionResolver';
import { fetchCurrentUserPermissions, fetchSystemSettings } from '../services/adminService';
import { SystemSettings } from '../types/auth';

export interface PermissionsContextType {
  effectivePermissions: EffectiveUserPermissions | null;
  isLoadingPermissions: boolean;
  hasPermission: (featureKey: FeatureKey) => boolean;
  getFeatureState: (featureKey: FeatureKey) => FeaturePermissionState;
  getFeatureDenialReason: (featureKey: FeatureKey) => string;
  reloadPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  effectivePermissions: null,
  isLoadingPermissions: false,
  hasPermission: () => true,
  getFeatureState: () => 'inherited',
  getFeatureDenialReason: () => '',
  reloadPermissions: async () => {},
});

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, role, isGuest } = useAuth();
  const [effectivePermissions, setEffectivePermissions] = useState<EffectiveUserPermissions | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Load system settings for emergency shutdown flags
  useEffect(() => {
    let isMounted = true;
    fetchSystemSettings().then((settings) => {
      if (isMounted) setSystemSettings(settings);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const reloadPermissions = useCallback(async () => {
    // Super Admin Owner has immediate universal clearance
    if (role === 'owner') {
      const ownerEffective = resolveEffectivePermissions(
        { uid: user?.uid || 'owner', role: 'owner', status: 'active' },
        null,
        systemSettings
      );
      setEffectivePermissions(ownerEffective);
      return;
    }

    if (!user?.uid || isGuest) {
      // Guest or unauthenticated user
      const guestEffective = resolveEffectivePermissions(
        { uid: 'guest', role: 'user', status: 'active' },
        null,
        systemSettings
      );
      setEffectivePermissions(guestEffective);
      return;
    }

    setIsLoadingPermissions(true);
    try {
      const serverPerms = await fetchCurrentUserPermissions(user.uid, role);
      if (serverPerms) {
        setEffectivePermissions(serverPerms);
      } else {
        // Fallback to locally resolved permissions
        const fallback = resolveEffectivePermissions(
          { uid: user.uid, role, status: userProfile?.status || 'active' },
          null,
          systemSettings
        );
        setEffectivePermissions(fallback);
      }
    } catch (err) {
      console.warn('Error loading user permissions:', err);
      const fallback = resolveEffectivePermissions(
        { uid: user.uid, role, status: userProfile?.status || 'active' },
        null,
        systemSettings
      );
      setEffectivePermissions(fallback);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [user?.uid, role, userProfile?.status, isGuest, systemSettings]);

  useEffect(() => {
    reloadPermissions();
  }, [reloadPermissions]);

  const hasPermission = useCallback(
    (featureKey: FeatureKey): boolean => {
      // Tier 2: Super Admin Owner universal clearance
      if (role === 'owner') return true;

      // Tier 1: Suspended account
      if (userProfile?.status === 'suspended') return false;

      // Check effective permissions map
      if (effectivePermissions?.permissions && featureKey in effectivePermissions.permissions) {
        return effectivePermissions.permissions[featureKey];
      }

      // Precedence resolution fallback
      const single = resolveSingleFeaturePermission(
        featureKey,
        { uid: user?.uid, role, status: userProfile?.status || 'active' },
        'inherited',
        systemSettings
      );
      return single.allowed;
    },
    [role, userProfile?.status, effectivePermissions, user?.uid, systemSettings]
  );

  const getFeatureState = useCallback(
    (featureKey: FeatureKey): FeaturePermissionState => {
      if (effectivePermissions?.states && featureKey in effectivePermissions.states) {
        return effectivePermissions.states[featureKey];
      }
      return 'inherited';
    },
    [effectivePermissions]
  );

  const getFeatureDenialReason = useCallback(
    (featureKey: FeatureKey): string => {
      if (effectivePermissions?.reasons && featureKey in effectivePermissions.reasons) {
        return effectivePermissions.reasons[featureKey];
      }
      const single = resolveSingleFeaturePermission(
        featureKey,
        { uid: user?.uid, role, status: userProfile?.status || 'active' },
        'inherited',
        systemSettings
      );
      return single.reason;
    },
    [effectivePermissions, user?.uid, role, userProfile?.status, systemSettings]
  );

  const contextValue = useMemo(
    () => ({
      effectivePermissions,
      isLoadingPermissions,
      hasPermission,
      getFeatureState,
      getFeatureDenialReason,
      reloadPermissions,
    }),
    [
      effectivePermissions,
      isLoadingPermissions,
      hasPermission,
      getFeatureState,
      getFeatureDenialReason,
      reloadPermissions,
    ]
  );

  return <PermissionsContext.Provider value={contextValue}>{children}</PermissionsContext.Provider>;
};

export const useUserPermissions = () => useContext(PermissionsContext);
