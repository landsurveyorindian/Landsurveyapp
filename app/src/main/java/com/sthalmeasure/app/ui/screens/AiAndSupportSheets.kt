package com.sthalmeasure.app.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.MediaController
import android.widget.VideoView
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.sthalmeasure.app.ai.ChatMessage
import com.sthalmeasure.app.ai.ScannedLandDocument
import com.sthalmeasure.app.data.model.AcademyVideoEntry
import com.sthalmeasure.app.domain.AcademyVideoValidator
import com.sthalmeasure.app.domain.VideoTutorialsCatalog
import com.sthalmeasure.app.domain.convertAreaFromSqm

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiPlotAdvisorSheet(
    activeState: String,
    messages: List<ChatMessage>,
    busy: Boolean,
    error: String?,
    onAsk: (String) -> Unit,
    onDismiss: () -> Unit
) {
    BackHandler { onDismiss() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var input by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("AI Plot Advisor ($activeState)", style = MaterialTheme.typography.titleLarge)
                    Text("Powered by Gemini Cadastral Engine", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close Advisor") }
            }

            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer,
                modifier = Modifier.fillMaxWidth().testTag("ai_unverified_disclaimer")
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(16.dp))
                    Text(
                        "Advisory only (unverified AI): Always confirm measurements and legal rules against official ROR / FMB survey records.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }

            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "Explain Patta vs Chitta / 7-12 in $activeState",
                    "How do I verify an irregular plot without diagonal?",
                    "What traverse closing ratio is acceptable for boundary survey?"
                ).forEach { quick ->
                    FilterChip(
                        selected = false,
                        onClick = { onAsk(quick) },
                        label = { Text(quick.take(32) + "...", style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                messages.forEach { m ->
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = if (m.isUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = (if (m.isUser) "You: " else "Advisor: ") + m.text,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
                if (busy) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Text("Analyzing cadastral rules...", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    label = { Text("Ask survey question...") },
                    singleLine = true,
                    modifier = Modifier.weight(1f).testTag("ai_advisor_input")
                )
                Button(
                    onClick = {
                        if (input.isNotBlank()) {
                            onAsk(input)
                            input = ""
                        }
                    },
                    enabled = !busy && input.isNotBlank(),
                    modifier = Modifier.height(52.dp).testTag("ai_advisor_send")
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LandDocumentScannerSheet(
    activeState: String,
    busy: Boolean,
    error: String?,
    result: ScannedLandDocument?,
    onScanBitmap: (Bitmap) -> Unit,
    onApplyAreaSqm: (Double) -> Unit,
    onDismiss: () -> Unit
) {
    BackHandler { onDismiss() }
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val rawBitmap = context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)
            } ?: return@rememberLauncherForActivityResult
            val maxDim = 1280
            val scale = minOf(maxDim.toFloat() / rawBitmap.width, maxDim.toFloat() / rawBitmap.height, 1f)
            val scaled = if (scale < 1f) {
                Bitmap.createScaledBitmap(
                    rawBitmap,
                    (rawBitmap.width * scale).toInt().coerceAtLeast(1),
                    (rawBitmap.height * scale).toInt().coerceAtLeast(1),
                    true
                )
            } else rawBitmap
            onScanBitmap(scaled)
        } catch (_: Throwable) {
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("AI Land Document Scanner", style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close Scanner") }
            }

            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer,
                modifier = Modifier.fillMaxWidth().testTag("scanner_unverified_banner")
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(16.dp))
                    Text(
                        "UNVERIFIED AI EXTRACTION: OCR may misread handwritten survey numbers or extents. Always cross-check against certified official ROR / FMB documents.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }

            Text(
                "Pick a clear photo of any Patta, Adangal, 7/12 Extract, Pahani, or FMB sketch to extract survey numbers and convert area.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Button(
                onClick = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().testTag("pick_document_scan_button")
            ) {
                if (busy) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Extracting Fields with Gemini...")
                } else {
                    Icon(Icons.Default.DocumentScanner, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Select Document Photo ($activeState)")
                }
            }

            if (error != null) {
                Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }

            result?.let { doc ->
                val b = convertAreaFromSqm(doc.estimatedSqm)
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${doc.documentType} • ${doc.state}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Survey No: ${doc.surveyNumber.ifBlank { "Not clearly visible" }}")
                        if (doc.districtOrVillage.isNotBlank()) Text("Location: ${doc.districtOrVillage}")
                        if (doc.ownerNames.isNotBlank()) Text("Owners: ${doc.ownerNames}")
                        if (doc.boundaries.isNotBlank()) Text("Boundaries: ${doc.boundaries}")
                        Text("Recorded Text: ${doc.recordedAreaText.ifBlank { "—" }}")
                        Text(
                            "Converted: ${"%.2f".format(b.sqm)} m² • ${"%.2f".format(b.cents)} Cents • ${"%.4f".format(b.acres)} Acres",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        if (doc.verificationNotes.isNotBlank()) {
                            Text("Verification Notice: ${doc.verificationNotes}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (doc.estimatedSqm > 0.0) {
                            OutlinedButton(
                                onClick = { onApplyAreaSqm(doc.estimatedSqm) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Load Unverified Area into Converter")
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademySheet(
    academyVideos: List<AcademyVideoEntry> = emptyList(),
    completedEpisodeIds: Set<String> = emptySet(),
    isOwner: Boolean = false,
    onToggleCompleted: (episodeId: String, completed: Boolean) -> Unit = { _, _ -> },
    onSaveVideoUrl: (episodeId: String, episodeNumber: Int, title: String, difficulty: String, url: String) -> Unit = { _, _, _, _, _ -> },
    onTryEpisodeRoute: (String) -> Unit,
    onDismiss: () -> Unit
) {
    BackHandler { onDismiss() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var category by remember { mutableStateOf("All") }
    var difficultyFilter by remember { mutableStateOf("All") }
    var expandedEpisodeId by remember { mutableStateOf<String?>(null) }

    val videoLookup = remember(academyVideos) { academyVideos.associateBy { it.id } }

    val filtered = remember(category, difficultyFilter, videoLookup) {
        VideoTutorialsCatalog.episodes.filter { ep ->
            val effectiveDiff = videoLookup[ep.id]?.difficulty?.ifBlank { ep.difficulty } ?: ep.difficulty
            (category == "All" || ep.category == category) &&
                (difficultyFilter == "All" || effectiveDiff.equals(difficultyFilter, ignoreCase = true))
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("18-Episode Survey Academy", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "${completedEpisodeIds.size} / ${VideoTutorialsCatalog.episodes.size} modules completed",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close Academy") }
            }

            LinearProgressIndicator(
                progress = { completedEpisodeIds.size / VideoTutorialsCatalog.episodes.size.toFloat().coerceAtLeast(1f) },
                modifier = Modifier.fillMaxWidth().testTag("academy_progress_bar")
            )

            // Difficulty path filter chips
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                VideoTutorialsCatalog.difficulties.forEach { diff ->
                    FilterChip(
                        selected = difficultyFilter == diff,
                        onClick = { difficultyFilter = diff },
                        label = { Text(diff, style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.testTag("academy_diff_${diff.lowercase()}")
                    )
                }
            }

            // Category filter chips
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                VideoTutorialsCatalog.categories.forEach { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(380.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                filtered.forEach { ep ->
                    val entry = videoLookup[ep.id]
                    val streamUrl = entry?.videoUrl?.trim().orEmpty()
                    val effectiveDiff = entry?.difficulty?.ifBlank { ep.difficulty } ?: ep.difficulty
                    val isDone = ep.id in completedEpisodeIds
                    val isExpanded = expandedEpisodeId == ep.id

                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, if (isDone) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Ep ${ep.number}: ${ep.title}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                                IconButton(
                                    onClick = { onToggleCompleted(ep.id, !isDone) },
                                    modifier = Modifier.testTag("academy_complete_${ep.id}")
                                ) {
                                    Icon(
                                        imageVector = if (isDone) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                        contentDescription = if (isDone) "Completed" else "Mark completed",
                                        tint = if (isDone) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Text(
                                "${effectiveDiff.uppercase()} • ${ep.duration} • ${ep.category}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(ep.summary, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            ep.steps.forEachIndexed { i, step ->
                                Text("${i + 1}. $step", style = MaterialTheme.typography.bodyMedium)
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { expandedEpisodeId = if (isExpanded) null else ep.id },
                                    modifier = Modifier.testTag("academy_watch_${ep.id}")
                                ) {
                                    Icon(Icons.Default.PlayCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (isExpanded) "Hide Video" else "Watch Video")
                                }
                                OutlinedButton(onClick = {
                                    onTryEpisodeRoute(ep.targetRoute)
                                    onDismiss()
                                }) {
                                    Text("Try Workflow")
                                }
                            }

                            if (isExpanded) {
                                if (AcademyVideoValidator.isValidStreamUrl(streamUrl)) {
                                    var playbackError by remember(ep.id, streamUrl) { mutableStateOf(false) }
                                    var isPrepared by remember(ep.id, streamUrl) { mutableStateOf(false) }
                                    var retryNonce by remember(ep.id, streamUrl) { mutableIntStateOf(0) }
                                    if (playbackError) {
                                        Surface(
                                            shape = MaterialTheme.shapes.small,
                                            color = MaterialTheme.colorScheme.errorContainer,
                                            modifier = Modifier.fillMaxWidth().testTag("academy_video_error_${ep.id}")
                                        ) {
                                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(
                                                    "Video stream could not be played ($streamUrl). Check network connectivity or stream format.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onErrorContainer
                                                )
                                                OutlinedButton(
                                                    onClick = {
                                                        playbackError = false
                                                        isPrepared = false
                                                        retryNonce++
                                                    },
                                                    modifier = Modifier.testTag("academy_video_retry_${ep.id}")
                                                ) {
                                                    Text("Retry Stream")
                                                }
                                            }
                                        }
                                    } else {
                                        if (!isPrepared) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier.padding(vertical = 4.dp)
                                            ) {
                                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                                Text("Preparing verified stream...", style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                        key(ep.id, streamUrl, retryNonce) {
                                            AndroidView(
                                                factory = { ctx ->
                                                    VideoView(ctx).apply {
                                                        val mc = MediaController(ctx)
                                                        mc.setAnchorView(this)
                                                        setMediaController(mc)
                                                        setVideoURI(Uri.parse(streamUrl))
                                                        setOnPreparedListener { mp ->
                                                            isPrepared = true
                                                            mp.isLooping = false
                                                        }
                                                        setOnCompletionListener { onToggleCompleted(ep.id, true) }
                                                        setOnErrorListener { _, _, _ ->
                                                            playbackError = true
                                                            true
                                                        }
                                                        start()
                                                    }
                                                },
                                                onRelease = { view ->
                                                    view.stopPlayback()
                                                },
                                                modifier = Modifier.fillMaxWidth().height(190.dp).testTag("academy_video_player_${ep.id}")
                                            )
                                        }
                                    }
                                } else {
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = MaterialTheme.colorScheme.surfaceVariant,
                                        modifier = Modifier.fillMaxWidth().testTag("academy_video_unavailable_${ep.id}")
                                    ) {
                                        Text(
                                            if (streamUrl.isBlank()) {
                                                "Video stream unavailable: No verified video stream URL has been configured for Episode ${ep.number} yet. Follow the numbered field steps above to complete this workflow."
                                            } else {
                                                "Video stream unavailable: Configured URL failed HTTPS validation ($streamUrl). Follow the numbered field steps above."
                                            },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }
                                }

                                if (isOwner) {
                                    var editUrl by remember(ep.id, streamUrl) { mutableStateOf(streamUrl) }
                                    var urlValidationError by remember(ep.id, streamUrl) { mutableStateOf<String?>(null) }
                                    OutlinedTextField(
                                        value = editUrl,
                                        onValueChange = {
                                            editUrl = it
                                            urlValidationError = null
                                        },
                                        label = { Text("Owner: Video HTTPS Stream URL") },
                                        isError = urlValidationError != null,
                                        supportingText = urlValidationError?.let { msg -> { Text(msg) } },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("academy_owner_url_input_${ep.id}")
                                    )
                                    Button(
                                        onClick = {
                                            val candidate = editUrl.trim()
                                            if (candidate.isNotEmpty() && !AcademyVideoValidator.isValidStreamUrl(candidate)) {
                                                urlValidationError = "Enter a valid https:// video URL (no spaces) or leave blank."
                                                return@Button
                                            }
                                            onSaveVideoUrl(ep.id, ep.number, ep.title, effectiveDiff, candidate)
                                        },
                                        modifier = Modifier.fillMaxWidth().testTag("academy_owner_url_save_${ep.id}")
                                    ) {
                                        Text("Save Episode Video URL")
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BugReportSheet(
    onSubmit: (title: String, module: String, severity: String, description: String) -> Unit,
    onDismiss: () -> Unit
) {
    BackHandler { onDismiss() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var title by remember { mutableStateOf("") }
    var module by remember { mutableStateOf("Calculator") }
    var severity by remember { mutableStateOf("medium") }
    var description by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Report Field Issue", style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close") }
            }
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Issue Summary*") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                listOf("Calculator", "CAD Drafting Studio", "GPS Walk Area", "GIS I/O", "Bhuvan Map 2D", "Marketplace").forEach { m ->
                    FilterChip(selected = module == m, onClick = { module = m }, label = { Text(m) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("low", "medium", "high", "critical").forEach { sev ->
                    FilterChip(selected = severity == sev, onClick = { severity = sev }, label = { Text(sev.uppercase()) })
                }
            }
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Steps to reproduce*") },
                minLines = 3,
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = {
                    if (title.isNotBlank() && description.isNotBlank()) {
                        onSubmit(title, module, severity, description)
                        onDismiss()
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp).testTag("submit_bug_report_button")
            ) {
                Text("Submit Report")
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
