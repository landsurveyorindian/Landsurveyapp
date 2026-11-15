package com.sthalmeasure.app.report

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import com.sthalmeasure.app.data.model.SurveyProject
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.domain.PlotPoint
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.domain.convertAreaFromSqm
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

object PdfReportGenerator {

    fun extractPolygonFromSummaryJson(summaryJson: String): List<PlotPoint> =
        PlotSummaryCodec.decode(summaryJson)?.points ?: emptyList()

    fun generateProjectPdf(context: Context, project: SurveyProject): File {
        val reportsDir = File(context.cacheDir, "reports").apply { mkdirs() }
        val safeName = project.name
            .replace(Regex("[^a-zA-Z0-9_\\-]"), "_")
            .trim('_')
            .ifBlank { "sthal_survey_report" }
            .take(40)
        val outFile = File(reportsDir, "${safeName}_${System.currentTimeMillis()}.pdf")

        return try {
            val doc = PdfDocument()
            try {
                writeAndroidPdf(doc, project, outFile)
            } finally {
                doc.close()
            }
            outFile
        } catch (_: Throwable) {
            writeFallbackVectorPdf(project, outFile)
            outFile
        }
    }

    private fun writeAndroidPdf(doc: PdfDocument, project: SurveyProject, outFile: File) {
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = doc.startPage(pageInfo)
        val canvas = page.canvas

        val titlePaint = Paint().apply {
            isAntiAlias = true
            color = Color.rgb(15, 76, 58)
            textSize = 20f
            isFakeBoldText = true
        }
        val subtitlePaint = Paint().apply {
            isAntiAlias = true
            color = Color.rgb(75, 85, 99)
            textSize = 11f
        }
        val sectionPaint = Paint().apply {
            isAntiAlias = true
            color = Color.rgb(15, 76, 58)
            textSize = 13f
            isFakeBoldText = true
        }
        val bodyPaint = Paint().apply {
            isAntiAlias = true
            color = Color.rgb(31, 41, 55)
            textSize = 11f
        }
        val boldBodyPaint = Paint(bodyPaint).apply { isFakeBoldText = true }
        val borderPaint = Paint().apply {
            style = Paint.Style.STROKE
            color = Color.rgb(209, 213, 219)
            strokeWidth = 1f
        }
        val polyStroke = Paint().apply {
            isAntiAlias = true
            style = Paint.Style.STROKE
            color = Color.rgb(15, 118, 110)
            strokeWidth = 2.5f
        }
        val polyFill = Paint().apply {
            isAntiAlias = true
            style = Paint.Style.FILL
            color = Color.argb(36, 15, 118, 110)
        }

        var y = 48f
        canvas.drawText("STHAL MEASURE — LAND SURVEY REPORT", 40f, y, titlePaint)
        y += 18f
        val dateText = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(Date())
        canvas.drawText("Generated: $dateText  •  Jurisdiction: ${project.state}", 40f, y, subtitlePaint)
        y += 14f

        // Honesty / verification notice banner
        val bannerPaint = Paint().apply { color = Color.rgb(254, 243, 199) }
        canvas.drawRoundRect(RectF(40f, y, 555f, y + 36f), 6f, 6f, bannerPaint)
        val bannerTextPaint = Paint().apply {
            isAntiAlias = true
            color = Color.rgb(146, 64, 14)
            textSize = 9.5f
            isFakeBoldText = true
        }
        val classification = when (project.parcelType) {
            "gps_walk" -> "Smartphone GNSS Field Boundary Estimate (±consumer GNSS tolerance)"
            "traverse" -> "Closed Compass / Bowditch Computed Traverse"
            "cad" -> "COGO / CAD Drafted Parcel Geometry"
            "five_sided", "four_sided", "triangle" -> "Geometric Triangulation Measurement"
            else -> "Calculated Unit Conversion"
        }
        canvas.drawText("Classification: $classification", 50f, y + 15f, bannerTextPaint)
        canvas.drawText(
            "Disclaimer: Legal demarcation requires certified government revenue records & licensed survey verification.",
            50f,
            y + 28f,
            Paint(bannerTextPaint).apply { isFakeBoldText = false }
        )
        y += 52f

        // Project header metadata
        canvas.drawText("Project Title: ${project.name}", 40f, y, boldBodyPaint)
        y += 16f
        canvas.drawText(
            "Method: ${project.parcelType.uppercase()}   •   Perimeter: ${"%.2f".format(project.perimeterMeters)} m",
            40f,
            y,
            bodyPaint
        )
        y += 20f

        // Vector polygon plot box if polygon points exist
        val polygonPoints = extractPolygonFromSummaryJson(project.summaryJson)
        val diagramRect = RectF(40f, y, 555f, y + 185f)
        canvas.drawRoundRect(diagramRect, 8f, 8f, borderPaint)
        if (polygonPoints.size >= 3) {
            val minX = polygonPoints.minOf { it.x }
            val maxX = polygonPoints.maxOf { it.x }
            val minY = polygonPoints.minOf { it.y }
            val maxY = polygonPoints.maxOf { it.y }
            val dx = max(1e-3, maxX - minX)
            val dy = max(1e-3, maxY - minY)
            val pad = 28f
            val scale = min((diagramRect.width() - pad * 2) / dx.toFloat(), (diagramRect.height() - pad * 2) / dy.toFloat())
            val offX = diagramRect.left + (diagramRect.width() - dx.toFloat() * scale) / 2f
            val offY = diagramRect.top + (diagramRect.height() - dy.toFloat() * scale) / 2f

            val path = Path()
            polygonPoints.forEachIndexed { idx, p ->
                val px = offX + ((p.x - minX).toFloat() * scale)
                val py = diagramRect.bottom - (offY - diagramRect.top + ((p.y - minY).toFloat() * scale))
                if (idx == 0) path.moveTo(px, py) else path.lineTo(px, py)
                canvas.drawCircle(px, py, 3.5f, polyStroke)
                val lbl = p.label.ifBlank { "P${idx + 1}" }
                if (polygonPoints.size <= 16) {
                    canvas.drawText(lbl, px + 5f, py - 5f, subtitlePaint)
                }
            }
            path.close()
            canvas.drawPath(path, polyFill)
            canvas.drawPath(path, polyStroke)
        } else {
            canvas.drawText(
                "Polygon geometry preview unavailable for saved text-only record.",
                diagramRect.left + 16f,
                diagramRect.centerY(),
                subtitlePaint
            )
        }
        y = diagramRect.bottom + 24f

        // Area breakdown table
        val b = convertAreaFromSqm(project.areaSqm)
        canvas.drawText("Area Conversion Summary", 40f, y, sectionPaint)
        y += 16f
        val rows = listOf(
            "Square Meters (m²)" to "${"%.2f".format(b.sqm)} m²",
            "Square Feet (sq ft)" to "${"%.1f".format(b.sqft)} sq ft",
            "Square Yards (Gaj)" to "${"%.2f".format(b.sqYards)} sq yd",
            "Acres" to "${"%.4f".format(b.acres)} acres",
            "Hectares" to "${"%.4f".format(b.hectares)} ha",
            "Cents" to "${"%.2f".format(b.cents)} cents",
            "Guntas" to "${"%.2f".format(b.guntas)} guntas"
        )
        rows.forEach { (k, v) ->
            canvas.drawText(k, 48f, y, bodyPaint)
            canvas.drawText(v, 310f, y, boldBodyPaint)
            y += 16f
        }

        y += 10f
        canvas.drawText("${project.state} Regional Revenue Equivalents", 40f, y, sectionPaint)
        y += 16f
        val regional = IndianStateUnitsCatalog.convertSqmToStateUnits(project.areaSqm, project.state).take(6)
        regional.forEach { u ->
            canvas.drawText("${u.unit.name} (${u.unit.localName})", 48f, y, bodyPaint)
            canvas.drawText(u.formatted, 310f, y, boldBodyPaint)
            y += 16f
        }

        if (project.notes.isNotBlank()) {
            y += 12f
            canvas.drawText("Field Notes", 40f, y, sectionPaint)
            y += 16f
            project.notes.chunked(82).take(6).forEach { line ->
                canvas.drawText(line, 48f, y, bodyPaint)
                y += 14f
            }
        }

        canvas.drawText(
            "Sthal Measure Native Android • Offline Geometric & GNSS Survey Report",
            40f,
            815f,
            subtitlePaint
        )

        doc.finishPage(page)
        FileOutputStream(outFile).use { fos ->
            doc.writeTo(fos)
        }
    }

