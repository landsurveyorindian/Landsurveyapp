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
        assertTrue(url.startsWith("https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"))
        assertTrue(url.contains("cadastral:cadastral"))
        assertTrue(url.contains("EPSG:4326"))
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

