package com.sthalmeasure.app.domain

import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

data class PlotPoint(
    val x: Double,
    val y: Double,
    val label: String = ""
)

data class HeronTriangleResult(
    val a: Double,
    val b: Double,
    val c: Double,
    val isValid: Boolean,
    val semiPerimeter: Double,
    val area: Double,
    val errorMessage: String? = null,
    val calculationDetails: String = ""
)

data class FourSidedResult(
    val isValid: Boolean,
    val totalArea: Double,
    val triangle1: HeronTriangleResult,
    val triangle2: HeronTriangleResult,
    val errorMessage: String? = null,
    val points: List<PlotPoint> = emptyList(),
    val effectiveDiagonalAC: Double = 0.0,
    val minValidDiagonal: Double = 0.0,
    val maxValidDiagonal: Double = 0.0,
    val suggestedDiagonal: Double = 0.0
)

data class FourSidedNoDiagResult(
    val isValid: Boolean,
    val cyclicArea: Double,
    val patwariArea: Double,
    val semiPerimeter: Double,
    val diagonalAC: Double,
    val diagonalBD: Double,
    val cornerAngleDegA: Double,
    val cornerAngleDegB: Double,
    val errorMessage: String? = null,
    val points: List<PlotPoint> = emptyList()
)

data class HissaShareItem(
    val holderName: String,
    val numerator: Double,
    val denominator: Double,
    val fractionPercent: Double,
    val areaSqm: Double,
    val cents: Double,
    val sqYards: Double,
    val acres: Double
)

fun parseSurveyDouble(raw: String): Double? {
    val cleaned = raw
        .replace(",", "")
        .replace(" ", "")
        .trim()
    if (cleaned.isEmpty()) return null
    return cleaned.toDoubleOrNull()?.takeIf { it.isFinite() }
}

object TriangulationEngine {
    private const val EPS = 1e-6

    fun validDiagonalRange(
        sideA: Double,
        sideB: Double,
        sideC: Double,
        sideD: Double
    ): Pair<Double, Double>? {
        if (!sideA.isFinite() || !sideB.isFinite() || !sideC.isFinite() || !sideD.isFinite() ||
            sideA <= 0.0 || sideB <= 0.0 || sideC <= 0.0 || sideD <= 0.0
        ) {
            return null
        }
        val s = (sideA + sideB + sideC + sideD) / 2.0
        if (sideA >= s - EPS || sideB >= s - EPS || sideC >= s - EPS || sideD >= s - EPS) {
            return null
        }
        val minDiag = max(abs(sideA - sideB), abs(sideC - sideD))
        val maxDiag = min(sideA + sideB, sideC + sideD)
        if (minDiag >= maxDiag - EPS) return null
        return Pair(minDiag, maxDiag)
    }

    fun suggestDiagonalAC(
        sideA: Double,
        sideB: Double,
        sideC: Double,
        sideD: Double
    ): Double {
        val range = validDiagonalRange(sideA, sideB, sideC, sideD) ?: return 0.0
        val prodACBD = sideA * sideC + sideB * sideD
        val prodABCD = sideA * sideB + sideC * sideD
        val prodADBC = sideA * sideD + sideB * sideC
        val ptolemy = if (prodADBC > 0.0) sqrt(max(0.0, (prodACBD * prodABCD) / prodADBC)) else 0.0
        val mid = (range.first + range.second) / 2.0
        val candidate = if (ptolemy.isFinite() && ptolemy > range.first + EPS && ptolemy < range.second - EPS) {
            ptolemy
        } else {
            mid
        }
        return candidate
    }

    fun calculateHeronTriangle(a: Double, b: Double, c: Double): HeronTriangleResult {
        if (!a.isFinite() || !b.isFinite() || !c.isFinite() || a <= 0.0 || b <= 0.0 || c <= 0.0) {
            return HeronTriangleResult(a, b, c, false, 0.0, 0.0, "All three sides must be positive numbers.")
        }
        if (a + b <= c + EPS || a + c <= b + EPS || b + c <= a + EPS) {
            return HeronTriangleResult(
                a, b, c, false, 0.0, 0.0,
                "Invalid triangle: sum of any two sides must exceed the third (${String.format(Locale.US, "%.2f", a)}, ${String.format(Locale.US, "%.2f", b)}, ${String.format(Locale.US, "%.2f", c)})."
            )
        }
        val s = (a + b + c) / 2.0
        val radicand = s * max(0.0, s - a) * max(0.0, s - b) * max(0.0, s - c)
        if (radicand <= 1e-9) {
            return HeronTriangleResult(a, b, c, false, s, 0.0, "Degenerate collinear triangle with zero area.")
        }
        val area = sqrt(radicand)
        val details = String.format(Locale.US, "s = %.2f, Area = %.2f", s, area)
        return HeronTriangleResult(a, b, c, true, s, area, null, details)
    }