    private fun writeFallbackVectorPdf(project: SurveyProject, outFile: File) {
        fun escPdf(s: String): String = s
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
            .filter { it.code in 32..126 }

        val b = convertAreaFromSqm(project.areaSqm)
        val dateText = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.US).format(Date())
        val polygonPoints = extractPolygonFromSummaryJson(project.summaryJson)

        val stream = buildString {
            appendLine("BT")
            appendLine("/F1 16 Tf")
            appendLine("40 795 Td")
            appendLine("(${escPdf("STHAL MEASURE - LAND SURVEY REPORT")}) Tj")
            appendLine("/F1 10 Tf")
            appendLine("0 -18 Td")
            appendLine("(${escPdf("Generated: $dateText | Jurisdiction: ${project.state}")}) Tj")
            appendLine("0 -16 Td")
            appendLine("(${escPdf("Project: ${project.name} | Method: ${project.parcelType.uppercase()}")}) Tj")
            appendLine("0 -14 Td")
            appendLine("(${escPdf("Disclaimer: Legal demarcation requires certified government revenue survey verification.")}) Tj")
            appendLine("ET")

            // Polygon vector sketch box
            appendLine("0.82 0.84 0.86 RG 1 w 40 530 515 170 re S")
            if (polygonPoints.size >= 3) {
                val minX = polygonPoints.minOf { it.x }
                val maxX = polygonPoints.maxOf { it.x }
                val minY = polygonPoints.minOf { it.y }
                val maxY = polygonPoints.maxOf { it.y }
                val dx = max(1e-3, maxX - minX)
                val dy = max(1e-3, maxY - minY)
                val scale = min(455.0 / dx, 130.0 / dy)
                val offX = 40.0 + (515.0 - dx * scale) / 2.0
                val offY = 530.0 + (170.0 - dy * scale) / 2.0
                appendLine("0.06 0.46 0.43 RG 2 w")
                polygonPoints.forEachIndexed { idx, p ->
                    val px = offX + (p.x - minX) * scale
                    val py = offY + (p.y - minY) * scale
                    val cmd = if (idx == 0) "m" else "l"
                    appendLine("${"%.2f".format(Locale.US, px)} ${"%.2f".format(Locale.US, py)} $cmd")
                }
                appendLine("h S")
            }

            appendLine("BT /F1 11 Tf 40 505 Td (${escPdf("Area Conversion Summary")}) Tj")
            val summaryLines = listOf(
                "Square Meters: ${"%.2f".format(Locale.US, b.sqm)} m2",
                "Square Feet: ${"%.1f".format(Locale.US, b.sqft)} sq ft",
                "Square Yards: ${"%.2f".format(Locale.US, b.sqYards)} sq yd",
                "Acres: ${"%.4f".format(Locale.US, b.acres)} | Hectares: ${"%.4f".format(Locale.US, b.hectares)}",
                "Cents: ${"%.2f".format(Locale.US, b.cents)} | Guntas: ${"%.2f".format(Locale.US, b.guntas)}",
                "Perimeter: ${"%.2f".format(Locale.US, project.perimeterMeters)} m"
            )
            summaryLines.forEach { line ->
                appendLine("0 -16 Td (${escPdf(line)}) Tj")
            }
            val regional = IndianStateUnitsCatalog.convertSqmToStateUnits(project.areaSqm, project.state).take(5)
            appendLine("0 -22 Td (${escPdf("${project.state} Regional Units:")}) Tj")
            regional.forEach { u ->
                appendLine("0 -15 Td (${escPdf("${u.unit.name}: ${u.formatted}")}) Tj")
            }
            if (project.notes.isNotBlank()) {
                appendLine("0 -20 Td (${escPdf("Notes: ${project.notes.take(120)}")}) Tj")
            }
            appendLine("ET")
        }

