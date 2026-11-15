package com.sthalmeasure.app.domain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

data class GpsAccuracyRating(
    val level: String,
    val label: String,
    val surveyReady: Boolean
)

data class UtmCoordinate(
    val zone: Int,
    val hemisphere: Char,
    val easting: Double,
    val northing: Double
)

data class KalmanEstimate(
    val lat: Double,
    val lng: Double,
    val estimatedAccuracy: Double
)

data class EpochSample(
    val lat: Double,
    val lng: Double,
    val accuracy: Double,
    val timestampMs: Long
)

data class StaticEpochResult(
    val lat: Double,
    val lng: Double,
    val convergedAccuracy: Double,
    val stdDevMeters: Double,
    val standardErrorMeters: Double,
    val sampleCount: Int,
    val isConverged: Boolean
)

data class GcpCalibration(
    val deltaLat: Double,
    val deltaLng: Double,
    val offsetMeters: Double,
    val benchmarkName: String
)

object GeoAndGpsUtils {
    fun calculateDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371000.0
        val dLat = (lat2 - lat1) * PI / 180.0
        val dLon = (lon2 - lon1) * PI / 180.0
        val a = sin(dLat / 2.0) * sin(dLat / 2.0) +
            cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
            sin(dLon / 2.0) * sin(dLon / 2.0)
        val c = 2.0 * atan2(sqrt(a), sqrt(max(0.0, 1.0 - a)))
        return r * c
    }

    fun computeGpsPolygonAreaSqm(latLngs: List<Pair<Double, Double>>): Double {
        if (latLngs.size < 3) return 0.0
        val originLat = latLngs.map { it.first }.average()
        val originLng = latLngs.map { it.second }.average()
        val latRad = originLat * PI / 180.0
        val mPerDegLat = 111132.954 - 559.822 * cos(2.0 * latRad)
        val mPerDegLng = 111412.84 * cos(latRad)
        val local = latLngs.map { (lat, lng) ->
            CadPoint((lng - originLng) * mPerDegLng, (lat - originLat) * mPerDegLat)
        }
        return CadEngine.computePolygonArea(local)
    }

    fun computeGpsPolygonPerimeterMeters(latLngs: List<Pair<Double, Double>>): Double {
        if (latLngs.size < 2) return 0.0
        var sum = 0.0
        for (i in latLngs.indices) {
            val j = (i + 1) % latLngs.size
            sum += calculateDistanceMeters(
                latLngs[i].first, latLngs[i].second,
                latLngs[j].first, latLngs[j].second
            )
        }
        return sum
    }

    fun toDms(degrees: Double, isLatitude: Boolean): String {
        val absDeg = abs(degrees)
        val d = floor(absDeg).toInt()
        val minFloat = (absDeg - d) * 60.0
        val m = floor(minFloat).toInt()
        val s = (minFloat - m) * 60.0
        val dir = if (isLatitude) {
            if (degrees >= 0) "N" else "S"
        } else {
            if (degrees >= 0) "E" else "W"
        }
        return "$d° $m' ${"%.2f".format(s)}\" $dir"
    }

    fun rateGpsAccuracy(accuracyMeters: Double): GpsAccuracyRating = when {
        accuracyMeters <= 5.0 -> GpsAccuracyRating(
            "excellent",
            "Survey-Grade Precision (±${"%.1f".format(accuracyMeters)}m)",
            true
        )
        accuracyMeters <= 15.0 -> GpsAccuracyRating(
            "good",
            "Cadastral Field Grade (±${accuracyMeters.toInt()}m)",
            true
        )
        accuracyMeters <= 30.0 -> GpsAccuracyRating(
            "fair",
            "Approximate Fix (±${accuracyMeters.toInt()}m)",
            false
        )
        else -> GpsAccuracyRating(
            "poor",
            "Low Accuracy (±${accuracyMeters.toInt()}m)",
            false
        )
    }

    fun detectIndianState(lat: Double, lng: Double): String? {
        if (lat in 28.40..28.88 && lng in 76.84..77.35) return "Delhi (NCT)"
        if (lat in 14.89..15.80 && lng in 73.65..74.35) return "Goa"
        if (lat in 8.25..12.80 && lng in 74.85..77.45) {
            if (lat < 10.5 && lng <= 77.40) return "Kerala"
            if (lat in 10.5..12.80 && lng <= 76.25) return "Kerala"
            if (lat in 10.0..11.5 && lng <= 76.80) return "Kerala"
        }
        if (lat in 8.05..13.55 && lng in 76.25..80.35) {
            return if (lat >= 11.8 && lng < 77.75) "Karnataka" else "Tamil Nadu"
        }
        if (lat in 15.83..19.85 && lng in 77.2..81.3) {
            return if (lng > 80.1 && lat < 16.8) "Andhra Pradesh" else "Telangana"
        }
        if (lat in 11.5..18.45 && lng in 74.05..78.58) {
            return if (lat > 15.5 && lng > 77.6) "Telangana" else "Karnataka"
        }
        if (lat in 12.6..19.15 && lng in 76.7..84.8) return "Andhra Pradesh"
        if (lat in 20.10..24.70 && lng in 68.10..74.45) return "Gujarat"
        if (lat in 15.6..22.05 && lng in 72.6..80.9) return "Maharashtra"
        if (lat in 17.80..22.60 && lng in 81.40..87.50) return "Odisha"
        if (lat in 21.50..27.30 && lng in 85.80..89.90) {
            return if (lat >= 24.0 && lng < 87.8) "Jharkhand" else "West Bengal"
        }
        if (lat in 24.30..27.50 && lng in 83.30..88.30) return "Bihar"
        if (lat in 21.90..25.30 && lng in 83.30..87.90) return "Jharkhand"
        if (lat in 17.80..24.10 && lng in 80.20..84.40) return "Chhattisgarh"
        if (lat in 24.20..30.40 && lng in 77.10..84.60) {
            return if (lat < 26.5 && lng < 78.5) "Madhya Pradesh" else "Uttar Pradesh"
        }
        if (lat in 21.10..26.90 && lng in 74.00..82.80) return "Madhya Pradesh"
        if (lat in 23.30..30.20 && lng in 69.50..78.30) {
            return if (lat > 27.5 && lng > 76.8) "Haryana" else "Rajasthan"
        }
        if (lat in 29.50..32.50 && lng in 73.80..76.90) return "Punjab"
        if (lat in 27.60..30.90 && lng in 74.40..77.60) return "Haryana"
        if (lat in 24.10..28.00 && lng in 89.70..96.00) return "Assam"
        return null
    }

    /**
     * Pure Kotlin WGS84 to UTM Forward Projection (Zones 42N - 47N cover India).
     */
    fun wgs84ToUtm(latDeg: Double, lngDeg: Double): UtmCoordinate {
        val a = 6378137.0
        val f = 1.0 / 298.257223563
        val k0 = 0.9996
        val e2 = f * (2.0 - f)
        val ep2 = e2 / (1.0 - e2)

        val zone = (floor((lngDeg + 180.0) / 6.0).toInt() + 1).coerceIn(1, 60)
        val lon0 = ((zone - 1) * 6 - 180 + 3) * PI / 180.0
        val lat = latDeg * PI / 180.0
        val lon = lngDeg * PI / 180.0

        val n = a / sqrt(1.0 - e2 * sin(lat).pow(2))
        val t = tan(lat).pow(2)
        val c = ep2 * cos(lat).pow(2)
        val capitalA = cos(lat) * (lon - lon0)

        val e4 = e2 * e2
        val e6 = e4 * e2
        val m = a * (
            (1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0) * lat -
                (3.0 * e2 / 8.0 + 3.0 * e4 / 32.0 + 45.0 * e6 / 1024.0) * sin(2.0 * lat) +
                (15.0 * e4 / 256.0 + 45.0 * e6 / 1024.0) * sin(4.0 * lat) -
                (35.0 * e6 / 3072.0) * sin(6.0 * lat)
            )

        val easting = k0 * n * (
            capitalA +
                (1.0 - t + c) * capitalA.pow(3) / 6.0 +
                (5.0 - 18.0 * t + t * t + 72.0 * c - 58.0 * ep2) * capitalA.pow(5) / 120.0
            ) + 500000.0

        var northing = k0 * (
            m + n * tan(lat) * (
                capitalA * capitalA / 2.0 +
                    (5.0 - t + 9.0 * c + 4.0 * c * c) * capitalA.pow(4) / 24.0 +
                    (61.0 - 58.0 * t + t * t + 600.0 * c - 330.0 * ep2) * capitalA.pow(6) / 720.0
                )
            )
        if (latDeg < 0) northing += 10000000.0
        return UtmCoordinate(
            zone = zone,
            hemisphere = if (latDeg >= 0) 'N' else 'S',
            easting = easting,
            northing = northing
        )
    }

    /**
     * Checks velocity/multipath spike between two fixes. Returns true if outlier should be rejected.
     * Also rejects non-finite coordinates, stale out-of-order timestamps, and duplicate-timestamp jumps.
     */
    fun isMultipathOutlier(
        prevLat: Double,
        prevLng: Double,
        prevTimeMs: Long,
        newLat: Double,
        newLng: Double,
        newTimeMs: Long,
        maxSpeedMps: Double = 15.0
    ): Boolean {
        if (!prevLat.isFinite() || !prevLng.isFinite() || !newLat.isFinite() || !newLng.isFinite()) {
            return true
        }
        if (newTimeMs < prevTimeMs) {
            return true
        }
        val dist = calculateDistanceMeters(prevLat, prevLng, newLat, newLng)
        if (newTimeMs == prevTimeMs) {
            return dist > 5.0
        }
        val dtSec = (newTimeMs - prevTimeMs) / 1000.0
        return (dist / dtSec) > maxSpeedMps && dist > 20.0
    }

    fun computeGcpCalibration(
        measuredLat: Double,
        measuredLng: Double,
        knownLat: Double,
        knownLng: Double,
        benchmarkName: String = "Survey Benchmark"
    ): GcpCalibration {
        val deltaLat = knownLat - measuredLat
        val deltaLng = knownLng - measuredLng
        val offsetMeters = calculateDistanceMeters(measuredLat, measuredLng, knownLat, knownLng)
        return GcpCalibration(deltaLat, deltaLng, offsetMeters, benchmarkName)
    }
}

