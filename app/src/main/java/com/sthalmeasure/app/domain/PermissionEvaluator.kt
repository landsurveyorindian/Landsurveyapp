package com.sthalmeasure.app.domain

import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserFeaturePermissions

enum class AppFeature(
    val key: String,
    val label: String,
    val subtitle: String,
    val defaultForUser: Boolean = true,
    val defaultForDeveloper: Boolean = true
) {
    PLOT_MEASUREMENT(
        key = "plot_measurement",
        label = "Plot Calculator & State Units",
        subtitle = "4-Sided, 5-Sided, Heron, Bowditch Traverse & 36-State Converter"
    ),
    GPS_SURVEY(
        key = "gps_survey",
        label = "GPS Boundary Walk",
        subtitle = "Fused GNSS Kalman Tracking, Multipath Filter, GCP & UTM"
    ),
    CAD_TOOLS(
        key = "cad_tools",
        label = "CAD Drafting Studio",
        subtitle = "COGO Plotting, Parcel Split, Setback & FMB G-Line Ladder"
    ),
    GIS_TOOLS(
        key = "gis_tools",
        label = "GIS Import / Export",
        subtitle = "DXF, GeoJSON, KML & Shapefile ZIP + CRS Validation"
    ),
    PDF_REPORTS(
        key = "pdf_reports",
        label = "PDF Survey Reports",
        subtitle = "Native Android Survey Certificate PDF Export & Share"
    ),
    MARKETPLACE(
        key = "marketplace",
        label = "Land Marketplace",
        subtitle = "Verified Parcel Listings, Search, Inquiries & Listing Reports"
    ),
    AI_TOOLS(
        key = "ai_tools",
        label = "AI Plot Advisor",
        subtitle = "Gemini Cadastral Chat Assistant"
    ),
    DOC_SCANNER(
        key = "doc_scanner",
        label = "AI Land Document Scanner",
        subtitle = "OCR Patta, 7/12 & Adangal Structured Extraction"
    ),
    VIDEO_ACADEMY(
        key = "video_academy",
        label = "Survey Video Academy",
        subtitle = "18-Episode Guided Field Training & Video Player"
    ),
    DEVELOPER_TOOLS(
        key = "developer_tools",
        label = "Developer Console",
        subtitle = "Engineering Bug Triage & Feature Flag Telemetry",
        defaultForUser = false,
        defaultForDeveloper = true
    );

    companion object {
        fun fromKey(key: String): AppFeature? = entries.firstOrNull { it.key == key }
    }
}

enum class PermissionAccessState {
    LOADING,
    ALLOWED,
    DENIED,
    UNAVAILABLE
}

sealed interface PermissionSourceState<out T> {
    data object Loading : PermissionSourceState<Nothing>
    data class Loaded<T>(val value: T) : PermissionSourceState<T>
    data object Denied : PermissionSourceState<Nothing>
    data class Unavailable(val message: String) : PermissionSourceState<Nothing>
}

enum class FeatureBlockReason(val badgeLabel: String) {
    ALLOWED("Active"),
    BLOCKED_BY_ROLE_SECURITY("Restricted by Role Security"),
    BLOCKED_BY_GLOBAL_KILL_SWITCH("Blocked by Global Kill Switch"),
    BLOCKED_BY_GROUP_CONTROL("Blocked by Role Group Control"),
    BLOCKED_BY_INDIVIDUAL_OVERRIDE("Disabled for Account")
}

data class FeatureResolution(
    val feature: AppFeature,
    val enabled: Boolean,
    val reason: FeatureBlockReason,
    val globalEnabled: Boolean,
    val groupEnabled: Boolean,
    val individualOverride: Boolean?
)

/**
 * Pure 5-level RBAC permission resolver with fail-closed loading states:
 * 1. Essential security & role restrictions (Users never receive DEVELOPER_TOOLS; Auth/Account SignOut never gated)
 * 2. Global kill switch
 * 3. Role-wide group permissions (All Users vs All Developers)
 * 4. Individual account permissions (cannot override a Global or Role-wide denial)
 * 5. Default feature value
 *
 * Loading/error semantics (fail-closed):
 * - Missing `userFeaturePermissions/{uid}` document is `Loaded(null)` and safely uses defaults.
 * - Loading sources keep protected features in `LOADING`.
 * - Firestore `PERMISSION_DENIED` moves features to `DENIED`.
 * - Network/unavailable errors move features to `UNAVAILABLE`.
 */
object PermissionEvaluator {

    fun defaultPermissionsForRole(role: AppRole): Map<String, Boolean> = when (role) {
        AppRole.OWNER -> AppFeature.entries.associate { it.key to true }
        AppRole.DEVELOPER -> AppFeature.entries.associate { it.key to it.defaultForDeveloper }
        AppRole.USER -> AppFeature.entries.associate { it.key to it.defaultForUser }
    }

    fun defaultUserGroupMap(): Map<String, Boolean> =
        AppFeature.entries.associate { it.key to it.defaultForUser }

    fun defaultDeveloperGroupMap(): Map<String, Boolean> =
        AppFeature.entries.associate { it.key to it.defaultForDeveloper }

    fun isGloballyEnabled(settings: SystemSettings, feature: AppFeature): Boolean = when (feature) {
        AppFeature.PLOT_MEASUREMENT -> settings.calculatorEnabled
        AppFeature.CAD_TOOLS -> settings.cadStudioEnabled
        AppFeature.GPS_SURVEY -> settings.gpsWalkEnabled
        AppFeature.GIS_TOOLS -> settings.gisImportExportEnabled
        AppFeature.PDF_REPORTS -> settings.pdfReportsEnabled
        AppFeature.MARKETPLACE -> settings.marketplaceEnabled
        AppFeature.AI_TOOLS -> settings.aiAdvisorEnabled
        AppFeature.DOC_SCANNER -> settings.documentScannerEnabled
        AppFeature.VIDEO_ACADEMY -> settings.academyEnabled
        AppFeature.DEVELOPER_TOOLS -> true
    }

