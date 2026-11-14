import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getDefaultPermissionForRole,
  resolveSingleFeaturePermission,
  resolveEffectivePermissions,
} from './permissionResolver';
import {
  APPLICATION_FEATURES,
  FeatureKey,
  UserFeaturePermissionsDoc,
} from '../types/permissions';
import { SystemSettings } from '../types/auth';

describe('Owner-Controlled Individual User Feature Access Management System', () => {
  // Test 1: Standard role defaults
  it('Scenario 1: Default User role permits standard features and denies developer tools', () => {
    assert.strictEqual(getDefaultPermissionForRole('land_measurement', 'user'), true);
    assert.strictEqual(getDefaultPermissionForRole('four_sided_plot', 'user'), true);
    assert.strictEqual(getDefaultPermissionForRole('bhuvan_map', 'user'), true);
    assert.strictEqual(getDefaultPermissionForRole('video_academy', 'user'), true);
    assert.strictEqual(getDefaultPermissionForRole('developer_diagnostics', 'user'), false);
    assert.strictEqual(getDefaultPermissionForRole('developer_logs', 'user'), false);
  });

  // Test 2: Developer role defaults
  it('Scenario 2: Developer role defaults allow developer diagnostics and telemetry logs', () => {
    assert.strictEqual(getDefaultPermissionForRole('developer_diagnostics', 'developer'), true);
    assert.strictEqual(getDefaultPermissionForRole('developer_logs', 'developer'), true);
    assert.strictEqual(getDefaultPermissionForRole('land_measurement', 'developer'), true);
  });

  // Test 3: Owner universal clearance
  it('Scenario 3: Owner role has universal clearance and cannot be locked out', () => {
    const ownerRes = resolveSingleFeaturePermission('developer_diagnostics', {
      uid: 'owner_1',
      role: 'owner',
      status: 'active',
    }, 'off'); // Even if explicit 'off' is provided, Tier 2 Owner lock takes precedence!

    assert.strictEqual(ownerRes.allowed, true);
    assert.strictEqual(ownerRes.source, 'owner_lock');
  });

  // Test 4: Suspended account security (Tier 1)
  it('Scenario 4: Suspended account fails closed across all features regardless of overrides', () => {
    const suspendedRes = resolveSingleFeaturePermission('land_measurement', {
      uid: 'user_suspended',
      role: 'user',
      status: 'suspended',
    }, 'on'); // Explicit 'on' override must NOT bypass suspended state!

    assert.strictEqual(suspendedRes.allowed, false);
    assert.strictEqual(suspendedRes.source, 'security');
    assert.match(suspendedRes.reason, /suspended/i);
  });

  // Test 5: Global emergency maintenance mode (Tier 3)
  it('Scenario 5: Global maintenance mode shuts down features for non-owners', () => {
    const maintenanceSettings: SystemSettings = {
      maintenanceMode: true,
      featureFlags: {
        cadDraftingStudio: true,
        bhuvanCadastralWalk: true,
        aiAssistedAudit: true,
        landMarketplace: true,
        advancedTraverse: true,
        experimentalBetaTools: false,
      },
      announcement: { active: false, message: '', type: 'info' },
      updatedAt: new Date().toISOString(),
      updatedBy: 'owner@sthalmeasure.gov.in',
    };

    const res = resolveSingleFeaturePermission('four_sided_plot', {
      uid: 'user_active',
      role: 'user',
      status: 'active',
    }, 'on', maintenanceSettings);

    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.source, 'global_shutdown');
  });

  // Test 6: Global emergency feature flag (Tier 3)
  it('Scenario 6: Global emergency feature flag disables specific module', () => {
    const flagSettings: SystemSettings = {
      maintenanceMode: false,
      featureFlags: {
        cadDraftingStudio: false, // Emergency disabled
        bhuvanCadastralWalk: true,
        aiAssistedAudit: true,
        landMarketplace: true,
        advancedTraverse: false, // Emergency disabled
        experimentalBetaTools: false,
      },
      announcement: { active: false, message: '', type: 'info' },
      updatedAt: new Date().toISOString(),
      updatedBy: 'owner@sthalmeasure.gov.in',
    };

    const cadRes = resolveSingleFeaturePermission('cad_tools', {
      uid: 'user_active',
      role: 'user',
      status: 'active',
    }, 'on', flagSettings);

    assert.strictEqual(cadRes.allowed, false);
    assert.strictEqual(cadRes.source, 'global_shutdown');
    assert.match(cadRes.reason, /cadDraftingStudio/i);
  });

  // Test 7: Role boundary protection (Tier 4)
  it('Scenario 7: Standard User accounts cannot be granted Developer tools via individual override', () => {
    const attemptEscalation = resolveSingleFeaturePermission('developer_diagnostics', {
      uid: 'user_standard',
      role: 'user',
      status: 'active',
    }, 'on');

    assert.strictEqual(attemptEscalation.allowed, false);
    assert.strictEqual(attemptEscalation.source, 'role_boundary');
    assert.match(attemptEscalation.reason, /prohibited for standard User accounts/i);
  });

  // Test 8: Individual explicit 'on' override (Tier 5)
  it('Scenario 8: Explicit ON override enables feature when role default was restrictive', () => {
    // For a developer account, if a beta feature were false, ON enables it
    const res = resolveSingleFeaturePermission('triangulation', {
      uid: 'user_a',
      role: 'user',
      status: 'active',
    }, 'on');

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.source, 'individual_override');
    assert.strictEqual(res.state, 'on');
  });

  // Test 9: Individual explicit 'off' override (Tier 5)
  it('Scenario 9: Explicit OFF override disables feature for specific user', () => {
    const res = resolveSingleFeaturePermission('video_academy', {
      uid: 'user_restricted',
      role: 'user',
      status: 'active',
    }, 'off');

    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.source, 'individual_override');
    assert.strictEqual(res.state, 'off');
    assert.match(res.reason, /explicitly disabled/i);
  });

  // Test 10: INHERITED state falls back to role default (Tier 6)
  it('Scenario 10: INHERITED state falls back to standard role defaults', () => {
    const userRes = resolveSingleFeaturePermission('land_measurement', {
      uid: 'user_inherited',
      role: 'user',
      status: 'active',
    }, 'inherited');

    assert.strictEqual(userRes.allowed, true);
    assert.strictEqual(userRes.source, 'role_default');
    assert.strictEqual(userRes.state, 'inherited');

    const devToolRes = resolveSingleFeaturePermission('developer_diagnostics', {
      uid: 'user_inherited',
      role: 'user',
      status: 'active',
    }, 'inherited');

    assert.strictEqual(devToolRes.allowed, false);
  });

  // Test 11: Account Isolation (Account A changes do not leak to Account B)
  it('Scenario 11: Account isolation - Overrides for Account A do not mutate Account B', () => {
    const docA: UserFeaturePermissionsDoc = {
      uid: 'user_a',
      email: 'a@example.com',
      displayName: 'Alice',
      role: 'user',
      permissions: {
        video_academy: 'off',
        land_measurement: 'off',
      } as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'owner@sthalmeasure.gov.in',
      permissionVersion: 2,
    };

    const docB: UserFeaturePermissionsDoc = {
      uid: 'user_b',
      email: 'b@example.com',
      displayName: 'Bob',
      role: 'user',
      permissions: {
        video_academy: 'inherited',
        land_measurement: 'inherited',
      } as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'owner@sthalmeasure.gov.in',
      permissionVersion: 1,
    };

    const effectiveA = resolveEffectivePermissions({ uid: 'user_a', role: 'user', status: 'active' }, docA);
    const effectiveB = resolveEffectivePermissions({ uid: 'user_b', role: 'user', status: 'active' }, docB);

    assert.strictEqual(effectiveA.permissions.video_academy, false);
    assert.strictEqual(effectiveA.permissions.land_measurement, false);

    assert.strictEqual(effectiveB.permissions.video_academy, true);
    assert.strictEqual(effectiveB.permissions.land_measurement, true);
  });

  // Test 12: Complete 21-feature application inventory resolution
  it('Scenario 12: Resolves all 21 discrete application features without unmapped keys', () => {
    assert.strictEqual(APPLICATION_FEATURES.length, 21);

    const effective = resolveEffectivePermissions({ uid: 'user_test', role: 'user', status: 'active' }, null);

    for (const feat of APPLICATION_FEATURES) {
      assert.strictEqual(typeof effective.permissions[feat.key], 'boolean');
      assert.strictEqual(typeof effective.states[feat.key], 'string');
      assert.strictEqual(typeof effective.reasons[feat.key], 'string');
    }
  });

  // Test 13: Restore Defaults resets all features to inherited
  it('Scenario 13: Restoring defaults reverts all overrides to inherited and recovers role defaults', () => {
    const docWithOverrides: UserFeaturePermissionsDoc = {
      uid: 'user_c',
      email: 'c@example.com',
      displayName: 'Charlie',
      role: 'user',
      permissions: {
        bhuvan_map: 'off',
        marketplace_browse: 'off',
        cad_tools: 'off',
      } as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'owner@sthalmeasure.gov.in',
      permissionVersion: 3,
    };

    const effectiveBefore = resolveEffectivePermissions(
      { uid: 'user_c', role: 'user', status: 'active' },
      docWithOverrides
    );
    assert.strictEqual(effectiveBefore.permissions.bhuvan_map, false);
    assert.strictEqual(effectiveBefore.permissions.marketplace_browse, false);

    // Simulate reset
    const docRestored: UserFeaturePermissionsDoc = {
      ...docWithOverrides,
      permissions: {} as any,
      permissionVersion: 4,
    };

    const effectiveAfter = resolveEffectivePermissions(
      { uid: 'user_c', role: 'user', status: 'active' },
      docRestored
    );
    assert.strictEqual(effectiveAfter.permissions.bhuvan_map, true);
    assert.strictEqual(effectiveAfter.permissions.marketplace_browse, true);
    assert.strictEqual(effectiveAfter.states.bhuvan_map, 'inherited');
  });

  // Test 14: Category coverage
  it('Scenario 14: Features belong to the 9 defined application categories', () => {
    const expectedCategories = new Set([
      'measurement',
      'surveying',
      'mapping',
      'cad_gis',
      'projects',
      'ai_tools',
      'marketplace',
      'learning',
      'developer_tools',
    ]);

    for (const feat of APPLICATION_FEATURES) {
      assert.strictEqual(expectedCategories.has(feat.category), true, `Feature ${feat.key} has valid category`);
    }
  });

  // Test 15: Developer role can be granted developer tools with explicit 'on' or 'inherited'
  it('Scenario 15: Developer account correctly resolves developer tools', () => {
    const devUser = { uid: 'dev_1', role: 'developer' as const, status: 'active' as const };
    const devEffective = resolveEffectivePermissions(devUser, null);

    assert.strictEqual(devEffective.permissions.developer_diagnostics, true);
    assert.strictEqual(devEffective.permissions.developer_logs, true);
  });
});
