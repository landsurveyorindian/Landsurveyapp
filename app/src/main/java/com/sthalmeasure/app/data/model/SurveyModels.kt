package com.sthalmeasure.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.ServerTimestamp

data class SurveyProject(
    @DocumentId val id: String = "",
    val userId: String = "",
    val name: String = "",
    val state: String = "Andhra Pradesh",
    val parcelType: String = "four_sided",
    val areaSqm: Double = 0.0,
    val areaSqFt: Double = 0.0,
    val areaSqYards: Double = 0.0,
    val areaAcres: Double = 0.0,
    val areaCents: Double = 0.0,
    val perimeterMeters: Double = 0.0,
    val notes: String = "",
    val summaryJson: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class MarketListing(
    @DocumentId val id: String = "",
    val userId: String = "",
    val title: String = "",
    val state: String = "Andhra Pradesh",
    val district: String = "",
    val surveyNo: String = "",
    val areaCents: Double = 0.0,
    val areaSqYards: Double = 0.0,
    val areaAcres: Double = 0.0,
    val priceInr: Double = 0.0,
    val sellerName: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val boundaryGeoJson: String = "",
    val photoUri: String = "",
    val verified: Boolean = false,
    val verificationStatus: String = "unverified",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class PrivateSellerData(
    @DocumentId val id: String = "",
    val listingId: String = "",
    val userId: String = "",
    val sellerName: String = "",
    val sellerEmail: String = "",
    val sellerPhone: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class ListingReport(
    @DocumentId val id: String = "",
    val listingId: String = "",
    val listingTitle: String = "",
    val reporterUid: String = "",
    val reporterEmail: String = "",
    val reason: String = "Misleading Extent",
    val details: String = "",
    val status: String = "open",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class MarketInquiry(
    @DocumentId val id: String = "",
    val listingId: String = "",
    val listingTitle: String = "",
    val sellerUid: String = "",
    val buyerUid: String = "",
    val buyerName: String = "",
    val buyerPhone: String = "",
    val message: String = "",
    val status: String = "sent",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class UserProfile(
    @DocumentId val id: String = "",
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val role: String = "user",
    val status: String = "active",
    val photoUrl: String = "",
    val preferredState: String = "Andhra Pradesh",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class BugReport(
    @DocumentId val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",
    val title: String = "",
    val description: String = "",
    val module: String = "Calculator",
    val severity: String = "medium",
    val status: String = "new",
    val appVersion: String = "1.0.0",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

enum class AppRole(val label: String) {
    OWNER("Owner"),
    DEVELOPER("Developer"),
    USER("User")
}

enum class LoginPortal(val label: String, val subtitle: String) {
    USER("User", "Field surveyors, engineers & landowners"),
    DEVELOPER("Developer", "Authorized developer email engineering & bug triage"),
    OWNER("Owner", "Executive business controls & developer access")
}

data class DeveloperEmailEntry(
    @DocumentId val id: String = "",
    val email: String = "",
    val label: String = "",
    val active: Boolean = true,
    val addedByUid: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class SystemSettings(
    @DocumentId val id: String = "",
    val announcementTitle: String = "",
    val announcementMessage: String = "",
    val maintenanceMode: Boolean = false,
    val calculatorEnabled: Boolean = true,
    val cadStudioEnabled: Boolean = true,
    val gpsWalkEnabled: Boolean = true,
    val gisImportExportEnabled: Boolean = true,
    val pdfReportsEnabled: Boolean = true,
    val marketplaceEnabled: Boolean = true,
    val aiAdvisorEnabled: Boolean = true,
    val documentScannerEnabled: Boolean = true,
    val academyEnabled: Boolean = true,
    val userGroupPermissions: Map<String, Boolean> = defaultUserGroupMap(),
    val developerGroupPermissions: Map<String, Boolean> = defaultDeveloperGroupMap(),
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun isRouteEnabled(route: String): Boolean = when (route) {
        "calc" -> calculatorEnabled
        "cad" -> cadStudioEnabled
        "gps" -> gpsWalkEnabled
        "gis" -> gisImportExportEnabled
        "market" -> marketplaceEnabled
        else -> true
    }

    companion object {
        fun defaultUserGroupMap(): Map<String, Boolean> = mapOf(
            "plot_measurement" to true,
            "gps_survey" to true,
            "cad_tools" to true,
            "gis_tools" to true,
            "pdf_reports" to true,
            "marketplace" to true,
            "ai_tools" to true,
            "doc_scanner" to true,
            "video_academy" to true,
            "developer_tools" to false
        )

        fun defaultDeveloperGroupMap(): Map<String, Boolean> = mapOf(
            "plot_measurement" to true,
            "gps_survey" to true,
            "cad_tools" to true,
            "gis_tools" to true,
            "pdf_reports" to true,
            "marketplace" to true,
            "ai_tools" to true,
            "doc_scanner" to true,
            "video_academy" to true,
            "developer_tools" to true
        )
    }
}

data class UserFeaturePermissions(
    @DocumentId val id: String = "",
    val uid: String = "",
    val email: String = "",
    val username: String = "",
    val role: String = "user",
    val permissions: Map<String, Boolean> = emptyMap(),
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null,
    val updatedBy: String = "",
    val version: Long = 1L
)

data class PermissionAuditLog(
    @DocumentId val id: String = "",
    val targetUid: String = "",
    val targetEmail: String = "",
    val action: String = "update",
    val changesSummary: String = "",
    val updatedBy: String = "",
    val updatedByEmail: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)

data class AcademyVideoEntry(
    @DocumentId val id: String = "",
    val episodeNumber: Int = 1,
    val title: String = "",
    val difficulty: String = "Beginner",
    val videoUrl: String = "",
    val updatedBy: String = "",
    @ServerTimestamp val updatedAt: Timestamp? = null
)

data class UserVideoProgress(
    @DocumentId val id: String = "",
    val uid: String = "",
    val completedEpisodeIds: List<String> = emptyList(),
    @ServerTimestamp val updatedAt: Timestamp? = null
)
