package com.sthalmeasure.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GpsFilterAndGeoTest {

    @Test
    fun detectIndianState_identifiesMajorSurveyRegions() {
        assertEquals("Andhra Pradesh", GeoAndGpsUtils.detectIndianState(16.5062, 80.6480)) // Vijayawada
        assertEquals("Telangana", GeoAndGpsUtils.detectIndianState(17.3850, 78.4867)) // Hyderabad
        assertEquals("Karnataka", GeoAndGpsUtils.detectIndianState(12.9716, 77.5946)) // Bengaluru
        assertEquals("Tamil Nadu", GeoAndGpsUtils.detectIndianState(13.0827, 80.2707)) // Chennai
        assertEquals("Maharashtra", GeoAndGpsUtils.detectIndianState(19.0760, 72.8777)) // Mumbai
    }

    @Test
    fun wgs84ToUtm_projectsIndianCoordinatesInCorrectZone() {
        val utm = GeoAndGpsUtils.wgs84ToUtm(16.5062, 80.6480)
        assertEquals(44, utm.zone)
        assertEquals('N', utm.hemisphere)
        assertTrue(utm.easting in 450000.0..500000.0)
        assertTrue(utm.northing > 1800000.0)
    }

    @Test
    fun gpsKalmanFilter_andStaticAccumulatorReduceNoise() {
        val kf = GpsKalmanFilter()
        val f1 = kf.update(16.500000, 80.600000, 10.0, 1000L)
        val f2 = kf.update(16.500010, 80.600010, 8.0, 2000L)
        val f3 = kf.update(16.500005, 80.600005, 6.0, 3000L)
        assertTrue(f3.estimatedAccuracy < f1.estimatedAccuracy)
        assertTrue(f2.lat > 16.5 && f2.lng > 80.6)

        val acc = StaticEpochAccumulator(targetCount = 10)
        repeat(10) {
            acc.addSample(16.5000 + it * 0.000001, 80.6000, 4.0)
        }
        // Multipath 40m spike is rejected
        acc.addSample(17.0, 81.0, 40.0)
        assertEquals(10, acc.getCount())
        assertTrue(acc.isComplete())
        val result = acc.computeResult()!!
        assertTrue(result.convergedAccuracy < 4.0)
    }

    @Test
    fun gpsPolygonArea_approximatesOneHectareSquare() {
        // ~100m x 100m around 16.5N, 80.6E
        val mLat = 100.0 / 110662.0
        val mLng = 100.0 / (111412.84 * kotlin.math.cos(16.5 * Math.PI / 180.0))
        val ring = listOf(
            16.5 to 80.6,
            16.5 to (80.6 + mLng),
            (16.5 + mLat) to (80.6 + mLng),
            (16.5 + mLat) to 80.6
        )
        val area = GeoAndGpsUtils.computeGpsPolygonAreaSqm(ring)
        assertEquals(10000.0, area, 50.0)
        assertFalse(GeoAndGpsUtils.isMultipathOutlier(16.5, 80.6, 1000L, 16.50001, 80.60001, 2000L))
        assertTrue(GeoAndGpsUtils.isMultipathOutlier(16.5, 80.6, 1000L, 16.51, 80.61, 2000L))
    }

    @Test
    fun gpsSurveySession_rejectsInvalidCoordinatesBeforeKalmanAndManualCapture() {
        val session = GpsSurveySession()

        // Null island [0,0], NaN, out-of-bounds, and >50m weak fixes rejected before lock
        assertEquals(GpsFixStatus.REJECTED_INVALID_OR_WEAK, session.ingestRawFix(0.0, 0.0, 4.0, 1000L))
        assertEquals(GpsFixStatus.REJECTED_INVALID_OR_WEAK, session.ingestRawFix(Double.NaN, 80.6, 4.0, 2000L))
        assertEquals(GpsFixStatus.REJECTED_INVALID_OR_WEAK, session.ingestRawFix(95.0, 80.6, 4.0, 3000L))
        assertEquals(GpsFixStatus.REJECTED_INVALID_OR_WEAK, session.ingestRawFix(16.5062, 80.6480, 68.0, 4000L))
        assertFalse(session.hasAcceptedFix)
        assertEquals(4, session.weakFixesSkipped)
        assertEquals(null, session.captureManualCorner())
        assertTrue(session.boundaryPoints.isEmpty())
    }

    @Test
    fun gpsSurveySession_multipathJumpRejectedWithoutCorruptingAcceptedFixReference() {
        val session = GpsSurveySession()

        // Accepted initial fix at Vijayawada benchmark
        assertEquals(GpsFixStatus.ACCEPTED, session.ingestRawFix(16.506200, 80.648000, 4.0, 1000L))
        assertEquals(16.506200, session.prevAcceptedRawLat, 1e-9)
        assertEquals(80.648000, session.prevAcceptedRawLng, 1e-9)
        assertEquals(1000L, session.prevAcceptedRawTimeMs)

        // Sudden 15 km multipath jump 1 second later MUST be rejected
        assertEquals(GpsFixStatus.REJECTED_MULTIPATH_OUTLIER, session.ingestRawFix(16.650000, 80.750000, 5.0, 2000L))
        assertEquals(1, session.outliersRejected)
        // Crucial invariant: rejected spike MUST NOT overwrite prevAcceptedRaw* or corrupt Kalman
        assertEquals(16.506200, session.prevAcceptedRawLat, 1e-9)
        assertEquals(80.648000, session.prevAcceptedRawLng, 1e-9)
        assertEquals(1000L, session.prevAcceptedRawTimeMs)
        assertTrue(session.filteredLat < 16.51)

        // Next real walking step 1s after the spike (~1m away from first fix) MUST STILL succeed
        assertEquals(GpsFixStatus.ACCEPTED, session.ingestRawFix(16.506210, 80.648010, 4.0, 3000L))
        assertEquals(3000L, session.prevAcceptedRawTimeMs)

        // Capture manual corner and verify it uses accepted filtered coords (not rejected spike)
        val corner = session.captureManualCorner()
        assertTrue(corner != null)
        assertTrue(corner!!.first in 16.506..16.507)
        assertTrue(corner.second in 80.647..80.649)
    }

    @Test
    fun gpsSurveySession_rejectsOutOfOrderAndDuplicateTimestampsAndSmoothsStationaryDrift() {
        val session = GpsSurveySession()
        assertEquals(GpsFixStatus.ACCEPTED, session.ingestRawFix(17.385000, 78.486700, 6.0, 5000L))

        // Out-of-order stale fix rejected
        assertEquals(GpsFixStatus.REJECTED_STALE_OR_DUPLICATE, session.ingestRawFix(17.385010, 78.486710, 5.0, 4000L))
        // Duplicate timestamp with near-identical coords rejected as duplicate
        assertEquals(GpsFixStatus.REJECTED_STALE_OR_DUPLICATE, session.ingestRawFix(17.385001, 78.486701, 5.0, 5000L))
        // Duplicate timestamp with >5m jump rejected as multipath outlier
        assertEquals(GpsFixStatus.REJECTED_MULTIPATH_OUTLIER, session.ingestRawFix(17.386000, 78.487700, 5.0, 5000L))

        assertTrue(session.startStaticEpochCollection())
        for (i in 1..12) {
            val jitterLat = 17.385000 + if (i % 2 == 0) 0.00001 else -0.00001
            val jitterLng = 78.486700 + if (i % 3 == 0) 0.00001 else -0.00001
            assertEquals(GpsFixStatus.ACCEPTED, session.ingestRawFix(jitterLat, jitterLng, 4.5, 5000L + i * 1000L))
        }
        assertFalse(session.collectingEpochs)
        assertEquals(1, session.boundaryPoints.size)
        val driftFromTrue = GeoAndGpsUtils.calculateDistanceMeters(
            17.385000,
            78.486700,
            session.boundaryPoints.first().first,
            session.boundaryPoints.first().second
        )
        assertTrue("Expected tight stationary epoch convergence <= 3m, got $driftFromTrue", driftFromTrue <= 3.0)
    }
}

