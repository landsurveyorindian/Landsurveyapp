package com.sthalmeasure.app.domain

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

data class CadPoint(
    val x: Double,
    val y: Double,
    val label: String = ""
)

data class CadCogoInverse(
    val distanceMeters: Double,
    val bearingDeg: Double,
    val deltaX: Double,
    val deltaY: Double,
    val quadrantalBearing: String
)

data class CadSubdivisionResult(
    val part1: List<CadPoint>,
    val part2: List<CadPoint>,
    val part1Area: Double,
    val part2Area: Double,
    val totalArea: Double,
    val splitLine: Pair<CadPoint, CadPoint>
)

data class CadFmbOffset(
    val id: String,
    val distanceAlongGLine: Double,
    val offsetDistance: Double,
    val side: Char,
    val label: String
)

data class OsnapTarget(
    val point: CadPoint,
    val type: String
)

object CadEngine {
    fun computePolygonArea(points: List<CadPoint>): Double {
        if (points.size < 3) return 0.0
        var sum = 0.0
        for (i in points.indices) {
            val j = (i + 1) % points.size
            sum += points[i].x * points[j].y - points[j].x * points[i].y
        }
        return abs(sum) / 2.0
    }

    fun computePolygonPerimeter(points: List<CadPoint>): Double {
        if (points.size < 2) return 0.0
        var perim = 0.0
        for (i in points.indices) {
            val j = (i + 1) % points.size
            perim += hypot(points[j].x - points[i].x, points[j].y - points[i].y)
        }
        return perim
    }

    fun computeBearingWcb(p1: CadPoint, p2: CadPoint): Double {
        var deg = atan2(p2.x - p1.x, p2.y - p1.y) * 180.0 / PI
        if (deg < 0.0) deg += 360.0
        return deg
    }

    fun toQuadrantalBearing(wcbDeg: Double): String {
        val wcb = ((wcbDeg % 360.0) + 360.0) % 360.0
        val (prefix, suffix, angle) = when {
            wcb <= 90.0 -> Triple("N", "E", wcb)
            wcb <= 180.0 -> Triple("S", "E", 180.0 - wcb)
            wcb <= 270.0 -> Triple("S", "W", wcb - 180.0)
            else -> Triple("N", "W", 360.0 - wcb)
        }
        val d = angle.toInt()
        val m = kotlin.math.round((angle - d) * 60.0).toInt().coerceIn(0, 59)
        return "$prefix $d° ${m.toString().padStart(2, '0')}' $suffix"
    }

    fun computeCogoForward(start: CadPoint, bearingDeg: Double, distanceMeters: Double, label: String = ""): CadPoint {
        val rad = bearingDeg * PI / 180.0
        return CadPoint(
            x = start.x + distanceMeters * sin(rad),
            y = start.y + distanceMeters * cos(rad),
            label = label
        )
    }

    fun computeCogoInverse(p1: CadPoint, p2: CadPoint): CadCogoInverse {
        val dist = hypot(p2.x - p1.x, p2.y - p1.y)
        val wcb = computeBearingWcb(p1, p2)
        return CadCogoInverse(
            distanceMeters = dist,
            bearingDeg = wcb,
            deltaX = p2.x - p1.x,
            deltaY = p2.y - p1.y,
            quadrantalBearing = toQuadrantalBearing(wcb)
        )
    }

    fun computeCentroid(points: List<CadPoint>): CadPoint {
        if (points.isEmpty()) return CadPoint(0.0, 0.0)
        return CadPoint(
            x = points.map { it.x }.average(),
            y = points.map { it.y }.average(),
            label = "C"
        )
    }

    fun findOsnapTarget(cursor: CadPoint, boundary: List<CadPoint>, thresholdMeters: Double = 1.5): OsnapTarget? {
        if (boundary.isEmpty()) return null
        var best: OsnapTarget? = null
        var bestDist = thresholdMeters

        boundary.forEach { p ->
            val d = hypot(cursor.x - p.x, cursor.y - p.y)
            if (d < bestDist) {
                bestDist = d
                best = OsnapTarget(p, "Endpoint")
            }
        }
        if (boundary.size >= 2) {
            for (i in boundary.indices) {
                val a = boundary[i]
                val b = boundary[(i + 1) % boundary.size]
                val mid = CadPoint((a.x + b.x) / 2.0, (a.y + b.y) / 2.0, "Mid")
                val d = hypot(cursor.x - mid.x, cursor.y - mid.y)
                if (d < bestDist) {
                    bestDist = d
                    best = OsnapTarget(mid, "Midpoint")
                }
            }
        }
        return best
    }

