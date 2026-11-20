package com.sthalmeasure.app.data

import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.firestore.FirebaseFirestoreException
import com.sthalmeasure.app.base.FirestoreEmulatorTestBase
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.SystemSettings
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.data.repository.AccountAndSupportRepository
import com.sthalmeasure.app.data.repository.AdminRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class AdminRepositoryRuleTest : FirestoreEmulatorTestBase() {

    private suspend fun signInAndVerifyEmail(email: String): String {
        val password = "TestPass#2026!"
        return withTimeout(15_000L) {
            auth.signOut()
            try {
                auth.createUserWithEmailAndPassword(email, password).await()
            } catch (_: FirebaseAuthUserCollisionException) {
                auth.signInWithEmailAndPassword(email, password).await()
            }
            val current = auth.currentUser!!
            if (!current.isEmailVerified) {
                current.sendEmailVerification().await()
                val oobUrl = URL("http://127.0.0.1:9099/emulator/v1/projects/refined-period-j3kqt/oobCodes")
                val conn = (oobUrl.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 5000
                    readTimeout = 5000
                }
                val body = conn.inputStream.bufferedReader().readText()
                conn.disconnect()
                val array = JSONObject(body).optJSONArray("oobCodes")
                var matchedCode: String? = null
                if (array != null) {
                    for (i in array.length() - 1 downTo 0) {
                        val item = array.getJSONObject(i)
                        if (item.optString("email").equals(email, ignoreCase = true) &&
                            item.optString("requestType") == "VERIFY_EMAIL"
                        ) {
                            matchedCode = item.optString("oobCode")
                            break
                        }
                    }
                }
                assertTrue("No VERIFY_EMAIL oobCode found for $email in $body", !matchedCode.isNullOrBlank())
                auth.applyActionCode(matchedCode!!).await()
                auth.signOut()
                auth.signInWithEmailAndPassword(email, password).await()
            }
            auth.currentUser!!.reload().await()
            val verified = auth.currentUser!!.isEmailVerified
            assertTrue("Expected verified email for $email", verified)
            auth.currentUser!!.getIdToken(true).await()
            kotlinx.coroutines.delay(250)
            auth.currentUser!!.uid
        }
    }

    private fun assertPermissionDenied(block: () -> Unit) {
        try {
            block()
            fail("Expected PERMISSION_DENIED")
        } catch (e: Throwable) {
            var cur: Throwable? = e
            var found = false
            while (cur != null) {
                if (cur is FirebaseFirestoreException &&
                    cur.code == FirebaseFirestoreException.Code.PERMISSION_DENIED
                ) {
                    found = true
                    break
                }
                cur = cur.cause
            }
            assertTrue("Expected PERMISSION_DENIED in cause chain, got $e", found)
        }
    }

    @Test
    fun ownerControlsDeveloperEmailsAndBusinessFlagsAcrossRoles() = runBlocking {
        val adminRepo = AdminRepository(db)
        val accountRepo = AccountAndSupportRepository(db)

        val devEmail = "dev_${UUID.randomUUID().toString().replace("-", "").take(8)}@sthalmeasure.test"

        // 0. Regular user checking an unauthorized developer email must safely return false (never crash sign-in)
        val nonDevCheck = withTimeout(15_000L) {
            adminRepo.isEmailAuthorizedDeveloper(testEmail)
        }
        assertFalse("Expected non-developer check to return false without crashing", nonDevCheck)

        // 1. Primary regular user creates a bug report, is blocked from admin collections
        val bugId = withTimeout(15_000L) {
            accountRepo.submitBugReport(
                BugReport(
                    userId = testUid,
                    userEmail = testEmail,
                    userName = "Field Surveyor",
                    title = "Compass offset",
                    description = "Check azimuth display",
                    module = "GPS Walk Area",
                    severity = "medium",
                    status = "new"
                )
            )
        }

        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.updateSystemSettings(SystemSettings(marketplaceEnabled = false))
                }
            }
        }
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.authorizeDeveloperEmail(devEmail, "Lead Dev", testUid)
                }
            }
        }
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.updateBugReportStatus(bugId, "investigating")
                }
            }
        }

        // 2. Owner signs in with verified email and authorizes developer email + saves business controls
        val ownerUid = signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.authorizeDeveloperEmail(devEmail, "GIS Engineer", ownerUid)
            adminRepo.updateSystemSettings(
                SystemSettings(
                    announcementTitle = "Survey Notice",
                    announcementMessage = "Tools verified",
                    maintenanceMode = false,
                    calculatorEnabled = true,
                    cadStudioEnabled = true,
                    gpsWalkEnabled = true,
                    gisImportExportEnabled = true,
                    marketplaceEnabled = false,
                    aiAdvisorEnabled = true,
                    documentScannerEnabled = true,
                    academyEnabled = true
                )
            )
        }

        val liveSettings = withTimeout(15_000L) {
            adminRepo.observeSystemSettings().first { !it.marketplaceEnabled }
        }
        assertFalse(liveSettings.marketplaceEnabled)
        assertEquals("Survey Notice", liveSettings.announcementTitle)

        // 3. Recognized developer email signs in -> recognized as developer & can triage bug report
        signInAndVerifyEmail(devEmail)
        val isRecognized = withTimeout(15_000L) {
            adminRepo.isEmailAuthorizedDeveloper(devEmail)
        }
        assertTrue("Expected $devEmail to be recognized as active developer", isRecognized)

        withTimeout(15_000L) {
            adminRepo.updateBugReportStatus(bugId, "investigating")
        }
        val reports = withTimeout(15_000L) {
            adminRepo.observeAllBugReports().first { list ->
                list.any { it.id == bugId && it.status == "investigating" }
            }
        }
        assertEquals("investigating", reports.first { it.id == bugId }.status)

        // 4. Owner cleans up test developer email & resets business controls
        signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.removeDeveloperEmail(devEmail)
            adminRepo.updateSystemSettings(SystemSettings())
        }
    }

    @Test
    fun ownerSavesAndRestoresIndividualUserFeaturePermissionsWithAuditLogs() = runBlocking {
        val adminRepo = AdminRepository(db)
        val targetProfile = UserProfile(
            uid = testUid,
            email = testEmail,
            displayName = "Field Surveyor",
            role = "user",
            status = "active"
        )

        // Regular user is denied writing individual permissions or reading audit logs
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.saveUserFeaturePermissions(
                        targetProfile = targetProfile,
                        permissions = mapOf("marketplace" to false),
                        updatedByUid = testUid,
                        updatedByEmail = testEmail
                    )
                }
            }
        }

        // Owner creates v1 individual permission doc + audit log
        val ownerUid = signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.saveUserFeaturePermissions(
                targetProfile = targetProfile,
                permissions = mapOf("marketplace" to false, "pdf_reports" to true),
                updatedByUid = ownerUid,
                updatedByEmail = AdminRepository.OWNER_EMAIL
            )
        }

        // Owner updates -> increments to v2 and restores defaults -> v3
        withTimeout(15_000L) {
            adminRepo.restoreDefaultUserFeaturePermissions(
                targetProfile = targetProfile,
                updatedByUid = ownerUid,
                updatedByEmail = AdminRepository.OWNER_EMAIL
            )
        }

        val logs = withTimeout(15_000L) {
            adminRepo.observePermissionAuditLogs().first { list ->
                list.any { it.targetUid == testUid && it.action == "restore_defaults" }
            }
        }
        assertTrue(logs.any { it.targetUid == testUid && it.action == "create" })
        assertTrue(logs.any { it.targetUid == testUid && it.action == "restore_defaults" })

        // Target user reads ONLY own permission doc
        signInAndVerifyEmail(testEmail)
        val ownDoc = withTimeout(15_000L) {
            adminRepo.observeUserFeaturePermissions(testUid).first { it != null && it.version >= 2L }
        }
        assertEquals(testUid, ownDoc?.uid)
        assertTrue((ownDoc?.version ?: 0L) >= 2L)
    }

    @Test
    fun developerCannotModifyPermissionsAndNonOwnerCannotModerateListingReports() = runBlocking {
        val adminRepo = AdminRepository(db)
        val marketRepo = com.sthalmeasure.app.data.repository.MarketRepository(db)
        val devEmail = "dev_${UUID.randomUUID().toString().replace("-", "").take(8)}@sthalmeasure.test"

        // Owner authorizes developer email and creates an open listing report as primary user
        signInAndVerifyEmail(testEmail)
        val reportId = withTimeout(15_000L) {
            marketRepo.reportListing(
                listingId = "plot_test",
                listingTitle = "Test Parcel",
                reporterUid = testUid,
                reporterEmail = testEmail,
                reason = "Boundary mismatch",
                details = "FMB corner mismatch"
            )
        }

        val ownerUid = signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.authorizeDeveloperEmail(devEmail, "GIS Dev", ownerUid)
        }

        // Switch to verified developer email: must NOT be able to edit userFeaturePermissions or moderate listing reports
        val devUid = signInAndVerifyEmail(devEmail)
        val targetProfile = UserProfile(
            uid = testUid,
            email = testEmail,
            displayName = "Field Surveyor",
            role = "user",
            status = "active"
        )
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.saveUserFeaturePermissions(
                        targetProfile = targetProfile,
                        permissions = mapOf("marketplace" to false),
                        updatedByUid = devUid,
                        updatedByEmail = devEmail
                    )
                }
            }
        }
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    adminRepo.updateListingReportStatus(reportId, "reviewed")
                }
            }
        }

        // Cleanup by owner
        signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.updateListingReportStatus(reportId, "dismissed")
            adminRepo.removeDeveloperEmail(devEmail)
        }
    }

    @Test
    fun disabledIndividualPermissionBlocksDirectFirestoreWritesForUser() = runBlocking {
        val adminRepo = AdminRepository(db)
        val surveyRepo = com.sthalmeasure.app.data.repository.SurveyRepository(db)
        val marketRepo = com.sthalmeasure.app.data.repository.MarketRepository(db)
        val targetProfile = UserProfile(
            uid = testUid,
            email = testEmail,
            displayName = "Restricted Surveyor",
            role = "user",
            status = "active"
        )

        // Owner disables plot_measurement and marketplace individually for testUid
        val ownerUid = signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.saveUserFeaturePermissions(
                targetProfile = targetProfile,
                permissions = mapOf(
                    "plot_measurement" to false,
                    "marketplace" to false,
                    "gps_survey" to true
                ),
                updatedByUid = ownerUid,
                updatedByEmail = AdminRepository.OWNER_EMAIL
            )
        }

        // User signs back in and attempts direct Firestore writes bypassing UI
        signInAndVerifyEmail(testEmail)
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    surveyRepo.createProject(
                        com.sthalmeasure.app.data.model.SurveyProject(
                            userId = testUid,
                            name = "Bypass Calc Write",
                            state = "Andhra Pradesh",
                            parcelType = "four_sided",
                            areaSqm = 100.0
                        )
                    )
                }
            }
        }
        assertPermissionDenied {
            runBlocking {
                withTimeout(15_000L) {
                    marketRepo.createListing(
                        com.sthalmeasure.app.data.model.MarketListing(
                            userId = testUid,
                            title = "Bypass Listing",
                            state = "Andhra Pradesh",
                            areaCents = 2.0,
                            priceInr = 900000.0,
                            sellerName = "User",
                            lat = 16.5,
                            lng = 80.6
                        ),
                        "+919988776655",
                        testEmail
                    )
                }
            }
        }

        // Allowed module for same user (gps_walk) still succeeds
        val gpsId = withTimeout(15_000L) {
            surveyRepo.createProject(
                com.sthalmeasure.app.data.model.SurveyProject(
                    userId = testUid,
                    name = "Allowed GPS Walk",
                    state = "Andhra Pradesh",
                    parcelType = "gps_walk",
                    areaSqm = 250.0
                )
            )
        }
        assertTrue(gpsId.isNotBlank())
        withTimeout(15_000L) { surveyRepo.deleteProject(gpsId) }

        // Restore defaults
        signInAndVerifyEmail(AdminRepository.OWNER_EMAIL)
        withTimeout(15_000L) {
            adminRepo.restoreDefaultUserFeaturePermissions(
                targetProfile = targetProfile,
                updatedByUid = ownerUid,
                updatedByEmail = AdminRepository.OWNER_EMAIL
            )
        }
    }
}


