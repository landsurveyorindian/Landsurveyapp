package com.sthalmeasure.app.ai

import android.graphics.Bitmap
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Schema
import com.google.firebase.ai.type.content
import com.google.firebase.ai.type.generationConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicLong

data class ChatMessage(
    val id: String,
    val isUser: Boolean,
    val text: String
)

data class ScannedLandDocument(
    val documentType: String,
    val state: String,
    val districtOrVillage: String,
    val surveyNumber: String,
    val recordedAreaText: String,
    val estimatedSqm: Double,
    val ownerNames: String,
    val boundaries: String,
    val verificationNotes: String
)

class AiRepository {
    private val lastCallTimestampMs = AtomicLong(0L)

    private val model by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            systemInstruction = content {
                text(
                    "You are a senior Indian licensed cadastral surveyor and geomatics advisor for Sthal Measure. " +
                        "Provide clear, mathematically accurate advice on Indian regional land units (Cents, Guntas, Bigha, " +
                        "Kanal, Marla, Ankanam, Ground), Bowditch traverse closure, Heron triangulation, FMB chain-and-offset, " +
                        "and ROR records (Meebhoomi, Dharani, Mahabhulekh 7/12, AnyRoR, Bhulekh, Bhoomi, Tamil Nilam). " +
                        "Always explicitly note that AI guidance and estimates must be verified against certified government survey records."
                )
            }
        )
    }

    private fun enforceRateLimit() {
        val now = System.currentTimeMillis()
        val prev = lastCallTimestampMs.get()
        if (now - prev < MIN_INTERVAL_MS) {
            val waitSec = ((MIN_INTERVAL_MS - (now - prev)) / 1000.0).coerceAtLeast(1.0)
            throw IllegalStateException("Please wait ${"%.0f".format(waitSec)}s before sending another AI request.")
        }
        lastCallTimestampMs.set(now)
    }

    suspend fun askPlotAdvisor(
        activeState: String,
        question: String,
        parcelContext: String,
        recentHistory: List<ChatMessage>
    ): String {
        val sanitizedQuestion = question.trim().take(MAX_QUESTION_LEN)
        require(sanitizedQuestion.isNotBlank()) { "Please enter a non-empty survey question." }
        enforceRateLimit()

        val historyContext = recentHistory.takeLast(6).joinToString("\n") {
            if (it.isUser) "Surveyor: ${it.text.take(400)}" else "Advisor: ${it.text.take(600)}"
        }
        val prompt = buildString {
            appendLine("Active State Jurisdiction: ${activeState.take(80)}")
            if (parcelContext.isNotBlank()) appendLine("Current Survey Context: ${parcelContext.take(600)}")
            if (historyContext.isNotBlank()) {
                appendLine("Recent Conversation:")
                appendLine(historyContext)
            }
            appendLine("Question: $sanitizedQuestion")
        }
        return try {
            withTimeout(60_000L) {
                val response = model.generateContent(prompt)
                response.text?.trim()?.takeIf { it.isNotEmpty() }
                    ?: throw IllegalStateException("AI returned an empty response.")
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            throw IllegalStateException(
                "AI Advisor request failed: ${e.localizedMessage ?: "Please check network connectivity."}",
                e
            )
        }
    }

    suspend fun scanLandDocument(bitmap: Bitmap, activeState: String): ScannedLandDocument {
        enforceRateLimit()
        val schema = Schema.obj(
            mapOf(
                "documentType" to Schema.string("Type such as 7/12 Extract, Patta Chitta, Adangal, FMB Sketch, Sale Deed"),
                "state" to Schema.string("Indian State name inferred from document"),
                "districtOrVillage" to Schema.string("District, Taluk/Mandal, or Village name"),
                "surveyNumber" to Schema.string("Survey Number / Khata / Gat / LP Number"),
                "recordedAreaText" to Schema.string("Exact area text written on the document"),
                "estimatedSqm" to Schema.double("Best estimate of area converted into square meters (0 if unreadable)"),
                "ownerNames" to Schema.string("Recorded owner / pattadar names if visible"),
                "boundaries" to Schema.string("North/South/East/West boundaries or side lengths if visible"),
                "verificationNotes" to Schema.string("Surveyor caveats, illegible text, or verification recommendations")
            )
        )
        val scannerModel = Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            generationConfig = generationConfig {
                responseMimeType = "application/json"
                responseSchema = schema
            }
        )
        return try {
            withTimeout(60_000L) {
                val response = scannerModel.generateContent(
                    content {
                        image(bitmap)
                        text(
                            "Analyze this Indian land revenue document, deed, or field sketch (active state hint: $activeState). " +
                                "Extract all visible survey numbers, extent/area (and convert accurately to square meters), " +
                                "owners, boundaries, and verification caveats as structured JSON. Never fabricate unreadable numbers."
                        )
                    }
                )
                val raw = response.text ?: throw IllegalStateException("Scanner returned empty output.")
                val json = JSONObject(raw)
                val estSqm = json.optDouble("estimatedSqm", 0.0).let { if (it.isFinite() && it >= 0.0) it else 0.0 }
                val rawNotes = json.optString("verificationNotes", "").trim()
                val notePrefix = "Unverified AI Extraction — cross-check all survey numbers and extents against official revenue records."
                ScannedLandDocument(
                    documentType = json.optString("documentType", "Land Record"),
                    state = json.optString("state", activeState),
                    districtOrVillage = json.optString("districtOrVillage", ""),
                    surveyNumber = json.optString("surveyNumber", ""),
                    recordedAreaText = json.optString("recordedAreaText", ""),
                    estimatedSqm = estSqm,
                    ownerNames = json.optString("ownerNames", ""),
                    boundaries = json.optString("boundaries", ""),
                    verificationNotes = if (rawNotes.isBlank()) notePrefix else "$notePrefix $rawNotes"
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            throw IllegalStateException(
                "Land document scan failed: ${e.localizedMessage ?: "Try a clearer photo or check connection."}",
                e
            )
        }
    }

    companion object {
        private const val MIN_INTERVAL_MS = 2500L
        private const val MAX_QUESTION_LEN = 1500
    }
}