    /**
     * Inward setback offset polygon (positive insetMeters moves boundary inward).
     */
    fun computeSetbackPolygon(points: List<CadPoint>, insetMeters: Double): List<CadPoint> {
        if (points.size < 3 || !insetMeters.isFinite() || abs(insetMeters) < 1e-6) return points
        // Determine winding order (signed area > 0 = CCW)
        var signedArea = 0.0
        for (i in points.indices) {
            val j = (i + 1) % points.size
            signedArea += points[i].x * points[j].y - points[j].x * points[i].y
        }
        val sign = if (signedArea >= 0.0) 1.0 else -1.0
        val centroid = computeCentroid(points)

        val shifted = mutableListOf<CadPoint>()
        for (i in points.indices) {
            val prev = points[(i - 1 + points.size) % points.size]
            val curr = points[i]
            val next = points[(i + 1) % points.size]

            val e1x = curr.x - prev.x
            val e1y = curr.y - prev.y
            val l1 = hypot(e1x, e1y).coerceAtLeast(1e-6)
            val n1x = -e1y / l1 * sign
            val n1y = e1x / l1 * sign

            val e2x = next.x - curr.x
            val e2y = next.y - curr.y
            val l2 = hypot(e2x, e2y).coerceAtLeast(1e-6)
            val n2x = -e2y / l2 * sign
            val n2y = e2x / l2 * sign

            val bx = n1x + n2x
            val by = n1y + n2y
            val bl = hypot(bx, by)
            val offsetVec = if (bl < 1e-6) {
                Pair(n1x * insetMeters, n1y * insetMeters)
            } else {
                val cosHalf = ((n1x * bx + n1y * by) / bl).coerceAtLeast(0.3)
                val dist = insetMeters / cosHalf
                Pair((bx / bl) * dist, (by / bl) * dist)
            }
            val nx = curr.x + offsetVec.first
            val ny = curr.y + offsetVec.second
            // Clamp overshoot past centroid
            val dOrig = hypot(curr.x - centroid.x, curr.y - centroid.y)
            val dNew = hypot(nx - centroid.x, ny - centroid.y)
            if (insetMeters > 0.0 && dNew > dOrig * 1.25) {
                shifted.add(CadPoint((curr.x + centroid.x) / 2.0, (curr.y + centroid.y) / 2.0, curr.label))
            } else {
                shifted.add(CadPoint(nx, ny, curr.label))
            }
        }
        return shifted
    }

    /**
     * Sutherland-Hodgman style half-plane split by vertical/horizontal line at fraction [ratio] (0..1)
     * across bounding box, used for parcel subdivision previews.
     */
    fun splitPolygonByRatio(points: List<CadPoint>, ratio: Double = 0.5, vertical: Boolean = true): CadSubdivisionResult? {
        if (points.size < 3) return null
        val totalArea = computePolygonArea(points)
        if (totalArea <= 1e-4) return null
        val targetArea = totalArea * ratio.coerceIn(0.1, 0.9)

        val minCoord = if (vertical) points.minOf { it.x } else points.minOf { it.y }
        val maxCoord = if (vertical) points.maxOf { it.x } else points.maxOf { it.y }

        var low = minCoord
        var high = maxCoord
        var bestLeft = points
        var bestRight = emptyList<CadPoint>()
        var splitPos = (low + high) / 2.0

        repeat(28) {
            splitPos = (low + high) / 2.0
            val left = clipHalfPlane(points, splitPos, keepLess = true, vertical = vertical)
            val leftArea = computePolygonArea(left)
            bestLeft = left
            bestRight = clipHalfPlane(points, splitPos, keepLess = false, vertical = vertical)
            if (leftArea < targetArea) low = splitPos else high = splitPos
        }

        val p1 = if (vertical) CadPoint(splitPos, points.minOf { it.y }) else CadPoint(points.minOf { it.x }, splitPos)
        val p2 = if (vertical) CadPoint(splitPos, points.maxOf { it.y }) else CadPoint(points.maxOf { it.x }, splitPos)

        return CadSubdivisionResult(
            part1 = bestLeft,
            part2 = bestRight,
            part1Area = computePolygonArea(bestLeft),
            part2Area = computePolygonArea(bestRight),
            totalArea = totalArea,
            splitLine = Pair(p1, p2)
        )
    }

