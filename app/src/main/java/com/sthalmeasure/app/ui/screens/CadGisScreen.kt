package com.sthalmeasure.app.ui.screens

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.CadEngine
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.GeoAndGpsUtils
import com.sthalmeasure.app.domain.GisFeature
import com.sthalmeasure.app.domain.GisImportResult
import com.sthalmeasure.app.domain.ImportedCrsType
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.ShapefileSupport
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.ui.components.BhuvanOverlayLayer
import com.sthalmeasure.app.ui.components.MapBaseLayer
import com.sthalmeasure.app.ui.components.PlotCanvas
import com.sthalmeasure.app.ui.components.SurveyMapConfig
import com.sthalmeasure.app.ui.components.SurveyMapLayerCard
import com.sthalmeasure.app.ui.components.rememberMyLocationAction

private enum class GisCrsOverride(val id: String, val label: String) {
    AUTO("auto", "Auto CRS"),
    WGS84("wgs84", "WGS84"),
    UTM_42N("utm42", "UTM 42N"),
    UTM_43N("utm43", "UTM 43N"),
    UTM_44N("utm44", "UTM 44N"),
    UTM_45N("utm45", "UTM 45N"),
    UTM_46N("utm46", "UTM 46N"),
    WEB_MERCATOR("3857", "Mercator 3857"),
    LOCAL("local", "Local (m)")
}

private fun resolveSafDisplayName(context: Context, uri: Uri): String? {
    return runCatching {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) cursor.getString(idx) else null
            } else null
        }
    }.getOrNull()
}

