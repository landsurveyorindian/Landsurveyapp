package com.sthalmeasure.app.domain

data class DecodedPlotSummary(
    val parcelType: String,
    val points: List<PlotPoint>,
    val noteHint: String = ""
)

object PlotSummaryCodec {
    private fun escapeJson(value: String): String = buildString(value.length + 8) {
        value.forEach { ch ->
            when (ch) {
                '\\' -> append("\\\\")
                '"' -> append("\\\"")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> append(ch)
            }
        }
    }

    private fun unescapeJson(value: String): String =
        value.replace("\\\"", "\"")
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t")
            .replace("\\\\", "\\")

    fun encode(
        parcelType: String,
        points: List<PlotPoint>,
        noteHint: String = ""
    ): String = buildString {
        append('{')
        append("\"parcelType\":\"").append(escapeJson(parcelType)).append('"')
        if (noteHint.isNotBlank()) {
            append(",\"noteHint\":\"").append(escapeJson(noteHint)).append('"')
        }
        append(",\"points\":[")
        val valid = points.filter { it.x.isFinite() && it.y.isFinite() }
        valid.forEachIndexed { idx, p ->
            if (idx > 0) append(',')
            append("{\"x\":").append(p.x)
                .append(",\"y\":").append(p.y)
                .append(",\"label\":\"").append(escapeJson(p.label)).append("\"}")
        }
        append("]}")
    }

    fun decode(summaryJson: String): DecodedPlotSummary? {
        if (summaryJson.isBlank()) return null
        return try {
            val parcelType = Regex("\"parcelType\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
                .find(summaryJson)?.groupValues?.get(1)?.let(::unescapeJson).orEmpty()
            val noteHint = Regex("\"noteHint\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
                .find(summaryJson)?.groupValues?.get(1)?.let(::unescapeJson).orEmpty()

            val pointsSection = Regex("\"points\"\\s*:\\s*\\[(.*?)]", setOf(RegexOption.DOT_MATCHES_ALL))
                .find(summaryJson)?.groupValues?.get(1).orEmpty()

            val itemRegex = Regex("\\{([^}]*)}")
            val xRegex = Regex("\"x\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)")
            val yRegex = Regex("\"y\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)")
            val lblRegex = Regex("\"label\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")

            val pts = mutableListOf<PlotPoint>()
            itemRegex.findAll(pointsSection).forEachIndexed { idx, match ->
                val objBody = match.groupValues[1]
                val x = xRegex.find(objBody)?.groupValues?.get(1)?.toDoubleOrNull()
                val y = yRegex.find(objBody)?.groupValues?.get(1)?.toDoubleOrNull()
                if (x != null && y != null && x.isFinite() && y.isFinite()) {
                    val label = lblRegex.find(objBody)?.groupValues?.get(1)?.let(::unescapeJson)
                        ?: "P${idx + 1}"
                    pts.add(PlotPoint(x, y, label))
                }
            }
            if (parcelType.isBlank() && pts.isEmpty() && noteHint.isBlank()) {
                null
            } else {
                DecodedPlotSummary(
                    parcelType = parcelType,
                    points = pts,
                    noteHint = noteHint
                )
            }
        } catch (_: Throwable) {
            null
        }
    }
}
