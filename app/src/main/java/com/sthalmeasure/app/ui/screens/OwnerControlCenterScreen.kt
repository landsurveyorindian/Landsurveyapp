package com.sthalmeasure.app.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeveloperMode
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.ToggleOn
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.DeveloperEmailEntry
import com.sthalmeasure.app.data.model.ListingReport
import com.sthalmeasure.app.data.model.MarketListing
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.data.repository.AdminRepository
import com.sthalmeasure.app.domain.AppFeature

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OwnerControlCenterScreen(
    ownerEmail: String,
    systemSettings: SystemSettings,
    developerEmails: List<DeveloperEmailEntry>,
    allUsers: List<UserProfile>,
    listings: List<MarketListing>,
    bugReports: List<BugReport>,
    listingReports: List<ListingReport> = emptyList(),
    onSaveBusinessControls: (SystemSettings) -> Unit,
    onAddDeveloperEmail: (email: String, label: String) -> Unit,
    onToggleDeveloperEmail: (email: String, active: Boolean) -> Unit,
    onRemoveDeveloperEmail: (email: String) -> Unit,
    onUpdateUserRoleStatus: (uid: String, role: String, status: String) -> Unit,
    onVerifyListing: (listingId: String, verified: Boolean, status: String) -> Unit,
    onTriageListingReport: (reportId: String, status: String) -> Unit = { _, _ -> },
    onOpenDeveloperDashboard: () -> Unit,
    onOpenIndividualPermissions: () -> Unit = {}
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Features", "Dev Emails", "Users", "Market")

    var draftSettings by remember(systemSettings) { mutableStateOf(systemSettings) }
    var devEmailInput by remember { mutableStateOf("") }
    var devLabelInput by remember { mutableStateOf("") }
    var devEmailError by remember { mutableStateOf<String?>(null) }

    val enabledFeatureCount = listOf(
        draftSettings.calculatorEnabled,
        draftSettings.cadStudioEnabled,
        draftSettings.gpsWalkEnabled,
        draftSettings.gisImportExportEnabled,
        draftSettings.pdfReportsEnabled,
        draftSettings.marketplaceEnabled,
        draftSettings.aiAdvisorEnabled,
        draftSettings.documentScannerEnabled,
        draftSettings.academyEnabled
    ).count { it }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header Banner
        Surface(
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.primaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            Icons.Default.AdminPanelSettings,
                            contentDescription = "Owner Control Center",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Column {
                            Text(
                                "Owner Control Center",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                ownerEmail.ifBlank { AdminRepository.OWNER_EMAIL },
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = onOpenDeveloperDashboard,
                        modifier = Modifier.testTag("owner_open_dev_btn")
                    ) {
                        Icon(Icons.Default.DeveloperMode, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.size(4.dp))
                        Text("Dev (${bugReports.count { it.status == "new" || it.status == "investigating" }})")
                    }
                }
                Text(
                    "$enabledFeatureCount / 9 Global Modules Enabled • ${developerEmails.count { it.active }} Active Dev Emails • ${allUsers.size} Users",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        // Section Tabs
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            tabs.forEachIndexed { idx, label ->
                SegmentedButton(
                    selected = selectedTab == idx,
                    onClick = { selectedTab = idx },
                    shape = SegmentedButtonDefaults.itemShape(index = idx, count = tabs.size),
                    icon = {},
                    modifier = Modifier.testTag("owner_tab_${label.lowercase().replace(" ", "_")}")
                ) {
                    Text(
                        text = label,
                        maxLines = 1,
                        softWrap = false,
                        style = MaterialTheme.typography.labelLarge.copy(fontSize = 11.sp)
                    )
                }
            }
        }

        when (selectedTab) {
            0 -> {
                // Dedicated Individual Account Permissions Entry
                OutlinedButton(
                    onClick = onOpenIndividualPermissions,
                    modifier = Modifier.fillMaxWidth().height(50.dp).testTag("open_individual_permissions_button")
                ) {
                    Icon(Icons.Default.ManageAccounts, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Open Individual Feature Access Manager")
                }

                // Global Feature Kill Switches
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.ToggleOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Text("Global Kill Switches", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            "Global switches apply across both Users and Developers (Owner retains full access). Group & individual overrides cannot bypass a disabled Global Kill Switch.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        FeatureToggleRow(
                            label = "Plot Calculator & State Units",
                            subtitle = "4-Sided, Heron, Traverse & 36-State Converter",
                            checked = draftSettings.calculatorEnabled,
                            tag = "switch_feat_calc",
                            onCheckedChange = { draftSettings = draftSettings.copy(calculatorEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "CAD Drafting Studio",
                            subtitle = "COGO Plotting, Split Parcel, Setback & FMB Ladder",
                            checked = draftSettings.cadStudioEnabled,
                            tag = "switch_feat_cad",
                            onCheckedChange = { draftSettings = draftSettings.copy(cadStudioEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "GPS Walk Area",
                            subtitle = "Live GNSS Kalman, Bhuvan & Google Map Layers & UTM",
                            checked = draftSettings.gpsWalkEnabled,
                            tag = "switch_feat_gps",
                            onCheckedChange = { draftSettings = draftSettings.copy(gpsWalkEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "GIS Import / Export",
                            subtitle = "DXF, GeoJSON, KML & Shapefile ZIP Interchange",
                            checked = draftSettings.gisImportExportEnabled,
                            tag = "switch_feat_gis",
                            onCheckedChange = { draftSettings = draftSettings.copy(gisImportExportEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "PDF Survey Reports",
                            subtitle = "Generate & Share Native A4 Survey Certificates",
                            checked = draftSettings.pdfReportsEnabled,
                            tag = "switch_feat_pdf",
                            onCheckedChange = { draftSettings = draftSettings.copy(pdfReportsEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "Land Marketplace",
                            subtitle = "Verified Parcel Listings, Search & Inquiries",
                            checked = draftSettings.marketplaceEnabled,
                            tag = "switch_feat_market",
                            onCheckedChange = { draftSettings = draftSettings.copy(marketplaceEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "AI Plot Advisor",
                            subtitle = "Gemini Cadastral Chat Assistant",
                            checked = draftSettings.aiAdvisorEnabled,
                            tag = "switch_feat_ai",
                            onCheckedChange = { draftSettings = draftSettings.copy(aiAdvisorEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "Land Document Scanner",
                            subtitle = "OCR 7/12, Patta & ROR Data Extraction",
                            checked = draftSettings.documentScannerEnabled,
                            tag = "switch_feat_scanner",
                            onCheckedChange = { draftSettings = draftSettings.copy(documentScannerEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "18-Episode Academy",
                            subtitle = "Field Surveying Video Workflows",
                            checked = draftSettings.academyEnabled,
                            tag = "switch_feat_academy",
                            onCheckedChange = { draftSettings = draftSettings.copy(academyEnabled = it) }
                        )
                        HorizontalDivider()
                        FeatureToggleRow(
                            label = "Global Maintenance Mode",
                            subtitle = "Lock standard user access while performing updates",
                            checked = draftSettings.maintenanceMode,
                            tag = "switch_feat_maintenance",
                            onCheckedChange = { draftSettings = draftSettings.copy(maintenanceMode = it) }
                        )
                    }
                }

                // Role-Wide Group Controls: All Users
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Group, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Text("All Users Group Controls", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            "Control default access for all standard User accounts without locking Developer staff.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        AppFeature.entries.filter { it != AppFeature.DEVELOPER_TOOLS }.forEachIndexed { idx, feature ->
                            if (idx > 0) HorizontalDivider()
                            val currentVal = draftSettings.userGroupPermissions[feature.key] ?: feature.defaultForUser
                            FeatureToggleRow(
                                label = feature.label,
                                subtitle = "Group policy for role = User",
                                checked = currentVal,
                                tag = "switch_user_group_${feature.key}",
                                onCheckedChange = { checked ->
                                    val updated = draftSettings.userGroupPermissions.toMutableMap().apply {
                                        this[feature.key] = checked
                                    }
                                    draftSettings = draftSettings.copy(userGroupPermissions = updated)
                                }
                            )
                        }
                    }
                }

                // Role-Wide Group Controls: All Developers
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DeveloperMode, contentDescription = null, tint = MaterialTheme.colorScheme.secondary)
                            Text("All Developers Group Controls", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            "Control role-wide access for recognized Developer accounts.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        AppFeature.entries.forEachIndexed { idx, feature ->
                            if (idx > 0) HorizontalDivider()
                            val currentVal = draftSettings.developerGroupPermissions[feature.key] ?: feature.defaultForDeveloper
                            FeatureToggleRow(
                                label = feature.label,
                                subtitle = "Group policy for role = Developer",
                                checked = currentVal,
                                tag = "switch_dev_group_${feature.key}",
                                onCheckedChange = { checked ->
                                    val updated = draftSettings.developerGroupPermissions.toMutableMap().apply {
                                        this[feature.key] = checked
                                    }
                                    draftSettings = draftSettings.copy(developerGroupPermissions = updated)
                                }
                            )
                        }
                    }
                }

                // Announcement & Publish Button
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = draftSettings.announcementTitle,
                            onValueChange = { draftSettings = draftSettings.copy(announcementTitle = it) },
                            label = { Text("Announcement Title (Optional)") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("announcement_title_input")
                        )
                        OutlinedTextField(
                            value = draftSettings.announcementMessage,
                            onValueChange = { draftSettings = draftSettings.copy(announcementMessage = it) },
                            label = { Text("System Banner Message (Optional)") },
                            minLines = 2,
                            modifier = Modifier.fillMaxWidth().testTag("announcement_msg_input")
                        )

                        Button(
                            onClick = { onSaveBusinessControls(draftSettings) },
                            modifier = Modifier.fillMaxWidth().height(50.dp).testTag("save_business_controls_button")
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(Modifier.size(8.dp))
                            Text("Save Business Controls Live")
                        }
                    }
                }
            }

            1 -> {
                // Developer Email ID Recognition
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Email, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Text("Recognize Developer by Email ID", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            "Add a Google email ID below. When that email signs in, Sthal Measure automatically grants Developer Dashboard & bug-triage access.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = devEmailInput,
                            onValueChange = {
                                devEmailInput = it
                                devEmailError = null
                            },
                            label = { Text("Developer Email ID") },
                            placeholder = { Text("engineer@company.com") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("dev_email_input")
                        )
                        OutlinedTextField(
                            value = devLabelInput,
                            onValueChange = { devLabelInput = it },
                            label = { Text("Role / Team Label (Optional)") },
                            placeholder = { Text("GIS Engineer") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("dev_label_input")
                        )
                        if (devEmailError != null) {
                            Text(devEmailError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                        Button(
                            onClick = {
                                val normalized = AdminRepository.normalizeEmail(devEmailInput)
                                if (!Regex("^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$").matches(normalized)) {
                                    devEmailError = "Enter a valid email address."
                                    return@Button
                                }
                                onAddDeveloperEmail(normalized, devLabelInput)
                                devEmailInput = ""
                                devLabelInput = ""
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp).testTag("authorize_dev_email_button")
                        ) {
                            Text("Authorize Developer Email")
                        }
                    }
                }

                if (developerEmails.isEmpty()) {
                    Text(
                        "No developer emails added yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                } else {
                    developerEmails.forEach { entry ->
                        Card(
                            shape = MaterialTheme.shapes.medium,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(entry.email, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "${entry.label.ifBlank { "Authorized Developer" }} • ${if (entry.active) "Active" else "Paused"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Switch(
                                        checked = entry.active,
                                        onCheckedChange = { onToggleDeveloperEmail(entry.email, it) },
                                        modifier = Modifier.testTag("toggle_dev_email_${entry.email}")
                                    )
                                    IconButton(
                                        onClick = { onRemoveDeveloperEmail(entry.email) },
                                        modifier = Modifier.testTag("delete_dev_email_${entry.email}")
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Remove ${entry.email}", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            2 -> {
                // User Directory & Role Controls + Entry to Individual Permissions
                OutlinedButton(
                    onClick = onOpenIndividualPermissions,
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Icon(Icons.Default.ManageAccounts, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Configure Per-Account Feature Permissions")
                }

                if (allUsers.isEmpty()) {
                    Text("No registered users yet.", style = MaterialTheme.typography.bodyMedium)
                } else {
                    allUsers.forEach { u ->
                        val isOwnerAccount = u.email.equals(AdminRepository.OWNER_EMAIL, ignoreCase = true) || u.role == "owner"
                        Card(
                            shape = MaterialTheme.shapes.medium,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(u.displayName.ifBlank { "Surveyor" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text(u.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = MaterialTheme.colorScheme.primaryContainer
                                    ) {
                                        Text(
                                            "${u.role.uppercase()} • ${u.status.uppercase()}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                                if (!isOwnerAccount) {
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        FilterChip(
                                            selected = u.role == "user",
                                            onClick = { onUpdateUserRoleStatus(u.uid, "user", u.status) },
                                            label = { Text("User Role") }
                                        )
                                        FilterChip(
                                            selected = u.role == "developer",
                                            onClick = { onUpdateUserRoleStatus(u.uid, "developer", u.status) },
                                            label = { Text("Developer Role") },
                                            modifier = Modifier.testTag("user_role_dev_${u.uid}")
                                        )
                                        FilterChip(
                                            selected = u.status == "suspended",
                                            onClick = {
                                                val nextStatus = if (u.status == "active") "suspended" else "active"
                                                onUpdateUserRoleStatus(u.uid, u.role, nextStatus)
                                            },
                                            label = { Text(if (u.status == "active") "Suspend" else "Reactivate") }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            3 -> {
                // Marketplace Verification Queue & Reported Listings
                if (listingReports.isNotEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Flag, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Text("Reported Listings (${listingReports.count { it.status == "open" }} open)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    listingReports.forEach { rpt ->
                        Card(
                            shape = MaterialTheme.shapes.medium,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f))
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("${rpt.listingTitle} • ${rpt.reason}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("Reporter: ${rpt.reporterEmail} • Status: ${rpt.status.uppercase()}", style = MaterialTheme.typography.bodySmall)
                                if (rpt.details.isNotBlank()) {
                                    Text(rpt.details, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(onClick = { onTriageListingReport(rpt.id, "reviewed") }) {
                                        Text("Mark Reviewed")
                                    }
                                    OutlinedButton(onClick = { onTriageListingReport(rpt.id, "dismissed") }) {
                                        Text("Dismiss")
                                    }
                                }
                            }
                        }
                    }
                }

                if (listings.isEmpty()) {
                    Text("No marketplace listings to review.", style = MaterialTheme.typography.bodyMedium)
                } else {
                    listings.forEach { l ->
                        Card(
                            shape = MaterialTheme.shapes.medium,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(l.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text("${l.district}, ${l.state} • ${l.surveyNo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = if (l.verified) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer
                                    ) {
                                        Text(
                                            l.verificationStatus.uppercase(),
                                            style = MaterialTheme.typography.labelSmall,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = { onVerifyListing(l.id, true, "verified") },
                                        enabled = !l.verified,
                                        modifier = Modifier.weight(1f).testTag("verify_listing_${l.id}")
                                    ) {
                                        Icon(Icons.Default.Verified, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.size(4.dp))
                                        Text("Verify")
                                    }
                                    OutlinedButton(
                                        onClick = { onVerifyListing(l.id, false, "rejected") },
                                        enabled = l.verificationStatus != "rejected",
                                        modifier = Modifier.weight(1f).testTag("reject_listing_${l.id}")
                                    ) {
                                        Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.size(4.dp))
                                        Text("Reject")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun FeatureToggleRow(
    label: String,
    subtitle: String,
    checked: Boolean,
    tag: String,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
            Text(label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            modifier = Modifier.testTag(tag)
        )
    }
}
