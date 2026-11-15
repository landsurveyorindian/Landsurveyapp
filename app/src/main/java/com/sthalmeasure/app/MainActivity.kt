package com.sthalmeasure.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Architecture
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.DeveloperMode
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.FolderCopy
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.ImportExport
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.firebase.auth.FirebaseUser
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.domain.AppFeature
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.domain.PermissionAccessState
import com.sthalmeasure.app.domain.PermissionEvaluator
import com.sthalmeasure.app.domain.PlotSummaryCodec
import com.sthalmeasure.app.firebase.AppCheckHelper
import com.sthalmeasure.app.firebase.AuthManager
import com.sthalmeasure.app.report.PdfReportGenerator
import com.sthalmeasure.app.ui.screens.AcademySheet
import com.sthalmeasure.app.ui.screens.AiPlotAdvisorSheet
import com.sthalmeasure.app.ui.screens.AuthFlowHost
import com.sthalmeasure.app.ui.screens.BugReportSheet
import com.sthalmeasure.app.ui.screens.CadGisScreen
import com.sthalmeasure.app.ui.screens.CadStudioScreen
import com.sthalmeasure.app.ui.screens.CalculatorScreen
import com.sthalmeasure.app.ui.screens.CompleteRegistrationScreen
import com.sthalmeasure.app.ui.screens.DeveloperDashboardScreen
import com.sthalmeasure.app.ui.screens.GpsWalkScreen
import com.sthalmeasure.app.ui.screens.HomeScreen
import com.sthalmeasure.app.ui.screens.IndividualPermissionsScreen
import com.sthalmeasure.app.ui.screens.LandDocumentScannerSheet
import com.sthalmeasure.app.ui.screens.MarketplaceScreen
import com.sthalmeasure.app.ui.screens.OwnerControlCenterScreen
import com.sthalmeasure.app.ui.screens.ProjectsScreen
import com.sthalmeasure.app.ui.theme.SthalMeasureTheme
import com.sthalmeasure.app.ui.viewmodel.AuthProfileState
import com.sthalmeasure.app.ui.viewmodel.MainViewModel

enum class SthalDestination(
    val route: String,
    val label: String,
    val icon: ImageVector
) {
    HOME("home", "Home", Icons.Default.Home),
    CALC("calc", "Calc", Icons.Default.Calculate),
    CAD("cad", "CAD", Icons.Default.Architecture),
    GPS("gps", "GPS", Icons.Default.GpsFixed),
    GIS("gis", "GIS", Icons.Default.ImportExport),
    PROJECTS("projects", "Vault", Icons.Default.FolderCopy),
    MARKET("market", "Market", Icons.Default.Storefront)
}