object CoordinateValidator {
    fun isValidCoordinate(lat: Double, lng: Double, accuracyMeters: Double): Boolean {
        if (!lat.isFinite() || !lng.isFinite() || !accuracyMeters.isFinite()) return false
        if (lat !in -90.0..90.0 || lng !in -180.0..180.0) return false
        // Reject [0, 0] null-island dummy GPS coordinates
        if (abs(lat) < 1e-6 && abs(lng) < 1e-6) return false
        if (accuracyMeters <= 0.0 || accuracyMeters > 50.0) return false
        return true
    }
}

enum class GpsFixStatus {
    ACCEPTED,
    REJECTED_INVALID_OR_WEAK,
    REJECTED_STALE_OR_DUPLICATE,
    REJECTED_MULTIPATH_OUTLIER
}

class GpsKalmanFilter(
    private var processNoise: Double = 3.0
) {
    private var lat: Double? = null
    private var lng: Double? = null
    private var variance: Double = -1.0
    private var lastTimestampMs: Long = 0L

    fun reset() {
        lat = null
        lng = null
        variance = -1.0
        lastTimestampMs = 0L
    }

    fun update(
        rawLat: Double,
        rawLng: Double,
        accuracyMeters: Double,
        timestampMs: Long = System.currentTimeMillis()
    ): KalmanEstimate {
        val safeAcc = max(0.5, accuracyMeters)
        val measVar = safeAcc * safeAcc
        val curLat = lat
        val curLng = lng
        if (curLat == null || curLng == null || variance < 0.0) {
            lat = rawLat
            lng = rawLng
            variance = measVar
            lastTimestampMs = timestampMs
            return KalmanEstimate(rawLat, rawLng, safeAcc)
        }

        val dtSec = ((timestampMs - lastTimestampMs) / 1000.0).coerceIn(0.1, 10.0)
        lastTimestampMs = timestampMs

        val latRad = curLat * PI / 180.0
        val mPerDegLat = 111132.954 - 559.822 * cos(2.0 * latRad)
        val mPerDegLng = 111412.84 * cos(latRad)

        val predVar = variance + dtSec * processNoise
        val gain = predVar / (predVar + measVar)

        val latDiffM = (rawLat - curLat) * mPerDegLat * gain
        val lngDiffM = (rawLng - curLng) * mPerDegLng * gain

        val nextLat = curLat + latDiffM / mPerDegLat
        val nextLng = curLng + lngDiffM / mPerDegLng
        lat = nextLat
        lng = nextLng
        variance = (1.0 - gain) * predVar

        return KalmanEstimate(
            lat = nextLat,
            lng = nextLng,
            estimatedAccuracy = max(0.3, sqrt(variance))
        )
    }
}

