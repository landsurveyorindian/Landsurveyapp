package com.sthalmeasure.app.data.repository

import android.content.Context
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.sthalmeasure.app.data.firestore.FirestoreErrorHandler
import com.sthalmeasure.app.data.firestore.FirestoreProvider
import com.sthalmeasure.app.data.firestore.OperationType
import com.sthalmeasure.app.data.model.AcademyVideoEntry
import com.sthalmeasure.app.data.model.AppRole
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.DeveloperEmailEntry
import com.sthalmeasure.app.data.model.ListingReport
import com.sthalmeasure.app.data.model.PermissionAuditLog
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserFeaturePermissions
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.domain.AcademyVideoValidator
import com.sthalmeasure.app.domain.AppFeature
import com.sthalmeasure.app.domain.PermissionEvaluator
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class AdminRepository(
    private val db: FirebaseFirestore
) {
    constructor(context: Context) : this(FirestoreProvider.getDb(context))

    private val settingsDoc get() = db.collection(COLLECTION_SYSTEM_SETTINGS).document(DOC_GLOBAL_SETTINGS)
    private val devEmailsCol get() = db.collection(COLLECTION_DEVELOPER_EMAILS)
    private val usersCol get() = db.collection(AccountAndSupportRepository.COLLECTION_USERS)
    private val bugReportsCol get() = db.collection(AccountAndSupportRepository.COLLECTION_BUG_REPORTS)
    private val listingsCol get() = db.collection(MarketRepository.COLLECTION_LISTINGS)
    private val userPermsCol get() = db.collection(COLLECTION_USER_FEATURE_PERMISSIONS)
    private val auditLogsCol get() = db.collection(COLLECTION_PERMISSION_AUDIT_LOGS)
    private val academyVideosCol get() = db.collection(COLLECTION_ACADEMY_VIDEOS)
    private val listingReportsCol get() = db.collection(COLLECTION_LISTING_REPORTS)

    fun observeSystemSettings(): Flow<SystemSettings> = callbackFlow {
        val registration = settingsDoc.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(
                    FirestoreErrorHandler.handleFirestoreError(
                        error,
                        OperationType.GET,
                        "$COLLECTION_SYSTEM_SETTINGS/$DOC_GLOBAL_SETTINGS"
                    )
                )
                return@addSnapshotListener
            }
            val parsed = if (snapshot != null && snapshot.exists()) {
                snapshot.toObject(
                    SystemSettings::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                ) ?: SystemSettings(id = DOC_GLOBAL_SETTINGS)
            } else {
                SystemSettings(id = DOC_GLOBAL_SETTINGS)
            }
            trySend(parsed)
        }
        awaitClose { registration.remove() }
    }

    suspend fun updateSystemSettings(settings: SystemSettings) {
        val path = "$COLLECTION_SYSTEM_SETTINGS/$DOC_GLOBAL_SETTINGS"
        val validKeys = AppFeature.entries.map { it.key }.toSet()
        val cleanUserGroup = SystemSettings.defaultUserGroupMap().toMutableMap().apply {
            settings.userGroupPermissions.forEach { (k, v) -> if (k in validKeys) put(k, v) }
            put(AppFeature.DEVELOPER_TOOLS.key, false) // Users can never get developer tools
        }
        val cleanDevGroup = SystemSettings.defaultDeveloperGroupMap().toMutableMap().apply {
            settings.developerGroupPermissions.forEach { (k, v) -> if (k in validKeys) put(k, v) }
        }
        val payload = mapOf(
            "announcementTitle" to settings.announcementTitle.trim().take(200),
            "announcementMessage" to settings.announcementMessage.trim().take(1000),
            "maintenanceMode" to settings.maintenanceMode,
            "calculatorEnabled" to settings.calculatorEnabled,
            "cadStudioEnabled" to settings.cadStudioEnabled,
            "gpsWalkEnabled" to settings.gpsWalkEnabled,
            "gisImportExportEnabled" to settings.gisImportExportEnabled,
            "pdfReportsEnabled" to settings.pdfReportsEnabled,
            "marketplaceEnabled" to settings.marketplaceEnabled,
            "aiAdvisorEnabled" to settings.aiAdvisorEnabled,
            "documentScannerEnabled" to settings.documentScannerEnabled,
            "academyEnabled" to settings.academyEnabled,
            "userGroupPermissions" to cleanUserGroup,
            "developerGroupPermissions" to cleanDevGroup,
            "updatedAt" to FieldValue.serverTimestamp()
        )
        try {
            settingsDoc.set(payload).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.WRITE, path)
        }
    }

    fun observeUserFeaturePermissions(uid: String): Flow<UserFeaturePermissions?> = callbackFlow {
        val registration = userPermsCol.document(uid).addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(
                    FirestoreErrorHandler.handleFirestoreError(
                        error,
                        OperationType.GET,
                        "$COLLECTION_USER_FEATURE_PERMISSIONS/$uid"
                    )
                )
                return@addSnapshotListener
            }
            val parsed = if (snapshot != null && snapshot.exists()) {
                snapshot.toObject(
                    UserFeaturePermissions::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
            } else {
                null
            }
            trySend(parsed)
        }
        awaitClose { registration.remove() }
    }

    fun observeAllUserFeaturePermissions(): Flow<List<UserFeaturePermissions>> = callbackFlow {
        val registration = userPermsCol
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_USER_FEATURE_PERMISSIONS
                        )
                    )
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        UserFeaturePermissions::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(list)
            }
        awaitClose { registration.remove() }
    }

    suspend fun saveUserFeaturePermissions(
        targetProfile: UserProfile,
        permissions: Map<String, Boolean>,
        updatedByUid: String,
        updatedByEmail: String,
        action: String = "update"
    ) {
        val targetUid = targetProfile.uid.trim()
        require(targetUid.isNotBlank()) { "Target account UID is required." }
        require(action in listOf("update", "restore_defaults")) { "Invalid audit action." }
        val validKeys = AppFeature.entries.map { it.key }.toSet()
        val roleEnum = when (targetProfile.role.lowercase()) {
            "owner" -> AppRole.OWNER
            "developer" -> AppRole.DEVELOPER
            else -> AppRole.USER
        }
        val cleanPerms = permissions
            .filterKeys { it in validKeys }
            .toMutableMap()
            .apply {
                if (roleEnum == AppRole.USER) {
                    put(AppFeature.DEVELOPER_TOOLS.key, false)
                }
            }
        val permDocRef = userPermsCol.document(targetUid)
        val path = "$COLLECTION_USER_FEATURE_PERMISSIONS/$targetUid"
        val logId = "perm_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val logDocRef = auditLogsCol.document(logId)

        val summaryText = cleanPerms.entries
            .sortedBy { it.key }
            .joinToString(", ") { (k, v) -> "$k=${if (v) "ON" else "OFF"}" }
            .take(1000)

        try {
            val existing = permDocRef.get().await()
            val prevVersion = existing.getLong("version") ?: 0L
            val existingCreatedAt = existing.getTimestamp("createdAt")
            val isFirstCreate = !existing.exists() || existingCreatedAt == null
            val resolvedAction = if (action == "update" && isFirstCreate) "create" else action
            db.runBatch { batch ->
                if (isFirstCreate) {
                    batch.set(
                        permDocRef,
                        mapOf(
                            "uid" to targetUid,
                            "email" to targetProfile.email.trim().lowercase().take(160),
                            "username" to targetProfile.displayName.trim().take(120),
                            "role" to targetProfile.role.lowercase().takeIf { it in listOf("owner", "developer", "user") }.orEmpty().ifBlank { "user" },
                            "permissions" to cleanPerms,
                            "createdAt" to FieldValue.serverTimestamp(),
                            "updatedAt" to FieldValue.serverTimestamp(),
                            "updatedBy" to updatedByUid,
                            "version" to 1L
                        )
                    )
                } else {
                    batch.update(
                        permDocRef,
                        mapOf(
                            "uid" to targetUid,
                            "email" to targetProfile.email.trim().lowercase().take(160),
                            "username" to targetProfile.displayName.trim().take(120),
                            "role" to targetProfile.role.lowercase().takeIf { it in listOf("owner", "developer", "user") }.orEmpty().ifBlank { "user" },
                            "permissions" to cleanPerms,
                            "updatedAt" to FieldValue.serverTimestamp(),
                            "updatedBy" to updatedByUid,
                            "version" to (prevVersion + 1L)
                        )
                    )
                }
                batch.set(
                    logDocRef,
                    mapOf(
                        "targetUid" to targetUid,
                        "targetEmail" to targetProfile.email.trim().lowercase().take(160),
                        "action" to resolvedAction,
                        "changesSummary" to summaryText,
                        "updatedBy" to updatedByUid,
                        "updatedByEmail" to updatedByEmail.trim().lowercase().take(160),
                        "createdAt" to FieldValue.serverTimestamp()
                    )
                )
            }.await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.WRITE, path)
        }
    }

    suspend fun restoreDefaultUserFeaturePermissions(
        targetProfile: UserProfile,
        updatedByUid: String,
        updatedByEmail: String
    ) {
        val roleEnum = when (targetProfile.role.lowercase()) {
            "owner" -> AppRole.OWNER
            "developer" -> AppRole.DEVELOPER
            else -> AppRole.USER
        }
        val defaults = PermissionEvaluator.defaultPermissionsForRole(roleEnum)
        saveUserFeaturePermissions(
            targetProfile = targetProfile,
            permissions = defaults,
            updatedByUid = updatedByUid,
            updatedByEmail = updatedByEmail,
            action = "restore_defaults"
        )
    }

    fun observePermissionAuditLogs(): Flow<List<PermissionAuditLog>> = callbackFlow {
        val registration = auditLogsCol
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(40)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_PERMISSION_AUDIT_LOGS
                        )
                    )
                    return@addSnapshotListener
                }
                val logs = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        PermissionAuditLog::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(logs)
            }
        awaitClose { registration.remove() }
    }

    fun observeDeveloperEmails(): Flow<List<DeveloperEmailEntry>> = callbackFlow {
        val registration = devEmailsCol
            .orderBy("email", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_DEVELOPER_EMAILS
                        )
                    )
                    return@addSnapshotListener
                }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        DeveloperEmailEntry::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { registration.remove() }
    }

    suspend fun isEmailAuthorizedDeveloper(email: String): Boolean {
        val clean = normalizeEmail(email)
        if (!EMAIL_REGEX.matches(clean)) return false
        val path = "$COLLECTION_DEVELOPER_EMAILS/$clean"
        return try {
            val snap = devEmailsCol.document(clean).get().await()
            snap.exists() && (snap.getBoolean("active") == true)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.GET, path)
        }
    }

    suspend fun authorizeDeveloperEmail(email: String, label: String, addedByUid: String) {
        val clean = normalizeEmail(email)
        require(EMAIL_REGEX.matches(clean)) { "Please enter a valid developer email address." }
        val cleanLabel = label.trim().ifBlank { "Authorized Developer" }.take(100)
        val path = "$COLLECTION_DEVELOPER_EMAILS/$clean"
        try {
            val docRef = devEmailsCol.document(clean)
            val existing = docRef.get().await()
            if (!existing.exists()) {
                docRef.set(
                    mapOf(
                        "email" to clean,
                        "label" to cleanLabel,
                        "active" to true,
                        "addedByUid" to addedByUid,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.update(
                    mapOf(
                        "label" to cleanLabel,
                        "active" to true,
                        "addedByUid" to addedByUid,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.WRITE, path)
        }
    }

    suspend fun setDeveloperEmailActive(email: String, active: Boolean, addedByUid: String) {
        val clean = normalizeEmail(email)
        val path = "$COLLECTION_DEVELOPER_EMAILS/$clean"
        try {
            devEmailsCol.document(clean).update(
                mapOf(
                    "active" to active,
                    "addedByUid" to addedByUid,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    suspend fun removeDeveloperEmail(email: String) {
        val clean = normalizeEmail(email)
        val path = "$COLLECTION_DEVELOPER_EMAILS/$clean"
        try {
            devEmailsCol.document(clean).delete().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.DELETE, path)
        }
    }

    fun observeAllUsers(): Flow<List<UserProfile>> = callbackFlow {
        val registration = usersCol
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            AccountAndSupportRepository.COLLECTION_USERS
                        )
                    )
                    return@addSnapshotListener
                }
                val users = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        UserProfile::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(users)
            }
        awaitClose { registration.remove() }
    }

    suspend fun updateUserRoleAndStatus(uid: String, role: String, status: String) {
        require(role in listOf("developer", "user")) { "Invalid role: $role" }
        require(status in listOf("active", "suspended")) { "Invalid status: $status" }
        val path = "${AccountAndSupportRepository.COLLECTION_USERS}/$uid"
        try {
            usersCol.document(uid).update(
                mapOf(
                    "role" to role,
                    "status" to status,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    fun observeAllBugReports(): Flow<List<BugReport>> = callbackFlow {
        val registration = bugReportsCol
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            AccountAndSupportRepository.COLLECTION_BUG_REPORTS
                        )
                    )
                    return@addSnapshotListener
                }
                val reports = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        BugReport::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(reports)
            }
        awaitClose { registration.remove() }
    }

    suspend fun updateBugReportStatus(reportId: String, status: String) {
        require(status in listOf("new", "investigating", "resolved", "closed")) { "Invalid status: $status" }
        val path = "${AccountAndSupportRepository.COLLECTION_BUG_REPORTS}/$reportId"
        try {
            bugReportsCol.document(reportId).update(
                mapOf(
                    "status" to status,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    suspend fun verifyMarketListing(listingId: String, verified: Boolean, status: String) {
        require(status in listOf("unverified", "pending", "verified", "rejected")) { "Invalid verification status: $status" }
        val path = "${MarketRepository.COLLECTION_LISTINGS}/$listingId"
        try {
            listingsCol.document(listingId).update(
                mapOf(
                    "verified" to verified,
                    "verificationStatus" to status,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    fun observeAcademyVideos(): Flow<List<AcademyVideoEntry>> = callbackFlow {
        val registration = academyVideosCol
            .orderBy("episodeNumber", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_ACADEMY_VIDEOS
                        )
                    )
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        AcademyVideoEntry::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(list)
            }
        awaitClose { registration.remove() }
    }

    suspend fun saveAcademyVideo(
        episodeId: String,
        episodeNumber: Int,
        title: String,
        difficulty: String,
        videoUrl: String,
        updatedByUid: String
    ) {
        val cleanId = episodeId.trim()
        require(cleanId.matches(Regex("^[a-zA-Z0-9_\\-]+$"))) { "Invalid episode ID." }
        require(difficulty in listOf("Beginner", "Intermediate", "Advanced")) { "Invalid difficulty level." }
        val cleanUrl = AcademyVideoValidator.normalizeAndValidateForSave(videoUrl)
        val path = "$COLLECTION_ACADEMY_VIDEOS/$cleanId"
        try {
            academyVideosCol.document(cleanId).set(
                mapOf(
                    "episodeNumber" to episodeNumber,
                    "title" to title.trim().take(160),
                    "difficulty" to difficulty,
                    "videoUrl" to cleanUrl.take(500),
                    "updatedBy" to updatedByUid,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.WRITE, path)
        }
    }

    fun observeListingReports(): Flow<List<ListingReport>> = callbackFlow {
        val registration = listingReportsCol
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_LISTING_REPORTS
                        )
                    )
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        ListingReport::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(list)
            }
        awaitClose { registration.remove() }
    }

    suspend fun updateListingReportStatus(reportId: String, status: String) {
        require(status in listOf("open", "reviewed", "dismissed")) { "Invalid status: $status" }
        val path = "$COLLECTION_LISTING_REPORTS/$reportId"
        try {
            listingReportsCol.document(reportId).update(
                mapOf(
                    "status" to status,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    companion object {
        const val OWNER_EMAIL = "pavansrirambezawada@gmail.com"
        const val COLLECTION_SYSTEM_SETTINGS = "system_settings"
        const val DOC_GLOBAL_SETTINGS = "global"
        const val COLLECTION_DEVELOPER_EMAILS = "developer_emails"
        const val COLLECTION_USER_FEATURE_PERMISSIONS = "userFeaturePermissions"
        const val COLLECTION_PERMISSION_AUDIT_LOGS = "permissionAuditLogs"
        const val COLLECTION_ACADEMY_VIDEOS = "academy_videos"
        const val COLLECTION_LISTING_REPORTS = "listing_reports"
        private val EMAIL_REGEX = Regex("^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$")

        fun normalizeEmail(email: String): String = email.trim().lowercase()
    }
}
