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
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.AreaBreakdown
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.domain.LinearUnit
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.domain.TraverseEngine
import com.sthalmeasure.app.domain.TraverseStation
import com.sthalmeasure.app.domain.TriangulationEngine
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.domain.parseSurveyDouble
import com.sthalmeasure.app.ui.components.IndianStateUnitsDropdown
import com.sthalmeasure.app.ui.components.PlotCanvas
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs

enum class CalcMode(val label: String) {
    FOUR_SIDED("4-Sided + Diag"),
    NO_DIAG("4-Sided (No Diag)"),
    TRIANGLE("Triangle (Heron)"),
    TRAVERSE("Bowditch Traverse"),
    CONVERTER("State Converter"),
    HISSA("Hissa Partition")
}

private data class TraverseStationInput(
    val id: String,
    val lineId: String,
    val bearingText: String,
    val distanceText: String
)

private enum class HissaHoldingUnit(val label: String, val toSqmFactor: Double) {
    CENTS("Cents", 40.468564224),
    ACRES("Acres", 4046.8564224),
    GUNTAS("Guntas", 101.17141056),
    SQ_YARDS("Sq. Yards", 0.83612736),
    SQ_FEET("Sq. Feet", 0.09290304),
    SQ_METERS("Sq. Meters", 1.0)
}

