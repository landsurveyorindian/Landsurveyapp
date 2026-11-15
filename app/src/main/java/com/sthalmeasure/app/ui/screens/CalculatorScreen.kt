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
import com.sthalmeasure.app.ui.components.PlotCanvas

enum class CalcMode(val label: String) {
    FOUR_SIDED("4-Sided + Diag"),
    FIVE_SIDED("5-Sided + 2 Diag"),
    NO_DIAG("4-Sided (No Diag)"),
    TRIANGLE("Triangle (Heron)"),
    TRAVERSE("Bowditch Traverse"),
    CONVERTER("State Converter"),
    HISSA("Hissa Partition")
}

@Composable
fun CalculatorScreen(
    activeState: String,
    presetSqm: Double,
    onSaveProject: (name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String) -> Unit,
    onSaveProjectWithSummary: ((name: String, parcelType: String, areaSqm: Double, perimeterMeters: Double, notes: String, summaryJson: String) -> Unit)? = null
) {
    var mode by remember { mutableStateOf(CalcMode.FOUR_SIDED) }
    var linearUnit by remember { mutableStateOf(LinearUnit.FEET) }

    // 4-sided inputs
    var sideA by remember { mutableStateOf("60") }
    var sideB by remember { mutableStateOf("40") }
    var sideC by remember { mutableStateOf("60") }
    var sideD by remember { mutableStateOf("40") }
    var diagAC by remember { mutableStateOf("72.11") }

    // 5-sided inputs
    var p5SideA by remember { mutableStateOf("40") }
    var p5SideB by remember { mutableStateOf("35") }
    var p5SideC by remember { mutableStateOf("30") }
    var p5SideD by remember { mutableStateOf("32") }
    var p5SideE by remember { mutableStateOf("38") }
    var p5Diag1 by remember { mutableStateOf("53") }
    var p5Diag2 by remember { mutableStateOf("54") }

    // 3-sided inputs
    var triA by remember { mutableStateOf("30") }
    var triB by remember { mutableStateOf("40") }
    var triC by remember { mutableStateOf("50") }

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
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
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

        if (mode in listOf(CalcMode.FOUR_SIDED, CalcMode.FIVE_SIDED, CalcMode.NO_DIAG, CalcMode.TRIANGLE)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
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
                val a = sideA.toDoubleOrNull() ?: 0.0
                val b = sideB.toDoubleOrNull() ?: 0.0
                val c = sideC.toDoubleOrNull() ?: 0.0
                val d = sideD.toDoubleOrNull() ?: 0.0
                val ac = diagAC.toDoubleOrNull() ?: 0.0
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
                        NumField("Measured Diagonal (AC)", diagAC, { diagAC = it }, Modifier.fillMaxWidth(), "diag_ac_input")
                    }
                }

                PlotCanvas(
                    points = res.points,
                    showDiagonalAC = true,
                    unitLabel = linearUnit.shortLabel
                )

                if (!res.isValid) {
                    ErrorBanner(res.errorMessage ?: "Invalid polygon dimensions.")
                } else {
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(areaSqm),
                        activeState = activeState,
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
                                "Sides ($sideA,$sideB,$sideC,$sideD) Diag $diagAC ${linearUnit.shortLabel}",
                                res.points
                            )
                        }
                    )
                }
            }

            CalcMode.FIVE_SIDED -> {
                val a = p5SideA.toDoubleOrNull() ?: 0.0
                val b = p5SideB.toDoubleOrNull() ?: 0.0
                val c = p5SideC.toDoubleOrNull() ?: 0.0
                val d = p5SideD.toDoubleOrNull() ?: 0.0
                val e = p5SideE.toDoubleOrNull() ?: 0.0
                val d1 = p5Diag1.toDoubleOrNull() ?: 0.0
                val d2 = p5Diag2.toDoubleOrNull() ?: 0.0
                val res = TriangulationEngine.calculateFiveSidedPlot(a, b, c, d, e, d1, d2)
                val areaSqm = res.totalArea * linearUnit.toMetersFactor * linearUnit.toMetersFactor
                val perimM = (a + b + c + d + e) * linearUnit.toMetersFactor

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("5-Sided Pentagon Triangulation (${linearUnit.shortLabel})", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side 1-2 (A)", p5SideA, { p5SideA = it }, Modifier.weight(1f), "five_side_a")
                            NumField("Side 2-3 (B)", p5SideB, { p5SideB = it }, Modifier.weight(1f), "five_side_b")
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side 3-4 (C)", p5SideC, { p5SideC = it }, Modifier.weight(1f), "five_side_c")
                            NumField("Side 4-5 (D)", p5SideD, { p5SideD = it }, Modifier.weight(1f), "five_side_d")
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NumField("Side 5-1 (E)", p5SideE, { p5SideE = it }, Modifier.weight(1f), "five_side_e")
                            NumField("Brace D1 (1-3)", p5Diag1, { p5Diag1 = it }, Modifier.weight(1f), "five_diag_1")
                        }
                        NumField("Brace D2 (1-4)", p5Diag2, { p5Diag2 = it }, Modifier.fillMaxWidth(), "five_diag_2")
                    }
                }

                PlotCanvas(points = res.points, unitLabel = linearUnit.shortLabel)

                if (!res.isValid) {
                    ErrorBanner(res.errorMessage ?: "Invalid 5-sided polygon dimensions.")
                } else {
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(areaSqm),
                        activeState = activeState,
                        perimeterMeters = perimM,
                        classificationNote = "Heron 3-Triangle Pentagon Calculation (T1=${"%.1f".format(res.triangle1.area)}, T2=${"%.1f".format(res.triangle2.area)}, T3=${"%.1f".format(res.triangle3.area)})"
                    )
                    SaveBar(
                        projectName = projectName,
                        onNameChange = { projectName = it },
                        onSave = {
                            saveComputed(
                                projectName,
                                "five_sided",
                                areaSqm,
                                perimM,
                                "5-Sided ($p5SideA,$p5SideB,$p5SideC,$p5SideD,$p5SideE) Diags ($p5Diag1,$p5Diag2) ${linearUnit.shortLabel}",
                                res.points
                            )
                        }
                    )
                }
            }

            CalcMode.NO_DIAG -> {
                val a = sideA.toDoubleOrNull() ?: 0.0
                val b = sideB.toDoubleOrNull() ?: 0.0
                val c = sideC.toDoubleOrNull() ?: 0.0
                val d = sideD.toDoubleOrNull() ?: 0.0
                val res = TriangulationEngine.calculateFourSidedNoDiagonal(a, b, c, d)
                val factorSq = linearUnit.toMetersFactor * linearUnit.toMetersFactor
                val cyclicSqm = res.cyclicArea * factorSq
                val patwariSqm = res.patwariArea * factorSq

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
                                "Cyclic Maximum Bound: ${"%.2f".format(res.cyclicArea)} ${linearUnit.shortLabel}² (${"%.2f".format(convertAreaFromSqm(cyclicSqm).cents)} Cents)",
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                "Patwari Avg Approx: ${"%.2f".format(res.patwariArea)} ${linearUnit.shortLabel}² (${"%.2f".format(convertAreaFromSqm(patwariSqm).cents)} Cents)",
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                "Assumption Warning: Without a measured diagonal AC or BD, shape is mathematically non-unique. Measure 1 diagonal before legal demarcation.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }

            CalcMode.TRIANGLE -> {
                val a = triA.toDoubleOrNull() ?: 0.0
                val b = triB.toDoubleOrNull() ?: 0.0
                val c = triC.toDoubleOrNull() ?: 0.0
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
                    }
                }
                PlotCanvas(points = pts, unitLabel = linearUnit.shortLabel)
                if (!res.isValid) {
                    ErrorBanner(res.errorMessage ?: "Invalid triangle")
                } else {
                    AreaSummaryCard(
                        breakdown = convertAreaFromSqm(areaSqm),
                        activeState = activeState,
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
                val stations = remember {
                    mutableStateListOf(
                        TraverseStation("1", "A-B", 0.0, 30.0),
                        TraverseStation("2", "B-C", 90.0, 40.0),
                        TraverseStation("3", "C-D", 180.0, 30.0),
                        TraverseStation("4", "D-A", 270.0, 40.05)
                    )
                }
                val summary = TraverseEngine.computeClosedTraverse(stations)

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Closed Traverse Stations", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f).padding(end = 8.dp))
                            OutlinedButton(
                                onClick = {
                                    val nextIdx = stations.size + 1
                                    stations.add(TraverseStation("$nextIdx", "Stn $nextIdx", 45.0, 20.0))
                                },
                                modifier = Modifier.testTag("add_station_button")
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(Modifier.width(4.dp))
                                Text("Add Leg")
                            }
                        }

                        stations.forEachIndexed { idx, stn ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(stn.lineId, style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(56.dp))
                                OutlinedTextField(
                                    value = stn.bearingDeg.toString(),
                                    onValueChange = { v ->
                                        stations[idx] = stn.copy(bearingDeg = v.toDoubleOrNull() ?: stn.bearingDeg)
                                    },
                                    label = { Text("WCB°") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = stn.distanceMeters.toString(),
                                    onValueChange = { v ->
                                        stations[idx] = stn.copy(distanceMeters = v.toDoubleOrNull() ?: stn.distanceMeters)
                                    },
                                    label = { Text("Dist (m)") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f)
                                )
                                if (stations.size > 3) {
                                    IconButton(onClick = { stations.removeAt(idx) }) {
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
                            Text("Closing Error: ${"%.4f".format(summary.linearClosingError)} m | Precision: ${summary.relativePrecision}", style = MaterialTheme.typography.labelMedium)
                            Text("ΔLat Sum: ${"%.4f".format(summary.sumLatitude)} m | ΔDep Sum: ${"%.4f".format(summary.sumDeparture)} m", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    AreaSummaryCard(
                        breakdown = summary.areaBreakdown,
                        activeState = activeState,
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
                StateUnitConverterSection(activeState, presetSqm)
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
        mutableStateOf("%.2f".format(presetSqm / stateConfig.units.first().sqm))
    }
    var menuExpanded by remember { mutableStateOf(false) }

    val inputVal = inputText.toDoubleOrNull() ?: 0.0
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
            Text("Equivalent Area (${"%.2f".format(sqm)} m²)", style = MaterialTheme.typography.titleMedium)
            rows.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("${row.unit.name} (${row.unit.localName})", style = MaterialTheme.typography.bodyMedium)
                    Text(row.formatted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun HissaPartitionSection(presetSqm: Double) {
    var totalCentsText by remember(presetSqm) { mutableStateOf("%.2f".format(presetSqm / 40.468564224)) }
    val shares = remember {
        mutableStateListOf(
            Triple("Sharer 1", "1", "2"),
            Triple("Sharer 2", "1", "4"),
            Triple("Sharer 3", "1", "4")
        )
    }
    val totalSqm = (totalCentsText.toDoubleOrNull() ?: 0.0) * 40.468564224
    val parsedShares = shares.map { (name, n, d) ->
        Triple(name, n.toDoubleOrNull() ?: 0.0, d.toDoubleOrNull() ?: 1.0)
    }
    val items = TriangulationEngine.calculateHissaShares(totalSqm, parsedShares)

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Hissa Fractional Co-Owner Partition", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = totalCentsText,
                onValueChange = { totalCentsText = it },
                label = { Text("Total Holding (Cents)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
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
                        modifier = Modifier.weight(0.7f)
                    )
                    OutlinedTextField(
                        value = s.third,
                        onValueChange = { shares[idx] = s.copy(third = it) },
                        label = { Text("Den") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(0.7f)
                    )
                }
            }
            OutlinedButton(onClick = { shares.add(Triple("Sharer ${shares.size + 1}", "1", "4")) }) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Add Co-Owner")
            }
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Partition Breakdown", style = MaterialTheme.typography.titleMedium)
            items.forEach { item ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${item.holderName} (${"%.1f".format(item.fractionPercent)}%)", style = MaterialTheme.typography.bodyMedium)
                    Text("${"%.2f".format(item.cents)} Cents • ${"%.1f".format(item.sqYards)} Gaj", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
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
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Surveyed Area Breakdown", style = MaterialTheme.typography.titleMedium)
                Text("Perim: ${"%.2f".format(perimeterMeters)} m", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            }
            Text(
                text = classificationNote,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricBox("Acres", "${"%.4f".format(breakdown.acres)}", Modifier.weight(1f))
                MetricBox("Cents", "${"%.2f".format(breakdown.cents)}", Modifier.weight(1f))
                MetricBox("Guntas", "${"%.2f".format(breakdown.guntas)}", Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricBox("Sq. Yards", "${"%.2f".format(breakdown.sqYards)}", Modifier.weight(1f))
                MetricBox("Sq. Feet", "${"%.1f".format(breakdown.sqft)}", Modifier.weight(1f))
                MetricBox("Sq. Meters", "${"%.2f".format(breakdown.sqm)}", Modifier.weight(1f))
            }
            stateSpecific.forEach { u ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${u.unit.name} (${u.unit.localName})", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(u.formatted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
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
        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
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
private fun ErrorBanner(message: String) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = message,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(12.dp)
        )
    }
}