    fun calculateTrianglePoints(a: Double, b: Double, c: Double): List<PlotPoint> {
        val t = calculateHeronTriangle(a, b, c)
        if (!t.isValid) return emptyList()
        val cosA = ((a * a + c * c - b * b) / (2.0 * a * c)).coerceIn(-1.0, 1.0)
        val theta = acos(cosA)
        return listOf(
            PlotPoint(0.0, 0.0, "A"),
            PlotPoint(a, 0.0, "B"),
            PlotPoint(c * cos(theta), c * sin(theta), "C")
        )
    }

    fun calculateFourSidedPlot(
        sideA: Double,
        sideB: Double,
        sideC: Double,
        sideD: Double,
        diagonalAC: Double
    ): FourSidedResult {
        if (!sideA.isFinite() || !sideB.isFinite() || !sideC.isFinite() || !sideD.isFinite() ||
            sideA <= 0.0 || sideB <= 0.0 || sideC <= 0.0 || sideD <= 0.0
        ) {
            val emptyTri = HeronTriangleResult(0.0, 0.0, 0.0, false, 0.0, 0.0, "All four boundary sides must be positive numbers.")
            return FourSidedResult(
                isValid = false,
                totalArea = 0.0,
                triangle1 = emptyTri,
                triangle2 = emptyTri,
                errorMessage = "All four boundary sides (A, B, C, D) must be positive numbers."
            )
        }

        val range = validDiagonalRange(sideA, sideB, sideC, sideD)
        val suggested = suggestDiagonalAC(sideA, sideB, sideC, sideD)
        if (range == null) {
            val s = (sideA + sideB + sideC + sideD) / 2.0
            val msg = String.format(
                Locale.US,
                "Impossible 4-sided closure: a single side equals or exceeds half the perimeter (%.2f).",
                s
            )
            val emptyTri = HeronTriangleResult(0.0, 0.0, 0.0, false, 0.0, 0.0, msg)
            return FourSidedResult(
                isValid = false,
                totalArea = 0.0,
                triangle1 = emptyTri,
                triangle2 = emptyTri,
                errorMessage = msg
            )
        }

        val effectiveDiag = if (!diagonalAC.isFinite() || diagonalAC <= 0.0) suggested else diagonalAC
        val t1 = calculateHeronTriangle(sideA, sideB, effectiveDiag)
        val t2 = calculateHeronTriangle(sideC, sideD, effectiveDiag)
        if (!t1.isValid || !t2.isValid) {
            val msg = String.format(
                Locale.US,
                "Diagonal AC (%.2f) must be between %.2f and %.2f for sides (%.1f, %.1f, %.1f, %.1f). Recommended AC: %.2f.",
                effectiveDiag,
                range.first,
                range.second,
                sideA,
                sideB,
                sideC,
                sideD,
                suggested
            )
            return FourSidedResult(
                isValid = false,
                totalArea = 0.0,
                triangle1 = t1,
                triangle2 = t2,
                errorMessage = msg,
                effectiveDiagonalAC = effectiveDiag,
                minValidDiagonal = range.first,
                maxValidDiagonal = range.second,
                suggestedDiagonal = suggested
            )
        }
        val denom1 = 2.0 * sideA * effectiveDiag
        val cos1 = if (denom1 > 0.0) ((sideA * sideA + effectiveDiag * effectiveDiag - sideB * sideB) / denom1).coerceIn(-1.0, 1.0) else 0.0
        val theta1 = acos(cos1)

        val denom2 = 2.0 * effectiveDiag * sideD
        val cos2 = if (denom2 > 0.0) ((effectiveDiag * effectiveDiag + sideD * sideD - sideC * sideC) / denom2).coerceIn(-1.0, 1.0) else 0.0
        val theta2 = acos(cos2)
        val totalAngleV4 = theta1 + theta2

        val points = listOf(
            PlotPoint(0.0, 0.0, "A"),
            PlotPoint(sideA, 0.0, "B"),
            PlotPoint(effectiveDiag * cos(theta1), effectiveDiag * sin(theta1), "C"),
            PlotPoint(sideD * cos(totalAngleV4), sideD * sin(totalAngleV4), "D")
        )
        return FourSidedResult(
            isValid = true,
            totalArea = t1.area + t2.area,
            triangle1 = t1,
            triangle2 = t2,
            points = points,
            effectiveDiagonalAC = effectiveDiag,
            minValidDiagonal = range.first,
            maxValidDiagonal = range.second,
            suggestedDiagonal = suggested
        )
    }

