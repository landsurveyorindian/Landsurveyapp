package com.sthalmeasure.app.domain

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.math.abs

data class GisImportResult(
    val points: List<CadPoint>,
    val detectedFormat: String,
    val crsLabel: String,
    val warnings: List<String> = emptyList(),
    val errorMessage: String? = null
) {
    val isValid: Boolean get() = errorMessage == null && points.isNotEmpty()
}

object ShapefileSupport {
    private const val WGS84_PRJ =
        """GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]"""

    fun validateImportedVertices(
        points: List<CadPoint>,
        format: String,
        prjText: String? = null
    ): GisImportResult {
        if (points.isEmpty()) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = format,
                crsLabel = prjText?.take(80).orEmpty().ifBlank { "Unknown" },
                errorMessage = "No valid polygon or polyline vertices were found in the $format file."
            )
        }
        val clean = points.filter { it.x.isFinite() && it.y.isFinite() }
        if (clean.size != points.size) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = format,
                crsLabel = "Invalid",
                errorMessage = "File contains NaN or infinite coordinates and cannot be imported."
            )
        }
        val warnings = mutableListOf<String>()
        if (clean.all { abs(it.x) < 1e-6 && abs(it.y) < 1e-6 }) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = format,
                crsLabel = "Invalid (0,0)",
                errorMessage = "All imported coordinates sit at Null Island [0, 0]. Verify CRS or coordinate fields."
            )
        }

        val prjUpper = prjText.orEmpty().uppercase()
        val hasProjectedPrj = prjUpper.contains("PROJCS") || prjUpper.contains("UTM")
        val withinLonLatRange = clean.all { abs(it.x) <= 180.0 && abs(it.y) <= 90.0 }

        val crsLabel = when {
            prjUpper.contains("WGS_1984") && !hasProjectedPrj -> {
                if (!withinLonLatRange) {
                    return GisImportResult(
                        points = emptyList(),
                        detectedFormat = format,
                        crsLabel = "WGS84 Mismatch",
                        errorMessage = "PRJ specifies WGS84 degrees, but coordinates exceed valid [-180..180, -90..90] bounds."
                    )
                }
                "EPSG:4326 (WGS84)"
            }
            hasProjectedPrj -> {
                warnings.add("Projected CRS detected in .prj (${prjText?.take(48)}). Treating coordinates as planar meters.")
                "Projected CRS (Planar Meters)"
            }
            withinLonLatRange && clean.any { abs(it.x) in 60.0..100.0 && abs(it.y) in 5.0..40.0 } -> {
                "Inferred WGS84 Geographic (India bounds)"
            }
            withinLonLatRange -> "Local / Small Geographic Span"
            else -> {
                warnings.add("Large planar coordinates detected (assumed local survey meters or UTM Easting/Northing).")
                "Planar Survey Grid (m)"
            }
        }

        return GisImportResult(
            points = clean,
            detectedFormat = format,
            crsLabel = crsLabel,
            warnings = warnings
        )
    }

    fun parseShapefileZip(zipBytes: ByteArray): GisImportResult {
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
        return parseShpBytes(shp, prjText)
    }

    fun parseShpBytes(shpBytes: ByteArray, prjText: String? = null): GisImportResult {
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
        if (shapeType != 3 && shapeType != 5 && shapeType != 13 && shapeType != 15) {
            return GisImportResult(
                points = emptyList(),
                detectedFormat = "SHP",
                crsLabel = "Type $shapeType",
                errorMessage = "Unsupported Shapefile geometry type ($shapeType). Only Polygon (5) and PolyLine (3) are supported."
            )
        }

        val pts = mutableListOf<CadPoint>()
        var offset = 100
        while (offset + 8 <= shpBytes.size) {
            val recBuf = ByteBuffer.wrap(shpBytes, offset, shpBytes.size - offset).slice()
            recBuf.order(ByteOrder.BIG_ENDIAN)
            recBuf.getInt() // record number
            val contentLenWords = recBuf.getInt()
            val contentLenBytes = contentLenWords * 2
            val contentStart = offset + 8
            if (contentLenBytes < 4 || contentStart + contentLenBytes > shpBytes.size) break

            val recBufData = ByteBuffer.wrap(shpBytes, contentStart, contentLenBytes)
                .slice()
                .order(ByteOrder.LITTLE_ENDIAN)
            val recType = recBufData.getInt()
            if (recType == 3 || recType == 5 || recType == 13 || recType == 15) {
                if (recBufData.remaining() >= 40) {
                    recBufData.position(4 + 32) // skip shapeType + bbox (4 doubles)
                    val numParts = recBufData.getInt()
                    val numPoints = recBufData.getInt()
                    if (numParts >= 1 && numPoints >= 1 && recBufData.remaining() >= numParts * 4 + numPoints * 16) {
                        val parts = IntArray(numParts) { recBufData.getInt() }
                        val firstPartStart = parts[0]
                        val secondPartStart = if (numParts > 1) parts[1] else numPoints
                        val ringCount = (secondPartStart - firstPartStart).coerceIn(0, numPoints)
                        for (i in 0 until ringCount) {
                            val x = recBufData.getDouble()
                            val y = recBufData.getDouble()
                            if (x.isFinite() && y.isFinite()) {
                                pts.add(CadPoint(x, y, "S${pts.size + 1}"))
                            }
                        }
                        break
                    }
                }
            }
            offset = contentStart + contentLenBytes
        }

        val cleaned = if (pts.size >= 2 &&
            abs(pts.first().x - pts.last().x) < 1e-7 &&
            abs(pts.first().y - pts.last().y) < 1e-7
        ) pts.dropLast(1) else pts

        return validateImportedVertices(cleaned, "Shapefile (.shp)", prjText)
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
