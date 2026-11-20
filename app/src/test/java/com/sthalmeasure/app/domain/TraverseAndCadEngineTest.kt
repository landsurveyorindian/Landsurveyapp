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
    fun computeClosingLegForPreceding_closesOpenTraverseToZeroError() {
        val firstThreeLegs = listOf(
            TraverseStation("1", "A-B", 0.0, 30.0),
            TraverseStation("2", "B-C", 90.0, 40.0),
            TraverseStation("3", "C-D", 180.0, 30.0)
        )
        val closing = TraverseEngine.computeClosingLegForPreceding(firstThreeLegs, id = "4", lineId = "D-A")
        assertNotNull(closing)
        assertEquals(270.0, closing!!.bearingDeg, 1e-4)
        assertEquals(40.0, closing.distanceMeters, 1e-4)

        val closedSummary = TraverseEngine.computeClosedTraverse(firstThreeLegs + closing)
        assertTrue(closedSummary.isValid)
        assertEquals(0.0, closedSummary.linearClosingError, 1e-5)
        assertEquals(1200.0, closedSummary.areaSqm, 1e-3)
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

    @Test
    fun parseDxf_ignoresBlocksAndPaperSpaceAndComputesMultiParcelMetricsAccurately() {
        // DXF with a giant BLOCKS title-frame decoy (0..50000) + two separate 50m x 40m UTM Zone 44N LWPOLYLINE parcels + 1 closed LINE square
        val dxf = """
            0
            SECTION
            2
            HEADER
            9
            ${'$'}INSUNITS
            70
            6
            0
            ENDSEC
            0
            SECTION
            2
            BLOCKS
            0
            LWPOLYLINE
            90
            4
            70
            1
            10
            0.0
            20
            0.0
            10
            50000.0
            20
            0.0
            10
            50000.0
            20
            50000.0
            10
            0.0
            20
            50000.0
            0
            ENDSEC
            0
            SECTION
            2
            ENTITIES
            0
            LWPOLYLINE
            8
            SURVEY_PARCELS
            90
            4
            70
            1
            10
            447000.0
            20
            1806000.0
            10
            447050.0
            20
            1806000.0
            10
            447050.0
            20
            1806040.0
            10
            447000.0
            20
            1806040.0
            0
            LWPOLYLINE
            8
            SURVEY_PARCELS
            90
            4
            70
            1
            10
            448000.0
            20
            1806000.0
            10
            448050.0
            20
            1806000.0
            10
            448050.0
            20
            1806040.0
            10
            448000.0
            20
            1806040.0
            0
            LWPOLYLINE
            67
            1
            90
            3
            70
            1
            10
            0.0
            20
            0.0
            10
            9999.0
            20
            0.0
            10
            9999.0
            20
            9999.0
            0
            ENDSEC
            0
            EOF
        """.trimIndent()

        val result = CadEngine.parseImportedGisBytes(dxf.encodeToByteArray(), "village_map.dxf", stateHint = "Andhra Pradesh")
        assertTrue(result.isValid)
        assertEquals(2, result.features.size)
        assertEquals(ImportedCrsType.UTM, result.crsType)
        assertEquals(44, result.utmZone)
        // Each 50x40 parcel = 2,000 sqm, 180m perim -> total 4,000 sqm & 360m (no 1000m jump line between parcels!)
        assertEquals(4000.0, result.totalAreaSqm, 25.0)
        assertEquals(360.0, result.totalPerimeterMeters, 2.0)
    }

    @Test
    fun parseDxf_scalesFeetInsunitsProperly() {
        val feetSquareDxf = """
            0
            SECTION
            2
            HEADER
            9
            ${'$'}INSUNITS
            70
            2
            0
            ENDSEC
            0
            SECTION
            2
            ENTITIES
            0
            LWPOLYLINE
            90
            4
            70
            1
            10
            0.0
            20
            0.0
            10
            100.0
            20
            0.0
            10
            100.0
            20
            100.0
            10
            0.0
            20
            100.0
            0
            ENDSEC
            0
            EOF
        """.trimIndent()

        val res = CadEngine.parseImportedGisBytes(feetSquareDxf.encodeToByteArray(), "lot_feet.dxf")
        assertTrue(res.isValid)
        assertEquals(0.3048, res.unitScaleToMeters, 1e-6)
        // 100ft x 100ft = 10,000 sqft = 929.0304 sqm, perimeter = 400ft = 121.92m
        assertEquals(929.0304, res.totalAreaSqm, 0.05)
        assertEquals(121.92, res.totalPerimeterMeters, 0.05)
    }
}