    private fun clipHalfPlane(
        poly: List<CadPoint>,
        threshold: Double,
        keepLess: Boolean,
        vertical: Boolean
    ): List<CadPoint> {
        if (poly.isEmpty()) return emptyList()
        val output = mutableListOf<CadPoint>()
        fun inside(p: CadPoint): Boolean {
            val v = if (vertical) p.x else p.y
            return if (keepLess) v <= threshold else v >= threshold
        }
        fun intersect(a: CadPoint, b: CadPoint): CadPoint {
            val va = if (vertical) a.x else a.y
            val vb = if (vertical) b.x else b.y
            val denom = (vb - va).let { if (abs(it) < 1e-9) 1e-9 else it }
            val t = ((threshold - va) / denom).coerceIn(0.0, 1.0)
            return CadPoint(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y))
        }
        for (i in poly.indices) {
            val cur = poly[i]
            val prev = poly[(i - 1 + poly.size) % poly.size]
            val curIn = inside(cur)
            val prevIn = inside(prev)
            if (curIn) {
                if (!prevIn) output.add(intersect(prev, cur))
                output.add(cur)
            } else if (prevIn) {
                output.add(intersect(prev, cur))
            }
        }
        return output
    }

    /**
     * Convert FMB chainage offsets along a G-line baseline into 2D surveyed boundary vertices.
     */
    fun computeFmbLadderPoints(gStart: CadPoint, gEnd: CadPoint, offsets: List<CadFmbOffset>): List<CadPoint> {
        val len = hypot(gEnd.x - gStart.x, gEnd.y - gStart.y).coerceAtLeast(1e-6)
        val ux = (gEnd.x - gStart.x) / len
        val uy = (gEnd.y - gStart.y) / len
        // Left normal = (-uy, ux), Right normal = (uy, -ux)
        return offsets.sortedBy { it.distanceAlongGLine }.map { off ->
            val bx = gStart.x + ux * off.distanceAlongGLine
            val by = gStart.y + uy * off.distanceAlongGLine
            val nx = if (off.side == 'L') -uy else uy
            val ny = if (off.side == 'L') ux else -ux
            CadPoint(
                x = bx + nx * off.offsetDistance,
                y = by + ny * off.offsetDistance,
                label = off.label
            )
        }
    }

    fun exportPolygonToDxf(points: List<CadPoint>, layerName: String = "PARCEL_BOUNDARY"): String {
        val sb = StringBuilder()
        sb.append("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n")
        if (points.size >= 2) {
            sb.append("0\nLWPOLYLINE\n8\n$layerName\n90\n${points.size}\n70\n1\n")
            points.forEach { p ->
                sb.append("10\n${"%.4f".format(p.x)}\n20\n${"%.4f".format(p.y)}\n")
            }
        }
        sb.append("0\nENDSEC\n0\nEOF\n")
        return sb.toString()
    }

    fun exportPolygonToGeoJson(
        points: List<CadPoint>,
        parcelName: String = "Sthal Survey Parcel",
        isWgs84LatLng: Boolean = false
    ): String {
        val ringPoints = if (points.isNotEmpty()) points + points.first() else emptyList()
        val coordsJson = ringPoints.joinToString(",") { p ->
            if (isWgs84LatLng) {
                "[${"%.7f".format(p.x)},${"%.7f".format(p.y)}]"
            } else {
                "[${"%.4f".format(p.x)},${"%.4f".format(p.y)}]"
            }
        }
        val escapedName = parcelName.replace("\\", "\\\\").replace("\"", "\\\"")
        val area = computePolygonArea(points)
        return """
            {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "properties": {
                    "name": "$escapedName",
                    "area_sqm": ${"%.4f".format(area)}
                  },
                  "geometry": {
                    "type": "Polygon",
                    "coordinates": [[$coordsJson]]
                  }
                }
              ]
            }
        """.trimIndent()
    }

    fun exportPolygonToKml(points: List<CadPoint>, parcelName: String = "Sthal Survey Parcel"): String {
        val coordsStr = (points + points.take(1)).joinToString(" ") { p ->
            "${"%.7f".format(p.x)},${"%.7f".format(p.y)},0"
        }
        return """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>$parcelName</name>
    <Placemark>
      <name>$parcelName</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>$coordsStr</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>"""
    }

    /**
     * Parses GeoJSON FeatureCollection / Feature / Polygon or simple KML/DXF LWPOLYLINE into CadPoint list.
     */
    fun parseImportedGisContent(content: String, extensionHint: String = "geojson"): List<CadPoint> {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) return emptyList()
        val ext = extensionHint.lowercase()
        return when {
            ext.endsWith("geojson") || ext.endsWith("json") || trimmed.startsWith("{") ->
                parseGeoJsonPolygon(trimmed)
            ext.endsWith("kml") || trimmed.contains("<coordinates>") ->
                parseKmlCoordinates(trimmed)
            ext.endsWith("dxf") || trimmed.contains("LWPOLYLINE") || trimmed.contains("POLYLINE") ->
                parseDxfVertices(trimmed)
            else -> emptyList()
        }
    }

    fun parseImportedGisBytes(bytes: ByteArray, fileName: String): GisImportResult {
        if (bytes.isEmpty()) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = "Empty",
                crsLabel = "Unknown",
                errorMessage = "Selected file is empty (0 bytes)."
            )
        }
        val lower = fileName.lowercase()
        val isZipMagic = bytes.size >= 4 && bytes[0] == 0x50.toByte() && bytes[1] == 0x4B.toByte()
        if (lower.endsWith(".zip") || isZipMagic) {
            return ShapefileSupport.parseShapefileZip(bytes)
        }
        if (lower.endsWith(".shp")) {
            return ShapefileSupport.parseShpBytes(bytes)
        }
        val text = bytes.decodeToString()
        val trimmed = text.trim()
        val format = when {
            lower.endsWith("geojson") || lower.endsWith("json") || trimmed.startsWith("{") -> "GeoJSON"
            lower.endsWith("kml") || trimmed.contains("<coordinates>", ignoreCase = true) -> "KML"
            lower.endsWith("dxf") || trimmed.contains("LWPOLYLINE") || trimmed.contains("POLYLINE") -> "AutoCAD DXF"
            else -> return GisImportResult(
                points = emptyList(),
                detectedFormat = "Unsupported",
                crsLabel = "Unknown",
                errorMessage = "Unsupported GIS file format ($fileName). Supported formats: GeoJSON, KML, DXF, and Shapefile (.zip/.shp)."
            )
        }
        val pts = parseImportedGisContent(text, fileName)
        return ShapefileSupport.validateImportedVertices(pts, format)
    }

    fun parseGeoJsonPolygon(json: String): List<CadPoint> {
        val coordIdx = json.indexOf("\"coordinates\"")
        if (coordIdx < 0) return emptyList()
        val tail = json.substring(coordIdx)
        val pairRegex = Regex("\\[\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\s*(?:,[^\\]]*)?\\]")
        val pts = pairRegex.findAll(tail).mapIndexedNotNull { idx, m ->
            val x = m.groupValues[1].toDoubleOrNull()
            val y = m.groupValues[2].toDoubleOrNull()
            if (x != null && y != null) CadPoint(x, y, "P${idx + 1}") else null
        }.toList()
        return if (pts.size >= 2 && hypot(pts.first().x - pts.last().x, pts.first().y - pts.last().y) < 1e-7) {
            pts.dropLast(1)
        } else pts
    }

    fun parseKmlCoordinates(kml: String): List<CadPoint> {
        val regex = Regex("<coordinates>([\\s\\S]*?)</coordinates>", RegexOption.IGNORE_CASE)
        val match = regex.find(kml) ?: return emptyList()
        val raw = match.groupValues[1].trim()
        val tokens = raw.split(Regex("\\s+")).filter { it.isNotBlank() }
        val pts = tokens.mapIndexedNotNull { idx, tok ->
            val parts = tok.split(",")
            val x = parts.getOrNull(0)?.toDoubleOrNull()
            val y = parts.getOrNull(1)?.toDoubleOrNull()
            if (x != null && y != null) CadPoint(x, y, "K${idx + 1}") else null
        }
        return if (pts.size >= 2 && hypot(pts.first().x - pts.last().x, pts.first().y - pts.last().y) < 1e-7) {
            pts.dropLast(1)
        } else pts
    }

    fun parseDxfVertices(dxf: String): List<CadPoint> {
        val lines = dxf.lines().map { it.trim() }
        val pts = mutableListOf<CadPoint>()
        var currentX: Double? = null
        var inEntity = false
        var i = 0
        while (i + 1 < lines.size) {
            val code = lines[i]
            val value = lines[i + 1]
            if (code == "0") {
                inEntity = value == "LWPOLYLINE" || value == "VERTEX" || value == "LINE"
            } else if (inEntity && code == "10") {
                currentX = value.toDoubleOrNull()
            } else if (inEntity && code == "20" && currentX != null) {
                val y = value.toDoubleOrNull()
                if (y != null) {
                    pts.add(CadPoint(currentX, y, "D${pts.size + 1}"))
                }
                currentX = null
            }
            i += 2
        }
        return pts
    }
}
