package com.sthalmeasure.app.domain

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.roundToInt

enum class ImportedCrsType {
    WGS84,
    WGS84_SWAPPED,
    UTM,
    CUSTOM_TM,
    WEB_MERCATOR,
    LOCAL_PLANAR
}

data class GisFeature(
    val points: List<CadPoint>,
    val closed: Boolean = true,
    val isHole: Boolean = false,
    val label: String = ""
)

data class GisImportResult(
    val points: List<CadPoint>,
    val detectedFormat: String,
    val crsLabel: String,
    val warnings: List<String> = emptyList(),
    val errorMessage: String? = null,
    val features: List<GisFeature> = if (points.size >= 2) listOf(GisFeature(points, points.size >= 3)) else emptyList(),
    val crsType: ImportedCrsType = ImportedCrsType.LOCAL_PLANAR,
    val utmZone: Int? = null,
    val utmHemisphere: Char = 'N',
    val tmCentralMeridianDeg: Double? = null,
    val tmLatOriginDeg: Double = 0.0,
    val tmScaleFactor: Double = 0.9996,
    val tmFalseEasting: Double = 500000.0,
    val tmFalseNorthing: Double = 0.0,
    val unitScaleToMeters: Double = 1.0,
    val totalAreaSqm: Double = 0.0,
    val totalPerimeterMeters: Double = 0.0
) {
    val isValid: Boolean get() = errorMessage == null && (points.isNotEmpty() || features.isNotEmpty())
}

object ShapefileSupport {
    private const val WGS84_PRJ =
        """GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]"""

    fun validateImportedVertices(
        points: List<CadPoint>,
        format: String,
        prjText: String? = null,
        stateHint: String = "Andhra Pradesh",
        unitScaleHint: Double = 1.0
    ): GisImportResult {
        val features = if (points.isNotEmpty()) {
            listOf(GisFeature(points = points, closed = points.size >= 3))
        } else {
            emptyList()
        }
        return validateImportedFeatures(
            features = features,
            format = format,
            prjText = prjText,
            stateHint = stateHint,
            unitScaleHint = unitScaleHint
        )
    }

