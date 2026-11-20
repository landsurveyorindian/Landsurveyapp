package com.sthalmeasure.app.ui.components

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.sthalmeasure.app.domain.PlotPoint
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

@Composable
fun PlotCanvas(
    points: List<PlotPoint>,
    modifier: Modifier = Modifier,
    canvasHeight: Dp = 220.dp,
    secondaryOverlay: List<PlotPoint> = emptyList(),
    splitSegment: Pair<PlotPoint, PlotPoint>? = null,
    showDiagonalAC: Boolean = false,
    unitLabel: String = "m",
    emptyHint: String = "Enter dimensions or capture points to render parcel geometry",
    multiFeatures: List<List<PlotPoint>> = emptyList(),
    multiFeaturesClosed: List<Boolean> = emptyList()
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.tertiary
    val borderColor = MaterialTheme.colorScheme.outline
    val surfaceBg = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    val inkColor = MaterialTheme.colorScheme.onSurface

    val renderFeatures = if (multiFeatures.isNotEmpty()) {
        multiFeatures.filter { it.size >= 2 }
    } else if (points.size >= 2) {
        listOf(points)
    } else {
        emptyList()
    }
    val renderClosed = if (multiFeatures.isNotEmpty()) {
        multiFeatures.indices.filter { multiFeatures[it].size >= 2 }
            .map { idx -> multiFeaturesClosed.getOrElse(idx) { multiFeatures[idx].size >= 3 } }
    } else if (points.size >= 2) {
        listOf(points.size >= 3)
    } else {
        emptyList()
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(canvasHeight)
            .clip(RoundedCornerShape(16.dp))
            .background(surfaceBg)
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (renderFeatures.isEmpty()) {
            Text(
                text = emptyHint,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            return@Box
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            val featurePoints = renderFeatures.flatten()
            val allPts = featurePoints + secondaryOverlay
            val minX = allPts.minOf { it.x }
            val maxX = allPts.maxOf { it.x }
            val minY = allPts.minOf { it.y }
            val maxY = allPts.maxOf { it.y }
            val dx = max(1e-6, maxX - minX)
            val dy = max(1e-6, maxY - minY)
            val pad = if (featurePoints.size > 60) 18.dp.toPx() else 34.dp.toPx()
            val scale = min((size.width - pad * 2) / dx.toFloat(), (size.height - pad * 2) / dy.toFloat())
            val offX = (size.width - dx.toFloat() * scale) / 2f
            val offY = (size.height - dy.toFloat() * scale) / 2f

            fun mapPt(p: PlotPoint): Offset = Offset(
                x = offX + ((p.x - minX).toFloat() * scale),
                y = size.height - (offY + ((p.y - minY).toFloat() * scale))
            )

            // Subtle blueprint grid lines
            val gridStep = 28.dp.toPx()
            val gridColor = borderColor.copy(alpha = 0.35f)
            var gx = gridStep
            while (gx < size.width) {
                drawLine(gridColor, Offset(gx, 0f), Offset(gx, size.height), strokeWidth = 1f)
                gx += gridStep
            }
            var gy = gridStep
            while (gy < size.height) {
                drawLine(gridColor, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1f)
                gy += gridStep
            }

            val totalVerts = featurePoints.size
            val strokePx = if (totalVerts > 120) 1.5.dp.toPx() else 2.6.dp.toPx()

            renderFeatures.forEachIndexed { fIdx, featPts ->
                val mappedFeat = featPts.map(::mapPt)
                val isClosed = renderClosed.getOrElse(fIdx) { featPts.size >= 3 }
                if (mappedFeat.size >= 3 && isClosed) {
                    val fillPath = Path().apply {
                        moveTo(mappedFeat[0].x, mappedFeat[0].y)
                        for (i in 1 until mappedFeat.size) lineTo(mappedFeat[i].x, mappedFeat[i].y)
                        close()
                    }
                    drawPath(fillPath, primaryColor.copy(alpha = 0.14f))
                    drawPath(fillPath, primaryColor, style = Stroke(width = strokePx))
                } else if (mappedFeat.size >= 2) {
                    val linePath = Path().apply {
                        moveTo(mappedFeat[0].x, mappedFeat[0].y)
                        for (i in 1 until mappedFeat.size) lineTo(mappedFeat[i].x, mappedFeat[i].y)
                    }
                    drawPath(linePath, primaryColor, style = Stroke(width = strokePx))
                }
            }

            // Single-polygon annotations & diagonal
            val mapped = renderFeatures.first().map(::mapPt)
            if (renderFeatures.size == 1 && showDiagonalAC && mapped.size >= 4) {
                drawLine(
                    color = secondaryColor,
                    start = mapped[0],
                    end = mapped[2],
                    strokeWidth = 1.8.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f), 0f)
                )
            }

            // Secondary overlay (setback inset or unadjusted traverse)
            if (secondaryOverlay.size >= 3) {
                val secMapped = secondaryOverlay.map(::mapPt)
                val secPath = Path().apply {
                    moveTo(secMapped[0].x, secMapped[0].y)
                    for (i in 1 until secMapped.size) lineTo(secMapped[i].x, secMapped[i].y)
                    close()
                }
                drawPath(
                    secPath,
                    color = secondaryColor,
                    style = Stroke(
                        width = 1.8.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 6f), 0f)
                    )
                )
            }

            // Split line preview
            if (splitSegment != null) {
                drawLine(
                    color = Color(0xFFDC2626),
                    start = mapPt(splitSegment.first),
                    end = mapPt(splitSegment.second),
                    strokeWidth = 2.2.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 6f), 0f)
                )
            }

            val labelPaint = Paint().apply {
                isAntiAlias = true
                textSize = 11.dp.toPx()
                color = android.graphics.Color.argb(
                    235,
                    (inkColor.red * 255).toInt(),
                    (inkColor.green * 255).toInt(),
                    (inkColor.blue * 255).toInt()
                )
                isFakeBoldText = true
            }
            val dimPaint = Paint().apply {
                isAntiAlias = true
                textSize = 10.dp.toPx()
                color = android.graphics.Color.argb(
                    210,
                    (primaryColor.red * 255).toInt(),
                    (primaryColor.green * 255).toInt(),
                    (primaryColor.blue * 255).toInt()
                )
            }

            // Segment length annotations (up to 12 edges on a single polygon)
            if (renderFeatures.size == 1 && points.size in 2..12) {
                for (i in points.indices) {
                    val j = (i + 1) % points.size
                    if (points.size == 2 && i == 1) break
                    val a = points[i]
                    val b = points[j]
                    val dist = hypot(b.x - a.x, b.y - a.y)
                    if (dist > 1e-4) {
                        val midX = (mapped[i].x + mapped[j].x) / 2f
                        val midY = (mapped[i].y + mapped[j].y) / 2f
                        drawContext.canvas.nativeCanvas.drawText(
                            "${"%.1f".format(dist)}$unitLabel",
                            midX + 4f,
                            midY - 4f,
                            dimPaint
                        )
                    }
                }
            }

            // Corner markers & labels (skipped on dense >60-vertex GIS village parcels to prevent clutter)
            if (totalVerts <= 60) {
                renderFeatures.forEachIndexed { fIdx, featPts ->
                    val featMapped = featPts.map(::mapPt)
                    featMapped.forEachIndexed { idx, offset ->
                        drawCircle(Color.White, radius = 5.dp.toPx(), center = offset)
                        drawCircle(primaryColor, radius = 3.5.dp.toPx(), center = offset)
                        val lbl = featPts[idx].label.ifBlank { "${idx + 1}" }
                        if (totalVerts <= 16 || (fIdx == 0 && (idx == 0 || idx == featPts.lastIndex))) {
                            drawContext.canvas.nativeCanvas.drawText(
                                lbl,
                                offset.x + 8f,
                                offset.y - 6f,
                                labelPaint
                            )
                        }
                    }
                }
            }

            // North compass arrow in top-right corner
            val nX = size.width - 22.dp.toPx()
            val nY = 26.dp.toPx()
            drawLine(inkColor.copy(alpha = 0.65f), Offset(nX, nY + 10.dp.toPx()), Offset(nX, nY - 10.dp.toPx()), 2f)
            drawContext.canvas.nativeCanvas.drawText("N", nX - 4f, nY - 13.dp.toPx(), labelPaint)
        }
    }
}
