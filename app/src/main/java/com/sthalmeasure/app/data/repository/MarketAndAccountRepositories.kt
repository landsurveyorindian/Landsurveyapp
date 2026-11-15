package com.sthalmeasure.app.data.repository

import android.content.Context
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.sthalmeasure.app.data.firestore.FirestoreErrorHandler
import com.sthalmeasure.app.data.firestore.FirestoreProvider
import com.sthalmeasure.app.data.firestore.OperationType
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.ListingReport
import com.sthalmeasure.app.data.model.MarketInquiry
import com.sthalmeasure.app.data.model.MarketListing
import com.sthalmeasure.app.data.model.PrivateSellerData
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.data.model.UserVideoProgress
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class MarketRepository(
    private val db: FirebaseFirestore
) {
    constructor(context: Context) : this(FirestoreProvider.getDb(context))

    private val listingsCol get() = db.collection(COLLECTION_LISTINGS)
    private val sellerDataCol get() = db.collection(COLLECTION_SELLER_DATA)
    private val reportsCol get() = db.collection(AdminRepository.COLLECTION_LISTING_REPORTS)
    private val inquiriesCol get() = db.collection(COLLECTION_MARKET_INQUIRIES)

    fun observeListings(): Flow<List<MarketListing>> = callbackFlow {
        val registration = listingsCol
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_LISTINGS
                        )
                    )
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(MarketListing::class.java)
                } ?: emptyList()
                trySend(list)
            }
        awaitClose { registration.remove() }
    }

    suspend fun createListing(
        listing: MarketListing,
        sellerPhone: String,
        sellerEmail: String
    ): String {
        val listingId = listing.id.takeIf { it.isNotBlank() && ID_REGEX.matches(it) }
            ?: "plot_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val cleanListing = listing.copy(
            id = "",
            title = listing.title.trim().take(200),
            state = listing.state.trim().ifBlank { "Andhra Pradesh" }.take(80),
            district = listing.district.trim().take(100),
            surveyNo = listing.surveyNo.trim().take(80),
            sellerName = listing.sellerName.trim().take(100),
            boundaryGeoJson = listing.boundaryGeoJson.take(32768),
            photoUri = listing.photoUri.take(500),
            verified = false,
            verificationStatus = "unverified",
            createdAt = null,
            updatedAt = null
        )
        val cleanPrivate = PrivateSellerData(
            id = "",
            listingId = listingId,
            userId = listing.userId,
            sellerName = cleanListing.sellerName,
            sellerEmail = sellerEmail.trim().take(160),
            sellerPhone = sellerPhone.trim().take(32),
            createdAt = null,
            updatedAt = null
        )
        try {
            db.runBatch { batch ->
                batch.set(listingsCol.document(listingId), cleanListing)
                batch.set(sellerDataCol.document(listingId), cleanPrivate)
            }.await()
            return listingId
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(
                e,
                OperationType.CREATE,
                "$COLLECTION_LISTINGS/$listingId"
            )
        }
    }

    suspend fun updateListing(
        listingId: String,
        title: String,
        district: String,
        surveyNo: String,
        areaCents: Double,
        areaSqYards: Double,
        areaAcres: Double,
        priceInr: Double
    ) {
        val path = "$COLLECTION_LISTINGS/$listingId"
        try {
            listingsCol.document(listingId).update(
                mapOf(
                    "title" to title.trim().take(200),
                    "district" to district.trim().take(100),
                    "surveyNo" to surveyNo.trim().take(80),
                    "areaCents" to areaCents.coerceAtLeast(0.01),
                    "areaSqYards" to areaSqYards.coerceAtLeast(0.0),
                    "areaAcres" to areaAcres.coerceAtLeast(0.0),
                    "priceInr" to priceInr.coerceAtLeast(1.0),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    suspend fun reportListing(
        listingId: String,
        listingTitle: String,
        reporterUid: String,
        reporterEmail: String,
        reason: String,
        details: String
    ): String {
        val reportId = "rep_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val path = "${AdminRepository.COLLECTION_LISTING_REPORTS}/$reportId"
        val clean = ListingReport(
            id = "",
            listingId = listingId.trim().take(128),
            listingTitle = listingTitle.trim().take(200),
            reporterUid = reporterUid,
            reporterEmail = reporterEmail.trim().take(160),
            reason = reason.trim().ifBlank { "Misleading Details" }.take(120),
            details = details.trim().take(1000),
            status = "open",
            createdAt = null,
            updatedAt = null
        )
        try {
            reportsCol.document(reportId).set(clean).await()
            return reportId
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.CREATE, path)
        }
    }

    suspend fun sendInquiry(
        listing: MarketListing,
        buyerUid: String,
        buyerName: String,
        buyerPhone: String,
        message: String
    ): String {
        val inquiryId = "inq_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val path = "$COLLECTION_MARKET_INQUIRIES/$inquiryId"
        val clean = MarketInquiry(
            id = "",
            listingId = listing.id.ifBlank { listing.title.take(40) }.take(128),
            listingTitle = listing.title.trim().take(200),
            sellerUid = listing.userId,
            buyerUid = buyerUid,
            buyerName = buyerName.trim().ifBlank { "Buyer" }.take(120),
            buyerPhone = buyerPhone.trim().take(32),
            message = message.trim().take(1000),
            status = "sent",
            createdAt = null,
            updatedAt = null
        )
        try {
            inquiriesCol.document(inquiryId).set(clean).await()
            return inquiryId
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.CREATE, path)
        }
    }

    fun observeSellerInquiries(sellerUid: String): Flow<List<MarketInquiry>> = callbackFlow {
        val registration = inquiriesCol
            .whereEqualTo("sellerUid", sellerUid)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_MARKET_INQUIRIES
                        )
                    )
                    return@addSnapshotListener
                }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(
                        MarketInquiry::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    )
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { registration.remove() }
    }

    suspend fun getSellerDataForOwner(listingId: String): PrivateSellerData? {
        val path = "$COLLECTION_SELLER_DATA/$listingId"
        return try {
            sellerDataCol.document(listingId).get().await()
                .toObject(PrivateSellerData::class.java)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.GET, path)
        }
    }

    suspend fun deleteListing(listingId: String) {
        val path = "$COLLECTION_LISTINGS/$listingId"
        try {
            db.runBatch { batch ->
                batch.delete(listingsCol.document(listingId))
                batch.delete(sellerDataCol.document(listingId))
            }.await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.DELETE, path)
        }
    }

    companion object {
        const val COLLECTION_LISTINGS = "market_listings"
        const val COLLECTION_SELLER_DATA = "market_seller_data"
        const val COLLECTION_MARKET_INQUIRIES = "market_inquiries"
        private val ID_REGEX = Regex("^[a-zA-Z0-9_\\-]+$")
    }
}

