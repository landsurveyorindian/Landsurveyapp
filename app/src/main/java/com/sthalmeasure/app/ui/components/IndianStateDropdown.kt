package com.sthalmeasure.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IndianStateUnitsDropdown(
    selectedState: String,
    onSelectState: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "All Indian States & UTs (${IndianStateUnitsCatalog.allStates.size} Jurisdictions)",
    dropdownTag: String = "state_units_dropdown",
    showUnitsSummaryInField: Boolean = true
) {
    val activeInfo = remember(selectedState) { IndianStateUnitsCatalog.getStateConfig(selectedState) }
    var expanded by remember { mutableStateOf(false) }

    val displayValue = if (showUnitsSummaryInField) {
        "${activeInfo.state} (${activeInfo.code}) • ${activeInfo.primaryUnits.take(3).joinToString(", ")}"
    } else {
        "${activeInfo.state} (${activeInfo.code})"
    }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier
    ) {
        OutlinedTextField(
            value = displayValue,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            label = { Text(label) },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Selected State or UT",
                    tint = MaterialTheme.colorScheme.primary
                )
            },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth()
                .testTag(dropdownTag)
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.heightIn(max = 360.dp)
        ) {
            IndianStateUnitsCatalog.allStates.forEach { stateInfo ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(
                                text = "${stateInfo.state} (${stateInfo.code}) • ${stateInfo.region.label}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (stateInfo.state == activeInfo.state) FontWeight.Bold else FontWeight.Medium,
                                color = if (stateInfo.state == activeInfo.state) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "Units: ${stateInfo.primaryUnits.joinToString(" • ")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            HorizontalDivider(modifier = Modifier.fillMaxWidth())
                        }
                    },
                    onClick = {
                        expanded = false
                        onSelectState(stateInfo.state)
                    },
                    modifier = Modifier.testTag("${dropdownTag}_item_${stateInfo.code.lowercase()}")
                )
            }
        }
    }
}
