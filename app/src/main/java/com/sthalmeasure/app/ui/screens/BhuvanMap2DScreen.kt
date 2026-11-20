package com.sthalmeasure.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.GeoAndGpsUtils
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.ui.components.BhuvanOverlayLayer
import com.sthalmeasure.app.ui.components.IndianStateUnitsDropdown
import com.sthalmeasure.app.ui.components.MapBaseLayer
import com.sthalmeasure.app.ui.components.SurveyMapConfig
import com.sthalmeasure.app.ui.components.SurveyMapLayerCard
import com.sthalmeasure.app.ui.components.rememberMyLocationAction

@Composable
fun BhuvanMap2DScreen(
    activeState: String,
    onSelectState: (String) -> Unit = {},
    onDetectedState: (String) -> Unit = {},
    onOpenGpsWalkArea: () -> Unit = {},
    onToast: (String) -> Unit = {}
) {
    var selectedState by remember(activeState) { mutableStateOf(activeState) }
    val stateInfo = remember(selectedState) { IndianStateUnitsCatalog.getStateConfig(selectedState) }
    val defaultCenter = remember(selectedState) { SurveyMapConfig.stateDefaultCenter(selectedState) }
    var centerLat by remember(selectedState) { mutableDoubleStateOf(defaultCenter.first) }
    var centerLng by remember(selectedState) { mutableDoubleStateOf(defaultCenter.second) }
    var myLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var accuracyMeters by remember { mutableStateOf<Double?>(null) }

    // Bhuvan Hybrid (Satellite + NRSC India 2D) + Cadastral Boundaries overlay active by default
    var baseLayer by remember { mutableStateOf(MapBaseLayer.BHUVAN_HYBRID) }
    var overlayLayer by remember { mutableStateOf(BhuvanOverlayLayer.CADASTRAL) }

    var jumpLatText by remember(centerLat) { mutableStateOf("%.6f".format(centerLat)) }
    var jumpLngText by remember(centerLng) { mutableStateOf("%.6f".format(centerLng)) }

    val (locating, triggerMyLocation) = rememberMyLocationAction(
        onLocationFound = { lat, lng, acc ->
            centerLat = lat
            centerLng = lng
            myLocation = lat to lng
            accuracyMeters = acc
            onToast("Centered Bhuvan 2D on My Location (±${acc.toInt()}m)")
        },
        onLocationError = { msg -> onToast(msg) }
    )

    val utm = remember(centerLat, centerLng) { GeoAndGpsUtils.wgs84ToUtm(centerLat, centerLng) }
    val detectedState = remember(centerLat, centerLng) { GeoAndGpsUtils.detectIndianState(centerLat, centerLng) }
    val oneAcreUnits = remember(selectedState) {
        IndianStateUnitsCatalog.convertSqmToStateUnits(4046.8564224, selectedState)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 8.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.primaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
                        Icon(Icons.Default.Public, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Column {
                            Text(
                                "Bhuvan Map 2D (NRSC)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                "NRSC Bhuvan Hybrid (Satellite + India 2D) with Cadastral Boundaries & State Units",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                            )
                        }
                    }
                }
                IndianStateUnitsDropdown(
                    selectedState = selectedState,
                    onSelectState = { chosen ->
                        selectedState = chosen
                        onSelectState(chosen)
                        onDetectedState(chosen)
                    },
                    label = "State / UT Cadastral Map & Units (${IndianStateUnitsCatalog.allStates.size} Jurisdictions)",
                    dropdownTag = "bhuvan_state_dropdown"
                )
            }
        }

        SurveyMapLayerCard(
            title = "Bhuvan Hybrid + Cadastral Map",
            activeState = selectedState,
            baseLayer = baseLayer,
            onSelectBaseLayer = { baseLayer = it },
            overlayLayer = overlayLayer,
            onSelectOverlayLayer = { overlayLayer = it },
            centerLat = centerLat,
            centerLng = centerLng,
            myLocation = myLocation,
            locating = locating,
            onMyLocationClick = triggerMyLocation,
            myLocationButtonTag = "bhuvan_my_location_button",
            mapContainerTag = "bhuvan_2d_map_container",
            mapHeight = 380.dp
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth().testTag("bhuvan_cadastral_legend")
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Cadastral Boundaries & FMB Overlay",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Portal: ${stateInfo.revenuePortal}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Switch(
                        checked = overlayLayer == BhuvanOverlayLayer.CADASTRAL,
                        onCheckedChange = { enabled ->
                            overlayLayer = if (enabled) BhuvanOverlayLayer.CADASTRAL else BhuvanOverlayLayer.NONE
                        },
                        modifier = Modifier.testTag("bhuvan_cadastral_switch")
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    LegendDot(Color(0xFFA21CAF), "Survey / Khasra / Gut Parcel")
                    LegendDot(Color(0xFF0F766E), "SISDP Village Boundary")
                }
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    LegendDot(Color(0xFFF59E0B), "Tri-Junction Stone & Hissa Sub-division")
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = triggerMyLocation,
                enabled = !locating,
                modifier = Modifier.weight(1f).testTag("bhuvan_locate_action_button")
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text(if (locating) "Locating..." else "My Location")
            }
            OutlinedButton(
                onClick = onOpenGpsWalkArea,
                modifier = Modifier.weight(1f).testTag("bhuvan_open_gps_walk_button")
            ) {
                Icon(Icons.Default.GpsFixed, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("GPS Walk Area")
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "${stateInfo.state} (${stateInfo.code}) Cadastral Units (1 Acre Equivalent)",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                oneAcreUnits.take(6).forEach { unitVal ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${unitVal.unit.name} (${unitVal.unit.localName})", style = MaterialTheme.typography.bodySmall)
                        Text(unitVal.formatted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Layers, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("NRSC Layer & Geodetic Readout", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
                Text(
                    "WGS84: ${GeoAndGpsUtils.toDms(centerLat, true)} | ${GeoAndGpsUtils.toDms(centerLng, false)}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    "UTM Zone ${utm.zone}${utm.hemisphere}: Easting ${"%.2f".format(utm.easting)} m, Northing ${"%.2f".format(utm.northing)} m",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (accuracyMeters != null) {
                    Text(
                        "My Location Accuracy: ${GeoAndGpsUtils.rateGpsAccuracy(accuracyMeters!!).label}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (detectedState != null && detectedState != selectedState) {
                    OutlinedButton(onClick = {
                        selectedState = detectedState
                        onSelectState(detectedState)
                        onDetectedState(detectedState)
                    }) {
                        Text("Detected Jurisdiction: $detectedState (Switch)")
                    }
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Explore, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("Center Bhuvan 2D on Coordinates", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = jumpLatText,
                        onValueChange = { jumpLatText = it },
                        label = { Text("Latitude") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f).testTag("bhuvan_jump_lat_input")
                    )
                    OutlinedTextField(
                        value = jumpLngText,
                        onValueChange = { jumpLngText = it },
                        label = { Text("Longitude") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f).testTag("bhuvan_jump_lng_input")
                    )
                }
                OutlinedButton(
                    onClick = {
                        val lat = jumpLatText.toDoubleOrNull()
                        val lng = jumpLngText.toDoubleOrNull()
                        if (lat != null && lng != null && lat in -90.0..90.0 && lng in -180.0..180.0) {
                            centerLat = lat
                            centerLng = lng
                        } else {
                            onToast("Enter valid latitude (-90..90) and longitude (-180..180).")
                        }
                    },
                    modifier = Modifier.fillMaxWidth().testTag("bhuvan_go_coords_button")
                ) {
                    Text("Center Map on Coordinates")
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(modifier = Modifier.size(10.dp).background(color, CircleShape))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

