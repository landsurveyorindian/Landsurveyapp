package com.sthalmeasure.app.domain

import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserFeaturePermissions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionEvaluatorTest {

    @Test
    fun owner_bypassesGlobalGroupAndIndividualRestrictions() {
        val lockedAll = SystemSettings(
            calculatorEnabled = false,
            marketplaceEnabled = false,
            pdfReportsEnabled = false,
            userGroupPermissions = mapOf("plot_measurement" to false),
            developerGroupPermissions = mapOf("plot_measurement" to false)
        )
        val individualDeny = UserFeaturePermissions(
            uid = "owner_1",
            permissions = mapOf("plot_measurement" to false, "marketplace" to false)
        )

        AppFeature.entries.forEach { feat ->
            val res = PermissionEvaluator.resolveFeature(AppRole.OWNER, lockedAll, individualDeny, feat)
            assertTrue("Owner must always retain access to ${feat.key}", res.enabled)
            assertEquals(FeatureBlockReason.ALLOWED, res.reason)
        }
    }

    @Test
    fun regularUser_neverReceivesDeveloperToolsEvenIfIndividualOverrideTrue() {
        val permissiveSettings = SystemSettings(
            userGroupPermissions = SystemSettings.defaultUserGroupMap().toMutableMap().apply {
                put(AppFeature.DEVELOPER_TOOLS.key, true)
            }
        )
        val individualTrue = UserFeaturePermissions(
            uid = "user_1",
            permissions = mapOf(AppFeature.DEVELOPER_TOOLS.key to true)
        )

        val res = PermissionEvaluator.resolveFeature(AppRole.USER, permissiveSettings, individualTrue, AppFeature.DEVELOPER_TOOLS)
        assertFalse(res.enabled)
        assertEquals(FeatureBlockReason.BLOCKED_BY_ROLE_SECURITY, res.reason)
    }

    @Test
    fun globalKillSwitch_cannotBeBypassedByGroupOrIndividualEnable() {
        val settings = SystemSettings(
            marketplaceEnabled = false,
            userGroupPermissions = mapOf(AppFeature.MARKETPLACE.key to true),
            developerGroupPermissions = mapOf(AppFeature.MARKETPLACE.key to true)
        )
        val individualAllow = UserFeaturePermissions(
            uid = "u_2",
            permissions = mapOf(AppFeature.MARKETPLACE.key to true)
        )

        val userRes = PermissionEvaluator.resolveFeature(AppRole.USER, settings, individualAllow, AppFeature.MARKETPLACE)
        val devRes = PermissionEvaluator.resolveFeature(AppRole.DEVELOPER, settings, individualAllow, AppFeature.MARKETPLACE)

        assertFalse(userRes.enabled)
        assertEquals(FeatureBlockReason.BLOCKED_BY_GLOBAL_KILL_SWITCH, userRes.reason)
        assertFalse(devRes.enabled)
        assertEquals(FeatureBlockReason.BLOCKED_BY_GLOBAL_KILL_SWITCH, devRes.reason)
    }

    @Test
    fun groupControl_blocksUserRoleWhileDeveloperGroupStillAllowed_andCannotBeBypassedIndividually() {
        val settings = SystemSettings(
            aiAdvisorEnabled = true,
            userGroupPermissions = SystemSettings.defaultUserGroupMap().toMutableMap().apply {
                put(AppFeature.AI_TOOLS.key, false)
            },
            developerGroupPermissions = SystemSettings.defaultDeveloperGroupMap().toMutableMap().apply {
                put(AppFeature.AI_TOOLS.key, true)
            }
        )
        val individualEnable = UserFeaturePermissions(
            uid = "u_3",
            permissions = mapOf(AppFeature.AI_TOOLS.key to true)
        )

        val userRes = PermissionEvaluator.resolveFeature(AppRole.USER, settings, individualEnable, AppFeature.AI_TOOLS)
        val devRes = PermissionEvaluator.resolveFeature(AppRole.DEVELOPER, settings, individualEnable, AppFeature.AI_TOOLS)

        assertFalse(userRes.enabled)
        assertEquals(FeatureBlockReason.BLOCKED_BY_GROUP_CONTROL, userRes.reason)
        assertTrue(devRes.enabled)
        assertEquals(FeatureBlockReason.ALLOWED, devRes.reason)
    }

    @Test
    fun individualOverride_canRestrictSpecificAccountEvenWhenGlobalAndGroupAllowed() {
        val settings = SystemSettings()
        val individualDisablePdf = UserFeaturePermissions(
            uid = "u_4",
            permissions = mapOf(AppFeature.PDF_REPORTS.key to false)
        )

        val restricted = PermissionEvaluator.resolveFeature(AppRole.USER, settings, individualDisablePdf, AppFeature.PDF_REPORTS)
        val untouched = PermissionEvaluator.resolveFeature(AppRole.USER, settings, individualDisablePdf, AppFeature.GPS_SURVEY)

        assertFalse(restricted.enabled)
        assertEquals(FeatureBlockReason.BLOCKED_BY_INDIVIDUAL_OVERRIDE, restricted.reason)
        assertTrue(untouched.enabled)
        assertEquals(FeatureBlockReason.ALLOWED, untouched.reason)
    }

    @Test
    fun failClosed_keepsNonOwnerFeaturesLoadingUntilBothSourcesSucceed() {
        val loadingSettings = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.USER,
            settingsState = PermissionSourceState.Loading,
            individualState = PermissionSourceState.Loaded(null)
        )
        val loadingIndividual = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.DEVELOPER,
            settingsState = PermissionSourceState.Loaded(SystemSettings()),
            individualState = PermissionSourceState.Loading
        )

        AppFeature.entries.forEach { feat ->
            assertEquals(PermissionAccessState.LOADING, loadingSettings[feat])
            assertEquals(PermissionAccessState.LOADING, loadingIndividual[feat])
        }
    }

    @Test
    fun failClosed_serviceErrorOrDenialNeverSilentlyGrantsAccess() {
        val unavailableStates = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.USER,
            settingsState = PermissionSourceState.Loaded(SystemSettings()),
            individualState = PermissionSourceState.Unavailable("network offline")
        )
        val deniedStates = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.DEVELOPER,
            settingsState = PermissionSourceState.Denied,
            individualState = PermissionSourceState.Loaded(null)
        )

        AppFeature.entries.forEach { feat ->
            assertEquals(PermissionAccessState.UNAVAILABLE, unavailableStates[feat])
            assertEquals(PermissionAccessState.DENIED, deniedStates[feat])
        }
    }

    @Test
    fun confirmedMissingIndividualDoc_usesConfiguredDefaultsSafely() {
        val states = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.USER,
            settingsState = PermissionSourceState.Loaded(SystemSettings()),
            individualState = PermissionSourceState.Loaded(null)
        )

        assertEquals(PermissionAccessState.ALLOWED, states[AppFeature.PLOT_MEASUREMENT])
        assertEquals(PermissionAccessState.ALLOWED, states[AppFeature.MARKETPLACE])
        assertEquals(PermissionAccessState.DENIED, states[AppFeature.DEVELOPER_TOOLS])
    }

    @Test
    fun verifiedOwner_retainsAccessEvenDuringSourceErrors() {
        val ownerStates = PermissionEvaluator.resolveAllFeatureAccessStates(
            role = AppRole.OWNER,
            settingsState = PermissionSourceState.Unavailable("timeout"),
            individualState = PermissionSourceState.Loading
        )
        AppFeature.entries.forEach { feat ->
            assertEquals(PermissionAccessState.ALLOWED, ownerStates[feat])
        }
    }
}

