package com.sthalmeasure.app.domain

import kotlin.math.PI
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
    val points: List<PlotPoint> = emptyList()
)

data class FiveSidedResult(
    val isValid: Boolean,
    val totalArea: Double,
    val triangle1: HeronTriangleResult,
    val triangle2: HeronTriangleResult,
    val triangle3: HeronTriangleResult,
    val errorMessage: String? = null,
    val points: List<PlotPoint> = emptyList()
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

object TriangulationEngine {
    private const val EPS = 1e-6

    fun calculateHeronTriangle(a: Double, b: Double, c: Double): HeronTriangleResult {
        if (!a.isFinite() || !b.isFinite() || !c.isFinite() || a <= 0.0 || b <= 0.0 || c <= 0.0) {
            return HeronTriangleResult(a, b, c, false, 0.0, 0.0, "All three sides must be positive numbers.")
        }
        if (a + b <= c + EPS || a + c <= b + EPS || b + c <= a + EPS) {
            return HeronTriangleResult(
                a, b, c, false, 0.0, 0.0,
                "Invalid triangle: sum of any two sides must exceed the third ($a, $b, $c)."
            )
        }
        val s = (a + b + c) / 2.0
        val radicand = s * max(0.0, s - a) * max(0.0, s - b) * max(0.0, s - c)
        if (radicand <= 1e-9) {
            return HeronTriangleResult(a, b, c, false, s, 0.0, "Degenerate collinear triangle with zero area.")
        }
        val area = sqrt(radicand)
        val details = "s = ${"%.2f".format(s)}, Area = ${"%.2f".format(area)}"
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
        val t1 = calculateHeronTriangle(sideA, sideB, diagonalAC)
        val t2 = calculateHeronTriangle(sideC, sideD, diagonalAC)
        if (!t1.isValid || !t2.isValid) {
            return FourSidedResult(
                isValid = false,
                totalArea = 0.0,
                triangle1 = t1,
                triangle2 = t2,
                errorMessage = t1.errorMessage ?: t2.errorMessage ?: "Invalid 4-sided dimensions."
            )
        }
        val denom1 = 2.0 * sideA * diagonalAC
        val cos1 = if (denom1 > 0.0) ((sideA * sideA + diagonalAC * diagonalAC - sideB * sideB) / denom1).coerceIn(-1.0, 1.0) else 0.0
        val theta1 = acos(cos1)

        val denom2 = 2.0 * diagonalAC * sideD
        val cos2 = if (denom2 > 0.0) ((diagonalAC * diagonalAC + sideD * sideD - sideC * sideC) / denom2).coerceIn(-1.0, 1.0) else 0.0
        val theta2 = acos(cos2)
        val totalAngleV4 = theta1 + theta2

        val points = listOf(
            PlotPoint(0.0, 0.0, "A"),
            PlotPoint(sideA, 0.0, "B"),
            PlotPoint(diagonalAC * cos(theta1), max(0.1, diagonalAC * sin(theta1)), "C"),
            PlotPoint(sideD * cos(totalAngleV4), max(0.1, sideD * sin(totalAngleV4)), "D")
        )
        return FourSidedResult(
            isValid = true,
            totalArea = t1.area + t2.area,
            triangle1 = t1,
            triangle2 = t2,
            points = points
        )
    }

    fun calculateFiveSidedPlot(
        sideA: Double,
        sideB: Double,
        sideC: Double,
        sideD: Double,
        sideE: Double,
        diag1: Double,
        diag2: Double
    ): FiveSidedResult {
        val t1 = calculateHeronTriangle(sideA, sideB, diag1)
        val t2 = calculateHeronTriangle(diag1, sideC, diag2)
        val t3 = calculateHeronTriangle(diag2, sideD, sideE)
        if (!t1.isValid || !t2.isValid || !t3.isValid) {
            return FiveSidedResult(
                isValid = false,
                totalArea = 0.0,
                triangle1 = t1,
                triangle2 = t2,
                triangle3 = t3,
                errorMessage = t1.errorMessage ?: t2.errorMessage ?: t3.errorMessage ?: "Invalid 5-sided dimensions."
            )
        }
        val cos1 = ((sideA * sideA + diag1 * diag1 - sideB * sideB) / (2.0 * sideA * diag1)).coerceIn(-1.0, 1.0)
        val ang1 = acos(cos1)
        val cos2 = ((diag1 * diag1 + diag2 * diag2 - sideC * sideC) / (2.0 * diag1 * diag2)).coerceIn(-1.0, 1.0)
        val ang2 = ang1 + acos(cos2)
        val cos3 = ((diag2 * diag2 + sideE * sideE - sideD * sideD) / (2.0 * diag2 * sideE)).coerceIn(-1.0, 1.0)
        val ang3 = ang2 + acos(cos3)

        val points = listOf(
            PlotPoint(0.0, 0.0, "1"),
            PlotPoint(sideA, 0.0, "2"),
            PlotPoint(diag1 * cos(ang1), max(0.1, diag1 * sin(ang1)), "3"),
            PlotPoint(diag2 * cos(ang2), max(0.1, diag2 * sin(ang2)), "4"),
            PlotPoint(sideE * cos(ang3), max(0.1, sideE * sin(ang3)), "5")
        )
        return FiveSidedResult(
            isValid = true,
            totalArea = t1.area + t2.area + t3.area,
            triangle1 = t1,
            triangle2 = t2,
            triangle3 = t3,
            points = points
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
                errorMessage = "Impossible polygon closure: a single side equals or exceeds half the perimeter (${"%.2f".format(s)})."
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
            PlotPoint(sideA - sideB * cos(angleBRad), max(0.1, sideB * sin(angleBRad)), "C"),
            PlotPoint(sideD * cos(angleARad), max(0.1, sideD * sin(angleARad)), "D")
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
        val safeTotal = totalSqm.coerceAtLeast(0.0)
        return shares.map { (name, num, den) ->
            val ratio = if (den > 0.0 && num >= 0.0) (num / den).coerceIn(0.0, 1.0) else 0.0
            val shareSqm = safeTotal * ratio
            val breakdown = convertAreaFromSqm(shareSqm)
            HissaShareItem(
                holderName = name.ifBlank { "Co-Owner" },
                numerator = num,
                denominator = den,
                fractionPercent = ratio * 100.0,
                areaSqm = shareSqm,
                cents = breakdown.cents,
                sqYards = breakdown.sqYards,
                acres = breakdown.acres
            )
        }
    }
}
