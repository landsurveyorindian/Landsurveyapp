package com.sthalmeasure.app.data

import com.google.firebase.firestore.FirebaseFirestoreException
import com.sthalmeasure.app.base.FirestoreEmulatorTestBase
import com.sthalmeasure.app.data.model.BugReport
import com.sthalmeasure.app.data.model.SurveyProject
import com.sthalmeasure.app.data.model.UserProfile
import com.sthalmeasure.app.data.repository.AccountAndSupportRepository
import com.sthalmeasure.app.data.repository.SurveyRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class SurveyRepositoryRuleTest : FirestoreEmulatorTestBase() {

    private fun Throwable.hasPermissionDenied(): Boolean {
        var cur: Throwable? = this
        while (cur != null) {
            if (cur is FirebaseFirestoreException &&
                cur.code == FirebaseFirestoreException.Code.PERMISSION_DENIED
            ) return true
            cur = cur.cause
        }
        return false
    }

    @Test
    fun ownerCanCreateUpdateListAndDeleteSurveyProject() = runBlocking {
        val repo = SurveyRepository(db)
        val project = SurveyProject(
            userId = testUid,
            name = "Guntur Plot Survey 42",
            state = "Andhra Pradesh",
            parcelType = "four_sided",
            areaSqm = 202.34,
            areaSqFt = 2178.0,
            areaSqYards = 242.0,
            areaAcres = 0.05,
            areaCents = 5.0,
            perimeterMeters = 58.4,
            notes = "Survey No 112/B",
            summaryJson = "{\"sides\":[15,14,15,14]}"
        )

        val docId = withTimeout(15_000L) { repo.createProject(project) }
        val projects = withTimeout(15_000L) {
            repo.observeUserProjects(testUid).first { it.any { p -> p.id == docId } }
        }
        assertEquals(1, projects.count { it.id == docId })
        assertEquals("Guntur Plot Survey 42", projects.first { it.id == docId }.name)

        withTimeout(15_000L) {
            repo.updateProject(docId, "Guntur Plot Revised", "Telangana", "Updated boundaries")
        }
        val updated = withTimeout(15_000L) {
            repo.observeUserProjects(testUid).first { list ->
                list.any { it.id == docId && it.name == "Guntur Plot Revised" }
            }
        }
        assertEquals("Telangana", updated.first { it.id == docId }.state)

        withTimeout(15_000L) { repo.deleteProject(docId) }
        val afterDelete = withTimeout(15_000L) {
            repo.observeUserProjects(testUid).first { list -> list.none { it.id == docId } }
        }
        assertTrue(afterDelete.none { it.id == docId })
    }

    @Test
    fun unauthenticatedAndCrossUserAccessDeniedOnSurveyProject() = runBlocking {
        val repo = SurveyRepository(db)
        val project = SurveyProject(
            userId = testUid,
            name = "Private Farm",
            state = "Maharashtra",
            parcelType = "traverse",
            areaSqm = 1000.0
        )
        val docId = withTimeout(15_000L) { repo.createProject(project) }

        auth.signOut()
        try {
            withTimeout(15_000L) { repo.createProject(project) }
            fail("Expected PERMISSION_DENIED for unauthenticated create")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on unauth create, got $e", e.hasPermissionDenied())
        }

        val attackerUid = signInNewUser("attacker")
        try {
            withTimeout(15_000L) {
                repo.updateProject(docId, "Tampered Name", "Kerala", "Hacked")
            }
            fail("Expected PERMISSION_DENIED for cross-user update")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on cross-user update, got $e", e.hasPermissionDenied())
        }

        try {
            withTimeout(15_000L) { repo.deleteProject(docId) }
            fail("Expected PERMISSION_DENIED for cross-user delete")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on cross-user delete, got $e", e.hasPermissionDenied())
        }

        try {
            withTimeout(15_000L) {
                repo.createProject(project.copy(userId = testUid))
            }
            fail("Expected PERMISSION_DENIED when forging userId=$testUid as $attackerUid")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on userId forgery, got $e", e.hasPermissionDenied())
        }
    }

    @Test
    fun userCanCreateProfileAndSubmitBugReportWithForcedUserRole() = runBlocking {
        val accountRepo = AccountAndSupportRepository(db)
        withTimeout(15_000L) {
            accountRepo.upsertUserProfile(
                UserProfile(
                    uid = testUid,
                    email = testEmail,
                    displayName = "Ravi Kumar",
                    preferredState = "Maharashtra"
                )
            )
            // Re-login upsert with default state must preserve previously registered state
            accountRepo.upsertUserProfile(
                UserProfile(
                    uid = testUid,
                    email = testEmail,
                    displayName = "Ravi Kumar",
                    preferredState = "Andhra Pradesh"
                )
            )
            val loaded = accountRepo.getUserProfile(testUid)
            assertEquals("Ravi Kumar", loaded?.displayName)
            assertEquals("Maharashtra", loaded?.preferredState)

            val reportId = accountRepo.submitBugReport(
                BugReport(
                    userId = testUid,
                    userEmail = testEmail,
                    userName = "Ravi Kumar",
                    title = "Traverse angle unit display",
                    description = "Verify DMS display in Bowditch sheet",
                    module = "Calculator",
                    severity = "low"
                )
            )
            assertTrue(reportId.startsWith("bug_"))
        }

        signInNewUser("other_user")
        try {
            withTimeout(15_000L) { accountRepo.getUserProfile(testUid) }
            fail("Expected PERMISSION_DENIED when reading another user's profile")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on cross-user profile get, got $e", e.hasPermissionDenied())
        }
    }

    @Test
    fun publicRegistrationCannotSelfAssignOwnerOrDeveloperRoleInFirestore() = runBlocking {
        val accountRepo = AccountAndSupportRepository(db)
        try {
            withTimeout(15_000L) {
                db.collection(AccountAndSupportRepository.COLLECTION_USERS)
                    .document(testUid)
                    .set(
                        mapOf(
                            "uid" to testUid,
                            "email" to testEmail,
                            "displayName" to "Escalation Attempt",
                            "role" to "owner",
                            "status" to "active",
                            "photoUrl" to "",
                            "preferredState" to "Andhra Pradesh",
                            "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                        )
                    )
                    .await()
            }
            fail("Expected PERMISSION_DENIED when self-creating profile with role=owner")
        } catch (e: Throwable) {
            assertTrue("Expected PERMISSION_DENIED on role=owner self-create, got $e", e.hasPermissionDenied())
        }

        // Upsert via AccountAndSupportRepository forces role=user and succeeds
        withTimeout(15_000L) {
            accountRepo.upsertUserProfile(
                UserProfile(uid = testUid, email = testEmail, displayName = "Honest User", role = "owner")
            )
            val created = accountRepo.getUserProfile(testUid)
            assertEquals("user", created?.role)
        }
    }
}