@Composable
fun CadGisScreen(
    activeState: String,
    activePolygon: List<CadPoint>,
    onApplyToCad: (List<CadPoint>) -> Unit,
    onToast: (String) -> Unit
) {
    val context = LocalContext.current
    var importedFileName by remember { mutableStateOf("Active CAD Parcel") }
    var importResult by remember { mutableStateOf<GisImportResult?>(null) }
    var importWarnings by remember { mutableStateOf<List<String>>(emptyList()) }
    var importError by remember { mutableStateOf<String?>(null) }
    var workingPoints by remember(activePolygon) { mutableStateOf(activePolygon) }
    var workingFeatures by remember(activePolygon) {
        mutableStateOf(
            if (activePolygon.size >= 2) listOf(GisFeature(activePolygon, closed = activePolygon.size >= 3))
            else emptyList()
        )
    }
    var crsOverride by remember { mutableStateOf(GisCrsOverride.AUTO) }
    var pendingExportFormat by remember { mutableStateOf("dxf") }

    val defaultCenter = remember(activeState) { SurveyMapConfig.stateDefaultCenter(activeState) }
    var mapCenterLat by remember(activeState) { mutableDoubleStateOf(defaultCenter.first) }
    var mapCenterLng by remember(activeState) { mutableDoubleStateOf(defaultCenter.second) }
    var myLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var selectedBaseLayer by remember { mutableStateOf(MapBaseLayer.BHUVAN_HYBRID) }
    var selectedOverlayLayer by remember { mutableStateOf(BhuvanOverlayLayer.CADASTRAL) }

    val (locatingMyPos, triggerMyLocation) = rememberMyLocationAction(
        onLocationFound = { lat, lng, acc ->
            mapCenterLat = lat
            mapCenterLng = lng
            myLocation = lat to lng
            onToast("Centered GIS map on My Location (±${acc.toInt()}m)")
        },
        onLocationError = { msg -> onToast(msg) }
    )

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
            val displayName = resolveSafDisplayName(context, uri)
            val name = displayName ?: uri.lastPathSegment ?: "imported.geojson"
            val result = CadEngine.parseImportedGisBytes(bytes, name, stateHint = activeState)
            if (!result.isValid) {
                importError = result.errorMessage ?: "Invalid or unsupported GIS file."
                importWarnings = emptyList()
                onToast(importError!!)
            } else {
                importError = null
                importWarnings = result.warnings
                importResult = result
                crsOverride = GisCrsOverride.AUTO
                workingPoints = result.points
                workingFeatures = result.features
                importedFileName = name.substringAfterLast('/')
                onToast("Imported ${result.features.size} parcel(s), ${result.features.sumOf { it.points.size }} vertices (${result.detectedFormat})")
            }
        } catch (e: Throwable) {
            importError = "Import failed: ${e.localizedMessage ?: "Unreadable file"}"
            onToast(importError!!)
        }
    }

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("*/*")
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            if (pendingExportFormat == "shp_zip") {
                val zipBytes = ShapefileSupport.exportPolygonToShapefileZip(
                    points = workingPoints,
                    layerName = importedFileName
                )
                context.contentResolver.openOutputStream(uri)?.use { it.write(zipBytes) }
            } else {
                val payload = when (pendingExportFormat) {
                    "dxf" -> CadEngine.exportPolygonToDxf(workingPoints)
                    "kml" -> CadEngine.exportPolygonToKml(workingPoints, importedFileName)
                    else -> CadEngine.exportPolygonToGeoJson(workingPoints, importedFileName)
                }
                context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(payload) }
            }
            onToast("Exported ${pendingExportFormat.uppercase()} successfully.")
        } catch (e: Throwable) {
            onToast("Export failed: ${e.localizedMessage}")
        }
    }

    val effectiveCrsType = remember(crsOverride, importResult) {
        when (crsOverride) {
            GisCrsOverride.AUTO -> importResult?.crsType ?: ImportedCrsType.LOCAL_PLANAR
            GisCrsOverride.WGS84 -> ImportedCrsType.WGS84
            GisCrsOverride.UTM_42N,
            GisCrsOverride.UTM_43N,
            GisCrsOverride.UTM_44N,
            GisCrsOverride.UTM_45N,
            GisCrsOverride.UTM_46N -> ImportedCrsType.UTM
            GisCrsOverride.WEB_MERCATOR -> ImportedCrsType.WEB_MERCATOR
            GisCrsOverride.LOCAL -> ImportedCrsType.LOCAL_PLANAR
        }
    }
    val effectiveUtmZone = remember(crsOverride, importResult, activeState) {
        when (crsOverride) {
            GisCrsOverride.UTM_42N -> 42
            GisCrsOverride.UTM_43N -> 43
            GisCrsOverride.UTM_44N -> 44
            GisCrsOverride.UTM_45N -> 45
            GisCrsOverride.UTM_46N -> 46
            else -> importResult?.utmZone ?: GeoAndGpsUtils.recommendedUtmZoneForState(activeState)
        }
    }
    val effectiveCrsBadge = remember(crsOverride, importResult, effectiveUtmZone) {
        val fmt = importResult?.detectedFormat ?: "Active CAD"
        val crsStr = when (crsOverride) {
            GisCrsOverride.AUTO -> importResult?.crsLabel ?: "Planar CAD Meters"
            GisCrsOverride.WGS84 -> "EPSG:4326 (WGS84 Manual)"
            GisCrsOverride.UTM_42N,
            GisCrsOverride.UTM_43N,
            GisCrsOverride.UTM_44N,
            GisCrsOverride.UTM_45N,
            GisCrsOverride.UTM_46N -> "WGS84 / UTM Zone ${effectiveUtmZone}N"
            GisCrsOverride.WEB_MERCATOR -> "EPSG:3857 (Web Mercator)"
            GisCrsOverride.LOCAL -> "Local Planar Meters"
        }
        "$fmt • $crsStr"
    }

    val activeUnitScale = importResult?.unitScaleToMeters ?: 1.0
    val activeTmCm = if (crsOverride == GisCrsOverride.AUTO) importResult?.tmCentralMeridianDeg else null
    val activeTmLat0 = if (crsOverride == GisCrsOverride.AUTO) (importResult?.tmLatOriginDeg ?: 0.0) else 0.0
    val activeTmScale = if (crsOverride == GisCrsOverride.AUTO) (importResult?.tmScaleFactor ?: 0.9996) else 0.9996
    val activeTmFe = if (crsOverride == GisCrsOverride.AUTO) (importResult?.tmFalseEasting ?: 500000.0) else 500000.0
    val activeTmFn = if (crsOverride == GisCrsOverride.AUTO) (importResult?.tmFalseNorthing ?: 0.0) else 0.0
    val activeHemi = if (crsOverride == GisCrsOverride.AUTO) (importResult?.utmHemisphere ?: 'N') else 'N'

    val projectedFeaturesLatLng = remember(
        workingFeatures,
        mapCenterLat,
        mapCenterLng,
        effectiveCrsType,
        effectiveUtmZone,
        activeHemi,
        activeTmCm,
        activeTmLat0,
        activeTmScale,
        activeTmFe,
        activeTmFn,
        activeUnitScale,
        activeState
    ) {
        SurveyMapConfig.projectFeaturesToLatLng(
            features = workingFeatures,
            anchorLat = mapCenterLat,
            anchorLng = mapCenterLng,
            crsType = effectiveCrsType,
            utmZone = effectiveUtmZone,
            utmHemisphere = activeHemi,
            tmCentralMeridianDeg = activeTmCm,
            tmLatOriginDeg = activeTmLat0,
            tmScaleFactor = activeTmScale,
            tmFalseEasting = activeTmFe,
            tmFalseNorthing = activeTmFn,
            unitScaleToMeters = activeUnitScale,
            stateHint = activeState
        )
    }

    val (effectiveLat, effectiveLng) = remember(projectedFeaturesLatLng, mapCenterLat, mapCenterLng) {
        val allProjected = projectedFeaturesLatLng.flatten()
        if (allProjected.isEmpty()) {
            mapCenterLat to mapCenterLng
        } else {
            val minLat = allProjected.minOf { it.first }
            val maxLat = allProjected.maxOf { it.first }
            val minLng = allProjected.minOf { it.second }
            val maxLng = allProjected.maxOf { it.second }
            ((minLat + maxLat) / 2.0) to ((minLng + maxLng) / 2.0)
        }
    }

    val resolvedState = remember(effectiveLat, effectiveLng, effectiveCrsType) {
        if (effectiveCrsType != ImportedCrsType.LOCAL_PLANAR) {
            GeoAndGpsUtils.detectIndianState(effectiveLat, effectiveLng)
        } else null
    }

    val (areaSqm, perimM) = remember(
        workingFeatures,
        effectiveCrsType,
        effectiveUtmZone,
        activeHemi,
        activeTmCm,
        activeTmLat0,
        activeTmScale,
        activeTmFe,
        activeTmFn,
        activeUnitScale,
        activeState
    ) {
        ShapefileSupport.computeMetricAreaAndPerimeter(
            features = workingFeatures,
            crsType = effectiveCrsType,
            utmZone = effectiveUtmZone,
            utmHemisphere = activeHemi,
            tmCentralMeridianDeg = activeTmCm,
            tmLatOriginDeg = activeTmLat0,
            tmScaleFactor = activeTmScale,
            tmFalseEasting = activeTmFe,
            tmFalseNorthing = activeTmFn,
            unitScaleToMeters = activeUnitScale,
            stateHint = activeState
        )
    }

    val totalVertices = remember(workingFeatures) { workingFeatures.sumOf { it.points.size } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 8.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("GIS & AutoCAD File Exchange", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Import `.geojson`, `.kml`, AutoCAD `.dxf`, or ESRI Shapefile `.zip`/`.shp` with automatic UTM / Web Mercator / WGS84 coordinate projection.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "Active CRS: $effectiveCrsBadge",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
                if (workingFeatures.isNotEmpty() && effectiveCrsType != ImportedCrsType.LOCAL_PLANAR) {
                    Text(
                        "Place: ${"%.5f".format(effectiveLat)}, ${"%.5f".format(effectiveLng)}${if (resolvedState != null) " • $resolvedState" else ""} (${workingFeatures.size} feature${if (workingFeatures.size == 1) "" else "s"})",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    GisCrsOverride.entries.forEach { opt ->
                        FilterChip(
                            selected = crsOverride == opt,
                            onClick = { crsOverride = opt },
                            label = { Text(opt.label, style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.testTag("gis_crs_chip_${opt.id}")
                        )
                    }
                }
                Button(
                    onClick = { importLauncher.launch(arrayOf("*/*")) },
                    modifier = Modifier.fillMaxWidth().testTag("gis_import_button")
                ) {
                    Icon(Icons.Default.UploadFile, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Import GeoJSON / KML / DXF / Shapefile")
                }
                if (importError != null) {
                    Text(importError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                importWarnings.forEach { warn ->
                    Text("CRS Note: $warn", color = MaterialTheme.colorScheme.tertiary, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        SurveyMapLayerCard(
            title = "GIS Boundary Map Layers",
            activeState = resolvedState ?: activeState,
            baseLayer = selectedBaseLayer,
            onSelectBaseLayer = { selectedBaseLayer = it },
            overlayLayer = selectedOverlayLayer,
            onSelectOverlayLayer = { selectedOverlayLayer = it },
            centerLat = effectiveLat,
            centerLng = effectiveLng,
            myLocation = myLocation,
            polygonLatLngs = projectedFeaturesLatLng.firstOrNull() ?: emptyList(),
            featurePolygonsLatLng = projectedFeaturesLatLng,
            featurePolygonsClosed = workingFeatures.map { it.closed },
            locating = locatingMyPos,
            onMyLocationClick = triggerMyLocation,
            myLocationButtonTag = "gis_my_location_button",
            mapContainerTag = "gis_map_container",
            mapHeight = 380.dp
        )

        PlotCanvas(
            points = workingPoints.map { PlotPoint(it.x, it.y, it.label) },
            multiFeatures = workingFeatures.map { feat -> feat.points.map { PlotPoint(it.x, it.y, it.label) } },
            multiFeaturesClosed = workingFeatures.map { it.closed },
            canvasHeight = 220.dp,
            unitLabel = ""
        )

        if (totalVertices >= 2) {
            AreaSummaryCard(
                breakdown = convertAreaFromSqm(areaSqm),
                activeState = resolvedState ?: activeState,
                perimeterMeters = perimM,
                classificationNote = "Imported/Active GIS Geometry ($effectiveCrsBadge • ${workingFeatures.size} parcel${if (workingFeatures.size == 1) "" else "s"})"
            )
        }

        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Export Active Parcel ($totalVertices vertices across ${workingFeatures.size.coerceAtLeast(1)} feature${if (workingFeatures.size == 1) "" else "s"})",
                    style = MaterialTheme.typography.titleMedium
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            pendingExportFormat = "dxf"
                            exportLauncher.launch("sthal_survey.dxf")
                        },
                        enabled = workingPoints.size >= 2,
                        modifier = Modifier.weight(1f).testTag("export_dxf_button")
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("DXF")
                    }
                    Button(
                        onClick = {
                            pendingExportFormat = "geojson"
                            exportLauncher.launch("sthal_survey.geojson")
                        },
                        enabled = workingPoints.size >= 3,
                        modifier = Modifier.weight(1f).testTag("export_geojson_button")
                    ) {
                        Text("GeoJSON")
                    }
                    Button(
                        onClick = {
                            pendingExportFormat = "kml"
                            exportLauncher.launch("sthal_survey.kml")
                        },
                        enabled = workingPoints.size >= 3,
                        modifier = Modifier.weight(1f).testTag("export_kml_button")
                    ) {
                        Text("KML")
                    }
                }
                OutlinedButton(
                    onClick = {
                        pendingExportFormat = "shp_zip"
                        exportLauncher.launch("sthal_survey_shapefile.zip")
                    },
                    enabled = workingPoints.size >= 3,
                    modifier = Modifier.fillMaxWidth().testTag("export_shp_zip_button")
                ) {
                    Icon(Icons.Default.Download, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Export Shapefile (.zip)")
                }
                OutlinedButton(
                    onClick = { onApplyToCad(workingPoints) },
                    enabled = workingPoints.size >= 2,
                    modifier = Modifier.fillMaxWidth().testTag("load_into_cad_button")
                ) {
                    Text("Load Boundary into CAD Drafting Studio")
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}

