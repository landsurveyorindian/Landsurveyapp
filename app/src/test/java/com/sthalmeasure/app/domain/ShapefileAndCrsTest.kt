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
    fun plotSummaryCodec_roundTripsVerticesAndFourSidedValidationWorks() {
        val pts = listOf(PlotPoint(0.0, 0.0, "1"), PlotPoint(20.0, 0.0, "2"), PlotPoint(20.0, 15.0, "3"), PlotPoint(0.0, 15.0, "4"))
        val json = PlotSummaryCodec.encode("four_sided", pts, "Quad check")
        val decoded = PlotSummaryCodec.decode(json)
        assertNotNull(decoded)
        assertEquals("four_sided", decoded?.parcelType)
        assertEquals(4, decoded?.points?.size)
        assertEquals("Quad check", decoded?.noteHint)

        val invalidTriangle = TriangulationEngine.calculateHeronTriangle(1.0, 2.0, 10.0)
        assertFalse(invalidTriangle.isValid)
        val validQuad = TriangulationEngine.calculateFourSidedPlot(20.0, 15.0, 20.0, 15.0, 25.0)
        assertTrue(validQuad.isValid)
    }

    @Test
    fun utmPrjShapefile_projectsToRealVillageCoordinatesAndExactMetricArea() {
        // Real 100m x 100m (10,000 sqm = 1 hectare) parcel in Pedakakani/Guntur, Andhra Pradesh (UTM Zone 44N)
        val utmPts = listOf(
            CadPoint(447000.0, 1806000.0, "1"),
            CadPoint(447100.0, 1806000.0, "2"),
            CadPoint(447100.0, 1806100.0, "3"),
            CadPoint(447000.0, 1806100.0, "4")
        )
        val prjUtm44N = """PROJCS["WGS_1984_UTM_Zone_44N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",81.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]"""

        val res = ShapefileSupport.validateImportedVertices(
            points = utmPts,
            format = "Shapefile (.shp)",
            prjText = prjUtm44N,
            stateHint = "Andhra Pradesh"
        )
        assertTrue(res.isValid)
        assertEquals(ImportedCrsType.UTM, res.crsType)
        assertEquals(44, res.utmZone)
        assertEquals(10_000.0, res.totalAreaSqm, 35.0)
        assertEquals(400.0, res.totalPerimeterMeters, 1.5)

        val latLng = ShapefileSupport.projectPointToLatLng(
            pt = utmPts[0],
            anchorLat = 0.0,
            anchorLng = 0.0,
            originPoint = utmPts[0],
            crsType = res.crsType,
            utmZone = res.utmZone
        )
        assertTrue("Expected Pedakakani/Guntur lat ~16.33, got ${latLng.first}", latLng.first in 16.30..16.36)
        assertTrue("Expected Pedakakani/Guntur lng ~80.50, got ${latLng.second}", latLng.second in 80.47..80.53)
        assertEquals("Andhra Pradesh", GeoAndGpsUtils.detectIndianState(latLng.first, latLng.second))
    }

    @Test
    fun standaloneShpWithoutExtensionOrPrj_sniffsMagicBytesAndInfersIndiaUtmAndHoleArea() {
        // Build a 1-hectare UTM Zone 43N parcel near Pune/Maharashtra without .prj and pass extensionless name
        val parcel = listOf(
            CadPoint(380000.0, 2048000.0),
            CadPoint(380200.0, 2048000.0),
            CadPoint(380200.0, 2048200.0),
            CadPoint(380000.0, 2048200.0)
        )
        val zipBytes = ShapefileSupport.exportPolygonToShapefileZip(parcel, "pune_parcel", includeWgs84Prj = false)
        // Extract raw .shp bytes from zip and feed via SAF-like extensionless URI name "document/4812"
        var rawShp: ByteArray? = null
        java.util.zip.ZipInputStream(java.io.ByteArrayInputStream(zipBytes)).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                if (entry.name.endsWith(".shp")) {
                    rawShp = zis.readBytes()
                    break
                }
                entry = zis.nextEntry
            }
        }
        assertNotNull(rawShp)
        val parsed = CadEngine.parseImportedGisBytes(rawShp!!, "document/4812", stateHint = "Maharashtra")
        assertTrue("Expected magic-sniffed .shp import, got ${parsed.errorMessage}", parsed.isValid)
        assertEquals(ImportedCrsType.UTM, parsed.crsType)
        assertEquals(43, parsed.utmZone)
        assertEquals(40_000.0, parsed.totalAreaSqm, 120.0)
        assertEquals(800.0, parsed.totalPerimeterMeters, 3.0)

        // Verify hole subtraction in multi-part polygon
        val outer = GisFeature(
            points = listOf(CadPoint(0.0, 0.0), CadPoint(100.0, 0.0), CadPoint(100.0, 100.0), CadPoint(0.0, 100.0)),
            closed = true,
            isHole = false
        )
        val hole = GisFeature(
            points = listOf(CadPoint(20.0, 20.0), CadPoint(20.0, 40.0), CadPoint(40.0, 40.0), CadPoint(40.0, 20.0)),
            closed = true,
            isHole = true
        )
        val (netArea, totalPerim) = ShapefileSupport.computeMetricAreaAndPerimeter(
            features = listOf(outer, hole),
            crsType = ImportedCrsType.LOCAL_PLANAR
        )
        assertEquals(9600.0, netArea, 1e-3)
        assertEquals(480.0, totalPerim, 1e-3)
    }

    @Test
    fun webMercator3857_inverseProjectsAndCalculatesTrueGeodesicAreaWithoutMercatorInflation() {
        // EPSG:3857 Web Mercator square at ~16.5°N: delta ~ 1043 m in Mercator coords equals ~ 1000 m on Earth (cos 16.5° ≈ 0.9588)
        val x0 = 8977000.0
        val y0 = 1862800.0
        val res = ShapefileSupport.validateImportedVertices(
            points = listOf(
                CadPoint(x0, y0),
                CadPoint(x0 + 1000.0, y0),
                CadPoint(x0 + 1000.0, y0 + 1000.0),
                CadPoint(x0, y0 + 1000.0)
            ),
            format = "GeoJSON",
            prjText = """PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",AUTHORITY["EPSG","3857"]]"""
        )
        assertTrue(res.isValid)
        assertEquals(ImportedCrsType.WEB_MERCATOR, res.crsType)
        // True ground area is ~ (1000 * cos(16.5°))^2 ≈ 919,000 sqm, NOT 1,000,000 sqm Web Mercator coords!
        assertTrue("Expected geodesic corrected area ~919k sqm, got ${res.totalAreaSqm}", res.totalAreaSqm in 900_000.0..940_000.0)
    }
}