class StaticEpochAccumulator(
    private val targetCount: Int = 20
) {
    private val samples = mutableListOf<EpochSample>()

    fun reset() = samples.clear()
    fun getCount(): Int = samples.size
    fun isComplete(): Boolean = samples.size >= targetCount

    fun addSample(lat: Double, lng: Double, accuracyMeters: Double, timestampMs: Long = System.currentTimeMillis()) {
        if (!CoordinateValidator.isValidCoordinate(lat, lng, accuracyMeters)) return
        if (accuracyMeters > 25.0) return
        samples.add(EpochSample(lat, lng, max(0.5, accuracyMeters), timestampMs))
    }

    fun computeResult(): StaticEpochResult? {
        if (samples.isEmpty()) return null
        var sumW = 0.0
        var sumWLat = 0.0
        var sumWLng = 0.0
        samples.forEach { s ->
            val w = 1.0 / (s.accuracy * s.accuracy)
            sumW += w
            sumWLat += s.lat * w
            sumWLng += s.lng * w
        }
        val meanLat = sumWLat / sumW
        val meanLng = sumWLng / sumW
        var sumDistSq = 0.0
        samples.forEach { s ->
            val d = GeoAndGpsUtils.calculateDistanceMeters(meanLat, meanLng, s.lat, s.lng)
            sumDistSq += d * d
        }
        val stdDev = sqrt(sumDistSq / samples.size)
        val stdErr = 1.0 / sqrt(sumW)
        val meanAcc = samples.map { it.accuracy }.average()
        val converged = max(
            0.3,
            min(meanAcc, max(stdErr, stdDev / max(1.0, sqrt(samples.size.toDouble()))))
        )
        return StaticEpochResult(
            lat = meanLat,
            lng = meanLng,
            convergedAccuracy = converged,
            stdDevMeters = stdDev,
            standardErrorMeters = stdErr,
            sampleCount = samples.size,
            isConverged = samples.size >= targetCount
        )
    }
}

