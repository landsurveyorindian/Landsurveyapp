package com.sthalmeasure.app.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Looper
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.AddLocationAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.CoordinateValidator
import com.sthalmeasure.app.domain.GcpCalibration
import com.sthalmeasure.app.domain.GeoAndGpsUtils
import com.sthalmeasure.app.domain.GpsSurveySession
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.ui.components.BhuvanOverlayLayer
import com.sthalmeasure.app.ui.components.MapBaseLayer
import com.sthalmeasure.app.ui.components.PlotCanvas
import com.sthalmeasure.app.ui.components.SurveyMapConfig
import com.sthalmeasure.app.ui.components.SurveyMapLayerCard
import com.sthalmeasure.app.ui.components.rememberMyLocationAction
import kotlin.math.PI
import kotlin.math.cos

enum class SurveyWalkLifecycle(val label: String) {
    STANDBY("Standby"),
    SURVEYING("Surveying Live"),
    PAUSED("Paused"),
    FINISHED("Survey Finished")
}

object GpsFixValidator {
    fun isValidCoordinate(lat: Double, lng: Double, accuracyMeters: Double): Boolean =
        CoordinateValidator.isValidCoordinate(lat, lng, accuracyMeters)

    fun buildBhuvanWmsPreviewUrl(lat: Double, lng: Double, layer: String): String =
        SurveyMapConfig.buildBhuvanWmsPreviewUrl(lat, lng, layer)
}

