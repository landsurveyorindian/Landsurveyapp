package com.sthalmeasure.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.CadEngine
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.ShapefileSupport
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.ui.components.PlotCanvas

@Composable
fun CadGisScreen(
    activeState: String,
    activePolygon: List<CadPoint>,
    onApplyToCad: (List<CadPoint>) -> Unit,
    onToast: (String) -> Unit
) {
    val context = LocalContext.current
    var importedFileName by remember { mutableStateOf("Active CAD Parcel") }
    var crsBadge by remember { mutableStateOf("Planar CAD Meters") }
    var importWarnings by remember { mutableStateOf<List<String>>(emptyList()) }
    var importError by remember { mutableStateOf<String?>(null) }
    var workingPoints by remember(activePolygon) { mutableStateOf(activePolygon) }
    var pendingExportFormat by remember { mutableStateOf("dxf") }

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
            val name = uri.lastPathSegment ?: "imported.geojson"
            val result = CadEngine.parseImportedGisBytes(bytes, name)
            if (!result.isValid) {
                importError = result.errorMessage ?: "Invalid or unsupported GIS file."
                importWarnings = emptyList()
                onToast(importError!!)
            } else {
                importError = null
                importWarnings = result.warnings
                workingPoints = result.points
                importedFileName = name.substringAfterLast('/')
                crsBadge = "${result.detectedFormat} • ${result.crsLabel}"
                onToast("Imported ${result.points.size} vertices (${result.detectedFormat})")
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

    val areaSqm = CadEngine.computePolygonArea(workingPoints)
    val perimM = CadEngine.computePolygonPerimeter(workingPoints)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("GIS & AutoCAD File Exchange", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Import `.geojson`, `.kml`, AutoCAD `.dxf`, or ESRI Shapefile `.zip`/`.shp` with automatic CRS & coordinate validation via Android Storage Access Framework.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "Active CRS: $crsBadge",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
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

        PlotCanvas(
            points = workingPoints.map { PlotPoint(it.x, it.y, it.label) },
            canvasHeight = 210.dp,
            unitLabel = ""
        )

        if (workingPoints.size >= 3) {
            AreaSummaryCard(
                breakdown = convertAreaFromSqm(areaSqm),
                activeState = activeState,
                perimeterMeters = perimM,
                classificationNote = "Imported/Active GIS Geometry ($crsBadge)"
            )
        }

        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Export Active Polygon (${workingPoints.size} vertices)", style = MaterialTheme.typography.titleMedium)
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
                    Text("Load Boundary into CAD Studio")
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}
