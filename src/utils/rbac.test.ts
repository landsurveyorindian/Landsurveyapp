import test from 'node:test';
import assert from 'node:assert/strict';
import {
  determineUserRole,
  canAccessOwnerCenter,
  canAccessDeveloperDashboard,
  canModerateMarketplace,
  canManageUsers,
  canManageDevelopers,
  isAccountActive,
  generateInviteToken,
  hashToken,
  validateInvitationStatus,
  sanitizeUserProfile,
} from './rbac.ts';

test('determineUserRole: Role resolved strictly from backend-assigned role; email cannot grant owner', () => {
  assert.equal(determineUserRole('owner'), 'owner');
  assert.equal(determineUserRole('developer'), 'developer');
  assert.equal(determineUserRole('user'), 'user');
  assert.equal(determineUserRole(undefined), 'user');
  // Strict test: even previously hardcoded email receives 'user' role if assigned 'user' or undefined
  assert.equal(determineUserRole('user', 'pavansrirambezawada@gmail.com'), 'user');
  assert.equal(determineUserRole(undefined, 'pavansrirambezawada@gmail.com'), 'user');
  assert.equal(determineUserRole('user', 'other@sthal.in'), 'user');
});

test('canAccessOwnerCenter: Only Owner role has access', () => {
  assert.equal(canAccessOwnerCenter('owner'), true);
  assert.equal(canAccessOwnerCenter('developer'), false);
  assert.equal(canAccessOwnerCenter('user'), false);
  assert.equal(canAccessOwnerCenter(undefined), false);
});

test('canAccessDeveloperDashboard: Owner and Developer have access', () => {
  assert.equal(canAccessDeveloperDashboard('owner'), true);
  assert.equal(canAccessDeveloperDashboard('developer'), true);
  assert.equal(canAccessDeveloperDashboard('user'), false);
  assert.equal(canAccessDeveloperDashboard(undefined), false);
});

test('canModerateMarketplace: Strictly Owner only', () => {
  assert.equal(canModerateMarketplace('owner'), true);
  assert.equal(canModerateMarketplace('developer'), false);
  assert.equal(canModerateMarketplace('user'), false);
});

test('canManageUsers & canManageDevelopers: Strictly Owner only', () => {
  assert.equal(canManageUsers('owner'), true);
  assert.equal(canManageUsers('developer'), false);
  assert.equal(canManageUsers('user'), false);

  assert.equal(canManageDevelopers('owner'), true);
  assert.equal(canManageDevelopers('developer'), false);
  assert.equal(canManageDevelopers('user'), false);
});

test('isAccountActive: Detects suspended status correctly', () => {
  assert.equal(isAccountActive('active'), true);
  assert.equal(isAccountActive(undefined), true);
  assert.equal(isAccountActive('suspended'), false);
});

test('generateInviteToken: Generates cryptographic DEV-XXXX-XXXX-XXXX format', () => {
  const token = generateInviteToken();
  assert.match(token, /^DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // Successive tokens must be distinct
  const token2 = generateInviteToken();
  assert.notEqual(token, token2);
});

test('hashToken: Produces deterministic SHA-256 hex string', async () => {
  const token = 'DEV-ABCD-EFGH-JKLM';
  const hash1 = await hashToken(token);
  const hash2 = await hashToken(token);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test('validateInvitationStatus: Handles pending, expired, revoked, and reused invitations', () => {
  const futureExp = new Date(Date.now() + 86400000).toISOString();
  const pastExp = new Date(Date.now() - 86400000).toISOString();

  // Valid pending invitation
  assert.deepEqual(validateInvitationStatus({ status: 'pending', expiresAt: futureExp }), {
    isValid: true,
  });

  // Expired invitation
  const expired = validateInvitationStatus({ status: 'pending', expiresAt: pastExp });
  assert.equal(expired.isValid, false);
  assert.match(expired.error || '', /expired/i);

  // Revoked invitation
  const revoked = validateInvitationStatus({ status: 'revoked', expiresAt: futureExp });
  assert.equal(revoked.isValid, false);
  assert.match(revoked.error || '', /revoked/i);

  // Reused (accepted) invitation
  const reused = validateInvitationStatus({ status: 'accepted', expiresAt: futureExp });
  assert.equal(reused.isValid, false);
  assert.match(reused.error || '', /already been used/i);
});

test('sanitizeUserProfile: Formats profile safely', () => {
  const profile = sanitizeUserProfile({
    uid: 'u123',
    email: 'user@sthal.in',
    displayName: '',
    role: 'developer',
  });
  assert.equal(profile.displayName, 'user');
  assert.equal(profile.role, 'developer');
  assert.equal(profile.status, 'active');
});
