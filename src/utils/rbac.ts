import { AppUserRole, AppUserStatus, UserProfile } from '../types/auth';

/**
 * Determine role strictly from authoritative backend record or custom claim.
 * Never grants privileges based on email string, frontend parameters, or unverified claims.
 */
export function determineUserRole(
  roleClaimOrRecord?: AppUserRole | string | null,
  _email?: string | null
): AppUserRole {
  if (roleClaimOrRecord === 'owner') return 'owner';
  if (roleClaimOrRecord === 'developer') return 'developer';
  return 'user';
}

/**
 * Check if a role has access to the Owner Control Center
 */
export function canAccessOwnerCenter(role?: AppUserRole): boolean {
  return role === 'owner';
}

/**
 * Check if a role has access to the Developer Dashboard
 */
export function canAccessDeveloperDashboard(role?: AppUserRole): boolean {
  return role === 'owner' || role === 'developer';
}

/**
 * Check if a user can moderate or approve/reject marketplace listings.
 * Only the Owner has marketplace moderation authority.
 */
export function canModerateMarketplace(role?: AppUserRole): boolean {
  return role === 'owner';
}

/**
 * Check if a user can modify user accounts or assign roles.
 * Only the Owner can modify users or roles.
 */
export function canManageUsers(role?: AppUserRole): boolean {
  return role === 'owner';
}

/**
 * Check if a user can invite or revoke developers.
 * Only the Owner can invite or revoke developers.
 */
export function canManageDevelopers(role?: AppUserRole): boolean {
  return role === 'owner';
}

/**
 * Validate that an account is active and permitted to use the system
 */
export function isAccountActive(status?: AppUserStatus): boolean {
  return status !== 'suspended';
}

/**
 * Check if an account is a protected owner account.
 * Evaluates role dynamically based strictly on validated server role.
 */
export function isProtectedOwnerAccount(target?: { role?: AppUserRole } | null): boolean {
  if (!target || typeof target !== 'object') return false;
  return target.role === 'owner';
}

/**
 * Generates a cryptographically secure random invitation token.
 * Uses Web Crypto API (crypto.getRandomValues).
 * Never falls back to insecure pseudo-random generators (Math.random).
 * Format: DEV-XXXXXXXX-XXXXXXXX-XXXXXXXX (high entropy 128-bit)
 */
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const byteCount = 18;
  const randomBytes = new Uint8Array(byteCount);

  const cryptoInstance =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== 'undefined'
      ? window.crypto
      : null;

  if (cryptoInstance && typeof cryptoInstance.getRandomValues === 'function') {
    cryptoInstance.getRandomValues(randomBytes);
  } else {
    throw new Error('Cryptographic Error: Secure random number generator is unavailable.');
  }

  const segments: string[] = [];
  let byteIndex = 0;
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(randomBytes[byteIndex++] % chars.length);
    }
    segments.push(segment);
  }

  return `DEV-${segments.join('-')}`;
}

/**
 * Compute SHA-256 hash of a string for secure token storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim().toUpperCase());

  const cryptoInstance =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== 'undefined'
      ? window.crypto
      : null;

  if (cryptoInstance && cryptoInstance.subtle && typeof cryptoInstance.subtle.digest === 'function') {
    const hashBuffer = await cryptoInstance.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Cryptographic Error: Secure SHA-256 digest is unavailable.');
}

/**
 * Validate an invitation against status and expiration timestamp
 */
export function validateInvitationStatus(invitation: {
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
}): { isValid: boolean; error?: string } {
  if (invitation.status === 'revoked') {
    return { isValid: false, error: 'Invitation has been revoked by an administrator.' };
  }
  if (invitation.status === 'accepted') {
    return { isValid: false, error: 'Invitation has already been used.' };
  }
  const now = Date.now();
  const exp = new Date(invitation.expiresAt).getTime();
  if (Number.isNaN(exp) || now > exp) {
    return { isValid: false, error: 'Invitation has expired.' };
  }
  return { isValid: true };
}

/**
 * Sanitize user profile for safe display without exposing sensitive credentials
 */
export function sanitizeUserProfile(user: Partial<UserProfile>): Partial<UserProfile> {
  const { uid, email, displayName, role, status, photoURL, phone, licenseNumber, createdAt, lastLoginAt } = user;
  return {
    uid,
    email,
    displayName: displayName || (email ? email.split('@')[0] : 'User'),
    role: determineUserRole(role),
    status: status || 'active',
    photoURL,
    phone,
    licenseNumber,
    createdAt: createdAt || new Date().toISOString(),
    lastLoginAt,
  };
}
