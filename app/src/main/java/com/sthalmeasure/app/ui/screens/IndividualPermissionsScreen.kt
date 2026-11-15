package com.sthalmeasure.app.ui.screens

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.PermissionAuditLog
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserFeaturePermissions
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.domain.AppFeature
import com.sthalmeasure.app.domain.FeatureBlockReason
import com.sthalmeasure.app.domain.PermissionEvaluator

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun IndividualPermissionsScreen(
    allUsers: List<UserProfile>,
    allPermissionDocs: List<UserFeaturePermissions>,
    auditLogs: List<PermissionAuditLog>,
    systemSettings: SystemSettings,
    onSavePermissions: (UserProfile, Map<String, Boolean>) -> Unit,
    onRestoreDefaults: (UserProfile) -> Unit,
    onBack: () -> Unit
) {
    BackHandler { onBack() }

    var searchQuery by remember { mutableStateOf("") }
    var selectedUid by remember { mutableStateOf(allUsers.firstOrNull()?.uid.orEmpty()) }

    val filteredUsers = remember(allUsers, searchQuery) {
        val q = searchQuery.trim()
        if (q.isEmpty()) allUsers
        else allUsers.filter {
            it.email.contains(q, ignoreCase = true) ||
                it.displayName.contains(q, ignoreCase = true) ||
                it.uid.contains(q, ignoreCase = true)
        }
    }

    val selectedUser = allUsers.firstOrNull { it.uid == selectedUid } ?: filteredUsers.firstOrNull()
    val existingDoc = remember(selectedUser, allPermissionDocs) {
        selectedUser?.let { u -> allPermissionDocs.firstOrNull { it.uid == u.uid } }
    }

    val selectedRole = remember(selectedUser) {
        when (selectedUser?.role?.lowercase()) {
            "owner" -> AppRole.OWNER
            "developer" -> AppRole.DEVELOPER
            else -> AppRole.USER
        }
    }

    val draftMap = remember { mutableStateMapOf<String, Boolean>() }
    LaunchedEffect(selectedUser?.uid, existingDoc?.version, selectedRole) {
        draftMap.clear()
        val defaults = PermissionEvaluator.defaultPermissionsForRole(selectedRole)
        AppFeature.entries.forEach { feat ->
            draftMap[feat.key] = existingDoc?.permissions?.get(feat.key) ?: defaults[feat.key] ?: true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.testTag("individual_perms_back_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to Owner Center")
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Individual Feature Access Manager",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Control per-user and per-developer feature entitlements with full audit history.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(Icons.Default.ManageAccounts, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        }

        // Search input
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search account by Email, Name, or UID") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().testTag("individual_perms_search_input")
        )

        // Account selector list
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    "Registered Accounts (${filteredUsers.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                if (filteredUsers.isEmpty()) {
                    Text(
                        "No accounts match \"$searchQuery\".",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    filteredUsers.forEach { user ->
                        val isSelected = selectedUser?.uid == user.uid
                        val hasCustomDoc = allPermissionDocs.any { it.uid == user.uid }
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            border = BorderStroke(
                                1.dp,
                                if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedUid = user.uid }
                                .testTag("select_perm_account_${user.uid}")
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        user.displayName.ifBlank { "Surveyor" },
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        user.email.ifBlank { user.uid },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        "UID: ${user.uid}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "${user.role.uppercase()} • ${user.status.uppercase()}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (hasCustomDoc) {
                                        Text(
                                            "Custom Override",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Selected account management panel
        if (selectedUser != null) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth().testTag("selected_account_summary")
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        "${selectedUser.displayName.ifBlank { "Surveyor" }} (${selectedUser.email})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("UID: ${selectedUser.uid}", style = MaterialTheme.typography.labelSmall)
                        Text("• Role: ${selectedRole.label}", style = MaterialTheme.typography.labelSmall)
                        Text("• Status: ${selectedUser.status}", style = MaterialTheme.typography.labelSmall)
                        Text("• Policy v${existingDoc?.version ?: 0}", style = MaterialTheme.typography.labelSmall)
                    }
                    if (selectedRole == AppRole.OWNER) {
                        Text(
                            "Owner accounts always retain full system access under security policy.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            // Feature toggles for selected account
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Account Feature Entitlements", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Priority: Role Security > Global Kill Switch > Role Group Control > Individual Setting > Default.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    val draftDoc = UserFeaturePermissions(
                        uid = selectedUser.uid,
                        permissions = draftMap.toMap()
                    )

                    AppFeature.entries.forEachIndexed { idx, feature ->
                        if (idx > 0) HorizontalDivider()
                        val resolution = PermissionEvaluator.resolveFeature(
                            role = selectedRole,
                            settings = systemSettings,
                            individualDoc = draftDoc,
                            feature = feature
                        )
                        val switchEnabled = selectedRole != AppRole.OWNER &&
                            !(selectedRole == AppRole.USER && feature == AppFeature.DEVELOPER_TOOLS)
                        val rawChecked = draftMap[feature.key] ?: resolution.enabled

                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f).padding(end = 10.dp)) {
                                Text(feature.label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Text(feature.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val badgeColor = when (resolution.reason) {
                                    FeatureBlockReason.ALLOWED -> MaterialTheme.colorScheme.primary
                                    FeatureBlockReason.BLOCKED_BY_INDIVIDUAL_OVERRIDE -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.tertiary
                                }
                                Text(
                                    text = "Effective: ${resolution.reason.badgeLabel}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = badgeColor,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Switch(
                                checked = if (selectedRole == AppRole.OWNER) true else rawChecked,
                                enabled = switchEnabled,
                                onCheckedChange = { checked ->
                                    draftMap[feature.key] = checked
                                },
                                modifier = Modifier.testTag("ind_perm_switch_${feature.key}")
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { onSavePermissions(selectedUser, draftMap.toMap()) },
                            enabled = selectedRole != AppRole.OWNER,
                            modifier = Modifier.weight(1f).height(48.dp).testTag("save_individual_perms_button")
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Save Permissions")
                        }
                        OutlinedButton(
                            onClick = {
                                val defaults = PermissionEvaluator.defaultPermissionsForRole(selectedRole)
                                draftMap.clear()
                                draftMap.putAll(defaults)
                                onRestoreDefaults(selectedUser)
                            },
                            enabled = selectedRole != AppRole.OWNER,
                            modifier = Modifier.weight(1f).height(48.dp).testTag("restore_individual_perms_button")
                        ) {
                            Icon(Icons.Default.Restore, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Restore Defaults")
                        }
                    }
                }
            }

            // Audit history for selected account
            val userLogs = remember(auditLogs, selectedUser.uid) {
                auditLogs.filter { it.targetUid == selectedUser.uid }
            }
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.History, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("Permission Update History (${userLogs.size})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    }
                    if (userLogs.isEmpty()) {
                        Text(
                            "No permission audit entries recorded for this account yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        userLogs.take(15).forEach { log ->
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(
                                        "${log.action.uppercase()} • by ${log.updatedByEmail.ifBlank { log.updatedBy }}",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(log.changesSummary, style = MaterialTheme.typography.bodySmall)
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
