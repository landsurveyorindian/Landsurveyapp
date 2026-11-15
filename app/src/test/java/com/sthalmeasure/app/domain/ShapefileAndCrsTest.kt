package com.sthalmeasure.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShapefileAndCrsTest {

    @Test
    fun shapefileZip_roundTripPreservesVerticesAndDetectsWgs84Crs() {
        val polygon = listOf(
            CadPoint(80.6480, 16.5062, "P1"),
            CadPoint(80.6490, 16.5062, "P2"),
            CadPoint(80.6490, 16.5072, "P3"),
            CadPoint(80.6480, 16.5072, "P4")
        )
        val zipBytes = ShapefileSupport.exportPolygonToShapefileZip(
            points = polygon,
            layerName = "amaravati_parcel",
            includeWgs84Prj = true
        )
        assertTrue(zipBytes.size > 100)

        val parsed = CadEngine.parseImportedGisBytes(zipBytes, "amaravati_parcel.zip")
        assertTrue("Expected valid Shapefile ZIP parse, got ${parsed.errorMessage}", parsed.isValid)
        assertEquals(4, parsed.points.size)
        assertEquals("EPSG:4326 (WGS84)", parsed.crsLabel)
        assertEquals(80.6480, parsed.points[0].x, 1e-6)
        assertEquals(16.5062, parsed.points[0].y, 1e-6)
    }

    @Test
    fun shapefileValidator_rejectsNullIslandAndOutOfBoundsWgs84Coordinates() {
        val nullIsland = ShapefileSupport.validateImportedVertices(
            points = listOf(CadPoint(0.0, 0.0), CadPoint(0.0, 0.0), CadPoint(0.0, 0.0)),
            format = "GeoJSON"
        )
        assertFalse(nullIsland.isValid)
        assertTrue(nullIsland.errorMessage.orEmpty().contains("Null Island"))

        val wgs84Prj = """GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984"]]"""
        val mismatched = ShapefileSupport.validateImportedVertices(
            points = listOf(CadPoint(450000.0, 1825000.0), CadPoint(450050.0, 1825000.0), CadPoint(450050.0, 1825050.0)),
            format = "Shapefile (.shp)",
            prjText = wgs84Prj
        )
        assertFalse(mismatched.isValid)
        assertTrue(mismatched.errorMessage.orEmpty().contains("exceed valid"))
    }

    @Test
    fun parseImportedGisBytes_rejectsUnsupportedAndEmptyPayloadsHonestly() {
        val emptyRes = CadEngine.parseImportedGisBytes(ByteArray(0), "empty.geojson")
        assertFalse(emptyRes.isValid)

        val badExt = CadEngine.parseImportedGisBytes("hello world".encodeToByteArray(), "notes.txt")
        assertFalse(badExt.isValid)
        assertTrue(badExt.errorMessage.orEmpty().contains("Unsupported"))
    }

    @Test
    fun plotSummaryCodec_roundTripsVerticesAndFiveSidedValidationWorks() {
        val pts = listOf(PlotPoint(0.0, 0.0, "1"), PlotPoint(20.0, 0.0, "2"), PlotPoint(15.0, 18.0, "3"))
        val json = PlotSummaryCodec.encode("five_sided", pts, "Pentagon check")
        val decoded = PlotSummaryCodec.decode(json)
        assertNotNull(decoded)
        assertEquals("five_sided", decoded?.parcelType)
        assertEquals(3, decoded?.points?.size)
        assertEquals("Pentagon check", decoded?.noteHint)

        val invalidPentagon = TriangulationEngine.calculateFiveSidedPlot(10.0, 10.0, 10.0, 10.0, 10.0, 25.0, 15.0)
        assertFalse(invalidPentagon.isValid)
    }
}