/**
 * Pure-Kotlin GPS boundary survey pipeline enforcing strict ordering:
 * 1. Coordinate & accuracy validation ([0,0], NaN, bounds, >50m accuracy rejected)
 * 2. Timestamp monotonicity & duplicate-fix gating
 * 3. Multipath velocity outlier rejection BEFORE Kalman / epoch / boundary storage;
 *    rejected fixes NEVER mutate [prevAcceptedRawLat]/[prevAcceptedRawLng]/[prevAcceptedRawTimeMs].
 * 4. Optional GCP offset calibration + Kalman filter
 * 5. Static epoch averaging & manual corner capture strictly from accepted filtered coordinates.
 */
class GpsSurveySession(
    epochTargetCount: Int = 10
) {
    private val kalman = GpsKalmanFilter()
    private val epochAccumulator = StaticEpochAccumulator(targetCount = epochTargetCount)
    private val _boundaryPoints = mutableListOf<Pair<Double, Double>>()

    var hasAcceptedFix: Boolean = false
        private set
    var filteredLat: Double = 0.0
        private set
    var filteredLng: Double = 0.0
        private set
    var filteredAccuracy: Double = 0.0
        private set
    var prevAcceptedRawLat: Double = 0.0
        private set
    var prevAcceptedRawLng: Double = 0.0
        private set
    var prevAcceptedRawTimeMs: Long = 0L
        private set
    var outliersRejected: Int = 0
        private set
    var weakFixesSkipped: Int = 0
        private set
    var staleOrDuplicateSkipped: Int = 0
        private set
    var collectingEpochs: Boolean = false
        private set
    var epochCount: Int = 0
        private set
    var lastAlertNote: String? = null
        private set
    var gcpCalibration: GcpCalibration? = null

    val boundaryPoints: List<Pair<Double, Double>>
        get() = _boundaryPoints.toList()

    fun ingestRawFix(
        rawLat: Double,
        rawLng: Double,
        accuracyMeters: Double,
        timestampMs: Long
    ): GpsFixStatus {
        // 1. Validate coordinates & accuracy FIRST
        if (!CoordinateValidator.isValidCoordinate(rawLat, rawLng, accuracyMeters)) {
            weakFixesSkipped++
            lastAlertNote = if (accuracyMeters.isFinite()) {
                "Skipped low-quality/invalid fix (±${accuracyMeters.toInt()}m)."
            } else {
                "Skipped invalid non-finite GPS fix."
            }
            return GpsFixStatus.REJECTED_INVALID_OR_WEAK
        }

        // 2. Reject stale (out-of-order) or duplicate timestamps before Kalman & outlier reference update
        if (hasAcceptedFix) {
            if (timestampMs < prevAcceptedRawTimeMs) {
                staleOrDuplicateSkipped++
                lastAlertNote = "Ignored out-of-order stale GPS timestamp."
                return GpsFixStatus.REJECTED_STALE_OR_DUPLICATE
            }
            if (timestampMs == prevAcceptedRawTimeMs) {
                val dupDist = GeoAndGpsUtils.calculateDistanceMeters(
                    prevAcceptedRawLat,
                    prevAcceptedRawLng,
                    rawLat,
                    rawLng
                )
                return if (dupDist > 5.0) {
                    outliersRejected++
                    lastAlertNote = "Multipath jump on duplicate timestamp rejected."
                    GpsFixStatus.REJECTED_MULTIPATH_OUTLIER
                } else {
                    staleOrDuplicateSkipped++
                    GpsFixStatus.REJECTED_STALE_OR_DUPLICATE
                }
            }

            // 3. Velocity / multipath spike check against LAST ACCEPTED raw fix (do not update prevAcceptedRaw* on reject)
            if (GeoAndGpsUtils.isMultipathOutlier(
                    prevLat = prevAcceptedRawLat,
                    prevLng = prevAcceptedRawLng,
                    prevTimeMs = prevAcceptedRawTimeMs,
                    newLat = rawLat,
                    newLng = rawLng,
                    newTimeMs = timestampMs
                )
            ) {
                outliersRejected++
                lastAlertNote = "Multipath velocity spike rejected cleanly."
                return GpsFixStatus.REJECTED_MULTIPATH_OUTLIER
            }
        }

        // 4. Commit accepted raw fix reference only AFTER passing all validation & outlier checks
        prevAcceptedRawLat = rawLat
        prevAcceptedRawLng = rawLng
        prevAcceptedRawTimeMs = timestampMs

        val gcpDeltaLat = gcpCalibration?.deltaLat ?: 0.0
        val gcpDeltaLng = gcpCalibration?.deltaLng ?: 0.0
        val calibratedLat = rawLat + gcpDeltaLat
        val calibratedLng = rawLng + gcpDeltaLng

        // 5. Kalman filter update on validated fix
        val est = kalman.update(calibratedLat, calibratedLng, accuracyMeters, timestampMs)
        if (!CoordinateValidator.isValidCoordinate(est.lat, est.lng, est.estimatedAccuracy)) {
            weakFixesSkipped++
            return GpsFixStatus.REJECTED_INVALID_OR_WEAK
        }

        filteredLat = est.lat
        filteredLng = est.lng
        filteredAccuracy = est.estimatedAccuracy
        hasAcceptedFix = true
        lastAlertNote = null

        // 6. Epoch accumulation uses filtered coordinates (already past outlier & Kalman gates)
        if (collectingEpochs) {
            epochAccumulator.addSample(est.lat, est.lng, accuracyMeters, timestampMs)
            epochCount = epochAccumulator.getCount()
            if (epochAccumulator.isComplete()) {
                collectingEpochs = false
                epochAccumulator.computeResult()?.let { converged ->
                    if (CoordinateValidator.isValidCoordinate(
                            converged.lat,
                            converged.lng,
                            converged.convergedAccuracy
                        )
                    ) {
                        _boundaryPoints.add(converged.lat to converged.lng)
                    }
                }
            }
        }
        return GpsFixStatus.ACCEPTED
    }

    fun startStaticEpochCollection(): Boolean {
        if (!hasAcceptedFix || collectingEpochs) return false
        epochAccumulator.reset()
        epochCount = 0
        collectingEpochs = true
        return true
    }

    fun captureManualCorner(): Pair<Double, Double>? {
        if (!hasAcceptedFix || !CoordinateValidator.isValidCoordinate(filteredLat, filteredLng, filteredAccuracy)) {
            lastAlertNote = "Wait for valid GNSS lock (±50m or better) before capturing corner."
            return null
        }
        val corner = filteredLat to filteredLng
        _boundaryPoints.add(corner)
        lastAlertNote = null
        return corner
    }

    fun undoLastCorner(): Boolean {
        if (_boundaryPoints.isEmpty()) return false
        _boundaryPoints.removeAt(_boundaryPoints.lastIndex)
        return true
    }

    fun clearAll() {
        _boundaryPoints.clear()
        kalman.reset()
        epochAccumulator.reset()
        hasAcceptedFix = false
        filteredLat = 0.0
        filteredLng = 0.0
        filteredAccuracy = 0.0
        prevAcceptedRawLat = 0.0
        prevAcceptedRawLng = 0.0
        prevAcceptedRawTimeMs = 0L
        outliersRejected = 0
        weakFixesSkipped = 0
        staleOrDuplicateSkipped = 0
        collectingEpochs = false
        epochCount = 0
        lastAlertNote = null
    }

    fun currentAreaSqm(): Double = GeoAndGpsUtils.computeGpsPolygonAreaSqm(_boundaryPoints)
    fun currentPerimeterMeters(): Double = GeoAndGpsUtils.computeGpsPolygonPerimeterMeters(_boundaryPoints)
}