        val streamBytes = stream.toByteArray(Charsets.US_ASCII)
        val objects = listOf(
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            "5 0 obj\n<< /Length ${streamBytes.size} >>\nstream\n$stream\nendstream\nendobj\n"
        )

        val baos = ByteArrayOutputStream()
        fun writeAscii(text: String) = baos.write(text.toByteArray(Charsets.US_ASCII))
        writeAscii("%PDF-1.4\n")
        val offsets = mutableListOf(0)
        objects.forEach { obj ->
            offsets.add(baos.size())
            writeAscii(obj)
        }
        val xrefPos = baos.size()
        writeAscii("xref\n0 ${objects.size + 1}\n")
        writeAscii("0000000000 65535 f \n")
        offsets.drop(1).forEach { off ->
            writeAscii("%010d 00000 n \n".format(Locale.US, off))
        }
        writeAscii("trailer\n<< /Size ${objects.size + 1} /Root 1 0 R >>\nstartxref\n$xrefPos\n%%EOF\n")
        outFile.writeBytes(baos.toByteArray())
    }

    fun getShareUri(context: Context, pdfFile: File): Uri =
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", pdfFile)

    fun launchShareIntent(context: Context, pdfFile: File, projectName: String) {
        val uri = getShareUri(context, pdfFile)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Sthal Measure Survey Report: $projectName")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Survey PDF Report"))
    }
}
