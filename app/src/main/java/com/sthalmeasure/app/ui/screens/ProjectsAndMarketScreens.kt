package com.sthalmeasure.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.sthalmeasure.app.data.model.MarketInquiry
import com.sthalmeasure.app.data.model.MarketListing
import com.sthalmeasure.app.data.model.PrivateSellerData
import com.sthalmeasure.app.data.model.SurveyProject

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProjectsScreen(
    projects: List<SurveyProject>,
    pdfReportsEnabled: Boolean = true,
    onUpdateProject: (id: String, name: String, state: String, notes: String) -> Unit,
    onDeleteProject: (id: String) -> Unit,
    onPromoteToMarket: (SurveyProject) -> Unit,
    onExportPdf: (SurveyProject) -> Unit = {},
    onReopenProject: (SurveyProject) -> Unit = {}
) {
    var filterType by remember { mutableStateOf("all") }
    var searchQuery by remember { mutableStateOf("") }
    var editingProject by remember { mutableStateOf<SurveyProject?>(null) }
    var deletingProject by remember { mutableStateOf<SurveyProject?>(null) }

    val filtered = remember(projects, filterType, searchQuery) {
        val byType = if (filterType == "all") projects else projects.filter { it.parcelType == filterType }
        val q = searchQuery.trim()
        if (q.isEmpty()) byType else byType.filter {
            it.name.contains(q, ignoreCase = true) ||
                it.state.contains(q, ignoreCase = true) ||
                it.notes.contains(q, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Survey Project Vault (${projects.size})", style = MaterialTheme.typography.titleLarge)

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search saved surveys by name, state, or notes") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().testTag("projects_search_input")
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf(
                "all" to "All",
                "four_sided" to "4-Sided",
                "triangle" to "Triangle",
                "traverse" to "Traverse",
                "cad" to "CAD",
                "gps_walk" to "GPS Area"
            ).forEach { (key, label) ->
                FilterChip(
                    selected = filterType == key,
                    onClick = { filterType = key },
                    label = { Text(label, style = MaterialTheme.typography.labelSmall) }
                )
            }
        }

        if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    if (projects.isEmpty()) {
                        "No saved survey projects yet. Calculate a plot or complete a GPS Walk Area survey to sync to your vault."
                    } else {
                        "No saved surveys match your current search/filter."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(filtered, key = { it.id }) { proj ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.fillMaxWidth().testTag("project_card_${proj.id}")
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(proj.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text("${proj.state} • ${proj.parcelType.uppercase()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                }
                                Row {
                                    IconButton(
                                        onClick = { editingProject = proj },
                                        modifier = Modifier.testTag("edit_project_${proj.id}")
                                    ) {
                                        Icon(Icons.Default.Edit, contentDescription = "Edit project")
                                    }
                                    IconButton(
                                        onClick = { deletingProject = proj },
                                        modifier = Modifier.testTag("delete_project_${proj.id}")
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete project", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                            Text(
                                "${"%.2f".format(proj.areaCents)} Cents • ${"%.1f".format(proj.areaSqYards)} Sq.Yd • ${"%.2f".format(proj.areaSqm)} m²",
                                style = MaterialTheme.typography.labelMedium
                            )
                            if (proj.notes.isNotBlank()) {
                                Text(proj.notes, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                OutlinedButton(
                                    onClick = { onReopenProject(proj) },
                                    modifier = Modifier.testTag("reopen_project_${proj.id}")
                                ) {
                                    Icon(Icons.Default.FolderOpen, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Reopen")
                                }
                                OutlinedButton(
                                    onClick = { onExportPdf(proj) },
                                    enabled = pdfReportsEnabled,
                                    modifier = Modifier.testTag("export_pdf_${proj.id}")
                                ) {
                                    Icon(Icons.Default.PictureAsPdf, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (pdfReportsEnabled) "PDF Report" else "PDF Locked")
                                }
                                OutlinedButton(onClick = { onPromoteToMarket(proj) }) {
                                    Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("List on Market")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    editingProject?.let { proj ->
        BackHandler { editingProject = null }
        var editName by remember(proj) { mutableStateOf(proj.name) }
        var editNotes by remember(proj) { mutableStateOf(proj.notes) }
        AlertDialog(
            onDismissRequest = { editingProject = null },
            title = { Text("Edit Project") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Project Name") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editNotes,
                        onValueChange = { editNotes = it },
                        label = { Text("Field Notes") },
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    onUpdateProject(proj.id, editName, proj.state, editNotes)
                    editingProject = null
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { editingProject = null }) { Text("Cancel") }
            }
        )
    }

    deletingProject?.let { proj ->
        BackHandler { deletingProject = null }
        AlertDialog(
            onDismissRequest = { deletingProject = null },
            title = { Text("Delete Survey Project?") },
            text = {
                Text("Permanently remove \"${proj.name}\" from your Survey Project Vault? This action cannot be undone.")
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = {
                        onDeleteProject(proj.id)
                        deletingProject = null
                    },
                    modifier = Modifier.testTag("confirm_delete_project_button")
                ) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { deletingProject = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun MarketplaceScreen(
    currentUid: String,
    activeState: String,
    listings: List<MarketListing>,
    sellerInquiries: List<MarketInquiry> = emptyList(),
    prefillCents: Double? = null,
    prefillTitle: String? = null,
    onConsumePrefill: () -> Unit,
    onLoadPrivateSellerData: suspend (String) -> PrivateSellerData?,
    onPublishListing: (
        title: String,
        district: String,
        surveyNo: String,
        areaCents: Double,
        priceInr: Double,
        sellerName: String,
        sellerPhone: String,
        photoUri: String
    ) -> Unit,
    onUpdateListing: (
        listingId: String,
        title: String,
        district: String,
        surveyNo: String,
        areaCents: Double,
        priceInr: Double
    ) -> Unit = { _, _, _, _, _, _ -> },
    onReportListing: (listingId: String, title: String, reason: String, details: String) -> Unit = { _, _, _, _ -> },
    onSendInquiry: (listing: MarketListing, buyerPhone: String, message: String) -> Unit = { _, _, _ -> },
    onDeleteListing: (String) -> Unit
) {
    var showCreateDialog by remember(prefillCents) { mutableStateOf(prefillCents != null) }
    var selectedListing by remember { mutableStateOf<MarketListing?>(null) }
    var editingListing by remember { mutableStateOf<MarketListing?>(null) }
    var reportingListing by remember { mutableStateOf<MarketListing?>(null) }
    var inquiryListing by remember { mutableStateOf<MarketListing?>(null) }
    var showInboxDialog by remember { mutableStateOf(false) }

    var searchQuery by remember { mutableStateOf("") }
    var stateFilterOnly by remember { mutableStateOf(false) }
    var verifiedOnly by remember { mutableStateOf(false) }

    val displayed = remember(listings, stateFilterOnly, verifiedOnly, searchQuery, activeState) {
        val q = searchQuery.trim()
        listings.filter { item ->
            val okState = !stateFilterOnly || item.state.equals(activeState, ignoreCase = true)
            val okVerified = !verifiedOnly || item.verified
            val okSearch = q.isEmpty() ||
                item.title.contains(q, ignoreCase = true) ||
                item.district.contains(q, ignoreCase = true) ||
                item.surveyNo.contains(q, ignoreCase = true) ||
                item.state.contains(q, ignoreCase = true)
            okState && okVerified && okSearch
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Land Marketplace (${displayed.size})", style = MaterialTheme.typography.titleLarge)
                OutlinedButton(
                    onClick = { showInboxDialog = true },
                    modifier = Modifier.testTag("market_inbox_button")
                ) {
                    Icon(Icons.Default.Inbox, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Inbox (${sellerInquiries.size})")
                }
            }

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search parcels by title, district, or survey no.") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("market_search_input")
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = stateFilterOnly,
                    onClick = { stateFilterOnly = !stateFilterOnly },
                    label = { Text(if (stateFilterOnly) activeState else "All India") }
                )
                FilterChip(
                    selected = verifiedOnly,
                    onClick = { verifiedOnly = !verifiedOnly },
                    label = { Text("Verified Only") },
                    modifier = Modifier.testTag("market_verified_filter")
                )
            }

            if (displayed.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "No matching parcels found. Adjust filters or tap + to list a surveyed plot.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(displayed, key = { it.id }) { item ->
                        Card(
                            onClick = { selectedListing = item },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.fillMaxWidth().testTag("market_card_${item.id}")
                        ) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                if (item.photoUri.isNotBlank()) {
                                    AsyncImage(
                                        model = item.photoUri,
                                        contentDescription = item.title,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(140.dp)
                                            .clip(MaterialTheme.shapes.small)
                                    )
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = if (item.verified) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                    ) {
                                        Text(
                                            text = if (item.verified) "VERIFIED" else item.verificationStatus.uppercase(),
                                            style = MaterialTheme.typography.labelSmall,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text("${item.district.ifBlank { "District" }}, ${item.state} • ${item.surveyNo.ifBlank { "Sy.No Pending" }}", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "${"%.2f".format(item.areaCents)} Cents (${"%.0f".format(item.areaSqYards)} Sq.Yd) • ₹${"%,.0f".format(item.priceInr)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = { showCreateDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .testTag("publish_listing_fab")
        ) {
            Icon(Icons.Default.Add, contentDescription = "Publish Plot Listing")
        }
    }

    if (showCreateDialog) {
        BackHandler {
            showCreateDialog = false
            onConsumePrefill()
        }
        PublishListingDialog(
            initialTitle = prefillTitle.orEmpty(),
            initialCents = prefillCents?.let { "%.2f".format(it) } ?: "5.0",
            onDismiss = {
                showCreateDialog = false
                onConsumePrefill()
            },
            onPublish = { title, dist, sy, cents, price, sellerName, phone, photo ->
                onPublishListing(title, dist, sy, cents, price, sellerName, phone, photo)
                showCreateDialog = false
                onConsumePrefill()
            }
        )
    }

    selectedListing?.let { listing ->
        BackHandler { selectedListing = null }
        var sellerData by remember(listing.id) { mutableStateOf<PrivateSellerData?>(null) }
        val isOwner = listing.userId == currentUid
        LaunchedEffect(listing.id, isOwner) {
            if (isOwner) {
                sellerData = onLoadPrivateSellerData(listing.id)
            }
        }
        AlertDialog(
            onDismissRequest = { selectedListing = null },
            title = { Text(listing.title) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("State: ${listing.state} (${listing.district})")
                    Text("Survey No: ${listing.surveyNo.ifBlank { "N/A" }}")
                    Text("Extent: ${"%.2f".format(listing.areaCents)} Cents | ${"%.4f".format(listing.areaAcres)} Acres")
                    Text("Price: ₹${"%,.0f".format(listing.priceInr)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text("Status: ${if (listing.verified) "Verified by Sthal Owner" else listing.verificationStatus.uppercase()}")
                    Text("Listed By: ${listing.sellerName}")
                    if (isOwner && sellerData != null) {
                        Text("Your Private Contact: ${sellerData!!.sellerPhone}", style = MaterialTheme.typography.labelMedium)
                    }
                    if (!isOwner) {
                        Spacer(Modifier.height(6.dp))
                        Button(
                            onClick = {
                                inquiryListing = listing
                                selectedListing = null
                            },
                            modifier = Modifier.fillMaxWidth().testTag("open_inquiry_dialog_btn")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Send Inquiry to Seller")
                        }
                        OutlinedButton(
                            onClick = {
                                reportingListing = listing
                                selectedListing = null
                            },
                            modifier = Modifier.fillMaxWidth().testTag("open_report_listing_btn")
                        ) {
                            Icon(Icons.Default.Flag, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Report Listing")
                        }
                    } else {
                        Spacer(Modifier.height(6.dp))
                        OutlinedButton(
                            onClick = {
                                editingListing = listing
                                selectedListing = null
                            },
                            modifier = Modifier.fillMaxWidth().testTag("edit_listing_button")
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Edit Listing")
                        }
                    }
                }
            },
            confirmButton = {
                if (isOwner) {
                    TextButton(onClick = {
                        onDeleteListing(listing.id)
                        selectedListing = null
                    }) {
                        Text("Delete Listing", color = MaterialTheme.colorScheme.error)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedListing = null }) { Text("Close") }
            }
        )
    }

    editingListing?.let { listing ->
        BackHandler { editingListing = null }
        var editTitle by remember(listing) { mutableStateOf(listing.title) }
        var editDistrict by remember(listing) { mutableStateOf(listing.district) }
        var editSurveyNo by remember(listing) { mutableStateOf(listing.surveyNo) }
        var editCents by remember(listing) { mutableStateOf(listing.areaCents.toString()) }
        var editPrice by remember(listing) { mutableStateOf(listing.priceInr.toLong().toString()) }
        AlertDialog(
            onDismissRequest = { editingListing = null },
            title = { Text("Edit Your Listing") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = editTitle, onValueChange = { editTitle = it }, label = { Text("Title*") }, singleLine = true)
                    OutlinedTextField(value = editDistrict, onValueChange = { editDistrict = it }, label = { Text("District") }, singleLine = true)
                    OutlinedTextField(value = editSurveyNo, onValueChange = { editSurveyNo = it }, label = { Text("Survey No.") }, singleLine = true)
                    OutlinedTextField(
                        value = editCents,
                        onValueChange = { editCents = it },
                        label = { Text("Area (Cents)*") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editPrice,
                        onValueChange = { editPrice = it },
                        label = { Text("Price (INR)*") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    val c = editCents.toDoubleOrNull()?.takeIf { it > 0 } ?: return@Button
                    val p = editPrice.toDoubleOrNull()?.takeIf { it > 0 } ?: return@Button
                    if (editTitle.isBlank()) return@Button
                    onUpdateListing(listing.id, editTitle.trim(), editDistrict.trim(), editSurveyNo.trim(), c, p)
                    editingListing = null
                }) { Text("Save Changes") }
            },
            dismissButton = {
                TextButton(onClick = { editingListing = null }) { Text("Cancel") }
            }
        )
    }

    inquiryListing?.let { listing ->
        BackHandler { inquiryListing = null }
        var buyerPhone by remember { mutableStateOf("") }
        var inquiryMsg by remember { mutableStateOf("Interested in \"${listing.title}\" (${listing.surveyNo}). Please share FMB copy & visit timing.") }
        AlertDialog(
            onDismissRequest = { inquiryListing = null },
            title = { Text("Contact Seller") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Your inquiry goes privately to ${listing.sellerName}. Seller phone numbers are protected until the seller replies.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedTextField(
                        value = buyerPhone,
                        onValueChange = { buyerPhone = it },
                        label = { Text("Your Contact Number*") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = inquiryMsg,
                        onValueChange = { inquiryMsg = it },
                        label = { Text("Message*") },
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (buyerPhone.isNotBlank() && inquiryMsg.isNotBlank()) {
                        onSendInquiry(listing, buyerPhone.trim(), inquiryMsg.trim())
                        inquiryListing = null
                    }
                }) { Text("Send Inquiry") }
            },
            dismissButton = {
                TextButton(onClick = { inquiryListing = null }) { Text("Cancel") }
            }
        )
    }

    reportingListing?.let { listing ->
        BackHandler { reportingListing = null }
        var reason by remember { mutableStateOf("Misleading Area / Survey No") }
        var details by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { reportingListing = null },
            title = { Text("Report Listing") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Misleading Area / Survey No", "Duplicate / Spam", "Suspicious Pricing").forEach { r ->
                        FilterChip(selected = reason == r, onClick = { reason = r }, label = { Text(r) })
                    }
                    OutlinedTextField(
                        value = details,
                        onValueChange = { details = it },
                        label = { Text("Evidence / Reason Details") },
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    onReportListing(listing.id, listing.title, reason, details.trim())
                    reportingListing = null
                }) { Text("Submit Report") }
            },
            dismissButton = {
                TextButton(onClick = { reportingListing = null }) { Text("Cancel") }
            }
        )
    }

    if (showInboxDialog) {
        BackHandler { showInboxDialog = false }
        AlertDialog(
            onDismissRequest = { showInboxDialog = false },
            title = { Text("Seller Inquiry Inbox (${sellerInquiries.size})") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (sellerInquiries.isEmpty()) {
                        Text("No buyer inquiries received yet.", style = MaterialTheme.typography.bodySmall)
                    } else {
                        sellerInquiries.forEachIndexed { idx, inq ->
                            if (idx > 0) HorizontalDivider()
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(inq.listingTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("Buyer: ${inq.buyerName} (${inq.buyerPhone})", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                Text(inq.message, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showInboxDialog = false }) { Text("Close") }
            }
        )
    }
}

@Composable
private fun PublishListingDialog(
    initialTitle: String,
    initialCents: String,
    onDismiss: () -> Unit,
    onPublish: (String, String, String, Double, Double, String, String, String) -> Unit
) {
    var title by remember { mutableStateOf(initialTitle.ifBlank { "Residential Plot for Sale" }) }
    var district by remember { mutableStateOf("") }
    var surveyNo by remember { mutableStateOf("") }
    var centsText by remember { mutableStateOf(initialCents) }
    var priceText by remember { mutableStateOf("2500000") }
    var sellerName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var photoUri by remember { mutableStateOf("") }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) photoUri = uri.toString()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Publish Surveyed Plot") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Listing Title*") }, singleLine = true)
                OutlinedTextField(value = district, onValueChange = { district = it }, label = { Text("District / Mandal") }, singleLine = true)
                OutlinedTextField(value = surveyNo, onValueChange = { surveyNo = it }, label = { Text("Survey / Patta No.") }, singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = centsText,
                        onValueChange = { centsText = it },
                        label = { Text("Area (Cents)*") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = priceText,
                        onValueChange = { priceText = it },
                        label = { Text("Price (INR)*") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                OutlinedTextField(value = sellerName, onValueChange = { sellerName = it }, label = { Text("Seller Name") }, singleLine = true)
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Private Phone / WhatsApp*") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true
                )
                OutlinedButton(
                    onClick = {
                        photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                    modifier = Modifier.fillMaxWidth().testTag("pick_listing_photo_button")
                ) {
                    Icon(Icons.Default.Image, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (photoUri.isBlank()) "Attach Parcel Photo (Photo Picker)" else "Photo Attached ✓")
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val c = centsText.toDoubleOrNull()?.takeIf { it > 0.0 } ?: return@Button
                    val p = priceText.toDoubleOrNull()?.takeIf { it > 0.0 } ?: return@Button
                    if (title.isBlank() || phone.isBlank()) return@Button
                    onPublish(title, district, surveyNo, c, p, sellerName, phone, photoUri)
                },
                modifier = Modifier.testTag("confirm_publish_listing_button")
            ) { Text("Publish") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