@Composable
fun CalculatorScreen(
    activeState: String,
    presetSqm: Double,
    onSelectState: (String) -> Unit = {},
    onSaveProject: (name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String) -> Unit,
    onSaveProjectWithSummary: ((name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String, summaryJson: String) -> Unit)? = null
) {
    var selectedState by remember(activeState) { mutableStateOf(activeState) }
    var mode by remember { mutableStateOf(CalcMode.FOUR_SIDED) }
    var linearUnit by remember { mutableStateOf(LinearUnit.FEET) }

    // 4-sided inputs
    var sideA by remember { mutableStateOf("60") }
    var sideB by remember { mutableStateOf("40") }
    var sideC by remember { mutableStateOf("60") }
    var sideD by remember { mutableStateOf("40") }
    var diagAC by remember { mutableStateOf("72.11") }

    // 3-sided inputs
    var triA by remember { mutableStateOf("30") }
    var triB by remember { mutableStateOf("40") }
    var triC by remember { mutableStateOf("50") }

    // Traverse station inputs (string-backed so users can freely edit decimals & backspace)
    val stationInputs = remember {
        mutableStateListOf(
            TraverseStationInput("1", "A-B", "0", "30"),
            TraverseStationInput("2", "B-C", "90", "40"),
            TraverseStationInput("3", "C-D", "180", "30"),
            TraverseStationInput("4", "D-A", "270", "40.05")
        )
    }

    var projectName by remember { mutableStateOf("Survey Plot #1") }

    fun saveComputed(name: String, type: String, areaSqm: Double, perimM: Double, notes: String, points: List<PlotPoint>) {
        if (onSaveProjectWithSummary != null) {
            onSaveProjectWithSummary(
                name,
                type,
                areaSqm,
                perimM,
                notes,
                PlotSummaryCodec.encode(type, points, notes)
            )
        } else {
            onSaveProject(name, type, areaSqm, perimM, notes)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
        androidx.compose.foundation.layout.FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            CalcMode.entries.forEach { m ->
                FilterChip(
                    selected = mode == m,
                    onClick = { mode = m },
                    label = { Text(m.label) },
                    modifier = Modifier.testTag("calc_mode_${m.name.lowercase()}")
                )
            }
        }

        IndianStateUnitsDropdown(
            selectedState = selectedState,
            onSelectState = { chosen ->
                selectedState = chosen
                onSelectState(chosen)
            },
            label = "Indian State / UT Units (${IndianStateUnitsCatalog.allStates.size} Jurisdictions)",
            dropdownTag = "calculator_state_dropdown"
        )

        if (mode in listOf(CalcMode.FOUR_SIDED, CalcMode.NO_DIAG, CalcMode.TRIANGLE)) {
            @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
            androidx.compose.foundation.layout.FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                LinearUnit.entries.forEach { lu ->
                    FilterChip(
                        selected = linearUnit == lu,
                        onClick = { linearUnit = lu },
                        label = { Text(lu.label, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
        }

        when (mode) {
            CalcMode.FOUR_SIDED -> {
                val a = parseSurveyDouble(sideA) ?: 0.0
                val b = parseSurveyDouble(sideB) ?: 0.0
                val c = parseSurveyDouble(sideC) ?: 0.0
                val d = parseSurveyDouble(sideD) ?: 0.0
                val ac = parseSurveyDouble(diagAC) ?: 0.0
                val validRange = TriangulationEngine.validDiagonalRange(a, b, c, d)
                val suggestedDiag = TriangulationEngine.suggestDiagonalAC(a, b, c, d)
                val res = TriangulationEngine.calculateFourSidedPlot(a, b, c, d, ac)
                val areaSqm = res.totalArea * linearUnit.toMetersFactor * linearUnit.toMetersFactor
                val perimM = (a + b + c + d) * linearUnit.toMetersFactor

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("4-Sided Field Triangulation (${linearUnit.shortLabel})", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("North (A)", sideA, { sideA = it }, Modifier.weight(1f), "side_a_input")
                            NumField("East (B)", sideB, { sideB = it }, Modifier.weight(1f), "side_b_input")
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("South (C)", sideC, { sideC = it }, Modifier.weight(1f), "side_c_input")
                            NumField("West (D)", sideD, { sideD = it }, Modifier.weight(1f), "side_d_input")
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            NumField("Measured Diagonal (AC)", diagAC, { diagAC = it }, Modifier.weight(1f), "diag_ac_input")
                            if (suggestedDiag > 0.0) {
                                OutlinedButton(
                                    onClick = {
                                        diagAC = String.format(Locale.US, "%.2f", suggestedDiag)
                                    },
                                    modifier = Modifier.testTag("auto_fit_diag_button")
                                ) {
                                    Icon(Icons.Default.AutoFixHigh, contentDescription = null)
                                    Spacer(Modifier.width(4.dp))
                                    Text("Auto AC")
                                }
                            }
                        }
                        if (validRange != null && suggestedDiag > 0.0) {
                            Text(
                                text = String.format(
                                    Locale.US,
                                    "Valid AC range: %.2f – %.2f %s • Orthogonal/Cyclic AC: %.2f %s",
                                    validRange.first,
                                    validRange.second,
                                    linearUnit.shortLabel,
                                    suggestedDiag,
                                    linearUnit.shortLabel
                                ),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (res.isValid) {
                            Text(
                                text = String.format(
                                    Locale.US,
                                    "△ABC: %.2f %s² + △ACD: %.2f %s² = %.2f %s² (AC = %.2f %s)",
                                    res.triangle1.area,
                                    linearUnit.shortLabel,
                                    res.triangle2.area,
                                    linearUnit.shortLabel,
                                    res.totalArea,
                                    linearUnit.shortLabel,
                                    res.effectiveDiagonalAC,
                                    linearUnit.shortLabel
                                ),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                PlotCanvas(
                    points = res.points,
                    showDiagonalAC = true,
                    unitLabel = linearUnit.shortLabel
                )

                if (!res.isValid) {
                    ErrorBanner(
                        message = res.errorMessage ?: "Invalid polygon dimensions.",
                        actionLabel = if (suggestedDiag > 0.0) {
                            String.format(Locale.US, "Use Valid Diagonal AC (%.2f %s)", suggestedDiag, linearUnit.shortLabel)
                        } else null,
                        actionTag = "error_apply_diag_button",
                        onAction = if (suggestedDiag > 0.0) {
                            { diagAC = String.format(Locale.US, "%.2f", suggestedDiag) }
                        } else null
                    )
                } else {
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(areaSqm),
                        activeState = selectedState,
                        perimeterMeters = perimM,
                        classificationNote = "Heron 2-Triangle Calculation (requires verified field diagonal AC)"
                    )
                    SaveBar(
                        projectName = projectName,
                        onNameChange = { projectName = it },
                        onSave = {
                            saveComputed(
                                projectName,
                                "four_sided",
                                areaSqm,
                                perimM,
                                "Sides ($sideA,$sideB,$sideC,$sideD) Diag ${String.format(Locale.US, "%.2f", res.effectiveDiagonalAC)} ${linearUnit.shortLabel}",
                                res.points
                            )
                        }
                    )
                }
            }

            CalcMode.NO_DIAG -> {
                val a = parseSurveyDouble(sideA) ?: 0.0
                val b = parseSurveyDouble(sideB) ?: 0.0
                val c = parseSurveyDouble(sideC) ?: 0.0
                val d = parseSurveyDouble(sideD) ?: 0.0
                val res = TriangulationEngine.calculateFourSidedNoDiagonal(a, b, c, d)
                val factorSq = linearUnit.toMetersFactor * linearUnit.toMetersFactor
                val cyclicSqm = res.cyclicArea * factorSq
                val patwariSqm = res.patwariArea * factorSq
                val perimM = (a + b + c + d) * linearUnit.toMetersFactor

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("4 Sides Without Diagonal (${linearUnit.shortLabel})", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side A", sideA, { sideA = it }, Modifier.weight(1f), "nodiag_a")
                            NumField("Side B", sideB, { sideB = it }, Modifier.weight(1f), "nodiag_b")
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side C", sideC, { sideC = it }, Modifier.weight(1f), "nodiag_c")
                            NumField("Side D", sideD, { sideD = it }, Modifier.weight(1f), "nodiag_d")
                        }
                    }
                }
                PlotCanvas(points = res.points, unitLabel = linearUnit.shortLabel)

                if (!res.isValid) {
                    ErrorBanner(res.errorMessage ?: "Invalid sides")
                } else {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("ESTIMATE ONLY — Brahmagupta Cyclic Upper Bound vs Patwari Avg", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            Text(
                                String.format(
                                    Locale.US,
                                    "Cyclic Maximum Bound: %.2f %s² (%.2f Cents) • Inferred AC: %.2f %s, BD: %.2f %s",
                                    res.cyclicArea,
                                    linearUnit.shortLabel,
                                    convertAreaFromSqm(cyclicSqm).cents,
                                    res.diagonalAC,
                                    linearUnit.shortLabel,
                                    res.diagonalBD,
                                    linearUnit.shortLabel
                                ),
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                String.format(
                                    Locale.US,
                                    "Patwari Avg Approx: %.2f %s² (%.2f Cents)",
                                    res.patwariArea,
                                    linearUnit.shortLabel,
                                    convertAreaFromSqm(patwariSqm).cents
                                ),
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                "Assumption Warning: Without a measured diagonal AC or BD, shape is mathematically non-unique. Measure 1 diagonal before legal demarcation.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(cyclicSqm),
                        activeState = selectedState,
                        perimeterMeters = perimM,
                        classificationNote = "Brahmagupta Cyclic Quadrilateral Upper-Bound Area"
                    )
                    SaveBar(
                        projectName = projectName,
                        onNameChange = { projectName = it },
                        onSave = {
                            saveComputed(
                                projectName,
                                "four_sided_no_diag",
                                cyclicSqm,
                                perimM,
                                "4-Sided No-Diag ($sideA,$sideB,$sideC,$sideD) ${linearUnit.shortLabel}",
                                res.points
                            )
                        }
                    )
                }
            }

            CalcMode.TRIANGLE -> {
                val a = parseSurveyDouble(triA) ?: 0.0
                val b = parseSurveyDouble(triB) ?: 0.0
                val c = parseSurveyDouble(triC) ?: 0.0
                val res = TriangulationEngine.calculateHeronTriangle(a, b, c)
                val pts = TriangulationEngine.calculateTrianglePoints(a, b, c)
                val areaSqm = res.area * linearUnit.toMetersFactor * linearUnit.toMetersFactor
                val perimM = (a + b + c) * linearUnit.toMetersFactor

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Heron 3-Sided Triangle (${linearUnit.shortLabel})", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side A", triA, { triA = it }, Modifier.weight(1f), "tri_a")
                            NumField("Side B", triB, { triB = it }, Modifier.weight(1f), "tri_b")
                            NumField("Side C", triC, { triC = it }, Modifier.weight(1f), "tri_c")
                        }
                        if (res.isValid) {
                            Text(
                                text = String.format(
                                    Locale.US,
                                    "Semi-perimeter s = %.2f %s • Heron Area = %.2f %s²",
                                    res.semiPerimeter,
                                    linearUnit.shortLabel,
                                    res.area,
                                    linearUnit.shortLabel
                                ),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                PlotCanvas(points = pts, unitLabel = linearUnit.shortLabel)
                if (!res.isValid) {
                    ErrorBanner(res.errorMessage ?: "Invalid triangle")
                } else {
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(areaSqm),
                        activeState = selectedState,
                        perimeterMeters = perimM,
                        classificationNote = "Exact Heron Planar Triangle Formula"
                    )
                    SaveBar(
                        projectName = projectName,
                        onNameChange = { projectName = it },
                        onSave = {
                            saveComputed(
                                projectName,
                                "triangle",
                                areaSqm,
                                perimM,
                                "Triangle ($triA, $triB, $triC) ${linearUnit.shortLabel}",
                                pts
                            )
                        }
                    )
                }
            }

            CalcMode.TRAVERSE -> {
                val stations = stationInputs.map { item ->
                    TraverseStation(
                        id = item.id,
                        lineId = item.lineId,
                        bearingDeg = parseSurveyDouble(item.bearingText) ?: Double.NaN,
                        distanceMeters = parseSurveyDouble(item.distanceText) ?: Double.NaN
                    )
                }
                val summary = TraverseEngine.computeClosedTraverse(stations)

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            "Closed Traverse Stations",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (stationInputs.size >= 3) {
                                OutlinedButton(
                                    onClick = {
                                        val preceding = stations.dropLast(1)
                                        val lastInput = stationInputs.last()
                                        val closing = TraverseEngine.computeClosingLegForPreceding(
                                            precedingLegs = preceding,
                                            id = lastInput.id,
                                            lineId = lastInput.lineId
                                        )
                                        if (closing != null) {
                                            stationInputs[stationInputs.lastIndex] = lastInput.copy(
                                                bearingText = String.format(Locale.US, "%.2f", closing.bearingDeg),
                                                distanceText = String.format(Locale.US, "%.2f", closing.distanceMeters)
                                            )
                                        }
                                    },
                                    modifier = Modifier.weight(1f).testTag("traverse_auto_close_button")
                                ) {
                                    Icon(Icons.Default.AutoFixHigh, contentDescription = null)
                                    Spacer(Modifier.width(4.dp))
                                    Text("Auto-Close")
                                }
                            }
                            OutlinedButton(
                                onClick = {
                                    val nextIdx = stationInputs.size + 1
                                    stationInputs.add(
                                        TraverseStationInput(
                                            id = "$nextIdx",
                                            lineId = "Stn $nextIdx",
                                            bearingText = "45",
                                            distanceText = "20"
                                        )
                                    )
                                },
                                modifier = Modifier.weight(1f).testTag("add_station_button")
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(Modifier.width(4.dp))
                                Text("Add Leg")
                            }
                        }

                        stationInputs.forEachIndexed { idx, item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(item.lineId, style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(56.dp))
                                OutlinedTextField(
                                    value = item.bearingText,
                                    onValueChange = { v ->
                                        stationInputs[idx] = item.copy(bearingText = v)
                                    },
                                    label = { Text("WCB°") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f).testTag("traverse_bearing_$idx")
                                )
                                OutlinedTextField(
                                    value = item.distanceText,
                                    onValueChange = { v ->
                                        stationInputs[idx] = item.copy(distanceText = v)
                                    },
                                    label = { Text("Dist (m)") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f).testTag("traverse_dist_$idx")
                                )
                                if (stationInputs.size > 3) {
                                    IconButton(onClick = { stationInputs.removeAt(idx) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Remove station")
                                    }
                                }
                            }
                        }
                    }
                }

                PlotCanvas(
                    points = summary.points,
                    secondaryOverlay = summary.unadjustedPoints,
                    unitLabel = "m"
                )

                if (!summary.isValid) {
                    ErrorBanner(summary.validationErrors.joinToString("\n"))
                } else {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = if (summary.isClosedGood) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.error.copy(alpha = 0.1f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Bowditch Compass Rule Summary (${summary.qualityGrade.label})", style = MaterialTheme.typography.titleMedium)
                            Text(
                                String.format(
                                    Locale.US,
                                    "Closing Error: %.4f m | Precision: %s",
                                    summary.linearClosingError,
                                    summary.relativePrecision
                                ),
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                String.format(
                                    Locale.US,
                                    "ΔLat Sum: %.4f m | ΔDep Sum: %.4f m",
                                    summary.sumLatitude,
                                    summary.sumDeparture
                                ),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                    AreaSummaryCard(
                        breakdown = summary.areaBreakdown,
                        activeState = selectedState,
                        perimeterMeters = summary.totalPerimeter,
                        classificationNote = "Bowditch Balanced Closed Traverse (${summary.qualityGrade.label})"
                    )
                    SaveBar(
                        projectName = projectName,
                        onNameChange = { projectName = it },
                        onSave = {
                            saveComputed(
                                projectName,
                                "traverse",
                                summary.areaSqm,
                                summary.totalPerimeter,
                                "${stations.size}-leg Bowditch Traverse (${summary.relativePrecision})",
                                summary.points
                            )
                        }
                    )
                }
            }

            CalcMode.CONVERTER -> {
                StateUnitConverterSection(selectedState, presetSqm)
            }

            CalcMode.HISSA -> {
                HissaPartitionSection(presetSqm)
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StateUnitConverterSection(activeState: String, presetSqm: Double) {
    val stateConfig = IndianStateUnitsCatalog.getStateConfig(activeState)
    var selectedUnit by remember(activeState) { mutableStateOf(stateConfig.units.first()) }
    var inputText by remember(presetSqm, activeState) {
        mutableStateOf(String.format(Locale.US, "%.2f", presetSqm / stateConfig.units.first().sqm))
    }
    var menuExpanded by remember { mutableStateOf(false) }

    val inputVal = parseSurveyDouble(inputText) ?: 0.0
    val sqm = IndianStateUnitsCatalog.convertStateUnitToSqm(inputVal, selectedUnit.key, activeState)
    val rows = IndianStateUnitsCatalog.convertSqmToStateUnits(sqm, activeState)

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("${stateConfig.state} Cadastral Unit Converter", style = MaterialTheme.typography.titleMedium)
            ExposedDropdownMenuBox(expanded = menuExpanded, onExpandedChange = { menuExpanded = it }) {
                OutlinedTextField(
                    value = "${selectedUnit.name} (${selectedUnit.localName})",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Source Unit") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = menuExpanded) },
                    modifier = Modifier
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        .fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                    stateConfig.units.forEach { u ->
                        DropdownMenuItem(
                            text = { Text("${u.name} (${u.localName})") },
                            onClick = {
                                selectedUnit = u
                                menuExpanded = false
                            }
                        )
                    }
                }
            }
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                label = { Text("Area Value (${selectedUnit.name})") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth().testTag("converter_value_input")
            )
            Text(selectedUnit.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                String.format(Locale.US, "Equivalent Area (%.2f m²)", sqm),
                style = MaterialTheme.typography.titleMedium
            )
            rows.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${row.unit.name} (${row.unit.localName})",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f).padding(end = 12.dp)
                    )
                    Text(
                        row.formatted,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

@Composable
private fun HissaPartitionSection(presetSqm: Double) {
    var holdingUnit by remember { mutableStateOf(HissaHoldingUnit.CENTS) }
    var totalHoldingText by remember(presetSqm) {
        mutableStateOf(String.format(Locale.US, "%.2f", presetSqm / HissaHoldingUnit.CENTS.toSqmFactor))
    }
    val shares = remember {
        mutableStateListOf(
            Triple("Sharer 1", "1", "2"),
            Triple("Sharer 2", "1", "4"),
            Triple("Sharer 3", "1", "4")
        )
    }
    val totalSqm = (parseSurveyDouble(totalHoldingText) ?: 0.0).coerceAtLeast(0.0) * holdingUnit.toSqmFactor
    val parsedShares = shares.map { (name, n, d) ->
        Triple(name, parseSurveyDouble(n) ?: 0.0, parseSurveyDouble(d) ?: 0.0)
    }
    val items = TriangulationEngine.calculateHissaShares(totalSqm, parsedShares)
    val totalPercent = items.sumOf { it.fractionPercent }
    val hasZeroDenominator = parsedShares.any { it.third <= 0.0 }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Hissa Fractional Co-Owner Partition", style = MaterialTheme.typography.titleMedium)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                HissaHoldingUnit.entries.forEach { hu ->
                    FilterChip(
                        selected = holdingUnit == hu,
                        onClick = {
                            val currentSqm = (parseSurveyDouble(totalHoldingText) ?: 0.0) * holdingUnit.toSqmFactor
                            holdingUnit = hu
                            if (currentSqm > 0.0) {
                                totalHoldingText = String.format(Locale.US, "%.2f", currentSqm / hu.toSqmFactor)
                            }
                        },
                        label = { Text(hu.label, style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.testTag("hissa_unit_${hu.name.lowercase()}")
                    )
                }
            }
            OutlinedTextField(
                value = totalHoldingText,
                onValueChange = { totalHoldingText = it },
                label = { Text("Total Holding (${holdingUnit.label})") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth().testTag("hissa_total_input")
            )
            shares.forEachIndexed { idx, s ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = s.first,
                        onValueChange = { shares[idx] = s.copy(first = it) },
                        label = { Text("Holder") },
                        singleLine = true,
                        modifier = Modifier.weight(1.4f)
                    )
                    OutlinedTextField(
                        value = s.second,
                        onValueChange = { shares[idx] = s.copy(second = it) },
                        label = { Text("Num") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(0.7f).testTag("hissa_num_$idx")
                    )
                    OutlinedTextField(
                        value = s.third,
                        onValueChange = { shares[idx] = s.copy(third = it) },
                        label = { Text("Den") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(0.7f).testTag("hissa_den_$idx")
                    )
                    if (shares.size > 1) {
                        IconButton(onClick = { shares.removeAt(idx) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Remove co-owner")
                        }
                    }
                }
            }
            OutlinedButton(
                onClick = { shares.add(Triple("Sharer ${shares.size + 1}", "1", "4")) },
                modifier = Modifier.testTag("hissa_add_sharer_button")
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Add Co-Owner")
            }
        }
    }

    if (hasZeroDenominator) {
        ErrorBanner("Denominator (Den) must be greater than 0 for every co-owner share.")
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Partition Breakdown", style = MaterialTheme.typography.titleMedium)
                Text(
                    String.format(Locale.US, "Allocated: %.1f%%", totalPercent),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (abs(totalPercent - 100.0) <= 0.2) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Bold
                )
            }
            items.forEach { item ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        String.format(Locale.US, "%s (%.1f%%)", item.holderName, item.fractionPercent),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f).padding(end = 12.dp)
                    )
                    Text(
                        String.format(Locale.US, "%.2f Cents • %.1f Gaj • %.1f m²", item.cents, item.sqYards, item.areaSqm),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

private val US_DECIMAL_SYMBOLS = DecimalFormatSymbols(Locale.US)

private fun formatPerimeterLabel(meters: Double): String {
    if (!meters.isFinite() || meters < 0.0) return "0.00 m"
    return if (meters >= 10_000.0) {
        "${DecimalFormat("#,##0.00", US_DECIMAL_SYMBOLS).format(meters / 1000.0)} km"
    } else {
        "${DecimalFormat("#,##0.00", US_DECIMAL_SYMBOLS).format(meters)} m"
    }
}

private fun formatMetricCellValue(value: Double, normalDecimals: Int): String {
    if (!value.isFinite()) return "0"
    val absV = abs(value)
    return when {
        absV >= 1_000_000.0 -> DecimalFormat("#,##0", US_DECIMAL_SYMBOLS).format(value)
        absV >= 10_000.0 -> DecimalFormat("#,##0.0", US_DECIMAL_SYMBOLS).format(value)
        else -> {
            val decs = "0".repeat(normalDecimals.coerceIn(0, 4))
            val pattern = if (decs.isEmpty()) "#,##0" else "#,##0.$decs"
            DecimalFormat(pattern, US_DECIMAL_SYMBOLS).format(value)
        }
    }
}

@Composable
fun AreaSummaryCard(
    breakdown: AreaBreakdown,
    activeState: String,
    perimeterMeters: Double,
    classificationNote: String = "Calculated Field Measurement (Verify against official records for legal title)"
) {
    val stateSpecific = IndianStateUnitsCatalog.convertSqmToStateUnits(breakdown.sqm, activeState).take(4)
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Surveyed Area Breakdown",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )
                Text(
                    "Perim: ${formatPerimeterLabel(perimeterMeters)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    softWrap = false
                )
            }
            Text(
                text = classificationNote,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricBox("Acres", formatMetricCellValue(breakdown.acres, 4), Modifier.weight(1f))
                MetricBox("Cents", formatMetricCellValue(breakdown.cents, 2), Modifier.weight(1f))
                MetricBox("Guntas", formatMetricCellValue(breakdown.guntas, 2), Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricBox("Sq. Yards", formatMetricCellValue(breakdown.sqYards, 2), Modifier.weight(1f))
                MetricBox("Sq. Feet", formatMetricCellValue(breakdown.sqft, 1), Modifier.weight(1f))
                MetricBox("Sq. Meters", formatMetricCellValue(breakdown.sqm, 2), Modifier.weight(1f))
            }
            stateSpecific.forEach { u ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${u.unit.name} (${u.unit.localName})",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f).padding(end = 12.dp)
                    )
                    Text(
                        u.formatted,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricBox(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            Modifier.padding(horizontal = 6.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                value,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SaveBar(projectName: String, onNameChange: (String) -> Unit, onSave: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = projectName,
            onValueChange = onNameChange,
            label = { Text("Project Title") },
            singleLine = true,
            modifier = Modifier.weight(1f).testTag("save_project_name")
        )
        Button(
            onClick = onSave,
            modifier = Modifier.height(52.dp).testTag("save_project_button")
        ) {
            Icon(Icons.Default.Save, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Save")
        }
    }
}

@Composable
private fun NumField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier,
    tag: String
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier.testTag(tag)
    )
}

@Composable
private fun ErrorBanner(
    message: String,
    actionLabel: String? = null,
    actionTag: String = "error_banner_action",
    onAction: (() -> Unit)? = null
) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
            if (actionLabel != null && onAction != null) {
                OutlinedButton(
                    onClick = onAction,
                    modifier = Modifier.testTag(actionTag)
                ) {
                    Icon(Icons.Default.AutoFixHigh, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(actionLabel)
                }
            }
        }
    }
}