    fun validateImportedFeatures(
        features: List<GisFeature>,
        format: String,
        prjText: String? = null,
        stateHint: String = "Andhra Pradesh",
        unitScaleHint: Double = 1.0
    ): GisImportResult {
        val nonEmptyFeatures = features.mapNotNull { feat ->
            val finitePts = feat.points.filter { it.x.isFinite() && it.y.isFinite() }
            if (finitePts.size != feat.points.size) {
                return GisImportResult(
                    points = emptyList(),
                    detectedFormat = format,
                    crsLabel = "Invalid",
                    errorMessage = "File contains NaN or infinite coordinates and cannot be imported."
                )
            }
            if (finitePts.size >= 2) feat.copy(points = finitePts) else null
        }

        val allPts = nonEmptyFeatures.flatMap { it.points }
        if (allPts.isEmpty()) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = format,
                crsLabel = prjText?.take(80).orEmpty().ifBlank { "Unknown" },
                errorMessage = "No valid polygon or polyline vertices were found in the $format file."
            )
        }
        val warnings = mutableListOf<String>()
        if (allPts.all { abs(it.x) < 1e-6 && abs(it.y) < 1e-6 }) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = format,
                crsLabel = "Invalid (0,0)",
                errorMessage = "All imported coordinates sit at Null Island [0, 0]. Verify CRS or coordinate fields."
            )
        }

        val prjRaw = prjText.orEmpty()
        val prjUpper = prjRaw.uppercase()
        val hasProjectedPrj = prjUpper.contains("PROJCS") ||
            prjUpper.contains("UTM") ||
            prjUpper.contains("TRANSVERSE_MERCATOR") ||
            prjUpper.contains("MERCATOR")

        val prjUnitScale = parsePrjUnitScaleMeters(prjRaw) ?: 1.0
        val withinLonLatRange = allPts.all { abs(it.x) <= 180.0 && abs(it.y) <= 90.0 }
        val inIndiaWgs84 = allPts.all { it.x in 65.0..99.0 && it.y in 5.0..38.5 }
        val inIndiaSwapped = !inIndiaWgs84 && allPts.all { it.x in 5.0..38.5 && it.y in 65.0..99.0 }
        val inIndiaWebMercator = allPts.all { it.x in 7_400_000.0..11_200_000.0 && it.y in 650_000.0..4_600_000.0 }
        val inIndiaUtmMeters = allPts.all { it.x in 150_000.0..860_000.0 && it.y in 650_000.0..4_200_000.0 }

        var crsType = ImportedCrsType.LOCAL_PLANAR
        var crsLabel = "Local Planar Survey Grid (m)"
        var utmZone: Int? = null
        var utmHemisphere = 'N'
        var tmCm: Double? = null
        var tmLat0 = 0.0
        var tmScale = 0.9996
        var tmFe = 500000.0
        var tmFn = 0.0
        var unitScale = 1.0

        when {
            (prjUpper.contains("WGS_1984") || prjUpper.contains("WGS 84") || prjUpper.contains("4326")) && !hasProjectedPrj -> {
                if (!withinLonLatRange) {
                    return GisImportResult(
                        points = emptyList(),
                        detectedFormat = format,
                        crsLabel = "WGS84 Mismatch",
                        errorMessage = "PRJ specifies WGS84 degrees, but coordinates exceed valid [-180..180, -90..90] bounds."
                    )
                }
                crsType = if (inIndiaSwapped) ImportedCrsType.WGS84_SWAPPED else ImportedCrsType.WGS84
                crsLabel = "EPSG:4326 (WGS84)"
            }
            prjUpper.contains("GEOGCS") && !hasProjectedPrj -> {
                if (!withinLonLatRange) {
                    return GisImportResult(
                        points = emptyList(),
                        detectedFormat = format,
                        crsLabel = "Geographic Bounds Error",
                        errorMessage = "PRJ specifies geographic degrees, but coordinates exceed [-180..180, -90..90] bounds."
                    )
                }
                crsType = if (inIndiaSwapped) ImportedCrsType.WGS84_SWAPPED else ImportedCrsType.WGS84
                crsLabel = "Geographic Lat/Lng (Degrees)"
            }
            prjUpper.contains("3857") || prjUpper.contains("900913") ||
                prjUpper.contains("PSEUDO_MERCATOR") || prjUpper.contains("MERCATOR_AUXILIARY_SPHERE") -> {
                crsType = ImportedCrsType.WEB_MERCATOR
                crsLabel = "EPSG:3857 (Web Mercator)"
                unitScale = prjUnitScale
            }
            hasProjectedPrj -> {
                unitScale = prjUnitScale
                val parsedUtm = parseUtmZoneFromPrj(prjRaw)
                val parsedCm = parsePrjParameter(prjRaw, "central_meridian")
                val parsedFe = parsePrjParameter(prjRaw, "false_easting")
                val parsedFn = parsePrjParameter(prjRaw, "false_northing")
                val parsedK0 = parsePrjParameter(prjRaw, "scale_factor")
                val parsedLat0 = parsePrjParameter(prjRaw, "latitude_of_origin")

                if (parsedUtm != null) {
                    utmZone = parsedUtm.first
                    utmHemisphere = parsedUtm.second
                    crsType = ImportedCrsType.UTM
                    crsLabel = "WGS84 / UTM Zone ${parsedUtm.first}${parsedUtm.second}"
                } else if (parsedCm != null) {
                    tmCm = parsedCm
                    tmLat0 = parsedLat0 ?: 0.0
                    tmScale = parsedK0 ?: 0.9996
                    tmFe = (parsedFe ?: 500000.0) * unitScale
                    tmFn = (parsedFn ?: 0.0) * unitScale
                    crsType = ImportedCrsType.CUSTOM_TM
                    crsLabel = "Projected TM (CM ${"%.1f".format(parsedCm)}°E)"
                } else if (inIndiaUtmMeters) {
                    val recZone = GeoAndGpsUtils.recommendedUtmZoneForState(stateHint)
                    utmZone = recZone
                    utmHemisphere = 'N'
                    crsType = ImportedCrsType.UTM
                    crsLabel = "UTM Zone ${recZone}N (Inferred from .prj + $stateHint)"
                    warnings.add("Projected .prj lacked explicit UTM zone number; mapped via UTM Zone ${recZone}N.")
                } else {
                    crsType = ImportedCrsType.LOCAL_PLANAR
                    crsLabel = "Projected CRS (Planar Meters)"
                    warnings.add("Projected CRS in .prj (${prjRaw.take(48)}) mapped as planar survey meters.")
                }
            }
            inIndiaWgs84 -> {
                crsType = ImportedCrsType.WGS84
                crsLabel = "EPSG:4326 (WGS84 India Bounds)"
            }
            inIndiaSwapped -> {
                crsType = ImportedCrsType.WGS84_SWAPPED
                crsLabel = "WGS84 (Auto-swapped Lat/Lon)"
                warnings.add("Detected Lat/Lon axis order in India bounds; normalized to Lon/Lat.")
            }
            inIndiaWebMercator -> {
                crsType = ImportedCrsType.WEB_MERCATOR
                crsLabel = "EPSG:3857 (Web Mercator)"
            }
            inIndiaUtmMeters -> {
                val recZone = GeoAndGpsUtils.recommendedUtmZoneForState(stateHint)
                crsType = ImportedCrsType.UTM
                utmZone = recZone
                utmHemisphere = 'N'
                crsLabel = "UTM Zone ${recZone}N ($stateHint Default)"
                warnings.add("No .prj file found — inferred India UTM Zone ${recZone}N. Switch zone chip below if parcel sits in an adjacent zone.")
            }
            else -> {
                unitScale = unitScaleHint.takeIf { it > 0.0 && it.isFinite() } ?: 1.0
                crsType = ImportedCrsType.LOCAL_PLANAR
                val unitTag = when {
                    abs(unitScale - 0.3048) < 1e-4 -> "ft -> m"
                    abs(unitScale - 0.001) < 1e-6 -> "mm -> m"
                    abs(unitScale - 0.01) < 1e-5 -> "cm -> m"
                    abs(unitScale - 0.0254) < 1e-5 -> "in -> m"
                    else -> "m"
                }
                crsLabel = "Local Planar Survey Grid ($unitTag)"
                if (allPts.any { abs(it.x) > 1000.0 || abs(it.y) > 1000.0 }) {
                    warnings.add("Unrecognized projected grid; select a UTM/Mercator CRS chip if georeferenced.")
                }
            }
        }

        val primaryFeature = nonEmptyFeatures
            .filter { !it.isHole }
            .maxByOrNull { it.points.size }
            ?: nonEmptyFeatures.first()

        val (areaSqm, perimM) = computeMetricAreaAndPerimeter(
            features = nonEmptyFeatures,
            crsType = crsType,
            utmZone = utmZone,
            utmHemisphere = utmHemisphere,
            tmCentralMeridianDeg = tmCm,
            tmLatOriginDeg = tmLat0,
            tmScaleFactor = tmScale,
            tmFalseEasting = tmFe,
            tmFalseNorthing = tmFn,
            unitScaleToMeters = unitScale,
            stateHint = stateHint
        )

        return GisImportResult(
            points = primaryFeature.points,
            detectedFormat = format,
            crsLabel = crsLabel,
            warnings = warnings,
            features = nonEmptyFeatures,
            crsType = crsType,
            utmZone = utmZone,
            utmHemisphere = utmHemisphere,
            tmCentralMeridianDeg = tmCm,
            tmLatOriginDeg = tmLat0,
            tmScaleFactor = tmScale,
            tmFalseEasting = tmFe,
            tmFalseNorthing = tmFn,
            unitScaleToMeters = unitScale,
            totalAreaSqm = areaSqm,
            totalPerimeterMeters = perimM
        )
    }

    fun projectPointToLatLng(
        pt: CadPoint,
        anchorLat: Double,
        anchorLng: Double,
        originPoint: CadPoint,
        crsType: ImportedCrsType,
        utmZone: Int? = null,
        utmHemisphere: Char = 'N',
        tmCentralMeridianDeg: Double? = null,
        tmLatOriginDeg: Double = 0.0,
        tmScaleFactor: Double = 0.9996,
        tmFalseEasting: Double = 500000.0,
        tmFalseNorthing: Double = 0.0,
        unitScaleToMeters: Double = 1.0,
        stateHint: String = "Andhra Pradesh"
    ): Pair<Double, Double> {
        return when (crsType) {
            ImportedCrsType.WGS84 -> pt.y to pt.x
            ImportedCrsType.WGS84_SWAPPED -> pt.x to pt.y
            ImportedCrsType.UTM -> {
                val zone = utmZone ?: GeoAndGpsUtils.recommendedUtmZoneForState(stateHint)
                GeoAndGpsUtils.utmToWgs84(
                    easting = pt.x * unitScaleToMeters,
                    northing = pt.y * unitScaleToMeters,
                    zone = zone,
                    hemisphere = utmHemisphere
                )
            }
            ImportedCrsType.CUSTOM_TM -> {
                val cm = tmCentralMeridianDeg ?: (((utmZone ?: GeoAndGpsUtils.recommendedUtmZoneForState(stateHint)) - 1) * 6 - 180 + 3).toDouble()
                GeoAndGpsUtils.transverseMercatorToWgs84(
                    easting = pt.x * unitScaleToMeters,
                    northing = pt.y * unitScaleToMeters,
                    centralMeridianDeg = cm,
                    latOriginDeg = tmLatOriginDeg,
                    scaleFactor = tmScaleFactor,
                    falseEasting = tmFalseEasting,
                    falseNorthing = tmFalseNorthing
                )
            }
            ImportedCrsType.WEB_MERCATOR -> {
                GeoAndGpsUtils.webMercatorToWgs84(
                    xMeters = pt.x * unitScaleToMeters,
                    yMeters = pt.y * unitScaleToMeters
                )
            }
            ImportedCrsType.LOCAL_PLANAR -> {
                val mLat = 111132.954 - 559.822 * kotlin.math.cos(2.0 * anchorLat * kotlin.math.PI / 180.0)
                val mLng = (111412.84 * kotlin.math.cos(anchorLat * kotlin.math.PI / 180.0)).coerceAtLeast(1000.0)
                val dxMeters = (pt.x - originPoint.x) * unitScaleToMeters
                val dyMeters = (pt.y - originPoint.y) * unitScaleToMeters
                (anchorLat + dyMeters / mLat) to (anchorLng + dxMeters / mLng)
            }
        }
    }

    fun computeMetricAreaAndPerimeter(
        features: List<GisFeature>,
        crsType: ImportedCrsType,
        utmZone: Int? = null,
        utmHemisphere: Char = 'N',
        tmCentralMeridianDeg: Double? = null,
        tmLatOriginDeg: Double = 0.0,
        tmScaleFactor: Double = 0.9996,
        tmFalseEasting: Double = 500000.0,
        tmFalseNorthing: Double = 0.0,
        unitScaleToMeters: Double = 1.0,
        stateHint: String = "Andhra Pradesh"
    ): Pair<Double, Double> {
        if (features.isEmpty()) return 0.0 to 0.0
        var totalArea = 0.0
        var totalPerim = 0.0
        val singleFeature = features.size == 1

        if (crsType == ImportedCrsType.LOCAL_PLANAR) {
            features.forEach { feat ->
                val scaled = feat.points.map {
                    CadPoint(it.x * unitScaleToMeters, it.y * unitScaleToMeters, it.label)
                }
                val treatClosed = feat.closed || (singleFeature && scaled.size >= 3)
                if (treatClosed && scaled.size >= 3) {
                    val a = CadEngine.computePolygonArea(scaled)
                    totalArea += if (feat.isHole) -a else a
                    totalPerim += CadEngine.computePolygonPerimeter(scaled)
                } else if (scaled.size >= 2) {
                    for (i in 0 until scaled.size - 1) {
                        totalPerim += hypot(scaled[i + 1].x - scaled[i].x, scaled[i + 1].y - scaled[i].y)
                    }
                }
            }
            return totalArea.coerceAtLeast(0.0) to totalPerim.coerceAtLeast(0.0)
        }

        val fallbackOrigin = features.first().points.first()
        features.forEach { feat ->
            val latLngs = feat.points.map { pt ->
                projectPointToLatLng(
                    pt = pt,
                    anchorLat = 0.0,
                    anchorLng = 0.0,
                    originPoint = fallbackOrigin,
                    crsType = crsType,
                    utmZone = utmZone,
                    utmHemisphere = utmHemisphere,
                    tmCentralMeridianDeg = tmCentralMeridianDeg,
                    tmLatOriginDeg = tmLatOriginDeg,
                    tmScaleFactor = tmScaleFactor,
                    tmFalseEasting = tmFalseEasting,
                    tmFalseNorthing = tmFalseNorthing,
                    unitScaleToMeters = unitScaleToMeters,
                    stateHint = stateHint
                )
            }
            val treatClosed = feat.closed || (singleFeature && latLngs.size >= 3)
            if (treatClosed && latLngs.size >= 3) {
                val a = GeoAndGpsUtils.computeGpsPolygonAreaSqm(latLngs)
                totalArea += if (feat.isHole) -a else a
                totalPerim += GeoAndGpsUtils.computeGpsPolygonPerimeterMeters(latLngs, closed = true)
            } else if (latLngs.size >= 2) {
                totalPerim += GeoAndGpsUtils.computeGpsPolygonPerimeterMeters(latLngs, closed = false)
            }
        }
        return totalArea.coerceAtLeast(0.0) to totalPerim.coerceAtLeast(0.0)
    }

    private fun parsePrjUnitScaleMeters(prj: String): Double? {
        val m = Regex("""UNIT\s*\[\s*"([^"]+)"\s*,\s*([0-9.eE+-]+)""", RegexOption.IGNORE_CASE).find(prj)
            ?: return null
        val name = m.groupValues[1].uppercase()
        val factor = m.groupValues[2].toDoubleOrNull() ?: return null
        // Ignore angular Degree units (handled as geographic degrees)
        if (name.contains("DEGREE") || name.contains("RADIAN")) return null
        return factor.takeIf { it > 0.0 && it.isFinite() }
    }

    private fun parsePrjParameter(prj: String, paramName: String): Double? {
        val m = Regex("""PARAMETER\s*\[\s*"$paramName"\s*,\s*([0-9.eE+-]+)\s*]""", RegexOption.IGNORE_CASE)
            .find(prj)
        return m?.groupValues?.getOrNull(1)?.toDoubleOrNull()
    }

    private fun parseUtmZoneFromPrj(prj: String): Pair<Int, Char>? {
        val utmRegex = Regex("""UTM[_\s-]*Zone[_\s-]*(\d{1,2})\s*([NS])?""", RegexOption.IGNORE_CASE)
        utmRegex.find(prj)?.let { m ->
            val z = m.groupValues[1].toIntOrNull()?.coerceIn(1, 60)
            val h = m.groupValues[2].uppercase().firstOrNull() ?: 'N'
            if (z != null) return z to h
        }
        val epsgN = Regex("""326(\d{2})""").find(prj)
        if (epsgN != null) {
            val z = epsgN.groupValues[1].toIntOrNull()
            if (z in 1..60) return z!! to 'N'
        }
        val epsgS = Regex("""327(\d{2})""").find(prj)
        if (epsgS != null) {
            val z = epsgS.groupValues[1].toIntOrNull()
            if (z in 1..60) return z!! to 'S'
        }
        val cm = parsePrjParameter(prj, "central_meridian")
        val fe = parsePrjParameter(prj, "false_easting")
        val k0 = parsePrjParameter(prj, "scale_factor")
        if (cm != null && fe != null && abs(fe - 500000.0) < 1.0 && abs((k0 ?: 0.9996) - 0.9996) < 1e-4) {
            val zone = ((cm + 183.0) / 6.0).roundToInt().coerceIn(1, 60)
            val expectedCm = ((zone - 1) * 6 - 180 + 3).toDouble()
            if (abs(cm - expectedCm) < 0.05) {
                val fn = parsePrjParameter(prj, "false_northing") ?: 0.0
                return zone to (if (fn >= 9_000_000.0) 'S' else 'N')
            }
        }
        return null
    }

    fun parseShapefileZip(zipBytes: ByteArray, stateHint: String = "Andhra Pradesh"): GisImportResult {
        var shpBytes: ByteArray? = null
        var prjText: String? = null
        ZipInputStream(ByteArrayInputStream(zipBytes)).use { zis ->
            var entry: ZipEntry? = zis.nextEntry
            while (entry != null) {
                val lower = entry.name.lowercase()
                if (!entry.isDirectory) {
                    when {
                        lower.endsWith(".shp") && shpBytes == null -> shpBytes = zis.readBytes()
                        lower.endsWith(".prj") && prjText == null -> prjText = zis.readBytes().decodeToString()
                    }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
        val shp = shpBytes ?: return GisImportResult(
            points = emptyList(),
            detectedFormat = "Shapefile ZIP",
            crsLabel = "Missing .shp",
            errorMessage = "Unsupported or invalid ZIP archive: no .shp geometry file found inside ZIP."
        )
        return parseShpBytes(shp, prjText, stateHint = stateHint)
    }

    fun parseShpBytes(
        shpBytes: ByteArray,
        prjText: String? = null,
        stateHint: String = "Andhra Pradesh"
    ): GisImportResult {
        if (shpBytes.size < 100) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = "SHP",
                crsLabel = "Corrupt",
                errorMessage = "Invalid .shp header: file is shorter than 100 bytes."
            )
        }
        val header = ByteBuffer.wrap(shpBytes, 0, 100)
        header.order(ByteOrder.BIG_ENDIAN)
        val fileCode = header.getInt(0)
        if (fileCode != 9994) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = "SHP",
                crsLabel = "Corrupt",
                errorMessage = "Invalid ESRI Shapefile magic code ($fileCode, expected 9994)."
            )
        }
        header.order(ByteOrder.LITTLE_ENDIAN)
        val shapeType = header.getInt(32)
        val supportedTypes = setOf(3, 5, 13, 15, 23, 25)
        if (shapeType !in supportedTypes) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = "SHP",
                crsLabel = "Type $shapeType",
                errorMessage = "Unsupported Shapefile geometry type ($shapeType). Only Polygon (5) and PolyLine (3) are supported."
            )
        }

        val features = mutableListOf<GisFeature>()
        var offset = 100
        while (offset + 8 <= shpBytes.size) {
            val recBuf = ByteBuffer.wrap(shpBytes, offset, shpBytes.size - offset).slice()
            recBuf.order(ByteOrder.BIG_ENDIAN)
            val recNum = recBuf.getInt()
            val contentLenWords = recBuf.getInt()
            val contentLenBytes = contentLenWords * 2
            val contentStart = offset + 8
            if (contentLenBytes < 4 || contentStart + contentLenBytes > shpBytes.size) break

            val recBufData = ByteBuffer.wrap(shpBytes, contentStart, contentLenBytes)
                .slice()
                .order(ByteOrder.LITTLE_ENDIAN)
            val recType = recBufData.getInt()
            if (recType in supportedTypes && recBufData.remaining() >= 40) {
                val isPolygon = recType == 5 || recType == 15 || recType == 25
                recBufData.position(4 + 32) // skip shapeType + bbox (4 doubles)
                val numParts = recBufData.getInt()
                val numPoints = recBufData.getInt()
                if (numParts >= 1 && numPoints >= 2 && recBufData.remaining() >= numParts * 4 + numPoints * 16) {
                    val parts = IntArray(numParts) { recBufData.getInt() }
                    val allRecPts = ArrayList<CadPoint>(numPoints)
                    for (i in 0 until numPoints) {
                        val x = recBufData.getDouble()
                        val y = recBufData.getDouble()
                        allRecPts.add(CadPoint(x, y, "S${i + 1}"))
                    }
                    var primarySign = 0.0
                    for (pIdx in 0 until numParts) {
                        val startIdx = parts[pIdx].coerceIn(0, numPoints)
                        val endIdx = (if (pIdx + 1 < numParts) parts[pIdx + 1] else numPoints).coerceIn(startIdx, numPoints)
                        val rawRing = allRecPts.subList(startIdx, endIdx).filter { it.x.isFinite() && it.y.isFinite() }
                        val cleaned = if (rawRing.size >= 2 &&
                            abs(rawRing.first().x - rawRing.last().x) < 1e-7 &&
                            abs(rawRing.first().y - rawRing.last().y) < 1e-7
                        ) rawRing.dropLast(1) else rawRing
                        if (cleaned.size >= 2) {
                            val signed = signedPlanarArea(cleaned)
                            if (pIdx == 0) primarySign = signed
                            val isHole = isPolygon && numParts > 1 && pIdx > 0 && primarySign != 0.0 && (signed * primarySign < 0.0)
                            features.add(
                                GisFeature(
                                    points = cleaned,
                                    closed = isPolygon && cleaned.size >= 3,
                                    isHole = isHole,
                                    label = "R${recNum}_${pIdx + 1}"
                                )
                            )
                        }
                    }
                }
            }
            offset = contentStart + contentLenBytes
        }

        return validateImportedFeatures(
            features = features,
            format = "Shapefile (.shp)",
            prjText = prjText,
            stateHint = stateHint
        )
    }

    private fun signedPlanarArea(pts: List<CadPoint>): Double {
        if (pts.size < 3) return 0.0
        var sum = 0.0
        for (i in pts.indices) {
            val j = (i + 1) % pts.size
            sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y
        }
        return sum / 2.0
    }

    fun exportPolygonToShapefileZip(
        points: List<CadPoint>,
        layerName: String = "sthal_parcel",
        includeWgs84Prj: Boolean = true
    ): ByteArray {
        val ring = if (points.size >= 3) points + points.first() else points
        val minX = ring.minOfOrNull { it.x } ?: 0.0
        val minY = ring.minOfOrNull { it.y } ?: 0.0
        val maxX = ring.maxOfOrNull { it.x } ?: 0.0
        val maxY = ring.maxOfOrNull { it.y } ?: 0.0

        val numParts = 1
        val numPoints = ring.size
        val recContentBytes = 4 + 32 + 4 + 4 + (numParts * 4) + (numPoints * 16)
        val totalShpBytes = 100 + 8 + recContentBytes

        val shp = ByteBuffer.allocate(totalShpBytes)
        // Header (100 bytes)
        shp.order(ByteOrder.BIG_ENDIAN)
        shp.putInt(9994)
        repeat(5) { shp.putInt(0) }
        shp.putInt(totalShpBytes / 2)
        shp.order(ByteOrder.LITTLE_ENDIAN)
        shp.putInt(1000)
        shp.putInt(5) // Polygon
        shp.putDouble(minX)
        shp.putDouble(minY)
        shp.putDouble(maxX)
        shp.putDouble(maxY)
        repeat(4) { shp.putDouble(0.0) } // Zmin, Zmax, Mmin, Mmax

        // Record header (big endian)
        shp.order(ByteOrder.BIG_ENDIAN)
        shp.putInt(1)
        shp.putInt(recContentBytes / 2)

        // Record geometry (little endian)
        shp.order(ByteOrder.LITTLE_ENDIAN)
        shp.putInt(5) // Polygon
        shp.putDouble(minX)
        shp.putDouble(minY)
        shp.putDouble(maxX)
        shp.putDouble(maxY)
        shp.putInt(numParts)
        shp.putInt(numPoints)
        shp.putInt(0)
        ring.forEach { pt ->
            shp.putDouble(pt.x)
            shp.putDouble(pt.y)
        }

        // Minimal .shx index (100-byte header + one 8-byte record)
        val shx = ByteBuffer.allocate(108)
        shx.order(ByteOrder.BIG_ENDIAN)
        shx.putInt(9994)
        repeat(5) { shx.putInt(0) }
        shx.putInt(108 / 2)
        shx.order(ByteOrder.LITTLE_ENDIAN)
        shx.putInt(1000)
        shx.putInt(5)
        shx.putDouble(minX)
        shx.putDouble(minY)
        shx.putDouble(maxX)
        shx.putDouble(maxY)
        repeat(4) { shx.putDouble(0.0) }
        shx.order(ByteOrder.BIG_ENDIAN)
        shx.putInt(50) // offset in 16-bit words
        shx.putInt(recContentBytes / 2)

        // Minimal valid 1-record .dbf (NAME text field)
        val dbfBytes = buildMinimalDbf(layerName.take(32))

        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zos ->
            val safeBase = layerName.replace(Regex("[^a-zA-Z0-9_\\-]"), "_").ifBlank { "sthal_parcel" }
            zos.putNextEntry(ZipEntry("$safeBase.shp"))
            zos.write(shp.array())
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("$safeBase.shx"))
            zos.write(shx.array())
            zos.closeEntry()

            zos.putNextEntry(ZipEntry("$safeBase.dbf"))
            zos.write(dbfBytes)
            zos.closeEntry()

            if (includeWgs84Prj) {
                zos.putNextEntry(ZipEntry("$safeBase.prj"))
                zos.write(WGS84_PRJ.toByteArray(Charsets.UTF_8))
                zos.closeEntry()
            }
        }
        return out.toByteArray()
    }

    private fun buildMinimalDbf(parcelName: String): ByteArray {
        val headerSize = 32 + 32 + 1
        val recordSize = 1 + 32
        val buf = ByteBuffer.allocate(headerSize + recordSize + 1).order(ByteOrder.LITTLE_ENDIAN)
        buf.put(0x03) // dBase III
        buf.put(26) // year offset
        buf.put(11)
        buf.put(14)
        buf.putInt(1) // 1 record
        buf.putShort(headerSize.toShort())
        buf.putShort(recordSize.toShort())
        buf.position(32)
        // Field descriptor: PARCEL (C, 32)
        val nameBytes = "PARCEL".toByteArray(Charsets.US_ASCII)
        buf.put(nameBytes)
        buf.position(32 + 11)
        buf.put('C'.code.toByte())
        buf.putInt(0)
        buf.put(32.toByte()) // field length
        buf.put(0) // decimal
        buf.position(32 + 32)
        buf.put(0x0D) // header terminator
        buf.put(0x20) // active record flag
        val valBytes = parcelName.padEnd(32, ' ').take(32).toByteArray(Charsets.US_ASCII)
        buf.put(valBytes)
        buf.put(0x1A) // EOF
        return buf.array()
    }
}
