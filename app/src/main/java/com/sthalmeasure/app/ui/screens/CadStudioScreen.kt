package com.sthalmeasure.app.ui.screens

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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ClearAll
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.CadEngine
import com.sthalmeasure.app.domain.CadFmbOffset
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.domain.parseSurveyDouble
import com.sthalmeasure.app.ui.components.PlotCanvas
import java.util.Locale

private enum class CadDeck(val label: String) {
    COGO("COGO Forward"),
    POINTS("Points (E, N)"),
    SETBACK("Setback & Split"),
    FMB("FMB G-Line Ladder")
}

private data class FmbOffsetInput(
    val id: String,
    val chainText: String,
    val offsetText: String,
    val side: Char,
    val label: String
)

@Composable
fun CadStudioScreen(
    points: List<CadPoint>,
    onUpdatePoints: (List<CadPoint>) -> Unit,
    onSaveProject: (name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String) -> Unit,
    onOpenGisExport: () -> Unit,
    onSaveProjectWithSummary: ((name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String, summaryJson: String) -> Unit)? = null
) {
    var activeDeck by remember { mutableStateOf(CadDeck.COGO) }
    var bearingText by remember { mutableStateOf("90") }
    var distanceText by remember { mutableStateOf("15") }
    var eastingText by remember { mutableStateOf("0") }
    var northingText by remember { mutableStateOf("0") }

    var showSetback by remember { mutableStateOf(false) }
    var setbackMeters by remember { mutableFloatStateOf(2.0f) }

    var showSplit by remember { mutableStateOf(false) }
    var splitRatio by remember { mutableFloatStateOf(0.5f) }
    var splitVertical by remember { mutableStateOf(true) }

    var gLineLength by remember { mutableStateOf("40") }
    val fmbOffsetInputs = remember {
        mutableStateListOf(
            FmbOffsetInput("1", "0", "12", 'L', "F1"),
            FmbOffsetInput("2", "40", "15", 'L', "F2"),
            FmbOffsetInput("3", "40", "10", 'R', "F3"),
            FmbOffsetInput("4", "0", "10", 'R', "F4")
        )
    }

    var saveTitle by remember { mutableStateOf("CAD Boundary Sketch") }

    val areaSqm = CadEngine.computePolygonArea(points)
    val perimM = CadEngine.computePolygonPerimeter(points)
    val breakdown = convertAreaFromSqm(areaSqm)

    val setbackPts = if (showSetback && points.size >= 3) {
        CadEngine.computeSetbackPolygon(points, setbackMeters.toDouble()).map { PlotPoint(it.x, it.y, it.label) }
    } else emptyList()

    val splitResult = if (showSplit && points.size >= 3) {
        CadEngine.splitPolygonByRatio(points, splitRatio.toDouble(), splitVertical)
    } else null

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.primaryContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
            modifier = Modifier.fillMaxWidth().testTag("cad_studio_header")
        ) {
            Column(Modifier.padding(12.dp)) {
                Text(
                    "CAD Drafting Studio",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "COGO Forward, Manual Coordinates, Setback, Split Parcel & FMB G-Line",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                )
            }
        }

        // Telemetry strip
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Area", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        String.format(Locale.US, "%.2f m² (%.2f Cts)", areaSqm, breakdown.cents),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Column {
                    Text("Perimeter", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        String.format(Locale.US, "%.2f m (%d pts)", perimM, points.size),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        PlotCanvas(
            points = points.map { PlotPoint(it.x, it.y, it.label) },
            secondaryOverlay = setbackPts,
            splitSegment = splitResult?.let {
                Pair(PlotPoint(it.splitLine.first.x, it.splitLine.first.y), PlotPoint(it.splitLine.second.x, it.splitLine.second.y))
            },
            canvasHeight = 230.dp,
            unitLabel = "m"
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { if (points.isNotEmpty()) onUpdatePoints(points.dropLast(1)) },
                modifier = Modifier.weight(1f).testTag("cad_undo_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Undo")
            }
            OutlinedButton(
                onClick = { onUpdatePoints(emptyList()) },
                modifier = Modifier.weight(1f).testTag("cad_clear_button")
            ) {
                Icon(Icons.Default.ClearAll, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Clear")
            }
            OutlinedButton(
                onClick = onOpenGisExport,
                modifier = Modifier.weight(1f).testTag("cad_export_button")
            ) {
                Text("DXF / GIS")
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            CadDeck.entries.forEach { deck ->
                FilterChip(
                    selected = activeDeck == deck,
                    onClick = { activeDeck = deck },
                    label = { Text(deck.label) },
                    modifier = Modifier.testTag("cad_deck_${deck.name.lowercase()}")
                )
            }
        }

        when (activeDeck) {
            CadDeck.COGO -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("COGO Forward Plotter", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = bearingText,
                                onValueChange = { bearingText = it },
                                label = { Text("WCB Bearing (°)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = distanceText,
                                onValueChange = { distanceText = it },
                                label = { Text("Distance (m)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Button(
                            onClick = {
                                val brg = parseSurveyDouble(bearingText) ?: return@Button
                                val dist = parseSurveyDouble(distanceText)?.takeIf { it > 0 } ?: return@Button
                                val start = points.lastOrNull() ?: CadPoint(0.0, 0.0, "P1")
                                val baseList = if (points.isEmpty()) listOf(start) else points
                                val next = CadEngine.computeCogoForward(start, brg, dist, "P${baseList.size + 1}")
                                onUpdatePoints(baseList + next)
                            },
                            modifier = Modifier.fillMaxWidth().testTag("cogo_add_vertex_button")
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("Plot Vertex by Bearing & Distance")
                        }
                        if (points.size >= 2) {
                            val inv = CadEngine.computeCogoInverse(points[points.size - 2], points.last())
                            Text(
                                String.format(Locale.US, "Last Segment: %.2f m @ %s", inv.distanceMeters, inv.quadrantalBearing),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            CadDeck.POINTS -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("CAD Drafting Studio • Vertex Entry", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = eastingText,
                                onValueChange = { eastingText = it },
                                label = { Text("Easting X (m)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = northingText,
                                onValueChange = { northingText = it },
                                label = { Text("Northing Y (m)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Button(
                            onClick = {
                                val x = parseSurveyDouble(eastingText) ?: return@Button
                                val y = parseSurveyDouble(northingText) ?: return@Button
                                val next = CadPoint(x, y, "P${points.size + 1}")
                                onUpdatePoints(points + next)
                            },
                            modifier = Modifier.fillMaxWidth().testTag("cad_add_point_button")
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("Add Vertex Coordinate")
                        }
                    }
                }
            }

            CadDeck.SETBACK -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(String.format(Locale.US, "Building Setback Inset (%.1f m)", setbackMeters), style = MaterialTheme.typography.titleMedium)
                            Switch(checked = showSetback, onCheckedChange = { showSetback = it })
                        }
                        Slider(value = setbackMeters, onValueChange = { setbackMeters = it }, valueRange = 0.5f..8.0f)
                        if (showSetback && setbackPts.size >= 3) {
                            val netArea = CadEngine.computePolygonArea(setbackPts.map { CadPoint(it.x, it.y) })
                            Text(
                                String.format(Locale.US, "Net Buildable Footprint: %.2f m²", netArea),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Subdivide Split (${(splitRatio * 100).toInt()}% / ${100 - (splitRatio * 100).toInt()}%)", style = MaterialTheme.typography.titleMedium)
                            Switch(checked = showSplit, onCheckedChange = { showSplit = it })
                        }
                        Slider(value = splitRatio, onValueChange = { splitRatio = it }, valueRange = 0.15f..0.85f)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(selected = splitVertical, onClick = { splitVertical = true }, label = { Text("Vertical Split") })
                            FilterChip(selected = !splitVertical, onClick = { splitVertical = false }, label = { Text("Horizontal Split") })
                        }
                        if (splitResult != null) {
                            Text(
                                String.format(Locale.US, "Part 1: %.2f m² | Part 2: %.2f m²", splitResult.part1Area, splitResult.part2Area),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            CadDeck.FMB -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("FMB G-Line Offset Ladder", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(
                            value = gLineLength,
                            onValueChange = { gLineLength = it },
                            label = { Text("G-Line Baseline Length (m)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        fmbOffsetInputs.forEachIndexed { idx, off ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(off.label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(26.dp))
                                OutlinedTextField(
                                    value = off.chainText,
                                    onValueChange = { v ->
                                        fmbOffsetInputs[idx] = off.copy(chainText = v)
                                    },
                                    label = { Text("Chain (m)") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = off.offsetText,
                                    onValueChange = { v ->
                                        fmbOffsetInputs[idx] = off.copy(offsetText = v)
                                    },
                                    label = { Text("Offset") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                FilterChip(
                                    selected = off.side == 'L',
                                    onClick = { fmbOffsetInputs[idx] = off.copy(side = if (off.side == 'L') 'R' else 'L') },
                                    label = { Text(off.side.toString()) }
                                )
                            }
                        }
                        Button(
                            onClick = {
                                val gLen = (parseSurveyDouble(gLineLength) ?: 40.0).coerceAtLeast(1.0)
                                val parsedOffsets = fmbOffsetInputs.map { item ->
                                    CadFmbOffset(
                                        id = item.id,
                                        distanceAlongGLine = parseSurveyDouble(item.chainText) ?: 0.0,
                                        offsetDistance = parseSurveyDouble(item.offsetText) ?: 0.0,
                                        side = item.side,
                                        label = item.label
                                    )
                                }
                                val pts = CadEngine.computeFmbLadderPoints(CadPoint(0.0, 0.0), CadPoint(0.0, gLen), parsedOffsets)
                                onUpdatePoints(pts)
                            },
                            modifier = Modifier.fillMaxWidth().testTag("fmb_generate_button")
                        ) {
                            Text("Generate Boundary from FMB Ladder")
                        }
                    }
                }
            }
        }

        if (points.size >= 3) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = saveTitle,
                    onValueChange = { saveTitle = it },
                    label = { Text("CAD Project Title") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                Button(
                    onClick = {
                        val note = "${points.size} vertices drafted in Sthal CAD Drafting Studio"
                        val summary = PlotSummaryCodec.encode(
                            parcelType = "cad",
                            points = points.map { PlotPoint(it.x, it.y, it.label) },
                            noteHint = note
                        )
                        if (onSaveProjectWithSummary != null) {
                            onSaveProjectWithSummary(saveTitle, "cad", areaSqm, perimM, note, summary)
                        } else {
                            onSaveProject(saveTitle, "cad", areaSqm, perimM, note)
                        }
                    },
                    modifier = Modifier.height(52.dp).testTag("cad_save_project_button")
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Save")
                }
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}
