import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from './config';
import { AppUserRole, UserProfile } from '../types/auth';
import { determineUserRole, isAccountActive } from '../utils/rbac';
import { fetchUserProfile, syncUserProfile } from '../services/adminService';

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: AppUserRole;
  activeView: 'app' | 'owner' | 'developer';
  setActiveView: (view: 'app' | 'owner' | 'developer') => void;
  loading: boolean;
  isGuest: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isSignInModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    phone?: string,
    licenseNumber?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (forceRedirect?: boolean) => Promise<boolean>;
  signInAsSurveyor: (name: string, email: string, licenseNumber?: string) => boolean;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: 'user',
  activeView: 'app',
  setActiveView: () => {},
  loading: true,
  isGuest: true,
  authError: null,
  clearAuthError: () => {},
  isSignInModalOpen: false,
  openSignInModal: () => {},
  closeSignInModal: () => {},
  signInWithEmail: async () => ({ success: false }),
  registerWithEmail: async () => ({ success: false }),
  sendPasswordReset: async () => ({ success: false }),
  signInWithGoogle: async () => false,
  signInAsSurveyor: () => false,
  signOut: async () => {},
  continueAsGuest: () => {},
  refreshProfile: async () => {},
});

const LOCAL_STORAGE_KEY = 'sthal_local_surveyor_session';
const ACTIVE_VIEW_KEY = 'sthal_preferred_admin_view';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return null;
  });
  const [role, setRole] = useState<AppUserRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return determineUserRole(parsed?.role, parsed?.email);
        }
      }
    } catch {}
    return 'user';
  });
  const [activeView, setActiveViewState] = useState<'app' | 'owner' | 'developer'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const preferred = localStorage.getItem(ACTIVE_VIEW_KEY) as any;
        if (preferred === 'owner' || preferred === 'developer') return preferred;
      }
    } catch {}
    return 'app';
  });
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return !localStorage.getItem(LOCAL_STORAGE_KEY);
      }
    } catch {}
    return true;
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const setActiveView = useCallback((view: 'app' | 'owner' | 'developer') => {
    setActiveViewState(view);
    try {
      localStorage.setItem(ACTIVE_VIEW_KEY, view);
    } catch {
      // ignore
    }
  }, []);

  // Sync profile & resolve authoritative role strictly from token claims and verified database record
  const syncAndSetUser = useCallback(async (firebaseUser: User) => {
    try {
      // 1. Check custom claims directly from Firebase Auth ID token (force refresh to catch revoked roles immediately)
      let claimRole: AppUserRole | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        if (tokenResult?.claims?.owner === true || tokenResult?.claims?.role === 'owner') {
          claimRole = 'owner';
        } else if (tokenResult?.claims?.developer === true || tokenResult?.claims?.role === 'developer') {
          claimRole = 'developer';
        } else if (tokenResult?.claims?.role === 'user') {
          claimRole = 'user';
        }
      } catch (claimErr) {
        console.warn('Could not read user token claims:', claimErr);
      }

      // 2. Fetch or sync user profile doc
      let profile = await fetchUserProfile(firebaseUser.uid);
      if (!profile) {
        profile = await syncUserProfile(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName,
          firebaseUser.photoURL,
          claimRole ? { role: claimRole } : undefined
        );
      }

      // 3. Check account status - fail closed if suspended
      if (profile && !isAccountActive(profile.status)) {
        await fbSignOut(auth);
        setUser(null);
        setUserProfile(null);
        setRole('user');
        setIsGuest(true);
        setActiveViewState('app');
        setAuthError('Your account has been suspended by the administrator. Please contact support.');
        return;
      }

      // Role is determined strictly from custom claims or verified Firestore profile
      const authoritativeRole: AppUserRole = determineUserRole(claimRole || profile?.role);

      setUser(firebaseUser);
      setUserProfile(profile);
      setRole(authoritativeRole);
      setIsGuest(false);
      setAuthError(null);

      // Automatic destination redirection based strictly on authoritative role
      const savedPref = localStorage.getItem(ACTIVE_VIEW_KEY) as 'app' | 'owner' | 'developer' | null;
      if (authoritativeRole === 'owner') {
        setActiveViewState(savedPref === 'app' || savedPref === 'developer' ? savedPref : 'owner');
      } else if (authoritativeRole === 'developer') {
        setActiveViewState(savedPref === 'app' ? 'app' : 'developer');
      } else {
        // Standard user can NEVER access owner or developer views
        setActiveViewState('app');
      }

      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // ignore
      }
    } catch (e: any) {
      console.warn('Profile synchronization error:', e);
      // Fail closed: Never grant privileged access on sync failure
      setUser(firebaseUser);
      setRole('user');
      setIsGuest(false);
      setActiveViewState('app');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) {
      await syncAndSetUser(user);
    }
  }, [user, syncAndSetUser]);

  useEffect(() => {
    // 1. Check for stored local surveyor profile if no firebase session exists yet
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.uid) {
          const assignedRole: AppUserRole = determineUserRole(parsed?.role, parsed?.email);
          setUserProfile({ ...parsed, role: assignedRole });
          setRole(assignedRole);
          setIsGuest(false);
        }
      }
    } catch (e) {
      console.warn('Error reading local surveyor session:', e);
    }

    // 2. Check for redirect result
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          syncAndSetUser(res.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check:', err?.code || err?.message);
      });

    // 3. Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await syncAndSetUser(currentUser);
      } else {
        // Check if offline/local surveyor exists
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.uid) {
              const assignedRole: AppUserRole = determineUserRole(parsed?.role, parsed?.email);
              setUserProfile({ ...parsed, role: assignedRole });
              setRole(assignedRole);
              setIsGuest(false);
              setLoading(false);
              const preferred = localStorage.getItem(ACTIVE_VIEW_KEY) as 'app' | 'owner' | 'developer' | null;
              if (preferred && (assignedRole === 'owner' || (preferred === 'developer' && assignedRole === 'developer'))) {
                setActiveViewState(preferred);
              } else {
                setActiveViewState('app');
              }
              return;
            }
          } catch {
            // ignore
          }
        }
        setUser(null);
        setUserProfile(null);
        setRole('user');
        setIsGuest(true);
        setActiveViewState('app');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncAndSetUser]);

  const openSignInModal = () => {
    setAuthError(null);
    setIsSignInModalOpen(true);
  };
  const closeSignInModal = () => setIsSignInModalOpen(false);

  // Email & Password Sign In
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setAuthError(null);
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncAndSetUser(res.user);
      return { success: true };
    } catch (err: any) {
      console.warn('Email sign in error:', err?.code || err?.message);
      let errorMsg = 'Failed to sign in with email and password.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect email or password. Please verify credentials.';
      } else if (err?.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect password. Try again or use forgot password.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/user-disabled') {
        errorMsg = 'This account has been disabled by an administrator.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Registration (Role is strictly 'user' or 'owner' if designated email)
  const registerWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    phone?: string,
    licenseNumber?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setAuthError(null);
      const cleanEmail = email.trim();
      const cleanName = displayName.trim() || cleanEmail.split('@')[0];

      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: cleanName });

        // Save trusted profile in Firestore
        await syncUserProfile(res.user.uid, cleanEmail, cleanName, null, {
          phone: phone?.trim(),
          licenseNumber: licenseNumber?.trim(),
          role: 'user', // strictly default to user!
        });

        await syncAndSetUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Registration returned no account' };
    } catch (err: any) {
      console.warn('Registration error:', err?.code || err?.message);
      let errorMsg = 'Failed to register account.';
      if (err?.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters long.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setAuthError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password / Password Reset
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        return { success: false, error: 'Please enter your registered email address.' };
      }
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (err: any) {
      console.warn('Password reset error:', err?.code || err?.message);
      let msg = 'Failed to send password reset instructions.';
      if (err?.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      return { success: false, error: msg };
    }
  };

  const signInWithGoogle = async (forceRedirect = false): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);
      if (forceRedirect) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return true;
        } catch (redirectErr: any) {
          setAuthError(redirectErr?.message || 'Google redirect sign-in failed.');
          return false;
        }
      }

      try {
        const res = await signInWithPopup(auth, googleProvider);
        if (res?.user) {
          await syncAndSetUser(res.user);
          return true;
        }
        setAuthError('Sign-in cancelled or returned no account.');
        return false;
      } catch (popupErr: any) {
        console.warn('Google Popup sign-in error:', popupErr?.code || popupErr?.message);
        let errorMsg = 'Google sign-in failed. Please check popup permissions and try again.';
        if (popupErr?.code === 'auth/popup-closed-by-user') {
          errorMsg = 'Sign-in popup was closed before completing.';
        } else if (popupErr?.code === 'auth/unauthorized-domain') {
          errorMsg = 'This domain is not authorized for Google Sign-In in Firebase settings.';
        } else if (popupErr?.code === 'auth/popup-blocked') {
          errorMsg = 'Sign-in popup was blocked by your browser. Please allow popups or try redirect sign-in.';
        } else if (popupErr?.message) {
          errorMsg = popupErr.message;
        }
        setAuthError(errorMsg);
        return false;
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsSurveyor = (name: string, email: string, licenseNumber?: string): boolean => {
    const cleanName = name.trim();
    if (!cleanName) {
      setAuthError('Full Name is required.');
      return false;
    }
    const cleanEmail = email.trim();
    const assignedRole: AppUserRole = 'user';

    const surveyorUser: UserProfile = {
      uid: `surv_local_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'usr'}_${Date.now().toString(36)}`,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: null,
      role: assignedRole,
      status: 'active',
      isLocalSurveyor: true,
      licenseNumber: licenseNumber?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(surveyorUser));
    } catch (e) {
      console.warn('Storage write error:', e);
    }

    setUserProfile(surveyorUser);
    setRole(assignedRole);
    setIsGuest(false);
    setAuthError(null);
    setActiveViewState('app');
    return true;
  };

  const signOut = async () => {
    try {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_VIEW_KEY);
      } catch {
        // ignore
      }
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setRole('user');
      setIsGuest(true);
      setActiveViewState('app');
      setAuthError(null);
    } catch (err) {
      console.error('Sign-out error:', err);
      setUser(null);
      setUserProfile(null);
      setIsGuest(true);
      setActiveViewState('app');
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setActiveViewState('app');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        activeView,
        setActiveView,
        loading,
        isGuest,
        authError,
        clearAuthError,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        signInWithGoogle,
        signInAsSurveyor,
        signOut,
        continueAsGuest,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
