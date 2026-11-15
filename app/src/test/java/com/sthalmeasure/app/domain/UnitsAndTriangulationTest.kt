package com.sthalmeasure.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class UnitsAndTriangulationTest {

    @Test
    fun convertAreaFromSqm_matchesIndianStandardFactors() {
        // 1 Acre = 4046.8564224 sqm = 100 Cents = 40 Guntas = 4840 Sq Yds = 43560 Sq Ft
        val acre = convertAreaFromSqm(4046.8564224)
        assertEquals(1.0, acre.acres, 1e-4)
        assertEquals(100.0, acre.cents, 1e-3)
        assertEquals(40.0, acre.guntas, 1e-3)
        assertEquals(4840.0, acre.sqYards, 0.1)
        assertEquals(43560.0, acre.sqft, 0.5)
    }

    @Test
    fun allStatesCatalog_coversAllStatesAndConvertsBidirectionally() {
        assertTrue(IndianStateUnitsCatalog.allStates.size >= 36)
        val ap = IndianStateUnitsCatalog.getStateConfig("Andhra Pradesh")
        assertEquals("AP", ap.code)
        val sqmFromCent = IndianStateUnitsCatalog.convertStateUnitToSqm(5.0, "cent", "Andhra Pradesh")
        assertEquals(5.0 * 40.468564224, sqmFromCent, 0.05)

        val up = IndianStateUnitsCatalog.getStateConfig("Uttar Pradesh")
        assertEquals("UP", up.code)
        val sqmFromBigha = IndianStateUnitsCatalog.convertStateUnitToSqm(1.0, "bigha_pucca_up", "Uttar Pradesh")
        assertEquals(2529.285, sqmFromBigha, 0.5)
    }

    @Test
    fun linearUnits_gunterAndMetricChainConversionsExact() {
        assertEquals(20.1168, LinearUnit.GUNTER_CHAINS.toMeters(1.0), 1e-6)
        assertEquals(20.0, LinearUnit.METRIC_LINKS.toMeters(100.0), 1e-6)
        // 1 sq Gunter chain = 404.6856 sqm = 10 Cents
        val oneSqChain = 1.0 * LinearUnit.GUNTER_CHAINS.toMetersFactor * LinearUnit.GUNTER_CHAINS.toMetersFactor
        val converted = convertAreaFromSqm(oneSqChain)
        assertEquals(10.0, converted.cents, 0.01)
    }

    @Test
    fun calculateHeronTriangle_validatesInequalityAndArea() {
        val rightTri = TriangulationEngine.calculateHeronTriangle(3.0, 4.0, 5.0)
        assertTrue(rightTri.isValid)
        assertEquals(6.0, rightTri.area, 1e-6)

        val invalid = TriangulationEngine.calculateHeronTriangle(1.0, 2.0, 10.0)
        assertFalse(invalid.isValid)
        assertEquals(0.0, invalid.area, 1e-6)
    }

    @Test
    fun calculateFourSidedPlot_rectangleWithDiagonalMatchesExactArea() {
        // 30 x 40 rectangle, diagonal = 50 -> exact area = 1200
        val res = TriangulationEngine.calculateFourSidedPlot(30.0, 40.0, 30.0, 40.0, 50.0)
        assertTrue(res.isValid)
        assertEquals(1200.0, res.totalArea, 1e-4)
        assertEquals(4, res.points.size)
    }

    @Test
    fun calculateFourSidedNoDiagonal_brahmaguptaAndPatwariComparison() {
        // Rectangle 20 x 30 -> cyclic == patwari == 600
        val rect = TriangulationEngine.calculateFourSidedNoDiagonal(20.0, 30.0, 20.0, 30.0)
        assertTrue(rect.isValid)
        assertEquals(600.0, rect.cyclicArea, 1e-3)
        assertEquals(600.0, rect.patwariArea, 1e-3)

        // Impossible closure when one side >= semiperimeter
        val bad = TriangulationEngine.calculateFourSidedNoDiagonal(100.0, 10.0, 10.0, 10.0)
        assertFalse(bad.isValid)
    }

    @Test
    fun calculateHissaShares_splitsAreaProportionally() {
        val shares = TriangulationEngine.calculateHissaShares(
            totalSqm = 404.68564224, // 10 cents
            shares = listOf(
                Triple("Brother A", 1.0, 2.0),
                Triple("Brother B", 1.0, 4.0),
                Triple("Sister C", 1.0, 4.0)
            )
        )
        assertEquals(5.0, shares[0].cents, 0.01)
        assertEquals(2.5, shares[1].cents, 0.01)
        assertTrue(abs(shares.sumOf { it.cents } - 10.0) < 0.02)
    }
}
