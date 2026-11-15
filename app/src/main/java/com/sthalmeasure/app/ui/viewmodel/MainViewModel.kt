package com.sthalmeasure.app.ui.viewmodel

import android.app.Application
import android.graphics.Bitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestoreException
import com.sthalmeasure.app.ai.AiRepository
import com.sthalmeasure.app.ai.ChatMessage
import com.sthalmeasure.app.ai.ScannedLandDocument
import com.sthalmeasure.app.data.model.AcademyVideoEntry
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.DeveloperEmailEntry
import com.sthalmeasure.app.data.model.ListingReport
import com.sthalmeasure.app.data.model.LoginPortal
import com.sthalmeasure.app.data.model.MarketInquiry
import com.sthalmeasure.app.data.model.MarketListing
import com.sthalmeasure.app.data.model.PermissionAuditLog
import com.sthalmeasure.app.data.model.PrivateSellerData
import com.sthalmeasure.app.data.model.SurveyProject
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserFeaturePermissions
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.data.repository.AccountAndSupportRepository
import com.sthalmeasure.app.data.repository.AdminRepository
import com.sthalmeasure.app.data.repository.MarketRepository
import com.sthalmeasure.app.data.repository.SurveyRepository
import com.sthalmeasure.app.domain.AppFeature
import com.sthalmeasure.app.domain.CadEngine
import com.sthalmeasure.app.domain.CadPoint
import com.sthalmeasure.app.domain.PermissionAccessState
import com.sthalmeasure.app.domain.PermissionEvaluator
import com.sthalmeasure.app.domain.PermissionSourceState
import com.sthalmeasure.app.domain.convertAreaFromSqm
import com.sthalmeasure.app.firebase.AuthManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