class AccountAndSupportRepository(
    private val db: FirebaseFirestore
) {
    constructor(context: Context) : this(FirestoreProvider.getDb(context))

    private val usersCol get() = db.collection(COLLECTION_USERS)
    private val bugReportsCol get() = db.collection(COLLECTION_BUG_REPORTS)
    private val videoProgressCol get() = db.collection(COLLECTION_VIDEO_PROGRESS)

    suspend fun getUserProfile(uid: String): UserProfile? {
        val path = "$COLLECTION_USERS/$uid"
        return try {
            usersCol.document(uid).get().await()
                .toObject(UserProfile::class.java)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.GET, path)
        }
    }

    suspend fun upsertUserProfile(profile: UserProfile) {
        val path = "$COLLECTION_USERS/${profile.uid}"
        try {
            val docRef = usersCol.document(profile.uid)
            val existing = docRef.get().await()
            if (!existing.exists()) {
                val newProfile = profile.copy(
                    id = "",
                    role = "user",
                    status = "active",
                    displayName = profile.displayName.take(120),
                    email = profile.email.take(160),
                    photoUrl = profile.photoUrl.take(500),
                    preferredState = profile.preferredState.ifBlank { "Andhra Pradesh" }.take(80),
                    createdAt = null,
                    updatedAt = null
                )
                docRef.set(newProfile).await()
            } else {
                val existingState = existing.getString("preferredState")?.takeIf { it.isNotBlank() }
                val existingName = existing.getString("displayName")?.takeIf { it.isNotBlank() }
                docRef.update(
                    mapOf(
                        "email" to profile.email.take(160),
                        "displayName" to (existingName ?: profile.displayName).take(120),
                        "photoUrl" to profile.photoUrl.take(500),
                        "preferredState" to (existingState ?: profile.preferredState.ifBlank { "Andhra Pradesh" }).take(80),
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

    suspend fun updatePreferredState(uid: String, state: String) {
        val path = "$COLLECTION_USERS/$uid"
        try {
            usersCol.document(uid).update(
                mapOf(
                    "preferredState" to state.trim().take(80),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    suspend fun submitBugReport(report: BugReport): String {
        val reportId = report.id.takeIf { it.isNotBlank() && ID_REGEX.matches(it) }
            ?: "bug_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val path = "$COLLECTION_BUG_REPORTS/$reportId"
        val clean = report.copy(
            id = "",
            title = report.title.trim().take(200),
            description = report.description.trim().take(2000),
            module = report.module.trim().ifBlank { "Calculator" }.take(80),
            severity = report.severity.takeIf { it in listOf("low", "medium", "high", "critical") } ?: "medium",
            status = "new",
            appVersion = report.appVersion.take(32),
            createdAt = null,
            updatedAt = null
        )
        try {
            bugReportsCol.document(reportId).set(clean).await()
            return reportId
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.CREATE, path)
        }
    }

    fun observeVideoProgress(uid: String): Flow<Set<String>> = callbackFlow {
        val registration = videoProgressCol.document(uid).addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(
                    FirestoreErrorHandler.handleFirestoreError(
                        error,
                        OperationType.GET,
                        "$COLLECTION_VIDEO_PROGRESS/$uid"
                    )
                )
                return@addSnapshotListener
            }
            val parsed = snapshot?.toObject(UserVideoProgress::class.java)
            trySend(parsed?.completedEpisodeIds?.toSet() ?: emptySet())
        }
        awaitClose { registration.remove() }
    }

    suspend fun setEpisodeCompleted(uid: String, episodeId: String, completed: Boolean) {
        val docRef = videoProgressCol.document(uid)
        val path = "$COLLECTION_VIDEO_PROGRESS/$uid"
        try {
            val existing = docRef.get().await()
            val current = existing.toObject(UserVideoProgress::class.java)?.completedEpisodeIds.orEmpty().toMutableSet()
            if (completed) current.add(episodeId) else current.remove(episodeId)
            docRef.set(
                mapOf(
                    "uid" to uid,
                    "completedEpisodeIds" to current.toList().take(50),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.WRITE, path)
        }
    }

    companion object {
        const val COLLECTION_USERS = "users"
        const val COLLECTION_BUG_REPORTS = "bug_reports"
        const val COLLECTION_VIDEO_PROGRESS = "user_video_progress"
        private val ID_REGEX = Regex("^[a-zA-Z0-9_\\-]+$")
    }
}
