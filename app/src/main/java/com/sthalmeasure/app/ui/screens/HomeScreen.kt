package com.sthalmeasure.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Architecture
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.FolderCopy
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.ImportExport
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.domain.AppFeature
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.domain.PermissionAccessState
import com.sthalmeasure.app.domain.PermissionEvaluator
import com.sthalmeasure.app.ui.components.IndianStateUnitsDropdown

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HomeScreen(
    activeState: String,
    projectCount: Int,
    listingCount: Int,
    appRole: AppRole = AppRole.USER,
    systemSettings: SystemSettings = SystemSettings(),
    effectivePermissions: Map<AppFeature, Boolean>? = null,
    featureAccessStates: Map<AppFeature, PermissionAccessState>? = null,
    openBugCount: Int = 0,
    onRetryPermissions: () -> Unit = {},
    onSelectState: (String) -> Unit = {},
    onNavigate: (String) -> Unit,
    onOpenAiAdvisor: () -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAcademy: () -> Unit,
    onOpenBugReport: () -> Unit
) {
    var selectedState by remember(activeState) { mutableStateOf(activeState) }
    val stateInfo = IndianStateUnitsCatalog.getStateConfig(selectedState)
    val resolvedStates: Map<AppFeature, PermissionAccessState> = when {
        featureAccessStates != null -> featureAccessStates
        effectivePermissions != null -> AppFeature.entries.associateWith { feat ->
            if (effectivePermissions[feat] == true) PermissionAccessState.ALLOWED else PermissionAccessState.DENIED
        }
        else -> PermissionEvaluator.resolveEffectivePermissions(appRole, systemSettings, null).mapValues { (_, ok) ->
            if (ok) PermissionAccessState.ALLOWED else PermissionAccessState.DENIED
        }
    }
    fun accessStateOf(f: AppFeature): PermissionAccessState = resolvedStates[f] ?: PermissionAccessState.LOADING
    fun isFeatEnabled(f: AppFeature): Boolean = accessStateOf(f) == PermissionAccessState.ALLOWED

    val anyLoading = resolvedStates.values.any { it == PermissionAccessState.LOADING }
    val anyUnavailable = resolvedStates.values.any { it == PermissionAccessState.UNAVAILABLE }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        if (anyUnavailable) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.errorContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth().testTag("permissions_unavailable_banner")
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudOff,
                            contentDescription = "Permissions Unavailable",
                            tint = MaterialTheme.colorScheme.error
                        )
                        Column {
                            Text(
                                text = "Feature Permissions Unavailable",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                            Text(
                                text = "Protected modules remain locked until cloud permission policy responds.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = onRetryPermissions,
                        modifier = Modifier.testTag("retry_permissions_button")
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Text(" Retry", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        } else if (anyLoading) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth().testTag("permissions_loading_banner")
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.HourglassTop,
                        contentDescription = "Checking permissions",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Verifying feature access policy...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        if (systemSettings.announcementTitle.isNotBlank() || systemSettings.announcementMessage.isNotBlank()) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.secondaryContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth().testTag("system_announcement_banner")
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Campaign,
                        contentDescription = "Announcement",
                        tint = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        if (systemSettings.announcementTitle.isNotBlank()) {
                            Text(
                                text = systemSettings.announcementTitle,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                        if (systemSettings.announcementMessage.isNotBlank()) {
                            Text(
                                text = systemSettings.announcementMessage,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }
            }
        }

        // State Revenue Banner
        Surface(
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.primaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${stateInfo.state} (${stateInfo.code})",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.primary
                    ) {
                        Text(
                            text = stateInfo.region.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                Text(
                    text = "Portal: ${stateInfo.revenuePortal}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = stateInfo.notes,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                )
                IndianStateUnitsDropdown(
                    selectedState = selectedState,
                    onSelectState = { chosen ->
                        selectedState = chosen
                        onSelectState(chosen)
                    },
                    label = "Switch State / UT & Cadastral Units (${IndianStateUnitsCatalog.allStates.size})",
                    dropdownTag = "home_state_dropdown"
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    stateInfo.primaryUnits.take(5).forEach { unitName ->
                        AssistChip(
                            onClick = { onNavigate("calc") },
                            enabled = isFeatEnabled(AppFeature.PLOT_MEASUREMENT),
                            label = { Text(unitName, style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }
            }
        }

        // Primary Workspaces Grid
        Text(
            text = "Surveying Workspaces",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground
        )

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                WorkspaceTile(
                    title = "Plot Calculator",
                    subtitle = "4-Sided, Heron, Traverse & Units",
                    icon = Icons.Default.Calculate,
                    tag = "tile_calculator",
                    accessState = accessStateOf(AppFeature.PLOT_MEASUREMENT),
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("calc") }
                )
                WorkspaceTile(
                    title = "CAD Drafting Studio",
                    subtitle = "COGO, Setback, Split & FMB",
                    icon = Icons.Default.Architecture,
                    tag = "tile_cad",
                    accessState = accessStateOf(AppFeature.CAD_TOOLS),
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("cad") }
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                WorkspaceTile(
                    title = "GPS Walk Area",
                    subtitle = "Kalman, Bhuvan & Google Maps",
                    icon = Icons.Default.GpsFixed,
                    tag = "tile_gps",
                    accessState = accessStateOf(AppFeature.GPS_SURVEY),
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("gps") }
                )
                WorkspaceTile(
                    title = "GIS Import / Export",
                    subtitle = "DXF, GeoJSON, SHP & Map Layers",
                    icon = Icons.Default.ImportExport,
                    tag = "tile_gis",
                    accessState = accessStateOf(AppFeature.GIS_TOOLS),
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("gis") }
                )
            }
            WorkspaceTile(
                title = "Bhuvan Map 2D",
                subtitle = "NRSC 2D Background Layer & My Location",
                icon = Icons.Default.Public,
                tag = "tile_bhuvan_map_2d",
                accessState = accessStateOf(AppFeature.GIS_TOOLS),
                modifier = Modifier.fillMaxWidth(),
                onClick = { onNavigate("bhuvan_2d") }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                WorkspaceTile(
                    title = "Survey Vault ($projectCount)",
                    subtitle = "Cloud Synced Field Projects",
                    icon = Icons.Default.FolderCopy,
                    tag = "tile_projects",
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("projects") }
                )
                WorkspaceTile(
                    title = "Land Market ($listingCount)",
                    subtitle = "Verified Parcel Listings",
                    icon = Icons.Default.Storefront,
                    tag = "tile_market",
                    accessState = accessStateOf(AppFeature.MARKETPLACE),
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigate("market") }
                )
            }
        }

        // AI & Academy Tools
        Text(
            text = "Intelligence & Training",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            WorkspaceTile(
                title = "AI Plot Advisor",
                subtitle = "Gemini Cadastral Expert",
                icon = Icons.Default.AutoAwesome,
                tag = "tile_ai_advisor",
                accessState = accessStateOf(AppFeature.AI_TOOLS),
                modifier = Modifier.weight(1f),
                onClick = onOpenAiAdvisor
            )
            WorkspaceTile(
                title = "Doc Scanner",
                subtitle = "OCR 7/12, Patta & Deeds",
                icon = Icons.Default.DocumentScanner,
                tag = "tile_doc_scanner",
                accessState = accessStateOf(AppFeature.DOC_SCANNER),
                modifier = Modifier.weight(1f),
                onClick = onOpenScanner
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            WorkspaceTile(
                title = "18-Ep Academy",
                subtitle = "Guided Field Workflows",
                icon = Icons.Default.PlayCircle,
                tag = "tile_academy",
                accessState = accessStateOf(AppFeature.VIDEO_ACADEMY),
                modifier = Modifier.weight(1f),
                onClick = onOpenAcademy
            )
            WorkspaceTile(
                title = "Report Issue",
                subtitle = "Submit Field Defect",
                icon = Icons.Default.BugReport,
                tag = "tile_bug_report",
                modifier = Modifier.weight(1f),
                onClick = onOpenBugReport
            )
        }

        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun WorkspaceTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    tag: String,
    modifier: Modifier = Modifier,
    accessState: PermissionAccessState = PermissionAccessState.ALLOWED,
    onClick: () -> Unit
) {
    val enabled = accessState == PermissionAccessState.ALLOWED
    val displaySubtitle = when (accessState) {
        PermissionAccessState.ALLOWED -> subtitle
        PermissionAccessState.LOADING -> "Checking access..."
        PermissionAccessState.UNAVAILABLE -> "Permissions unavailable"
        PermissionAccessState.DENIED -> "Disabled by Owner"
    }
    Card(
        modifier = modifier
            .height(108.dp)
            .alpha(if (enabled) 1f else 0.58f)
            .clickable(enabled = enabled, onClick = onClick)
            .testTag(tag),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
                when (accessState) {
                    PermissionAccessState.ALLOWED -> Unit
                    PermissionAccessState.LOADING -> Icon(
                        imageVector = Icons.Default.HourglassTop,
                        contentDescription = "Checking access",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                    PermissionAccessState.UNAVAILABLE -> Icon(
                        imageVector = Icons.Default.CloudOff,
                        contentDescription = "Permissions unavailable",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp)
                    )
                    PermissionAccessState.DENIED -> Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Disabled by Owner",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Text(
                    text = displaySubtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = when (accessState) {
                        PermissionAccessState.ALLOWED -> MaterialTheme.colorScheme.onSurfaceVariant
                        PermissionAccessState.LOADING -> MaterialTheme.colorScheme.onSurfaceVariant
                        PermissionAccessState.UNAVAILABLE, PermissionAccessState.DENIED -> MaterialTheme.colorScheme.error
                    },
                    maxLines = 1
                )
            }
        }
    }
}