sealed interface AuthProfileState {
    data object Checking : AuthProfileState
    data class NeedsRegistration(val user: FirebaseUser) : AuthProfileState
    data class Ready(val profile: UserProfile) : AuthProfileState
    data class Error(val user: FirebaseUser, val message: String) : AuthProfileState
}

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val surveyRepo = SurveyRepository(application)
    private val marketRepo = MarketRepository(application)
    private val accountRepo = AccountAndSupportRepository(application)
    private val adminRepo = AdminRepository(application)
    private val aiRepo = AiRepository()

    private val _authUser = MutableStateFlow<FirebaseUser?>(null)
    val authUser: StateFlow<FirebaseUser?> = _authUser.asStateFlow()

    private val _authProfileState = MutableStateFlow<AuthProfileState>(AuthProfileState.Checking)
    val authProfileState: StateFlow<AuthProfileState> = _authProfileState.asStateFlow()

    private val _selectedLoginPortal = MutableStateFlow(LoginPortal.USER)
    val selectedLoginPortal: StateFlow<LoginPortal> = _selectedLoginPortal.asStateFlow()

    private val _appRole = MutableStateFlow(AppRole.USER)
    val appRole: StateFlow<AppRole> = _appRole.asStateFlow()

    private val _currentProfile = MutableStateFlow<UserProfile?>(null)
    val currentProfile: StateFlow<UserProfile?> = _currentProfile.asStateFlow()

    private val _systemSettingsState = MutableStateFlow<PermissionSourceState<SystemSettings>>(PermissionSourceState.Loading)
    val systemSettingsState: StateFlow<PermissionSourceState<SystemSettings>> = _systemSettingsState.asStateFlow()

    private val _individualPermissionsState = MutableStateFlow<PermissionSourceState<UserFeaturePermissions?>>(PermissionSourceState.Loading)
    val individualPermissionsState: StateFlow<PermissionSourceState<UserFeaturePermissions?>> = _individualPermissionsState.asStateFlow()

    val systemSettings: StateFlow<SystemSettings> = _systemSettingsState
        .map { state -> (state as? PermissionSourceState.Loaded)?.value ?: SystemSettings() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = SystemSettings()
        )

    val myFeaturePermissions: StateFlow<UserFeaturePermissions?> = _individualPermissionsState
        .map { state -> (state as? PermissionSourceState.Loaded)?.value }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = null
        )

    val featureAccessStates: StateFlow<Map<AppFeature, PermissionAccessState>> = combine(
        _appRole,
        _systemSettingsState,
        _individualPermissionsState
    ) { role, settingsState, individualState ->
        PermissionEvaluator.resolveAllFeatureAccessStates(role, settingsState, individualState)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = AppFeature.entries.associateWith { PermissionAccessState.LOADING }
    )

    val effectivePermissions: StateFlow<Map<AppFeature, Boolean>> = featureAccessStates
        .map { states ->
            AppFeature.entries.associateWith { feat -> states[feat] == PermissionAccessState.ALLOWED }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = AppFeature.entries.associateWith { false }
        )

    private val _allUserFeaturePermissions = MutableStateFlow<List<UserFeaturePermissions>>(emptyList())
    val allUserFeaturePermissions: StateFlow<List<UserFeaturePermissions>> = _allUserFeaturePermissions.asStateFlow()

    private val _permissionAuditLogs = MutableStateFlow<List<PermissionAuditLog>>(emptyList())
    val permissionAuditLogs: StateFlow<List<PermissionAuditLog>> = _permissionAuditLogs.asStateFlow()

    private val _developerEmails = MutableStateFlow<List<DeveloperEmailEntry>>(emptyList())
    val developerEmails: StateFlow<List<DeveloperEmailEntry>> = _developerEmails.asStateFlow()

    private val _allUsers = MutableStateFlow<List<UserProfile>>(emptyList())
    val allUsers: StateFlow<List<UserProfile>> = _allUsers.asStateFlow()

    private val _allBugReports = MutableStateFlow<List<BugReport>>(emptyList())
    val allBugReports: StateFlow<List<BugReport>> = _allBugReports.asStateFlow()

    private val _listingReports = MutableStateFlow<List<ListingReport>>(emptyList())
    val listingReports: StateFlow<List<ListingReport>> = _listingReports.asStateFlow()

    private val _sellerInquiries = MutableStateFlow<List<MarketInquiry>>(emptyList())
    val sellerInquiries: StateFlow<List<MarketInquiry>> = _sellerInquiries.asStateFlow()

    private val _academyVideos = MutableStateFlow<List<AcademyVideoEntry>>(emptyList())
    val academyVideos: StateFlow<List<AcademyVideoEntry>> = _academyVideos.asStateFlow()

    private val _completedEpisodeIds = MutableStateFlow<Set<String>>(emptySet())
    val completedEpisodeIds: StateFlow<Set<String>> = _completedEpisodeIds.asStateFlow()

    private val _registrationBusy = MutableStateFlow(false)
    val registrationBusy: StateFlow<Boolean> = _registrationBusy.asStateFlow()

    private val _registrationError = MutableStateFlow<String?>(null)
    val registrationError: StateFlow<String?> = _registrationError.asStateFlow()

    private var pendingRegName: String? = null
    private var pendingRegState: String? = null

    private val _activeState = MutableStateFlow("Andhra Pradesh")
    val activeState: StateFlow<String> = _activeState.asStateFlow()

    private val _projects = MutableStateFlow<List<SurveyProject>>(emptyList())
    val projects: StateFlow<List<SurveyProject>> = _projects.asStateFlow()

    private val _listings = MutableStateFlow<List<MarketListing>>(emptyList())
    val listings: StateFlow<List<MarketListing>> = _listings.asStateFlow()

    private val _draftingPoints = MutableStateFlow(
        listOf(
            CadPoint(0.0, 0.0, "P1"),
            CadPoint(24.0, 0.0, "P2"),
            CadPoint(24.0, 18.0, "P3"),
            CadPoint(0.0, 18.0, "P4")
        )
    )
    val draftingPoints: StateFlow<List<CadPoint>> = _draftingPoints.asStateFlow()

    private val _aiChat = MutableStateFlow(
        listOf(
            ChatMessage(
                id = "welcome",
                isUser = false,
                text = "Namaste! I am your Sthal Measure Cadastral AI Advisor. Ask about regional revenue units, Bowditch traverse closure, FMB offsets, or land dispute checks."
            )
        )
    )
    val aiChat: StateFlow<List<ChatMessage>> = _aiChat.asStateFlow()

    private val _aiBusy = MutableStateFlow(false)
    val aiBusy: StateFlow<Boolean> = _aiBusy.asStateFlow()

    private val _aiError = MutableStateFlow<String?>(null)
    val aiError: StateFlow<String?> = _aiError.asStateFlow()

    private val _scannerBusy = MutableStateFlow(false)
    val scannerBusy: StateFlow<Boolean> = _scannerBusy.asStateFlow()

    private val _scannerResult = MutableStateFlow<ScannedLandDocument?>(null)
    val scannerResult: StateFlow<ScannedLandDocument?> = _scannerResult.asStateFlow()

    private val _scannerError = MutableStateFlow<String?>(null)
    val scannerError: StateFlow<String?> = _scannerError.asStateFlow()

    private val _statusBanner = MutableStateFlow<String?>(null)
    val statusBanner: StateFlow<String?> = _statusBanner.asStateFlow()

    private val _converterPresetSqm = MutableStateFlow(404.6856)
    val converterPresetSqm: StateFlow<Double> = _converterPresetSqm.asStateFlow()

    private val listenerJobs = mutableListOf<Job>()

    init {
        viewModelScope.launch {
            AuthManager.observeAuthState().collect { user ->
                _authUser.value = user
                cancelDataJobs()
                if (user != null) {
                    syncUserAndData(user)
                } else {
                    _authProfileState.value = AuthProfileState.Checking
                    _appRole.value = AppRole.USER
                    _currentProfile.value = null
                    _systemSettingsState.value = PermissionSourceState.Loading
                    _individualPermissionsState.value = PermissionSourceState.Loading
                    _allUserFeaturePermissions.value = emptyList()
                    _permissionAuditLogs.value = emptyList()
                    _registrationError.value = null
                    _projects.value = emptyList()
                    _listings.value = emptyList()
                    _developerEmails.value = emptyList()
                    _allUsers.value = emptyList()
                    _allBugReports.value = emptyList()
                    _listingReports.value = emptyList()
                    _sellerInquiries.value = emptyList()
                    _academyVideos.value = emptyList()
                    _completedEpisodeIds.value = emptySet()
                }
            }
        }
    }

    private fun cancelDataJobs() {
        listenerJobs.forEach { it.cancel() }
        listenerJobs.clear()
    }

    fun getFeatureAccessState(feature: AppFeature): PermissionAccessState =
        featureAccessStates.value[feature] ?: PermissionAccessState.LOADING

    fun hasFeature(feature: AppFeature): Boolean =
        getFeatureAccessState(feature) == PermissionAccessState.ALLOWED

    fun selectLoginPortal(portal: LoginPortal) {
        _selectedLoginPortal.value = portal
    }

    fun prepareRegistration(fullName: String, preferredState: String) {
        pendingRegName = fullName.trim().takeIf { it.isNotBlank() }
        pendingRegState = preferredState.trim().takeIf { it.isNotBlank() }
    }

    fun clearPendingRegistration() {
        pendingRegName = null
        pendingRegState = null
    }

    private fun classifyFirestoreFailure(error: Throwable): PermissionSourceState<Nothing> {
        var cur: Throwable? = error
        while (cur != null) {
            if (cur is FirebaseFirestoreException &&
                cur.code == FirebaseFirestoreException.Code.PERMISSION_DENIED
            ) {
                return PermissionSourceState.Denied
            }
            cur = cur.cause
        }
        if (error.message?.contains("PERMISSION_DENIED", ignoreCase = true) == true) {
            return PermissionSourceState.Denied
        }
        return PermissionSourceState.Unavailable(
            error.localizedMessage ?: "Permission service temporarily unavailable."
        )
    }

    /**
     * Resolves privilege strictly from verified Firebase Auth custom claims or verified bootstrap
     * identity / server-side allowlist — NEVER from client-editable Firestore profile `role` strings.
     */
    private suspend fun resolveUserRole(user: FirebaseUser): AppRole {
        val tokenClaims = try {
            user.getIdToken(false).await().claims
        } catch (e: CancellationException) {
            throw e
        } catch (_: Throwable) {
            emptyMap<String, Any>()
        }

        val email = user.email.orEmpty().trim().lowercase()
        val hasOwnerClaim = (tokenClaims["owner"] as? Boolean == true) ||
            ((tokenClaims["role"] as? String)?.equals("owner", ignoreCase = true) == true)
        val isVerifiedOwnerEmail = email == AdminRepository.OWNER_EMAIL && user.isEmailVerified
        if (hasOwnerClaim || isVerifiedOwnerEmail) {
            return AppRole.OWNER
        }

        val hasDeveloperClaim = (tokenClaims["developer"] as? Boolean == true) ||
            ((tokenClaims["role"] as? String)?.equals("developer", ignoreCase = true) == true)
        if (hasDeveloperClaim) {
            return AppRole.DEVELOPER
        }

        if (user.isEmailVerified && email.isNotBlank() && adminRepo.isEmailAuthorizedDeveloper(email)) {
            return AppRole.DEVELOPER
        }
        return AppRole.USER
    }

    private fun notifyPortalMismatchIfNeeded(resolvedRole: AppRole) {
        when (_selectedLoginPortal.value) {
            LoginPortal.OWNER -> if (resolvedRole != AppRole.OWNER) {
                _statusBanner.value = "Signed in as ${resolvedRole.label}. Only the verified Owner has Owner Controls."
            }
            LoginPortal.DEVELOPER -> if (resolvedRole == AppRole.USER) {
                _statusBanner.value = "Signed in as User. Ask the Owner to authorize your email ID in Developer Access."
            }
            LoginPortal.USER -> Unit
        }
    }

    fun retryAccountSync() {
        _authUser.value?.let { syncUserAndData(it) }
    }

    fun refreshPermissions() {
        val user = _authUser.value ?: return
        viewModelScope.launch {
            try {
                val resolvedRole = resolveUserRole(user)
                _appRole.value = resolvedRole
                startDataListeners(user.uid, resolvedRole)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                val failed = classifyFirestoreFailure(e)
                _systemSettingsState.value = failed
                _individualPermissionsState.value = failed
            }
        }
    }

    private fun syncUserAndData(user: FirebaseUser) {
        _authProfileState.value = AuthProfileState.Checking
        _systemSettingsState.value = PermissionSourceState.Loading
        _individualPermissionsState.value = PermissionSourceState.Loading
        viewModelScope.launch {
            try {
                val existing = accountRepo.getUserProfile(user.uid)
                if (existing != null) {
                    val savedState = existing.preferredState.ifBlank { "Andhra Pradesh" }
                    _activeState.value = savedState
                    clearPendingRegistration()
                    val resolvedRole = resolveUserRole(user)
                    _appRole.value = resolvedRole
                    _currentProfile.value = existing
                    notifyPortalMismatchIfNeeded(resolvedRole)
                    _authProfileState.value = AuthProfileState.Ready(existing)
                    startDataListeners(user.uid, resolvedRole)
                } else if (pendingRegName != null || pendingRegState != null) {
                    val chosenName = pendingRegName ?: user.displayName.orEmpty().ifBlank { "Surveyor" }
                    val chosenState = pendingRegState ?: "Andhra Pradesh"
                    val profile = UserProfile(
                        uid = user.uid,
                        email = user.email.orEmpty(),
                        displayName = chosenName,
                        photoUrl = user.photoUrl?.toString().orEmpty(),
                        preferredState = chosenState
                    )
                    accountRepo.upsertUserProfile(profile)
                    _activeState.value = chosenState
                    clearPendingRegistration()
                    val resolvedRole = resolveUserRole(user)
                    _appRole.value = resolvedRole
                    _currentProfile.value = profile
                    notifyPortalMismatchIfNeeded(resolvedRole)
                    _authProfileState.value = AuthProfileState.Ready(profile)
                    startDataListeners(user.uid, resolvedRole)
                } else {
                    _authProfileState.value = AuthProfileState.NeedsRegistration(user)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                val failed = classifyFirestoreFailure(e)
                _systemSettingsState.value = failed
                _individualPermissionsState.value = failed
                _authProfileState.value = AuthProfileState.Error(
                    user = user,
                    message = e.localizedMessage ?: "Unable to load account & permission policy from cloud."
                )
            }
        }
    }

    fun completeRegistration(displayName: String, preferredState: String) {
        val user = _authUser.value ?: return
        val cleanName = displayName.trim()
        if (cleanName.isBlank()) {
            _registrationError.value = "Please enter your full name."
            return
        }
        val cleanState = preferredState.ifBlank { "Andhra Pradesh" }
        _registrationBusy.value = true
        _registrationError.value = null
        viewModelScope.launch {
            try {
                val profile = UserProfile(
                    uid = user.uid,
                    email = user.email.orEmpty(),
                    displayName = cleanName,
                    photoUrl = user.photoUrl?.toString().orEmpty(),
                    preferredState = cleanState
                )
                accountRepo.upsertUserProfile(profile)
                _activeState.value = cleanState
                val resolvedRole = resolveUserRole(user)
                _appRole.value = resolvedRole
                _currentProfile.value = profile
                notifyPortalMismatchIfNeeded(resolvedRole)
                _authProfileState.value = AuthProfileState.Ready(profile)
                startDataListeners(user.uid, resolvedRole)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _registrationError.value = e.localizedMessage ?: "Failed to save registration."
            } finally {
                _registrationBusy.value = false
            }
        }
    }

    private fun startDataListeners(uid: String, role: AppRole) {
        cancelDataJobs()
        _systemSettingsState.value = PermissionSourceState.Loading
        _individualPermissionsState.value = PermissionSourceState.Loading

        listenerJobs += viewModelScope.launch {
            surveyRepo.observeUserProjects(uid)
                .catch { e -> _statusBanner.value = e.localizedMessage }
                .collect { _projects.value = it }
        }
        listenerJobs += viewModelScope.launch {
            marketRepo.observeListings()
                .catch { e -> _statusBanner.value = e.localizedMessage }
                .collect { _listings.value = it }
        }
        listenerJobs += viewModelScope.launch {
            marketRepo.observeSellerInquiries(uid)
                .catch { /* Seller may not have inquiries yet */ }
                .collect { _sellerInquiries.value = it }
        }
        listenerJobs += viewModelScope.launch {
            adminRepo.observeSystemSettings()
                .catch { e -> _systemSettingsState.value = classifyFirestoreFailure(e) }
                .collect { settings -> _systemSettingsState.value = PermissionSourceState.Loaded(settings) }
        }
        listenerJobs += viewModelScope.launch {
            adminRepo.observeUserFeaturePermissions(uid)
                .catch { e -> _individualPermissionsState.value = classifyFirestoreFailure(e) }
                .collect { doc -> _individualPermissionsState.value = PermissionSourceState.Loaded(doc) }
        }
        listenerJobs += viewModelScope.launch {
            adminRepo.observeAcademyVideos()
                .catch { /* Academy URLs remain empty until loaded */ }
                .collect { _academyVideos.value = it }
        }
        listenerJobs += viewModelScope.launch {
            accountRepo.observeVideoProgress(uid)
                .catch { /* Ignore transient */ }
                .collect { _completedEpisodeIds.value = it }
        }

        if (role == AppRole.OWNER || role == AppRole.DEVELOPER) {
            listenerJobs += viewModelScope.launch {
                adminRepo.observeDeveloperEmails()
                    .catch { e -> _statusBanner.value = e.localizedMessage }
                    .collect { _developerEmails.value = it }
            }
            listenerJobs += viewModelScope.launch {
                adminRepo.observeAllUsers()
                    .catch { e -> _statusBanner.value = e.localizedMessage }
                    .collect { _allUsers.value = it }
            }
            listenerJobs += viewModelScope.launch {
                adminRepo.observeAllBugReports()
                    .catch { e -> _statusBanner.value = e.localizedMessage }
                    .collect { _allBugReports.value = it }
            }
        }

        if (role == AppRole.OWNER) {
            listenerJobs += viewModelScope.launch {
                adminRepo.observeListingReports()
                    .catch { e -> _statusBanner.value = e.localizedMessage }
                    .collect { _listingReports.value = it }
            }
            listenerJobs += viewModelScope.launch {
                adminRepo.observeAllUserFeaturePermissions()
                    .catch { /* Ignore transient */ }
                    .collect { _allUserFeaturePermissions.value = it }
            }
            listenerJobs += viewModelScope.launch {
                adminRepo.observePermissionAuditLogs()
                    .catch { /* Ignore transient */ }
                    .collect { _permissionAuditLogs.value = it }
            }
        }
    }

    fun selectState(stateName: String) {
        _activeState.value = stateName
        val uid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                accountRepo.updatePreferredState(uid, stateName)
            } catch (_: Throwable) {
            }
        }
    }

    fun updateDraftingPoints(points: List<CadPoint>) {
        _draftingPoints.value = points
    }

    fun clearStatusBanner() {
        _statusBanner.value = null
    }

    fun postMessage(msg: String) {
        _statusBanner.value = msg
    }

    fun setConverterSqm(sqm: Double) {
        if (sqm.isFinite() && sqm >= 0.0) {
            _converterPresetSqm.value = sqm
        }
    }

    fun saveSurveyProject(
        name: String,
        parcelType: String,
        areaSqm: Double,
        perimeterMeters: Double,
        notes: String,
        summaryJson: String = "{}"
    ) {
        val uid = _authUser.value?.uid ?: run {
            _statusBanner.value = "Please sign in to save projects."
            return
        }
        val requiredFeature = when (parcelType) {
            "gps_walk" -> AppFeature.GPS_SURVEY
            "cad" -> AppFeature.CAD_TOOLS
            else -> AppFeature.PLOT_MEASUREMENT
        }
        if (!hasFeature(requiredFeature)) {
            _statusBanner.value = "${requiredFeature.label} is disabled for your account."
            return
        }
        val b = convertAreaFromSqm(areaSqm)
        viewModelScope.launch {
            try {
                surveyRepo.createProject(
                    SurveyProject(
                        userId = uid,
                        name = name.ifBlank { "Survey ${parcelType.uppercase()}" },
                        state = _activeState.value,
                        parcelType = parcelType,
                        areaSqm = b.sqm,
                        areaSqFt = b.sqft,
                        areaSqYards = b.sqYards,
                        areaAcres = b.acres,
                        areaCents = b.cents,
                        perimeterMeters = perimeterMeters,
                        notes = notes,
                        summaryJson = summaryJson
                    )
                )
                _statusBanner.value = "Saved '$name' to Survey Vault."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to save project."
            }
        }
    }

    fun updateProjectNotes(projectId: String, name: String, state: String, notes: String) {
        viewModelScope.launch {
            try {
                surveyRepo.updateProject(projectId, name, state, notes)
                _statusBanner.value = "Project updated."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Update failed."
            }
        }
    }

    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            try {
                surveyRepo.deleteProject(projectId)
                _statusBanner.value = "Project removed."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Delete failed."
            }
        }
    }

    fun publishMarketListing(
        title: String,
        district: String,
        surveyNo: String,
        areaCents: Double,
        priceInr: Double,
        sellerName: String,
        sellerPhone: String,
        photoUri: String,
        lat: Double = 16.5062,
        lng: Double = 80.6480
    ) {
        if (!hasFeature(AppFeature.MARKETPLACE)) {
            _statusBanner.value = "Marketplace access is disabled for your account."
            return
        }
        val user = _authUser.value ?: return
        val sqm = areaCents * 40.468564224
        val breakdown = convertAreaFromSqm(sqm)
        viewModelScope.launch {
            try {
                marketRepo.createListing(
                    listing = MarketListing(
                        userId = user.uid,
                        title = title,
                        state = _activeState.value,
                        district = district,
                        surveyNo = surveyNo,
                        areaCents = areaCents,
                        areaSqYards = breakdown.sqYards,
                        areaAcres = breakdown.acres,
                        priceInr = priceInr,
                        sellerName = sellerName.ifBlank { user.displayName ?: "Owner" },
                        lat = lat,
                        lng = lng,
                        photoUri = photoUri
                    ),
                    sellerPhone = sellerPhone,
                    sellerEmail = user.email.orEmpty()
                )
                _statusBanner.value = "Listing published to Sthal Marketplace."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to publish listing."
            }
        }
    }

    fun updateMarketListing(
        listingId: String,
        title: String,
        district: String,
        surveyNo: String,
        areaCents: Double,
        priceInr: Double
    ) {
        if (!hasFeature(AppFeature.MARKETPLACE)) {
            _statusBanner.value = "Marketplace access is disabled for your account."
            return
        }
        val sqm = areaCents * 40.468564224
        val breakdown = convertAreaFromSqm(sqm)
        viewModelScope.launch {
            try {
                marketRepo.updateListing(
                    listingId = listingId,
                    title = title,
                    district = district,
                    surveyNo = surveyNo,
                    areaCents = areaCents,
                    areaSqYards = breakdown.sqYards,
                    areaAcres = breakdown.acres,
                    priceInr = priceInr
                )
                _statusBanner.value = "Listing updated."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to update listing."
            }
        }
    }

    fun reportMarketListing(listingId: String, listingTitle: String, reason: String, details: String) {
        if (!hasFeature(AppFeature.MARKETPLACE)) {
            _statusBanner.value = "Marketplace access is disabled for your account."
            return
        }
        val user = _authUser.value ?: return
        viewModelScope.launch {
            try {
                marketRepo.reportListing(
                    listingId = listingId,
                    listingTitle = listingTitle,
                    reporterUid = user.uid,
                    reporterEmail = user.email.orEmpty(),
                    reason = reason,
                    details = details
                )
                _statusBanner.value = "Listing report sent to Owner & Moderation Team."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Could not submit listing report."
            }
        }
    }

    fun sendMarketInquiry(listing: MarketListing, buyerPhone: String, message: String) {
        if (!hasFeature(AppFeature.MARKETPLACE)) {
            _statusBanner.value = "Marketplace access is disabled for your account."
            return
        }
        val user = _authUser.value ?: return
        val name = _currentProfile.value?.displayName?.ifBlank { null } ?: user.displayName ?: "Interested Buyer"
        viewModelScope.launch {
            try {
                marketRepo.sendInquiry(
                    listing = listing,
                    buyerUid = user.uid,
                    buyerName = name,
                    buyerPhone = buyerPhone,
                    message = message
                )
                _statusBanner.value = "Inquiry safely sent to seller without exposing private PII."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Could not send inquiry."
            }
        }
    }

    fun deleteMarketListing(listingId: String) {
        viewModelScope.launch {
            try {
                marketRepo.deleteListing(listingId)
                _statusBanner.value = "Listing deleted."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Delete failed."
            }
        }
    }

    suspend fun loadOwnerPrivateSellerData(listingId: String): PrivateSellerData? {
        return try {
            marketRepo.getSellerDataForOwner(listingId)
        } catch (_: Throwable) {
            null
        }
    }

    fun askAiAdvisor(question: String, parcelContext: String = "") {
        if (!hasFeature(AppFeature.AI_TOOLS)) {
            _aiError.value = "AI Plot Advisor is disabled for your account."
            return
        }
        val cleanQ = question.trim()
        if (cleanQ.isEmpty() || _aiBusy.value) return
        val activePoints = _draftingPoints.value
        val resolvedContext = parcelContext.ifBlank {
            if (activePoints.size >= 3) {
                val sqm = CadEngine.computePolygonArea(activePoints)
                val perim = CadEngine.computePolygonPerimeter(activePoints)
                val b = convertAreaFromSqm(sqm)
                "Active CAD/Survey parcel has ${activePoints.size} vertices: ${"%.2f".format(b.sqm)} m² (${"%.2f".format(b.cents)} Cents, ${"%.4f".format(b.acres)} Acres), perimeter ${"%.2f".format(perim)} m in ${_activeState.value}."
            } else ""
        }
        val userMsg = ChatMessage(UUID.randomUUID().toString(), true, cleanQ)
        _aiChat.value = _aiChat.value + userMsg
        _aiBusy.value = true
        _aiError.value = null
        viewModelScope.launch {
            try {
                val reply = aiRepo.askPlotAdvisor(_activeState.value, cleanQ, resolvedContext, _aiChat.value)
                _aiChat.value = _aiChat.value + ChatMessage(UUID.randomUUID().toString(), false, reply)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _aiError.value = e.localizedMessage ?: "AI Advisor failed."
            } finally {
                _aiBusy.value = false
            }
        }
    }

    fun scanLandDocument(bitmap: Bitmap) {
        if (!hasFeature(AppFeature.DOC_SCANNER)) {
            _scannerError.value = "Document Scanner is disabled for your account."
            return
        }
        if (_scannerBusy.value) return
        _scannerBusy.value = true
        _scannerError.value = null
        _scannerResult.value = null
        viewModelScope.launch {
            try {
                val result = aiRepo.scanLandDocument(bitmap, _activeState.value)
                _scannerResult.value = result
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _scannerError.value = e.localizedMessage ?: "Scan failed."
            } finally {
                _scannerBusy.value = false
            }
        }
    }

    fun clearScannerResult() {
        _scannerResult.value = null
        _scannerError.value = null
    }

    fun setEpisodeCompleted(episodeId: String, completed: Boolean) {
        if (!hasFeature(AppFeature.VIDEO_ACADEMY)) return
        val uid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                accountRepo.setEpisodeCompleted(uid, episodeId, completed)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to save progress."
            }
        }
    }

    fun saveAcademyVideo(episodeId: String, episodeNumber: Int, title: String, difficulty: String, videoUrl: String) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required to manage videos."
            return
        }
        val uid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                adminRepo.saveAcademyVideo(episodeId, episodeNumber, title, difficulty, videoUrl, uid)
                _statusBanner.value = "Episode $episodeNumber video saved."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to save video settings."
            }
        }
    }

    fun submitBugReport(title: String, module: String, severity: String, description: String) {
        val user = _authUser.value ?: return
        viewModelScope.launch {
            try {
                accountRepo.submitBugReport(
                    BugReport(
                        userId = user.uid,
                        userEmail = user.email.orEmpty(),
                        userName = user.displayName.orEmpty(),
                        title = title,
                        module = module,
                        severity = severity,
                        description = description
                    )
                )
                _statusBanner.value = "Thank you! Issue report submitted."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Could not submit report."
            }
        }
    }

    fun saveBusinessControls(settings: SystemSettings) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required."
            return
        }
        viewModelScope.launch {
            try {
                adminRepo.updateSystemSettings(settings)
                _statusBanner.value = "Global & Group feature controls published live."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to update feature controls."
            }
        }
    }

    fun saveIndividualPermissions(targetProfile: UserProfile, permissions: Map<String, Boolean>) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required."
            return
        }
        val owner = _authUser.value ?: return
        viewModelScope.launch {
            try {
                adminRepo.saveUserFeaturePermissions(
                    targetProfile = targetProfile,
                    permissions = permissions,
                    updatedByUid = owner.uid,
                    updatedByEmail = owner.email.orEmpty()
                )
                _statusBanner.value = "Individual permissions saved for ${targetProfile.email}."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to save individual permissions."
            }
        }
    }

    fun restoreDefaultIndividualPermissions(targetProfile: UserProfile) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required."
            return
        }
        val owner = _authUser.value ?: return
        viewModelScope.launch {
            try {
                adminRepo.restoreDefaultUserFeaturePermissions(
                    targetProfile = targetProfile,
                    updatedByUid = owner.uid,
                    updatedByEmail = owner.email.orEmpty()
                )
                _statusBanner.value = "Restored role defaults for ${targetProfile.email}."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to restore defaults."
            }
        }
    }

    fun triageListingReport(reportId: String, status: String) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required to moderate listing reports."
            return
        }
        viewModelScope.launch {
            try {
                adminRepo.updateListingReportStatus(reportId, status)
                _statusBanner.value = "Listing report marked $status."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to update report."
            }
        }
    }

    fun addDeveloperEmail(email: String, label: String) {
        if (_appRole.value != AppRole.OWNER) {
            _statusBanner.value = "Owner permission required."
            return
        }
        val uid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                adminRepo.authorizeDeveloperEmail(email, label, uid)
                _statusBanner.value = "Developer email authorized: ${AdminRepository.normalizeEmail(email)}"
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to authorize developer email."
            }
        }
    }

    fun toggleDeveloperEmail(email: String, active: Boolean) {
        if (_appRole.value != AppRole.OWNER) return
        val uid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                adminRepo.setDeveloperEmailActive(email, active, uid)
                _statusBanner.value = if (active) "Developer email activated." else "Developer email paused."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to update developer access."
            }
        }
    }

    fun removeDeveloperEmail(email: String) {
        if (_appRole.value != AppRole.OWNER) return
        viewModelScope.launch {
            try {
                adminRepo.removeDeveloperEmail(email)
                _statusBanner.value = "Developer email removed."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to remove developer email."
            }
        }
    }

    fun updateUserRoleStatus(targetUid: String, role: String, status: String) {
        if (_appRole.value != AppRole.OWNER) return
        val ownerUid = _authUser.value?.uid ?: return
        viewModelScope.launch {
            try {
                adminRepo.updateUserRoleAndStatus(targetUid, role, status)
                val targetUser = _allUsers.value.firstOrNull { it.uid == targetUid }
                val cleanEmail = targetUser?.email?.let { AdminRepository.normalizeEmail(it) }.orEmpty()
                if (cleanEmail.isNotBlank()) {
                    if (role == "developer") {
                        adminRepo.authorizeDeveloperEmail(
                            email = cleanEmail,
                            label = targetUser?.displayName?.ifBlank { "Authorized Developer" } ?: "Authorized Developer",
                            addedByUid = ownerUid
                        )
                    } else if (role == "user") {
                        runCatching { adminRepo.setDeveloperEmailActive(cleanEmail, false, ownerUid) }
                    }
                }
                _statusBanner.value = "Account updated ($role / $status)."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Failed to update user account."
            }
        }
    }

    fun verifyMarketplaceListing(listingId: String, verified: Boolean, status: String) {
        if (_appRole.value != AppRole.OWNER) return
        viewModelScope.launch {
            try {
                adminRepo.verifyMarketListing(listingId, verified, status)
                _statusBanner.value = "Listing marked as $status."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Verification update failed."
            }
        }
    }

    fun triageBugReport(reportId: String, status: String) {
        if (_appRole.value != AppRole.OWNER && _appRole.value != AppRole.DEVELOPER) return
        viewModelScope.launch {
            try {
                adminRepo.updateBugReportStatus(reportId, status)
                _statusBanner.value = "Bug status updated to $status."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _statusBanner.value = e.localizedMessage ?: "Bug triage failed."
            }
        }
    }

    fun signOut() {
        clearPendingRegistration()
        viewModelScope.launch {
            AuthManager.signOut(getApplication())
        }
    }
}
