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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ClearAll
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.automirrored.filled.Undo
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
import com.sthalmeasure.app.ui.components.PlotCanvas

private enum class CadDeck(val label: String) {
    COGO("COGO Forward"),
    SETBACK("Setback & Split"),
    FMB("FMB G-Line Ladder")
}

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

    var showSetback by remember { mutableStateOf(false) }
    var setbackMeters by remember { mutableFloatStateOf(2.0f) }

    var showSplit by remember { mutableStateOf(false) }
    var splitRatio by remember { mutableFloatStateOf(0.5f) }
    var splitVertical by remember { mutableStateOf(true) }

    var gLineLength by remember { mutableStateOf("40") }
    val fmbOffsets = remember {
        mutableStateListOf(
            CadFmbOffset("1", 0.0, 12.0, 'L', "F1"),
            CadFmbOffset("2", 40.0, 15.0, 'L', "F2"),
            CadFmbOffset("3", 40.0, 10.0, 'R', "F3"),
            CadFmbOffset("4", 0.0, 10.0, 'R', "F4")
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
                    Text("${"%.2f".format(areaSqm)} m² (${"%.2f".format(breakdown.cents)} Cts)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
                Column {
                    Text("Perimeter", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${"%.2f".format(perimM)} m (${points.size} pts)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
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
                                val brg = bearingText.toDoubleOrNull() ?: return@Button
                                val dist = distanceText.toDoubleOrNull()?.takeIf { it > 0 } ?: return@Button
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
                                "Last Segment: ${"%.2f".format(inv.distanceMeters)} m @ ${inv.quadrantalBearing}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
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
                            Text("Building Setback Inset (${"%.1f".format(setbackMeters)} m)", style = MaterialTheme.typography.titleMedium)
                            Switch(checked = showSetback, onCheckedChange = { showSetback = it })
                        }
                        Slider(value = setbackMeters, onValueChange = { setbackMeters = it }, valueRange = 0.5f..8.0f)
                        if (showSetback && setbackPts.size >= 3) {
                            val netArea = CadEngine.computePolygonArea(setbackPts.map { CadPoint(it.x, it.y) })
                            Text("Net Buildable Footprint: ${"%.2f".format(netArea)} m²", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
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
                                "Part 1: ${"%.2f".format(splitResult.part1Area)} m² | Part 2: ${"%.2f".format(splitResult.part2Area)} m²",
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
                        fmbOffsets.forEachIndexed { idx, off ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(off.label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(26.dp))
                                OutlinedTextField(
                                    value = off.distanceAlongGLine.toString(),
                                    onValueChange = { v ->
                                        fmbOffsets[idx] = off.copy(distanceAlongGLine = v.toDoubleOrNull() ?: off.distanceAlongGLine)
                                    },
                                    label = { Text("Chain (m)") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = off.offsetDistance.toString(),
                                    onValueChange = { v ->
                                        fmbOffsets[idx] = off.copy(offsetDistance = v.toDoubleOrNull() ?: off.offsetDistance)
                                    },
                                    label = { Text("Offset") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                FilterChip(
                                    selected = off.side == 'L',
                                    onClick = { fmbOffsets[idx] = off.copy(side = if (off.side == 'L') 'R' else 'L') },
                                    label = { Text(off.side.toString()) }
                                )
                            }
                        }
                        Button(
                            onClick = {
                                val gLen = (gLineLength.toDoubleOrNull() ?: 40.0).coerceAtLeast(1.0)
                                val pts = CadEngine.computeFmbLadderPoints(CadPoint(0.0, 0.0), CadPoint(0.0, gLen), fmbOffsets)
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
                        val note = "${points.size} vertices drafted in Sthal CAD Studio"
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