    fun calculateFourSidedNoDiagonal(
        sideA: Double,
        sideB: Double,
        sideC: Double,
        sideD: Double
    ): FourSidedNoDiagResult {
        if (!sideA.isFinite() || !sideB.isFinite() || !sideC.isFinite() || !sideD.isFinite() ||
            sideA <= 0.0 || sideB <= 0.0 || sideC <= 0.0 || sideD <= 0.0
        ) {
            return FourSidedNoDiagResult(
                isValid = false, cyclicArea = 0.0, patwariArea = 0.0, semiPerimeter = 0.0,
                diagonalAC = 0.0, diagonalBD = 0.0, cornerAngleDegA = 0.0, cornerAngleDegB = 0.0,
                errorMessage = "All 4 boundary sides must be positive numbers."
            )
        }
        val s = (sideA + sideB + sideC + sideD) / 2.0
        if (sideA >= s || sideB >= s || sideC >= s || sideD >= s) {
            return FourSidedNoDiagResult(
                isValid = false, cyclicArea = 0.0, patwariArea = 0.0, semiPerimeter = s,
                diagonalAC = 0.0, diagonalBD = 0.0, cornerAngleDegA = 0.0, cornerAngleDegB = 0.0,
                errorMessage = String.format(
                    Locale.US,
                    "Impossible polygon closure: a single side equals or exceeds half the perimeter (%.2f).",
                    s
                )
            )
        }

        val radicand = max(0.0, s - sideA) * max(0.0, s - sideB) * max(0.0, s - sideC) * max(0.0, s - sideD)
        val cyclicArea = sqrt(radicand)
        val patwariArea = ((sideA + sideC) / 2.0) * ((sideB + sideD) / 2.0)

        val denomA = 2.0 * (sideA * sideD + sideB * sideC)
        val numA = sideA * sideA + sideD * sideD - (sideB * sideB + sideC * sideC)
        val cosA = if (denomA > 0.0) (numA / denomA).coerceIn(-0.999999, 0.999999) else 0.0
        val angleARad = acos(cosA)

        val denomB = 2.0 * (sideA * sideB + sideC * sideD)
        val numB = sideA * sideA + sideB * sideB - (sideC * sideC + sideD * sideD)
        val cosB = if (denomB > 0.0) (numB / denomB).coerceIn(-0.999999, 0.999999) else 0.0
        val angleBRad = acos(cosB)

        val prodACBD = sideA * sideC + sideB * sideD
        val prodABCD = sideA * sideB + sideC * sideD
        val prodADBC = sideA * sideD + sideB * sideC
        val diagAC = if (prodADBC > 0.0) sqrt(max(0.0, (prodACBD * prodABCD) / prodADBC)) else 0.0
        val diagBD = if (prodABCD > 0.0) sqrt(max(0.0, (prodACBD * prodADBC) / prodABCD)) else 0.0

        val points = listOf(
            PlotPoint(0.0, 0.0, "A"),
            PlotPoint(sideA, 0.0, "B"),
            PlotPoint(sideA - sideB * cos(angleBRad), sideB * sin(angleBRad), "C"),
            PlotPoint(sideD * cos(angleARad), sideD * sin(angleARad), "D")
        )
        return FourSidedNoDiagResult(
            isValid = true,
            cyclicArea = cyclicArea,
            patwariArea = patwariArea,
            semiPerimeter = s,
            diagonalAC = diagAC,
            diagonalBD = diagBD,
            cornerAngleDegA = angleARad * 180.0 / PI,
            cornerAngleDegB = angleBRad * 180.0 / PI,
            points = points
        )
    }

    fun calculateHissaShares(
        totalSqm: Double,
        shares: List<Triple<String, Double, Double>>
    ): List<HissaShareItem> {
        val safeTotal = if (totalSqm.isFinite()) totalSqm.coerceAtLeast(0.0) else 0.0
        return shares.map { (name, num, den) ->
            val safeNum = if (num.isFinite() && num >= 0.0) num else 0.0
            val safeDen = if (den.isFinite() && den > 0.0) den else 0.0
            val ratio = if (safeDen > 0.0) (safeNum / safeDen).coerceIn(0.0, 1.0) else 0.0
            val shareSqm = safeTotal * ratio
            val breakdown = convertAreaFromSqm(shareSqm)
            HissaShareItem(
                holderName = name.ifBlank { "Co-Owner" },
                numerator = safeNum,
                denominator = safeDen,
                fractionPercent = ratio * 100.0,
                areaSqm = shareSqm,
                cents = breakdown.cents,
                sqYards = breakdown.sqYards,
                acres = breakdown.acres
            )
        }
    }
}