    fun isGroupEnabled(settings: SystemSettings, role: AppRole, feature: AppFeature): Boolean = when (role) {
        AppRole.OWNER -> true
        AppRole.DEVELOPER -> settings.developerGroupPermissions[feature.key] ?: feature.defaultForDeveloper
        AppRole.USER -> {
            if (feature == AppFeature.DEVELOPER_TOOLS) false
            else settings.userGroupPermissions[feature.key] ?: feature.defaultForUser
        }
    }

    fun resolveFeature(
        role: AppRole,
        settings: SystemSettings,
        individualDoc: UserFeaturePermissions?,
        feature: AppFeature
    ): FeatureResolution {
        // Level 1: Essential security & role restrictions
        if (role == AppRole.OWNER) {
            return FeatureResolution(
                feature = feature,
                enabled = true,
                reason = FeatureBlockReason.ALLOWED,
                globalEnabled = isGloballyEnabled(settings, feature),
                groupEnabled = true,
                individualOverride = individualDoc?.permissions?.get(feature.key)
            )
        }
        if (role == AppRole.USER && feature == AppFeature.DEVELOPER_TOOLS) {
            return FeatureResolution(
                feature = feature,
                enabled = false,
                reason = FeatureBlockReason.BLOCKED_BY_ROLE_SECURITY,
                globalEnabled = true,
                groupEnabled = false,
                individualOverride = individualDoc?.permissions?.get(feature.key)
            )
        }

        // Level 2: Global kill switch
        val globalOn = isGloballyEnabled(settings, feature)
        val groupOn = isGroupEnabled(settings, role, feature)
        val individual = individualDoc?.permissions?.get(feature.key)

        if (!globalOn) {
            return FeatureResolution(
                feature = feature,
                enabled = false,
                reason = FeatureBlockReason.BLOCKED_BY_GLOBAL_KILL_SWITCH,
                globalEnabled = false,
                groupEnabled = groupOn,
                individualOverride = individual
            )
        }

        // Level 3: Role-wide group permissions
        if (!groupOn) {
            return FeatureResolution(
                feature = feature,
                enabled = false,
                reason = FeatureBlockReason.BLOCKED_BY_GROUP_CONTROL,
                globalEnabled = true,
                groupEnabled = false,
                individualOverride = individual
            )
        }

        // Level 4 & 5: Individual override (can only restrict, never re-enable above) or Default
        val defaultOn = when (role) {
            AppRole.DEVELOPER -> feature.defaultForDeveloper
            AppRole.USER -> feature.defaultForUser
            AppRole.OWNER -> true
        }
        val effective = individual ?: defaultOn
        return FeatureResolution(
            feature = feature,
            enabled = effective,
            reason = if (effective) FeatureBlockReason.ALLOWED else FeatureBlockReason.BLOCKED_BY_INDIVIDUAL_OVERRIDE,
            globalEnabled = true,
            groupEnabled = true,
            individualOverride = individual
        )
    }

    fun resolveFeatureAccessState(
        role: AppRole,
        settingsState: PermissionSourceState<SystemSettings>,
        individualState: PermissionSourceState<UserFeaturePermissions?>,
        feature: AppFeature
    ): PermissionAccessState {
        // Verified Owner always retains administrative access
        if (role == AppRole.OWNER) {
            return PermissionAccessState.ALLOWED
        }
        // Fail closed on explicit permission denial from backend
        if (settingsState is PermissionSourceState.Denied ||
            individualState is PermissionSourceState.Denied
        ) {
            return PermissionAccessState.DENIED
        }
        // Fail closed when Firestore service / network is unavailable
        if (settingsState is PermissionSourceState.Unavailable ||
            individualState is PermissionSourceState.Unavailable
        ) {
            return PermissionAccessState.UNAVAILABLE
        }
        // Fail closed while required permission documents are still loading
        if (settingsState !is PermissionSourceState.Loaded ||
            individualState !is PermissionSourceState.Loaded
        ) {
            return PermissionAccessState.LOADING
        }
        val resolution = resolveFeature(role, settingsState.value, individualState.value, feature)
        return if (resolution.enabled) PermissionAccessState.ALLOWED else PermissionAccessState.DENIED
    }

    fun resolveAllFeatureAccessStates(
        role: AppRole,
        settingsState: PermissionSourceState<SystemSettings>,
        individualState: PermissionSourceState<UserFeaturePermissions?>
    ): Map<AppFeature, PermissionAccessState> =
        AppFeature.entries.associateWith { feature ->
            resolveFeatureAccessState(role, settingsState, individualState, feature)
        }

    fun resolveEffectivePermissions(
        role: AppRole,
        settings: SystemSettings,
        individualDoc: UserFeaturePermissions?
    ): Map<AppFeature, Boolean> =
        AppFeature.entries.associateWith { feature ->
            resolveFeature(role, settings, individualDoc, feature).enabled
        }

    fun featureForRoute(route: String): AppFeature? = when (route) {
        "calc" -> AppFeature.PLOT_MEASUREMENT
        "cad" -> AppFeature.CAD_TOOLS
        "gps" -> AppFeature.GPS_SURVEY
        "gis" -> AppFeature.GIS_TOOLS
        "market" -> AppFeature.MARKETPLACE
        "developer" -> AppFeature.DEVELOPER_TOOLS
        else -> null
    }
}