@Composable
fun GpsWalkScreen(
    activeState: String,
    onDetectedState: (String) -> Unit,
    onSendToCad: (List<CadPoint>) -> Unit,
    onSaveProject: (name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String) -> Unit,
    onSaveProjectWithSummary: ((name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String, summaryJson: String) -> Unit)? = null
) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grantedMap ->
        hasPermission = grantedMap[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grantedMap[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    val locMgr = remember(context) { context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager }
    val gpsProviderEnabled = locMgr?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
        locMgr?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true

    val stateDefaultCenter = remember(activeState) { SurveyMapConfig.stateDefaultCenter(activeState) }
    var lifecycle by remember { mutableStateOf(SurveyWalkLifecycle.STANDBY) }
    var collectingEpochs by remember { mutableStateOf(false) }
    var filteredLat by remember { mutableDoubleStateOf(stateDefaultCenter.first) }
    var filteredLng by remember { mutableDoubleStateOf(stateDefaultCenter.second) }
    var filteredAcc by remember { mutableDoubleStateOf(0.0) }
    var outliersRejected by remember { mutableIntStateOf(0) }
    var weakFixesSkipped by remember { mutableIntStateOf(0) }
    var lastAlertNote by remember { mutableStateOf<String?>(null) }

    var epochCount by remember { mutableIntStateOf(0) }
    var hasFix by remember { mutableStateOf(false) }
    var selectedBaseLayer by remember { mutableStateOf(MapBaseLayer.BHUVAN_HYBRID) }
    var selectedOverlayLayer by remember { mutableStateOf(BhuvanOverlayLayer.CADASTRAL) }
    var manualCenter by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var gcpCalibration by remember { mutableStateOf<GcpCalibration?>(null) }
    var showGcpDialog by remember { mutableStateOf(false) }
    var projectName by remember { mutableStateOf("GPS Walk Area") }

    val (locatingMyPos, triggerMyLocation) = rememberMyLocationAction(
        onLocationFound = { lat, lng, acc ->
            manualCenter = lat to lng
            if (!hasFix) {
                filteredLat = lat
                filteredLng = lng
                filteredAcc = acc
            }
            lastAlertNote = "My Location centered (±${acc.toInt()} m)"
        },
        onLocationError = { msg ->
            lastAlertNote = msg
        }
    )

    val surveySession = remember { GpsSurveySession(epochTargetCount = 10) }
    val boundaryPts = remember { mutableStateListOf<Pair<Double, Double>>() }

    fun syncFromSession() {
        hasFix = surveySession.hasAcceptedFix
        filteredLat = surveySession.filteredLat
        filteredLng = surveySession.filteredLng
        filteredAcc = surveySession.filteredAccuracy
        outliersRejected = surveySession.outliersRejected
        weakFixesSkipped = surveySession.weakFixesSkipped
        collectingEpochs = surveySession.collectingEpochs
        epochCount = surveySession.epochCount
        lastAlertNote = surveySession.lastAlertNote
        boundaryPts.clear()
        boundaryPts.addAll(surveySession.boundaryPoints)
    }

    val isStreaming = hasPermission && lifecycle == SurveyWalkLifecycle.SURVEYING

    @SuppressLint("MissingPermission")
    DisposableEffect(isStreaming) {
        if (!isStreaming) {
            return@DisposableEffect onDispose { }
        }
        val client = LocationServices.getFusedLocationProviderClient(context)
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1500L)
            .setMinUpdateIntervalMillis(1000L)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                val acc = loc.accuracy.toDouble().coerceAtLeast(1.0)
                val fixTime = loc.time.takeIf { it > 0L } ?: System.currentTimeMillis()
                surveySession.gcpCalibration = gcpCalibration
                surveySession.ingestRawFix(
                    rawLat = loc.latitude,
                    rawLng = loc.longitude,
                    accuracyMeters = acc,
                    timestampMs = fixTime
                )
                syncFromSession()
            }
        }
        client.requestLocationUpdates(req, callback, Looper.getMainLooper())
        onDispose { client.removeLocationUpdates(callback) }
    }

    val areaSqm = GeoAndGpsUtils.computeGpsPolygonAreaSqm(boundaryPts)
    val perimM = GeoAndGpsUtils.computeGpsPolygonPerimeterMeters(boundaryPts)
    val breakdown = convertAreaFromSqm(areaSqm)

    val localPlotPoints = remember(boundaryPts.toList()) {
        if (boundaryPts.isEmpty()) emptyList()
        else {
            val oLat = boundaryPts[0].first
            val oLng = boundaryPts[0].second
            val mLat = 111132.954 - 559.822 * cos(2.0 * oLat * PI / 180.0)
            val mLng = 111412.84 * cos(oLat * PI / 180.0)
            boundaryPts.mapIndexed { idx, (lat, lng) ->
                PlotPoint((lng - oLng) * mLng, (lat - oLat) * mLat, "G${idx + 1}")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 8.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (!hasPermission) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Precise GNSS Location Required", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Sthal Measure uses on-device Fused Location + Kalman filtering + multipath rejection to survey boundary corners without third-party tracking.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Button(
                        onClick = {
                            permLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        },
                        modifier = Modifier.fillMaxWidth().testTag("grant_gps_permission_button")
                    ) {
                        Icon(Icons.Default.GpsFixed, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Allow Location Access")
                    }
                }
            }
        } else {
            if (!gpsProviderEnabled) {
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Text(
                            "Device Location / GPS provider appears turned off. Enable GPS in system settings for outdoor satellite lock.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("GPS Walk Area • ${lifecycle.label}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(
                                "Outliers Rejected: $outliersRejected • Weak Skipped: $weakFixesSkipped",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = if (lifecycle == SurveyWalkLifecycle.SURVEYING) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                "${boundaryPts.size} pts",
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    // Full Start / Pause / Resume / Finish Lifecycle Controls
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        when (lifecycle) {
                            SurveyWalkLifecycle.STANDBY -> {
                                Button(
                                    onClick = { lifecycle = SurveyWalkLifecycle.SURVEYING },
                                    modifier = Modifier.weight(1f).testTag("gps_start_survey_button")
                                ) {
                                    Text("Start Survey")
                                }
                            }
                            SurveyWalkLifecycle.SURVEYING -> {
                                OutlinedButton(
                                    onClick = { lifecycle = SurveyWalkLifecycle.PAUSED },
                                    modifier = Modifier.weight(1f).testTag("gps_pause_survey_button")
                                ) {
                                    Text("Pause")
                                }
                                Button(
                                    onClick = { lifecycle = SurveyWalkLifecycle.FINISHED },
                                    enabled = boundaryPts.size >= 3,
                                    modifier = Modifier.weight(1f).testTag("gps_finish_survey_button")
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                                    Spacer(Modifier.width(4.dp))
                                    Text("Finish")
                                }
                            }
                            SurveyWalkLifecycle.PAUSED -> {
                                Button(
                                    onClick = { lifecycle = SurveyWalkLifecycle.SURVEYING },
                                    modifier = Modifier.weight(1f).testTag("gps_resume_survey_button")
                                ) {
                                    Text("Resume")
                                }
                                OutlinedButton(
                                    onClick = { lifecycle = SurveyWalkLifecycle.FINISHED },
                                    enabled = boundaryPts.size >= 3,
                                    modifier = Modifier.weight(1f).testTag("gps_finish_survey_button")
                                ) {
                                    Text("Finish")
                                }
                            }
                            SurveyWalkLifecycle.FINISHED -> {
                                OutlinedButton(
                                    onClick = { lifecycle = SurveyWalkLifecycle.SURVEYING },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Resume Walk")
                                }
                            }
                        }
                    }

                    if (hasFix) {
                        val rating = GeoAndGpsUtils.rateGpsAccuracy(filteredAcc)
                        val utm = GeoAndGpsUtils.wgs84ToUtm(filteredLat, filteredLng)
                        val detected = GeoAndGpsUtils.detectIndianState(filteredLat, filteredLng)

                        Text(rating.label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                        Text(
                            "WGS84: ${GeoAndGpsUtils.toDms(filteredLat, true)} | ${GeoAndGpsUtils.toDms(filteredLng, false)}",
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            "UTM Zone ${utm.zone}${utm.hemisphere}: E ${"%.2f".format(utm.easting)} m, N ${"%.2f".format(utm.northing)} m",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (gcpCalibration != null) {
                            Text(
                                "GCP Calibrated (${gcpCalibration!!.benchmarkName}): Δ${"%.2f".format(gcpCalibration!!.offsetMeters)} m offset active",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        if (detected != null && detected != activeState) {
                            OutlinedButton(onClick = { onDetectedState(detected) }) {
                                Text("Detected Jurisdiction: $detected (Tap to Switch)")
                            }
                        }
                    } else {
                        Text(
                            if (lifecycle == SurveyWalkLifecycle.SURVEYING) "Searching for sky view GNSS satellites..."
                            else "Tap 'Start Survey' to lock satellites and activate Kalman + multipath gating.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (lastAlertNote != null) {
                        Text(lastAlertNote!!, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = {
                        surveySession.captureManualCorner()
                        syncFromSession()
                    },
                    enabled = hasFix && lifecycle != SurveyWalkLifecycle.FINISHED,
                    modifier = Modifier.weight(1f).testTag("drop_gps_corner_button")
                ) {
                    Icon(Icons.Default.AddLocationAlt, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Corner")
                }
                OutlinedButton(
                    onClick = {
                        surveySession.startStaticEpochCollection()
                        syncFromSession()
                    },
                    enabled = hasFix && !collectingEpochs && lifecycle == SurveyWalkLifecycle.SURVEYING,
                    modifier = Modifier.weight(1f).testTag("static_epoch_button")
                ) {
                    Text(if (collectingEpochs) "Avg $epochCount/10" else "10-Epoch")
                }
                OutlinedButton(
                    onClick = { showGcpDialog = true },
                    enabled = hasFix,
                    modifier = Modifier.weight(0.8f).testTag("gcp_calibrate_button")
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = null)
                    Spacer(Modifier.width(2.dp))
                    Text("GCP")
                }
            }
        }

        // Interactive Bhuvan 2D & Google Maps Layer Selector with My Location
        val mapCenterLat = manualCenter?.first
            ?: filteredLat.takeIf { hasFix }
            ?: boundaryPts.firstOrNull()?.first
            ?: stateDefaultCenter.first
        val mapCenterLng = manualCenter?.second
            ?: filteredLng.takeIf { hasFix }
            ?: boundaryPts.firstOrNull()?.second
            ?: stateDefaultCenter.second
        val liveMarkerLatLng = when {
            hasFix -> filteredLat to filteredLng
            else -> manualCenter
        }

        SurveyMapLayerCard(
            title = "GPS Walk Area Map Layers",
            activeState = activeState,
            baseLayer = selectedBaseLayer,
            onSelectBaseLayer = { selectedBaseLayer = it },
            overlayLayer = selectedOverlayLayer,
            onSelectOverlayLayer = { selectedOverlayLayer = it },
            centerLat = mapCenterLat,
            centerLng = mapCenterLng,
            myLocation = liveMarkerLatLng,
            polygonLatLngs = boundaryPts.toList(),
            locating = locatingMyPos,
            onMyLocationClick = triggerMyLocation,
            myLocationButtonTag = "gps_my_location_button",
            mapContainerTag = "gps_walk_map_container",
            mapHeight = 320.dp
        )

        PlotCanvas(
            points = localPlotPoints,
            canvasHeight = 200.dp,
            unitLabel = "m",
            emptyHint = "Drop at least 3 GPS boundary corners to map parcel"
        )

        if (boundaryPts.isNotEmpty()) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = {
                        surveySession.undoLastCorner()
                        syncFromSession()
                    },
                    modifier = Modifier.weight(1f).testTag("gps_undo_corner_button")
                ) {
                    Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Undo")
                }
                OutlinedButton(
                    onClick = {
                        surveySession.clearAll()
                        syncFromSession()
                        lifecycle = SurveyWalkLifecycle.STANDBY
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.DeleteSweep, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Clear")
                }
                OutlinedButton(
                    onClick = {
                        onSendToCad(localPlotPoints.map { CadPoint(it.x, it.y, it.label) })
                    },
                    enabled = localPlotPoints.size >= 3,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("To CAD")
                }
            }
        }

        if (boundaryPts.size >= 3) {
            AreaSummaryCard(
                breakdown = breakdown,
                activeState = activeState,
                perimeterMeters = perimM,
                classificationNote = "Smartphone GNSS Walk Estimate (±consumer GNSS tolerance; $outliersRejected spikes filtered)"
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = projectName,
                    onValueChange = { projectName = it },
                    label = { Text("GPS Walk Area Title") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                Button(
                    onClick = {
                        val notesText = "${boundaryPts.size} GNSS vertices | Map: ${selectedBaseLayer.label} / ${selectedOverlayLayer.label} | Outliers filtered: $outliersRejected"
                        if (onSaveProjectWithSummary != null) {
                            onSaveProjectWithSummary(
                                projectName,
                                "gps_walk",
                                areaSqm,
                                perimM,
                                notesText,
                                PlotSummaryCodec.encode("gps_walk", localPlotPoints, notesText)
                            )
                        } else {
                            onSaveProject(projectName, "gps_walk", areaSqm, perimM, notesText)
                        }
                    },
                    modifier = Modifier.height(52.dp).testTag("gps_save_project_button")
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Save")
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }

    if (showGcpDialog) {
        BackHandler { showGcpDialog = false }
        var benchmarkName by remember { mutableStateOf("Revenue Tri-Junction Stone") }
        var knownLatText by remember(filteredLat) { mutableStateOf("%.6f".format(filteredLat)) }
        var knownLngText by remember(filteredLng) { mutableStateOf("%.6f".format(filteredLng)) }
        AlertDialog(
            onDismissRequest = { showGcpDialog = false },
            title = { Text("GCP Benchmark Calibration") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Enter known benchmark WGS84 coordinates while standing on the stone to apply a differential shift to all captured corners.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    OutlinedTextField(
                        value = benchmarkName,
                        onValueChange = { benchmarkName = it },
                        label = { Text("Benchmark Label") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = knownLatText,
                        onValueChange = { knownLatText = it },
                        label = { Text("Known Latitude") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = knownLngText,
                        onValueChange = { knownLngText = it },
                        label = { Text("Known Longitude") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    val kLat = knownLatText.toDoubleOrNull() ?: return@Button
                    val kLng = knownLngText.toDoubleOrNull() ?: return@Button
                    if (kLat in -90.0..90.0 && kLng in -180.0..180.0) {
                        gcpCalibration = GeoAndGpsUtils.computeGcpCalibration(
                            measuredLat = filteredLat,
                            measuredLng = filteredLng,
                            knownLat = kLat,
                            knownLng = kLng,
                            benchmarkName = benchmarkName.ifBlank { "Survey Benchmark" }
                        )
                        showGcpDialog = false
                    }
                }) { Text("Apply Offset") }
            },
            dismissButton = {
                TextButton(onClick = {
                    gcpCalibration = null
                    showGcpDialog = false
                }) { Text("Clear / Cancel") }
            }
        )
    }
}
