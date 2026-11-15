package com.sthalmeasure.app.domain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

data class TraverseStation(
    val id: String,
    val lineId: String,
    val bearingDeg: Double,
    val distanceMeters: Double
)

data class ComputedTraverseLine(
    val id: String,
    val lineId: String,
    val bearingDeg: Double,
    val distanceMeters: Double,
    val latitude: Double,
    val departure: Double,
    val corrLat: Double,
    val corrDep: Double,
    val adjLat: Double,
    val adjDep: Double,
    val northing: Double,
    val easting: Double
)

enum class TraverseQualityGrade(val label: String) {
    FIRST_ORDER("First-Order"),
    SECOND_ORDER("Second-Order"),
    THIRD_ORDER("Third-Order"),
    SUB_STANDARD("Sub-Standard"),
    INVALID("Invalid")
}

data class TraverseSummary(
    val isValid: Boolean,
    val validationErrors: List<String>,
    val totalPerimeter: Double,
    val sumLatitude: Double,
    val sumDeparture: Double,
    val linearClosingError: Double,
    val relativePrecision: String,
    val precisionRatio: Double,
    val qualityGrade: TraverseQualityGrade,
    val lines: List<ComputedTraverseLine>,
    val isClosedGood: Boolean,
    val areaSqm: Double,
    val areaBreakdown: AreaBreakdown,
    val points: List<PlotPoint>,
    val unadjustedPoints: List<PlotPoint>
)

object TraverseEngine {
    fun normalizeBearing(bearingDeg: Double): Double {
        if (!bearingDeg.isFinite()) return 0.0
        var n = bearingDeg % 360.0
        if (n < 0.0) n += 360.0
        return if (abs(n) < 1e-9) 0.0 else n
    }

    fun computeClosedTraverse(
        rawStations: List<TraverseStation>,
        baseNorthing: Double = 1000.0,
        baseEasting: Double = 1000.0
    ): TraverseSummary {
        val errors = mutableListOf<String>()
        if (rawStations.size < 3) {
            errors.add("A closed traverse requires at least 3 stations.")
        }
        rawStations.forEachIndexed { idx, s ->
            if (!s.distanceMeters.isFinite() || s.distanceMeters <= 0.0) {
                errors.add("Station ${idx + 1} (${s.lineId}): distance must be > 0.")
            }
            if (!s.bearingDeg.isFinite()) {
                errors.add("Station ${idx + 1} (${s.lineId}): bearing must be valid.")
            }
        }
        val emptyArea = convertAreaFromSqm(0.0)
        if (errors.isNotEmpty()) {
            return TraverseSummary(
                isValid = false,
                validationErrors = errors,
                totalPerimeter = 0.0,
                sumLatitude = 0.0,
                sumDeparture = 0.0,
                linearClosingError = 0.0,
                relativePrecision = "Invalid",
                precisionRatio = 0.0,
                qualityGrade = TraverseQualityGrade.INVALID,
                lines = emptyList(),
                isClosedGood = false,
                areaSqm = 0.0,
                areaBreakdown = emptyArea,
                points = emptyList(),
                unadjustedPoints = emptyList()
            )
        }

        val clean = rawStations.map {
            it.copy(bearingDeg = normalizeBearing(it.bearingDeg))
        }

        var totalPerimeter = 0.0
        var sumLat = 0.0
        var sumDep = 0.0
        var unadjN = baseNorthing
        var unadjE = baseEasting

        val unadjustedPoints = mutableListOf<PlotPoint>()
        unadjustedPoints.add(PlotPoint(baseEasting, baseNorthing, "A"))

        val rawComputed = clean.mapIndexed { idx, stn ->
            val rad = stn.bearingDeg * PI / 180.0
            val lat = stn.distanceMeters * cos(rad)
            val dep = stn.distanceMeters * sin(rad)
            totalPerimeter += stn.distanceMeters
            sumLat += lat
            sumDep += dep
            unadjN += lat
            unadjE += dep
            if (idx < clean.size - 1) {
                val label = ('A' + idx + 1).toString()
                unadjustedPoints.add(PlotPoint(unadjE, unadjN, label))
            }
            Triple(stn, lat, dep)
        }

        val closingError = hypot(sumLat, sumDep)
        val ratio = if (closingError > 1e-6) totalPerimeter / closingError else 999999.0
        val precisionStr = if (closingError <= 1e-6) "Exact (Closed)" else "1 in ${"%,.0f".format(ratio)}"

        val grade = when {
            closingError <= 1e-6 || ratio >= 5000.0 -> TraverseQualityGrade.FIRST_ORDER
            ratio >= 2000.0 -> TraverseQualityGrade.SECOND_ORDER
            ratio >= 1000.0 -> TraverseQualityGrade.THIRD_ORDER
            else -> TraverseQualityGrade.SUB_STANDARD
        }

        var adjN = baseNorthing
        var adjE = baseEasting
        val adjustedPoints = mutableListOf<PlotPoint>()
        adjustedPoints.add(PlotPoint(adjE, adjN, "A"))

        val lines = rawComputed.mapIndexed { idx, (stn, lat, dep) ->
            val weight = stn.distanceMeters / totalPerimeter
            val corrLat = -sumLat * weight
            val corrDep = -sumDep * weight
            val adjLat = lat + corrLat
            val adjDep = dep + corrDep
            adjN += adjLat
            adjE += adjDep
            if (idx < clean.size - 1) {
                adjustedPoints.add(PlotPoint(adjE, adjN, ('A' + idx + 1).toString()))
            }
            ComputedTraverseLine(
                id = stn.id,
                lineId = stn.lineId,
                bearingDeg = stn.bearingDeg,
                distanceMeters = stn.distanceMeters,
                latitude = lat,
                departure = dep,
                corrLat = corrLat,
                corrDep = corrDep,
                adjLat = adjLat,
                adjDep = adjDep,
                northing = adjN,
                easting = adjE
            )
        }

        // Shoelace area on adjusted points
        var doubleArea = 0.0
        for (i in adjustedPoints.indices) {
            val j = (i + 1) % adjustedPoints.size
            doubleArea += adjustedPoints[i].x * adjustedPoints[j].y - adjustedPoints[j].x * adjustedPoints[i].y
        }
        val areaSqm = abs(doubleArea) / 2.0

        return TraverseSummary(
            isValid = true,
            validationErrors = emptyList(),
            totalPerimeter = totalPerimeter,
            sumLatitude = sumLat,
            sumDeparture = sumDep,
            linearClosingError = closingError,
            relativePrecision = precisionStr,
            precisionRatio = ratio,
            qualityGrade = grade,
            lines = lines,
            isClosedGood = ratio >= 1000.0 || closingError <= 1e-6,
            areaSqm = areaSqm,
            areaBreakdown = convertAreaFromSqm(areaSqm),
            points = adjustedPoints,
            unadjustedPoints = unadjustedPoints
        )
    }
}