private const val ROUTE_OWNER = "owner"
private const val ROUTE_DEVELOPER = "developer"
private const val ROUTE_INDIVIDUAL_PERMS = "individual_perms"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Must configure App Check before any Firebase service call
        AppCheckHelper.configureAppCheck(this, intent)
        enableEdgeToEdge()

        setContent {
            SthalMeasureTheme {
                val vm: MainViewModel = viewModel()
                val authUser by vm.authUser.collectAsStateWithLifecycle()
                val authProfileState by vm.authProfileState.collectAsStateWithLifecycle()
                val selectedPortal by vm.selectedLoginPortal.collectAsStateWithLifecycle()
                val registrationBusy by vm.registrationBusy.collectAsStateWithLifecycle()
                val registrationError by vm.registrationError.collectAsStateWithLifecycle()

                LaunchedEffect(Unit) {
                    if (authUser == null) {
                        AuthManager.trySilentGoogleSignIn(this@MainActivity)
                    }
                }

                val user = authUser
                if (user == null) {
                    AuthFlowHost(
                        selectedPortal = selectedPortal,
                        onSelectPortal = { vm.selectLoginPortal(it) },
                        onPrepareRegistration = { name, state -> vm.prepareRegistration(name, state) },
                        onClearPendingRegistration = { vm.clearPendingRegistration() }
                    )
                } else {
                    when (val profileState = authProfileState) {
                        AuthProfileState.Checking -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                        is AuthProfileState.NeedsRegistration -> {
                            CompleteRegistrationScreen(
                                userEmail = profileState.user.email.orEmpty(),
                                defaultDisplayName = profileState.user.displayName.orEmpty(),
                                defaultState = vm.activeState.collectAsStateWithLifecycle().value,
                                busy = registrationBusy,
                                errorMessage = registrationError,
                                onCompleteRegistration = { name, state ->
                                    vm.completeRegistration(name, state)
                                },
                                onSignOut = { vm.signOut() }
                            )
                        }
                        is AuthProfileState.Ready -> {
                            key(user.uid) {
                                SthalMainShell(user = user, vm = vm)
                            }
                        }
                        is AuthProfileState.Error -> {
                            AccountSyncErrorScreen(
                                message = profileState.message,
                                onRetry = { vm.retryAccountSync() },
                                onSignOut = { vm.signOut() }
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SthalMainShell(user: FirebaseUser, vm: MainViewModel) {
    val activeState by vm.activeState.collectAsStateWithLifecycle()
    val appRole by vm.appRole.collectAsStateWithLifecycle()
    val currentProfile by vm.currentProfile.collectAsStateWithLifecycle()
    val systemSettings by vm.systemSettings.collectAsStateWithLifecycle()
    val featureAccessStates by vm.featureAccessStates.collectAsStateWithLifecycle()
    val effectivePermissions by vm.effectivePermissions.collectAsStateWithLifecycle()
    val allUserFeaturePermissions by vm.allUserFeaturePermissions.collectAsStateWithLifecycle()
    val permissionAuditLogs by vm.permissionAuditLogs.collectAsStateWithLifecycle()
    val developerEmails by vm.developerEmails.collectAsStateWithLifecycle()
    val allUsers by vm.allUsers.collectAsStateWithLifecycle()
    val allBugReports by vm.allBugReports.collectAsStateWithLifecycle()
    val listingReports by vm.listingReports.collectAsStateWithLifecycle()
    val sellerInquiries by vm.sellerInquiries.collectAsStateWithLifecycle()
    val academyVideos by vm.academyVideos.collectAsStateWithLifecycle()
    val completedEpisodeIds by vm.completedEpisodeIds.collectAsStateWithLifecycle()
    val projects by vm.projects.collectAsStateWithLifecycle()
    val listings by vm.listings.collectAsStateWithLifecycle()
    val draftingPoints by vm.draftingPoints.collectAsStateWithLifecycle()
    val aiChat by vm.aiChat.collectAsStateWithLifecycle()
    val aiBusy by vm.aiBusy.collectAsStateWithLifecycle()
    val aiError by vm.aiError.collectAsStateWithLifecycle()
    val scannerBusy by vm.scannerBusy.collectAsStateWithLifecycle()
    val scannerResult by vm.scannerResult.collectAsStateWithLifecycle()
    val scannerError by vm.scannerError.collectAsStateWithLifecycle()
    val statusBanner by vm.statusBanner.collectAsStateWithLifecycle()
    val converterPresetSqm by vm.converterPresetSqm.collectAsStateWithLifecycle()

    val context = LocalContext.current
    var currentRoute by remember { mutableStateOf(SthalDestination.HOME.route) }
    var showStateDialog by remember { mutableStateOf(false) }
    var showAdvisorSheet by remember { mutableStateOf(false) }
    var showScannerSheet by remember { mutableStateOf(false) }
    var showAcademySheet by remember { mutableStateOf(false) }
    var showBugReportSheet by remember { mutableStateOf(false) }
    var marketPrefillCents by remember { mutableStateOf<Double?>(null) }
    var marketPrefillTitle by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(statusBanner) {
        val msg = statusBanner
        if (msg != null) {
            snackbarHostState.showSnackbar(msg)
            vm.clearStatusBanner()
        }
    }

    if (currentProfile?.status == "suspended" && appRole != AppRole.OWNER) {
        BlockedStateScreen(
            title = "Account Suspended",
            message = "Your Sthal Measure account is currently suspended by the App Owner.",
            tag = "suspended_account_card",
            onSignOut = { vm.signOut() }
        )
        return
    }

    if (systemSettings.maintenanceMode && appRole == AppRole.USER) {
        BlockedStateScreen(
            title = "Scheduled Maintenance",
            message = systemSettings.announcementMessage.ifBlank {
                "Sthal Measure is undergoing scheduled maintenance by the App Owner. Please check back shortly."
            },
            tag = "maintenance_mode_card",
            onSignOut = { vm.signOut() }
        )
        return
    }

    fun accessStateOf(feature: AppFeature): PermissionAccessState =
        featureAccessStates[feature] ?: PermissionAccessState.LOADING

    fun isFeatureAllowed(feature: AppFeature): Boolean =
        accessStateOf(feature) == PermissionAccessState.ALLOWED

    val routeAccessState: PermissionAccessState = when (currentRoute) {
        ROUTE_OWNER, ROUTE_INDIVIDUAL_PERMS ->
            if (appRole == AppRole.OWNER) PermissionAccessState.ALLOWED else PermissionAccessState.DENIED
        ROUTE_DEVELOPER -> when (appRole) {
            AppRole.OWNER -> PermissionAccessState.ALLOWED
            AppRole.DEVELOPER -> accessStateOf(AppFeature.DEVELOPER_TOOLS)
            AppRole.USER -> PermissionAccessState.DENIED
        }
        else -> PermissionEvaluator.featureForRoute(currentRoute)?.let { accessStateOf(it) }
            ?: PermissionAccessState.ALLOWED
    }
    val canAccessRoute = routeAccessState == PermissionAccessState.ALLOWED

    fun featureBlockedBanner(feature: AppFeature, label: String): String = when (accessStateOf(feature)) {
        PermissionAccessState.LOADING -> "$label is waiting for cloud permission verification."
        PermissionAccessState.UNAVAILABLE -> "$label is locked while cloud permissions are unavailable. Tap Retry."
        PermissionAccessState.DENIED, PermissionAccessState.ALLOWED -> "$label has been disabled for your account."
    }

    val openAiWithPolicy: () -> Unit = {
        if (isFeatureAllowed(AppFeature.AI_TOOLS)) {
            showAdvisorSheet = true
        } else {
            vm.postMessage(featureBlockedBanner(AppFeature.AI_TOOLS, "AI Plot Advisor"))
        }
    }
    val openScannerWithPolicy: () -> Unit = {
        if (isFeatureAllowed(AppFeature.DOC_SCANNER)) {
            showScannerSheet = true
        } else {
            vm.postMessage(featureBlockedBanner(AppFeature.DOC_SCANNER, "Document Scanner"))
        }
    }
    val openAcademyWithPolicy: () -> Unit = {
        if (isFeatureAllowed(AppFeature.VIDEO_ACADEMY)) {
            showAcademySheet = true
        } else {
            vm.postMessage(featureBlockedBanner(AppFeature.VIDEO_ACADEMY, "18-Episode Academy"))
        }
    }

    // Sub-destinations return cleanly on system Back press
    if (currentRoute == ROUTE_INDIVIDUAL_PERMS) {
        BackHandler { currentRoute = ROUTE_OWNER }
    } else if (currentRoute != SthalDestination.HOME.route) {
        BackHandler { currentRoute = SthalDestination.HOME.route }
    }

    val visibleDestinations = SthalDestination.entries.filter { dest ->
        PermissionEvaluator.featureForRoute(dest.route)?.let { isFeatureAllowed(it) } ?: true
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val useRail = maxWidth >= 720.dp

        Scaffold(
            contentWindowInsets = WindowInsets.safeDrawing,
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        titleContentColor = MaterialTheme.colorScheme.onSurface
                    ),
                    title = {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("Sthal Measure", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Surface(
                                    shape = MaterialTheme.shapes.small,
                                    color = when (appRole) {
                                        AppRole.OWNER -> MaterialTheme.colorScheme.primary
                                        AppRole.DEVELOPER -> MaterialTheme.colorScheme.secondary
                                        AppRole.USER -> MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    modifier = Modifier.testTag("header_role_badge")
                                ) {
                                    Text(
                                        text = appRole.label.uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = when (appRole) {
                                            AppRole.OWNER -> MaterialTheme.colorScheme.onPrimary
                                            AppRole.DEVELOPER -> MaterialTheme.colorScheme.onSecondary
                                            AppRole.USER -> MaterialTheme.colorScheme.onSurfaceVariant
                                        },
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Surface(
                                shape = MaterialTheme.shapes.small,
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier
                                    .clickable { showStateDialog = true }
                                    .testTag("header_state_selector")
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.LocationOn, contentDescription = "Active State", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.height(14.dp))
                                    Text(activeState, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                }
                            }
                        }
                    },
                    actions = {
                        if (appRole == AppRole.OWNER) {
                            IconButton(
                                onClick = { currentRoute = ROUTE_OWNER },
                                modifier = Modifier.testTag("header_owner_button")
                            ) {
                                Icon(Icons.Default.AdminPanelSettings, contentDescription = "Owner Control Center")
                            }
                        }
                        if (appRole == AppRole.OWNER || (appRole == AppRole.DEVELOPER && isFeatureAllowed(AppFeature.DEVELOPER_TOOLS))) {
                            IconButton(
                                onClick = { currentRoute = ROUTE_DEVELOPER },
                                modifier = Modifier.testTag("header_developer_button")
                            ) {
                                Icon(Icons.Default.DeveloperMode, contentDescription = "Developer Dashboard")
                            }
                        }
                        if (isFeatureAllowed(AppFeature.DOC_SCANNER)) {
                            IconButton(
                                onClick = openScannerWithPolicy,
                                modifier = Modifier.testTag("header_scanner_button")
                            ) {
                                Icon(Icons.Default.DocumentScanner, contentDescription = "Scan Land Document")
                            }
                        }
                        if (isFeatureAllowed(AppFeature.AI_TOOLS)) {
                            IconButton(
                                onClick = openAiWithPolicy,
                                modifier = Modifier.testTag("header_ai_button")
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "AI Plot Advisor")
                            }
                        }
                        IconButton(
                            onClick = { vm.signOut() },
                            modifier = Modifier.testTag("header_signout_button")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out")
                        }
                    }
                )
            },
            bottomBar = {
                if (!useRail) {
                    NavigationBar(modifier = Modifier.navigationBarsPadding()) {
                        visibleDestinations.forEach { dest ->
                            NavigationBarItem(
                                selected = currentRoute == dest.route,
                                onClick = { currentRoute = dest.route },
                                icon = { Icon(dest.icon, contentDescription = dest.label) },
                                label = { Text(dest.label, maxLines = 1) },
                                modifier = Modifier.testTag("nav_${dest.route}")
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (useRail) {
                    NavigationRail(modifier = Modifier.fillMaxHeight()) {
                        visibleDestinations.forEach { dest ->
                            NavigationRailItem(
                                selected = currentRoute == dest.route,
                                onClick = { currentRoute = dest.route },
                                icon = { Icon(dest.icon, contentDescription = dest.label) },
                                label = { Text(dest.label) }
                            )
                        }
                        if (appRole == AppRole.OWNER) {
                            NavigationRailItem(
                                selected = currentRoute == ROUTE_OWNER || currentRoute == ROUTE_INDIVIDUAL_PERMS,
                                onClick = { currentRoute = ROUTE_OWNER },
                                icon = { Icon(Icons.Default.AdminPanelSettings, contentDescription = "Owner") },
                                label = { Text("Owner") }
                            )
                        }
                        if (appRole == AppRole.OWNER || (appRole == AppRole.DEVELOPER && isFeatureAllowed(AppFeature.DEVELOPER_TOOLS))) {
                            NavigationRailItem(
                                selected = currentRoute == ROUTE_DEVELOPER,
                                onClick = { currentRoute = ROUTE_DEVELOPER },
                                icon = { Icon(Icons.Default.DeveloperMode, contentDescription = "Dev") },
                                label = { Text("Dev") }
                            )
                        }
                    }
                }

                Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                    if (!canAccessRoute) {
                        FeatureDisabledView(
                            accessState = routeAccessState,
                            onRetryPermissions = { vm.refreshPermissions() },
                            onBackHome = { currentRoute = SthalDestination.HOME.route }
                        )
                    } else {
                        when (currentRoute) {
                            SthalDestination.HOME.route -> HomeScreen(
                                activeState = activeState,
                                projectCount = projects.size,
                                listingCount = listings.size,
                                appRole = appRole,
                                systemSettings = systemSettings,
                                effectivePermissions = effectivePermissions,
                                featureAccessStates = featureAccessStates,
                                openBugCount = allBugReports.count { it.status == "new" || it.status == "investigating" },
                                onRetryPermissions = { vm.refreshPermissions() },
                                onNavigate = { currentRoute = it },
                                onOpenAiAdvisor = openAiWithPolicy,
                                onOpenScanner = openScannerWithPolicy,
                                onOpenAcademy = openAcademyWithPolicy,
                                onOpenBugReport = { showBugReportSheet = true }
                            )
                            SthalDestination.CALC.route -> CalculatorScreen(
                                activeState = activeState,
                                presetSqm = converterPresetSqm,
                                onSaveProject = { name, type, sqm, perim, notes ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes)
                                },
                                onSaveProjectWithSummary = { name, type, sqm, perim, notes, summaryJson ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes, summaryJson)
                                }
                            )
                            SthalDestination.CAD.route -> CadStudioScreen(
                                points = draftingPoints,
                                onUpdatePoints = { vm.updateDraftingPoints(it) },
                                onSaveProject = { name, type, sqm, perim, notes ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes)
                                },
                                onOpenGisExport = { currentRoute = SthalDestination.GIS.route },
                                onSaveProjectWithSummary = { name, type, sqm, perim, notes, summaryJson ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes, summaryJson)
                                }
                            )
                            SthalDestination.GPS.route -> GpsWalkScreen(
                                activeState = activeState,
                                onDetectedState = { vm.selectState(it) },
                                onSendToCad = {
                                    vm.updateDraftingPoints(it)
                                    currentRoute = SthalDestination.CAD.route
                                },
                                onSaveProject = { name, type, sqm, perim, notes ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes)
                                },
                                onSaveProjectWithSummary = { name, type, sqm, perim, notes, summaryJson ->
                                    vm.saveSurveyProject(name, type, sqm, perim, notes, summaryJson)
                                }
                            )
                            SthalDestination.GIS.route -> CadGisScreen(
                                activeState = activeState,
                                activePolygon = draftingPoints,
                                onApplyToCad = {
                                    vm.updateDraftingPoints(it)
                                    currentRoute = SthalDestination.CAD.route
                                },
                                onToast = { vm.postMessage(it) }
                            )
                            SthalDestination.PROJECTS.route -> ProjectsScreen(
                                projects = projects,
                                pdfReportsEnabled = isFeatureAllowed(AppFeature.PDF_REPORTS),
                                onUpdateProject = { id, n, s, notes -> vm.updateProjectNotes(id, n, s, notes) },
                                onDeleteProject = { id -> vm.deleteProject(id) },
                                onPromoteToMarket = { proj ->
                                    marketPrefillTitle = proj.name
                                    marketPrefillCents = proj.areaCents.takeIf { it > 0.0 } ?: 5.0
                                    currentRoute = SthalDestination.MARKET.route
                                },
                                onExportPdf = { proj ->
                                    if (!isFeatureAllowed(AppFeature.PDF_REPORTS)) {
                                        vm.postMessage("PDF Survey Reports have been disabled by the Owner.")
                                    } else {
                                        try {
                                            val file = PdfReportGenerator.generateProjectPdf(context, proj)
                                            PdfReportGenerator.launchShareIntent(context, file, proj.name)
                                            vm.postMessage("Generated PDF report: ${file.name}")
                                        } catch (t: Throwable) {
                                            vm.postMessage(t.localizedMessage ?: "Could not generate PDF report.")
                                        }
                                    }
                                },
                                onReopenProject = { proj ->
                                    val decoded = PlotSummaryCodec.decode(proj.summaryJson)
                                    vm.setConverterSqm(proj.areaSqm)
                                    if (decoded != null && decoded.points.size >= 3) {
                                        vm.updateDraftingPoints(decoded.points.map { CadPoint(it.x, it.y, it.label) })
                                        currentRoute = SthalDestination.CAD.route
                                        vm.postMessage("Reopened \"${proj.name}\" (${decoded.points.size} vertices) in Drafting Studio.")
                                    } else {
                                        currentRoute = SthalDestination.CALC.route
                                        vm.postMessage("Loaded \"${proj.name}\" area into State Converter.")
                                    }
                                }
                            )
                            SthalDestination.MARKET.route -> MarketplaceScreen(
                                currentUid = user.uid,
                                activeState = activeState,
                                listings = listings,
                                sellerInquiries = sellerInquiries,
                                prefillCents = marketPrefillCents,
                                prefillTitle = marketPrefillTitle,
                                onConsumePrefill = {
                                    marketPrefillCents = null
                                    marketPrefillTitle = null
                                },
                                onLoadPrivateSellerData = { id -> vm.loadOwnerPrivateSellerData(id) },
                                onPublishListing = { title, dist, sy, cents, price, seller, phone, photo ->
                                    vm.publishMarketListing(title, dist, sy, cents, price, seller, phone, photo)
                                },
                                onUpdateListing = { id, title, dist, sy, cents, price ->
                                    vm.updateMarketListing(id, title, dist, sy, cents, price)
                                },
                                onReportListing = { id, title, reason, details ->
                                    vm.reportMarketListing(id, title, reason, details)
                                },
                                onSendInquiry = { listing, phone, msg ->
                                    vm.sendMarketInquiry(listing, phone, msg)
                                },
                                onDeleteListing = { id -> vm.deleteMarketListing(id) }
                            )
                            ROUTE_OWNER -> OwnerControlCenterScreen(
                                ownerEmail = user.email.orEmpty(),
                                systemSettings = systemSettings,
                                developerEmails = developerEmails,
                                allUsers = allUsers,
                                listings = listings,
                                bugReports = allBugReports,
                                listingReports = listingReports,
                                onSaveBusinessControls = { vm.saveBusinessControls(it) },
                                onAddDeveloperEmail = { email, label -> vm.addDeveloperEmail(email, label) },
                                onToggleDeveloperEmail = { email, active -> vm.toggleDeveloperEmail(email, active) },
                                onRemoveDeveloperEmail = { email -> vm.removeDeveloperEmail(email) },
                                onUpdateUserRoleStatus = { uid, role, status -> vm.updateUserRoleStatus(uid, role, status) },
                                onVerifyListing = { id, verified, status -> vm.verifyMarketplaceListing(id, verified, status) },
                                onTriageListingReport = { id, status -> vm.triageListingReport(id, status) },
                                onOpenDeveloperDashboard = { currentRoute = ROUTE_DEVELOPER },
                                onOpenIndividualPermissions = { currentRoute = ROUTE_INDIVIDUAL_PERMS }
                            )
                            ROUTE_INDIVIDUAL_PERMS -> IndividualPermissionsScreen(
                                allUsers = allUsers,
                                allPermissionDocs = allUserFeaturePermissions,
                                auditLogs = permissionAuditLogs,
                                systemSettings = systemSettings,
                                onSavePermissions = { profile, map -> vm.saveIndividualPermissions(profile, map) },
                                onRestoreDefaults = { profile -> vm.restoreDefaultIndividualPermissions(profile) },
                                onBack = { currentRoute = ROUTE_OWNER }
                            )
                            ROUTE_DEVELOPER -> DeveloperDashboardScreen(
                                developerEmail = user.email.orEmpty(),
                                appRole = appRole,
                                systemSettings = systemSettings,
                                developerEmails = developerEmails,
                                bugReports = allBugReports,
                                onTriageBug = { id, status -> vm.triageBugReport(id, status) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showStateDialog) {
        BackHandler { showStateDialog = false }
        AlertDialog(
            onDismissRequest = { showStateDialog = false },
            title = { Text("Select State Jurisdiction") },
            text = {
                LazyColumn(modifier = Modifier.height(360.dp)) {
                    items(IndianStateUnitsCatalog.allStates, key = { it.state }) { st ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    vm.selectState(st.state)
                                    showStateDialog = false
                                }
                                .padding(vertical = 10.dp, horizontal = 4.dp)
                        ) {
                            Text("${st.state} (${st.code})", fontWeight = FontWeight.SemiBold)
                            Text(st.primaryUnits.take(4).joinToString(" • "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        HorizontalDivider()
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showStateDialog = false }) { Text("Done") }
            }
        )
    }

    if (showAdvisorSheet) {
        AiPlotAdvisorSheet(
            activeState = activeState,
            messages = aiChat,
            busy = aiBusy,
            error = aiError,
            onAsk = { vm.askAiAdvisor(it) },
            onDismiss = { showAdvisorSheet = false }
        )
    }

    if (showScannerSheet) {
        LandDocumentScannerSheet(
            activeState = activeState,
            busy = scannerBusy,
            error = scannerError,
            result = scannerResult,
            onScanBitmap = { vm.scanLandDocument(it) },
            onApplyAreaSqm = { sqm ->
                vm.setConverterSqm(sqm)
                showScannerSheet = false
                currentRoute = SthalDestination.CALC.route
            },
            onDismiss = {
                vm.clearScannerResult()
                showScannerSheet = false
            }
        )
    }

    if (showAcademySheet) {
        AcademySheet(
            academyVideos = academyVideos,
            completedEpisodeIds = completedEpisodeIds,
            isOwner = appRole == AppRole.OWNER,
            onToggleCompleted = { epId, done -> vm.setEpisodeCompleted(epId, done) },
            onSaveVideoUrl = { epId, num, title, diff, url -> vm.saveAcademyVideo(epId, num, title, diff, url) },
            onTryEpisodeRoute = { route -> currentRoute = route },
            onDismiss = { showAcademySheet = false }
        )
    }

    if (showBugReportSheet) {
        BugReportSheet(
            onSubmit = { t, m, sev, desc -> vm.submitBugReport(t, m, sev, desc) },
            onDismiss = { showBugReportSheet = false }
        )
    }
}

@Composable
private fun BlockedStateScreen(
    title: String,
    message: String,
    tag: String,
    onSignOut: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .testTag(tag),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.height(48.dp)
            )
            Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onSignOut,
                modifier = Modifier.testTag("${tag}_signout")
            ) {
                Text("Sign Out")
            }
        }
    }
}

@Composable
private fun AccountSyncErrorScreen(
    message: String,
    onRetry: () -> Unit,
    onSignOut: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .testTag("account_sync_error_view"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.CloudOff,
                contentDescription = "Account Sync Unavailable",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.height(48.dp)
            )
            Text("Account Policy Unavailable", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onRetry,
                modifier = Modifier.testTag("account_sync_retry_button")
            ) {
                Text("Retry Policy Sync")
            }
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.testTag("account_sync_signout_button")
            ) {
                Text("Sign Out")
            }
        }
    }
}

@Composable
private fun FeatureDisabledView(
    accessState: PermissionAccessState,
    onRetryPermissions: () -> Unit,
    onBackHome: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .testTag("feature_disabled_view"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (accessState) {
                PermissionAccessState.LOADING -> {
                    CircularProgressIndicator()
                    Text("Checking Permissions...", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Protected workspaces remain locked until cloud access policy loads.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
                PermissionAccessState.UNAVAILABLE -> {
                    Icon(
                        imageVector = Icons.Default.CloudOff,
                        contentDescription = "Permissions Unavailable",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.height(44.dp)
                    )
                    Text("Permission Service Unavailable", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Unable to verify feature access from Firestore. Protected modules remain locked.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Button(
                        onClick = onRetryPermissions,
                        modifier = Modifier.testTag("feature_unavailable_retry_button")
                    ) {
                        Text("Retry Verification")
                    }
                }
                PermissionAccessState.DENIED, PermissionAccessState.ALLOWED -> {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Feature Disabled",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.height(44.dp)
                    )
                    Text("Feature Disabled by Owner", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = "This module is currently turned off in the Owner Control Center.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
            OutlinedButton(
                onClick = onBackHome,
                modifier = Modifier.testTag("feature_disabled_back_home")
            ) {
                Text("Return to Home")
            }
        }
    }
}

