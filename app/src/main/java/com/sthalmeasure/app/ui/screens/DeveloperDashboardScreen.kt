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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.DeveloperMode
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.DeveloperEmailEntry
import com.sthalmeasure.app.data.model.SystemSettings

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DeveloperDashboardScreen(
    developerEmail: String,
    appRole: AppRole,
    systemSettings: SystemSettings,
    developerEmails: List<DeveloperEmailEntry>,
    bugReports: List<BugReport>,
    onTriageBug: (reportId: String, status: String) -> Unit
) {
    var statusFilter by remember { mutableStateOf("all") }
    val filters = listOf("all", "new", "investigating", "resolved", "closed")
    val triageStatuses = listOf("new", "investigating", "resolved", "closed")

    val filteredReports = if (statusFilter == "all") {
        bugReports
    } else {
        bugReports.filter { it.status == statusFilter }
    }

    val enabledCount = listOf(
        systemSettings.calculatorEnabled,
        systemSettings.cadStudioEnabled,
        systemSettings.gpsWalkEnabled,
        systemSettings.gisImportExportEnabled,
        systemSettings.marketplaceEnabled,
        systemSettings.aiAdvisorEnabled,
        systemSettings.documentScannerEnabled,
        systemSettings.academyEnabled
    ).count { it }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Surface(
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.secondaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.25f)),
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
                            Icons.Default.DeveloperMode,
                            contentDescription = "Developer Dashboard",
                            tint = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        Column {
                            Text(
                                "Developer Engineering Console",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                            Text(
                                developerEmail.ifBlank { "Authorized Developer" },
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                            )
                        }
                    }
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.primary
                    ) {
                        Text(
                            appRole.label.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                Text(
                    "${bugReports.count { it.status == "new" || it.status == "investigating" }} Open Bugs • ${developerEmails.count { it.active }} Active Dev Emails • $enabledCount/8 Features Live",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }

        // Bug Status Filter Row
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            filters.forEach { f ->
                val count = if (f == "all") bugReports.size else bugReports.count { it.status == f }
                FilterChip(
                    selected = statusFilter == f,
                    onClick = { statusFilter = f },
                    label = { Text("${f.replaceFirstChar { it.uppercase() }} ($count)") },
                    modifier = Modifier.testTag("dev_filter_$f")
                )
            }
        }

        // Bug Triage Queue
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.BugReport, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text("Field Bug Reports (${filteredReports.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        if (filteredReports.isEmpty()) {
            Card(
                shape = MaterialTheme.shapes.medium,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "No bug reports match the selected filter.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            filteredReports.forEach { report ->
                Card(
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth().testTag("bug_card_${report.id}")
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                report.title,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = when (report.severity) {
                                    "critical", "high" -> MaterialTheme.colorScheme.errorContainer
                                    else -> MaterialTheme.colorScheme.primaryContainer
                                }
                            ) {
                                Text(
                                    report.severity.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                        Text(
                            "${report.module} • By ${report.userName.ifBlank { "Surveyor" }} (${report.userEmail})",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(report.description, style = MaterialTheme.typography.bodyMedium)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            triageStatuses.forEach { st ->
                                FilterChip(
                                    selected = report.status == st,
                                    onClick = { onTriageBug(report.id, st) },
                                    label = { Text(st.replaceFirstChar { it.uppercase() }) },
                                    modifier = Modifier.testTag("triage_${report.id}_$st")
                                )
                            }
                        }
                    }
                }
            }
        }

        // Read-only Feature Flag Telemetry Card
        Card(
            shape = MaterialTheme.shapes.medium,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("Live Business Feature Flags (Owner Controlled)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(
                    "Maintenance Mode: ${if (systemSettings.maintenanceMode) "ON" else "OFF"} • Calc: ${flag(systemSettings.calculatorEnabled)} • CAD: ${flag(systemSettings.cadStudioEnabled)} • GPS: ${flag(systemSettings.gpsWalkEnabled)} • GIS: ${flag(systemSettings.gisImportExportEnabled)} • Market: ${flag(systemSettings.marketplaceEnabled)} • AI: ${flag(systemSettings.aiAdvisorEnabled)} • Scanner: ${flag(systemSettings.documentScannerEnabled)} • Academy: ${flag(systemSettings.academyEnabled)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(Modifier.height(12.dp))
    }
}

private fun flag(enabled: Boolean): String = if (enabled) "ON" else "OFF"
