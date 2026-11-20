package com.sthalmeasure.app.report

import androidx.test.core.app.ApplicationProvider
import com.sthalmeasure.app.data.model.SurveyProject
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.ui.screens.GpsFixValidator
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class PdfAndGpsValidatorTest {

    @Test
    fun pdfReportGenerator_createsValidPdfDocumentWithPolygonSummary() {
        val context = ApplicationProvider.getApplicationContext<android.app.Application>()
        val pts = listOf(
            PlotPoint(0.0, 0.0, "P1"),
            PlotPoint(25.0, 0.0, "P2"),
            PlotPoint(25.0, 16.0, "P3"),
            PlotPoint(0.0, 16.0, "P4")
        )
        val project = SurveyProject(
            id = "proj_pdf_test",
            userId = "uid_1",
            name = "Guntur Plot Survey",
            state = "Andhra Pradesh",
            parcelType = "cad",
            areaSqm = 400.0,
            areaSqFt = 4305.56,
            areaSqYards = 478.4,
            areaAcres = 0.0988,
            areaCents = 9.88,
            perimeterMeters = 82.0,
            notes = "Survey stone verified.",
            summaryJson = PlotSummaryCodec.encode("cad", pts, "Corner verified")
        )

        val pdfFile: File = PdfReportGenerator.generateProjectPdf(context, project)
        assertTrue(pdfFile.exists())
        assertTrue("Expected PDF > 500 bytes, got ${pdfFile.length()}", pdfFile.length() > 500L)
        val header = pdfFile.inputStream().use {
            val buf = ByteArray(5)
            it.read(buf)
            String(buf, Charsets.US_ASCII)
        }
        assertTrue("Expected %PDF- header, got $header", header.startsWith("%PDF-"))
        pdfFile.delete()
    }

    @Test
    fun gpsFixValidator_rejectsNullIslandNaNAndWeakAccuracy() {
        assertFalse(GpsFixValidator.isValidCoordinate(0.0, 0.0, 5.0))
        assertFalse(GpsFixValidator.isValidCoordinate(Double.NaN, 80.6, 5.0))
        assertFalse(GpsFixValidator.isValidCoordinate(16.5, 80.6, 85.0))
        assertFalse(GpsFixValidator.isValidCoordinate(16.5, 80.6, 0.0))
        assertFalse(GpsFixValidator.isValidCoordinate(95.0, 80.6, 5.0))
        assertTrue(GpsFixValidator.isValidCoordinate(16.5062, 80.6480, 4.2))
    }

    @Test
    fun bhuvanWmsUrl_targetsNrscEndpointAndValidLayer() {
        val url = GpsFixValidator.buildBhuvanWmsPreviewUrl(16.5062, 80.6480, "CADASTRAL_OVERLAY")
        assertTrue(url.startsWith("https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms"))
        assertTrue(url.contains("cadastral:cadastral_india"))
        assertTrue(url.contains("EPSG:4326"))

        val bhuvan2dUrl = com.sthalmeasure.app.ui.components.SurveyMapConfig.buildBhuvanWmsPreviewUrl(16.5062, 80.6480, "bhuvan_2d")
        assertTrue(bhuvan2dUrl.contains("layers=india3"))

        val tmsUrl = com.sthalmeasure.app.ui.components.SurveyMapConfig.buildBhuvanTmsUrlTemplate("india3")
        assertTrue(tmsUrl.startsWith("https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/india3@EPSG:900913@png/"))

        val telanganaLulc = com.sthalmeasure.app.ui.components.SurveyMapConfig.lulcLayerForStateCode("TG")
        val punjabLulc = com.sthalmeasure.app.ui.components.SurveyMapConfig.lulcLayerForStateCode("PB")
        assertTrue(telanganaLulc == "lulc:AP_LULC50K_1112")
        assertTrue(punjabLulc == "lulc:PB_LULC50K_1112")

        val html = com.sthalmeasure.app.ui.components.buildLeafletMapHtml(
            """{"baseLayer":"bhuvan_2d","overlayWms":"cadastral:cadastral_india","overlayId":"CADASTRAL_OVERLAY","stateCode":"AP","lat":16.5062,"lng":80.6480}"""
        )
        assertFalse("Should not target broken uncached /bhuvan/wms", html.contains("nrsc.gov.in/bhuvan/wms"))
        assertTrue(html.contains("bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/tms/1.0.0/india3@EPSG:900913@png"))
        assertTrue(html.contains("mt1.google.com/vt/lyrs=s"))
        assertTrue(html.contains("server.arcgisonline.com/ArcGIS/rest/services/World_Imagery"))
        assertTrue(html.contains("https://sthalmeasure.app/assets/leaflet/leaflet.js"))
        assertTrue(html.contains("tms: true"))
        assertFalse("Should not inject synthetic cadastral labels over map", html.contains("104/1A"))
        assertFalse("Should not inject synthetic village box", html.contains("drawCadastralOverlay"))
        assertTrue(com.sthalmeasure.app.ui.components.MapBaseLayer.BHUVAN_HYBRID.label == "Bhuvan Hybrid")
        assertTrue("Cadastral overlay must allow native z17-z18 tiles for survey numbers", html.contains("maxNativeZoom: 18"))
        assertFalse("Cadastral overlay must not cap native zoom at 16", html.contains("maxNativeZoom: 16"))
        assertTrue("Dedicated cadastralPane should be created above base tiles", html.contains("createPane('cadastralPane')"))
        assertTrue("Cadastral pane should have readable white halo CSS", html.contains(".leaflet-cadastralPane-pane"))
        assertTrue("Cadastral overlay should initialize at survey-number zoom 17", html.contains("var startZoom = isCad ? 17"))
        val apDefault = com.sthalmeasure.app.ui.components.SurveyMapConfig.stateDefaultCenter("Andhra Pradesh")
        assertTrue("AP default center should point to NRSC cadastral revenue zone", apDefault.first in 16.0..17.0 && apDefault.second in 80.0..81.0)
    }

    @Test
    fun surveyMapConfig_providesGoogleLayersAndProjectsPlanarAndWgs84Polygons() {
        val streets = com.sthalmeasure.app.ui.components.SurveyMapConfig.buildGoogleTileUrlTemplate(
            com.sthalmeasure.app.ui.components.MapBaseLayer.GOOGLE_STREETS
        )
        val sat = com.sthalmeasure.app.ui.components.SurveyMapConfig.buildGoogleTileUrlTemplate(
            com.sthalmeasure.app.ui.components.MapBaseLayer.GOOGLE_SATELLITE
        )
        val hybrid = com.sthalmeasure.app.ui.components.SurveyMapConfig.buildGoogleTileUrlTemplate(
            com.sthalmeasure.app.ui.components.MapBaseLayer.GOOGLE_HYBRID
        )
        assertTrue(streets.contains("lyrs=m"))
        assertTrue(sat.contains("lyrs=s"))
        assertTrue(hybrid.contains("lyrs=y"))

        val wgsPts = listOf(
            com.sthalmeasure.app.domain.CadPoint(80.6480, 16.5062, "P1"),
            com.sthalmeasure.app.domain.CadPoint(80.6490, 16.5072, "P2")
        )
        val projectedWgs = com.sthalmeasure.app.ui.components.SurveyMapConfig.projectPointsToLatLng(
            wgsPts, 16.5, 80.6, "EPSG:4326 (WGS84)"
        )
        assertTrue(kotlin.math.abs(projectedWgs[0].first - 16.5062) < 1e-6)
        assertTrue(kotlin.math.abs(projectedWgs[0].second - 80.6480) < 1e-6)

        val planarPts = listOf(
            com.sthalmeasure.app.domain.CadPoint(0.0, 0.0, "P1"),
            com.sthalmeasure.app.domain.CadPoint(100.0, 100.0, "P2")
        )
        val projectedPlanar = com.sthalmeasure.app.ui.components.SurveyMapConfig.projectPointsToLatLng(
            planarPts, 16.5062, 80.6480, "Planar CAD Meters"
        )
        assertTrue(projectedPlanar[1].first > 16.5062)
        assertTrue(projectedPlanar[1].second > 80.6480)

        // Verify UTM Zone 44N inverse projects near Guntur/AP instead of anchoring around passed dummy anchor
        val utmPts = listOf(
            com.sthalmeasure.app.domain.CadPoint(447000.0, 1806000.0, "P1"),
            com.sthalmeasure.app.domain.CadPoint(447100.0, 1806100.0, "P2")
        )
        val projectedUtm = com.sthalmeasure.app.ui.components.SurveyMapConfig.projectPointsToLatLng(
            utmPts, 28.6139, 77.2090, "AutoCAD DXF • UTM Zone 44N"
        )
        assertTrue("Expected AP lat ~16.33 instead of anchor 28.61, got ${projectedUtm[0].first}", projectedUtm[0].first in 16.30..16.36)
        assertTrue("Expected AP lng ~80.50 instead of anchor 77.20, got ${projectedUtm[0].second}", projectedUtm[0].second in 80.47..80.53)
    }

    @Test
    fun leafletHtml_rendersMultipleFeaturesAndSuppressesCircleMarkersForDenseParcels() {
        val html = com.sthalmeasure.app.ui.components.buildLeafletMapHtml(
            """{"baseLayer":"bhuvan_2d","overlayWms":"cadastral:cadastral_india","overlayId":"CADASTRAL_OVERLAY","stateCode":"AP","lat":16.5,"lng":80.5}"""
        )
        assertTrue(html.contains("totalVerts <= 60"))
        assertTrue(html.contains("L.featureGroup()"))
        assertTrue(html.contains("ResizeObserver"))
    }

    @Test
    fun academyVideoValidator_acceptsVerifiedHttpsAndRejectsMalformedUrls() {
        assertTrue(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://cdn.sthalmeasure.in/academy/ep1.mp4"))
        assertTrue(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://storage.googleapis.com/bucket/video.mp4?token=abc"))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl(""))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://"))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("http://cdn.sthalmeasure.in/ep1.mp4"))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://localhost/ep1.mp4"))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://cdn.sthalmeasure.in/ep 1.mp4"))
        assertFalse(com.sthalmeasure.app.domain.AcademyVideoValidator.isValidStreamUrl("https://intranet/ep1.mp4"))
    }
}


