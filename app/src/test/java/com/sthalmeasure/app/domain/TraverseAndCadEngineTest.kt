package com.sthalmeasure.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TraverseAndCadEngineTest {

    @Test
    fun computeClosedTraverse_perfectSquareClosesWithExactArea() {
        val stations = listOf(
            TraverseStation("1", "A-B", 0.0, 20.0),
            TraverseStation("2", "B-C", 90.0, 20.0),
            TraverseStation("3", "C-D", 180.0, 20.0),
            TraverseStation("4", "D-A", 270.0, 20.0)
        )
        val summary = TraverseEngine.computeClosedTraverse(stations)
        assertTrue(summary.isValid)
        assertEquals(80.0, summary.totalPerimeter, 1e-4)
        assertEquals(0.0, summary.linearClosingError, 1e-4)
        assertEquals(400.0, summary.areaSqm, 1e-2)
        assertEquals(TraverseQualityGrade.FIRST_ORDER, summary.qualityGrade)
    }

    @Test
    fun computeClosedTraverse_appliesBowditchCorrectionToMisclosure() {
        val stations = listOf(
            TraverseStation("1", "1-2", 0.0, 50.0),
            TraverseStation("2", "2-3", 90.0, 50.1), // 0.1m east error
            TraverseStation("3", "3-4", 180.0, 50.0),
            TraverseStation("4", "4-1", 270.0, 50.0)
        )
        val summary = TraverseEngine.computeClosedTraverse(stations)
        assertTrue(summary.isValid)
        assertEquals(0.1, summary.linearClosingError, 1e-3)
        assertTrue(summary.isClosedGood)
        assertEquals(0.0, summary.lines.sumOf { it.adjDep }, 1e-4)
        assertEquals(0.0, summary.lines.sumOf { it.adjLat }, 1e-4)
    }

    @Test
    fun computeClosedTraverse_rejectsLessThanThreeStations() {
        val summary = TraverseEngine.computeClosedTraverse(
            listOf(
                TraverseStation("1", "A-B", 0.0, 10.0),
                TraverseStation("2", "B-C", 90.0, 10.0)
            )
        )
        assertFalse(summary.isValid)
        assertEquals(TraverseQualityGrade.INVALID, summary.qualityGrade)
    }

    @Test
    fun cadEngine_cogoSplitSetbackAndExportsRoundTrip() {
        val square = listOf(
            CadPoint(0.0, 0.0, "A"),
            CadPoint(20.0, 0.0, "B"),
            CadPoint(20.0, 20.0, "C"),
            CadPoint(0.0, 20.0, "D")
        )
        assertEquals(400.0, CadEngine.computePolygonArea(square), 1e-4)
        assertEquals(80.0, CadEngine.computePolygonPerimeter(square), 1e-4)

        val split = CadEngine.splitPolygonByRatio(square, 0.5, vertical = true)
        assertNotNull(split)
        assertEquals(200.0, split!!.part1Area, 0.5)
        assertEquals(200.0, split.part2Area, 0.5)

        val setback = CadEngine.computeSetbackPolygon(square, 2.0)
        assertEquals(256.0, CadEngine.computePolygonArea(setback), 0.5)

        val dxf = CadEngine.exportPolygonToDxf(square)
        val parsedDxf = CadEngine.parseDxfVertices(dxf)
        assertEquals(4, parsedDxf.size)

        val geoJson = CadEngine.exportPolygonToGeoJson(square)
        val parsedJson = CadEngine.parseGeoJsonPolygon(geoJson)
        assertEquals(4, parsedJson.size)

        val kml = CadEngine.exportPolygonToKml(square)
        val parsedKml = CadEngine.parseKmlCoordinates(kml)
        assertEquals(4, parsedKml.size)
    }
}
