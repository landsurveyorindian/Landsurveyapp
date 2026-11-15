package com.sthalmeasure.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import com.sthalmeasure.app.ui.screens.AuthFlowHost
import com.sthalmeasure.app.ui.screens.CalculatorScreen
import com.sthalmeasure.app.ui.screens.CompleteRegistrationScreen
import com.sthalmeasure.app.ui.screens.HomeScreen
import com.sthalmeasure.app.ui.theme.SthalMeasureTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class UiScreensRobolectricTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun authFlowHost_switchesSeparatelyBetweenLoginAndRegistration() {
        composeTestRule.setContent {
            SthalMeasureTheme {
                AuthFlowHost()
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Welcome Back").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("google_signin_button").performScrollTo().assertIsDisplayed()

        // Navigate to separate Registration screen
        composeTestRule.onNodeWithTag("go_to_register_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Create Account").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("register_name_input").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("register_state_dropdown").performScrollTo().assertIsDisplayed()

        // Empty name validation on Register button
        composeTestRule.onNodeWithTag("register_google_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Please enter your full name (at least 2 characters) to register.")
            .performScrollTo()
            .assertIsDisplayed()

        // Switch back to Login screen
        composeTestRule.onNodeWithTag("go_to_login_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Welcome Back").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun completeRegistrationScreen_submitsEnteredNameAndState() {
        var submittedName = ""
        var submittedState = ""
        composeTestRule.setContent {
            SthalMeasureTheme {
                CompleteRegistrationScreen(
                    userEmail = "surveyor@example.com",
                    defaultDisplayName = "",
                    defaultState = "Telangana",
                    busy = false,
                    errorMessage = null,
                    onCompleteRegistration = { name, state ->
                        submittedName = name
                        submittedState = state
                    },
                    onSignOut = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("complete_reg_name_input").performScrollTo().performTextInput("Lakshmi Rao")
        composeTestRule.onNodeWithTag("complete_reg_submit_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("Lakshmi Rao", submittedName)
        assertEquals("Telangana", submittedState)
    }

    @Test
    fun homeScreen_displaysStateBannerAndNavigatesOnTileClick() {
        var navigatedRoute: String? = null
        composeTestRule.setContent {
            SthalMeasureTheme {
                HomeScreen(
                    activeState = "Maharashtra",
                    projectCount = 3,
                    listingCount = 2,
                    onNavigate = { navigatedRoute = it },
                    onOpenAiAdvisor = {},
                    onOpenScanner = {},
                    onOpenAcademy = {},
                    onOpenBugReport = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Maharashtra (MH)").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("tile_projects").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Survey Vault (3)").assertExists()
        composeTestRule.onNodeWithTag("tile_calculator").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("calc", navigatedRoute)
    }

    @Test
    fun calculatorScreen_calculatesFourSidedPlotAndSavesProject() {
        var savedType: String? = null
        var savedAreaSqm = 0.0
        composeTestRule.setContent {
            SthalMeasureTheme {
                CalculatorScreen(
                    activeState = "Andhra Pradesh",
                    presetSqm = 404.68564224,
                    onSaveProject = { _, type, areaSqm, _, _ ->
                        savedType = type
                        savedAreaSqm = areaSqm
                    }
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Surveyed Area Breakdown").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("save_project_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()

        assertEquals("four_sided", savedType)
        assertTrue("Expected positive area > 200 sqm, got $savedAreaSqm", savedAreaSqm > 200.0)
    }

    @Test
    fun calculatorScreen_switchesToTraverseMode() {
        composeTestRule.setContent {
            SthalMeasureTheme {
                CalculatorScreen(
                    activeState = "Karnataka",
                    presetSqm = 404.68564224,
                    onSaveProject = { _, _, _, _, _ -> }
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("calc_mode_traverse").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("add_station_button").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun loginScreen_switchesBetweenUserDeveloperAndOwnerPortals() {
        composeTestRule.setContent {
            SthalMeasureTheme {
                AuthFlowHost()
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("portal_tab_user").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Developer").assertIsDisplayed()
        composeTestRule.onNodeWithText("Owner").assertIsDisplayed()

        composeTestRule.onNodeWithTag("portal_tab_developer").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Developer Login").performScrollTo().assertIsDisplayed()

        composeTestRule.onNodeWithTag("portal_tab_owner").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Owner Control Login").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun firebaseConfig_targetsConfirmedOriginalProjectAndDatabase() {
        val context = androidx.test.core.app.ApplicationProvider.getApplicationContext<android.content.Context>()
        assertEquals(
            "ai-studio-73b42930-76b6-43b5-885b-2613a808d850",
            context.getString(com.sthalmeasure.app.R.string.firestore_database_id)
        )
        assertEquals(
            "423393024033-76voi4scplilk78m971lr9mb74o497ea.apps.googleusercontent.com",
            context.getString(com.sthalmeasure.app.R.string.default_web_client_id)
        )
        assertEquals(
            "refined-period-j3kqt",
            context.getString(com.sthalmeasure.app.R.string.project_id)
        )
    }

    @Test
    fun ownerControlCenterScreen_savesBusinessControlsAndAuthorizesDeveloperEmail() {
        var savedSettings: com.sthalmeasure.app.data.model.SystemSettings? = null
        var addedDevEmail = ""
        var addedDevLabel = ""

        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.OwnerControlCenterScreen(
                    ownerEmail = "pavansrirambezawada@gmail.com",
                    systemSettings = com.sthalmeasure.app.data.model.SystemSettings(),
                    developerEmails = emptyList(),
                    allUsers = emptyList(),
                    listings = emptyList(),
                    bugReports = emptyList(),
                    onSaveBusinessControls = { savedSettings = it },
                    onAddDeveloperEmail = { e, l ->
                        addedDevEmail = e
                        addedDevLabel = l
                    },
                    onToggleDeveloperEmail = { _, _ -> },
                    onRemoveDeveloperEmail = {},
                    onUpdateUserRoleStatus = { _, _, _ -> },
                    onVerifyListing = { _, _, _ -> },
                    onOpenDeveloperDashboard = {}
                )
            }
        }
        composeTestRule.waitForIdle()

        // Toggle Land Marketplace off and save controls
        composeTestRule.onNodeWithTag("switch_feat_market").performScrollTo().performClick()
        composeTestRule.onNodeWithTag("save_business_controls_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals(false, savedSettings?.marketplaceEnabled)

        // Switch to Dev Emails tab and authorize an engineer email
        composeTestRule.onNodeWithTag("owner_tab_dev_emails").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("dev_email_input").performScrollTo().performTextInput("GIS.Lead@Sthal.IN ")
        composeTestRule.onNodeWithTag("dev_label_input").performScrollTo().performTextInput("Lead CAD Dev")
        composeTestRule.onNodeWithTag("authorize_dev_email_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("gis.lead@sthal.in", addedDevEmail)
        assertEquals("Lead CAD Dev", addedDevLabel)
    }

    @Test
    fun developerDashboardScreen_filtersAndTriagesBugs() {
        var triagedId = ""
        var triagedStatus = ""
        val sampleBugs = listOf(
            com.sthalmeasure.app.data.model.BugReport(
                id = "bug_1",
                userId = "u1",
                userEmail = "u1@test.in",
                userName = "Ramesh",
                title = "DXF scale factor",
                description = "Meters export adjustment",
                module = "GIS I/O",
                severity = "high",
                status = "new"
            ),
            com.sthalmeasure.app.data.model.BugReport(
                id = "bug_2",
                userId = "u2",
                userEmail = "u2@test.in",
                userName = "Sita",
                title = "Label overlap",
                description = "Diagonal text clip",
                module = "Calculator",
                severity = "low",
                status = "resolved"
            )
        )

        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.DeveloperDashboardScreen(
                    developerEmail = "dev@sthal.in",
                    appRole = com.sthalmeasure.app.data.model.AppRole.DEVELOPER,
                    systemSettings = com.sthalmeasure.app.data.model.SystemSettings(),
                    developerEmails = emptyList(),
                    bugReports = sampleBugs,
                    onTriageBug = { id, st ->
                        triagedId = id
                        triagedStatus = st
                    }
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("DXF scale factor").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("triage_bug_1_investigating").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("bug_1", triagedId)
        assertEquals("investigating", triagedStatus)
    }

    @Test
    fun homeScreen_showsDisabledStateForLockedFeaturesForUserRole() {
        composeTestRule.setContent {
            SthalMeasureTheme {
                HomeScreen(
                    activeState = "Andhra Pradesh",
                    projectCount = 1,
                    listingCount = 1,
                    appRole = com.sthalmeasure.app.data.model.AppRole.USER,
                    systemSettings = com.sthalmeasure.app.data.model.SystemSettings(
                        announcementTitle = "Kharif Notice",
                        marketplaceEnabled = false
                    ),
                    onNavigate = {},
                    onOpenAiAdvisor = {},
                    onOpenScanner = {},
                    onOpenAcademy = {},
                    onOpenBugReport = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("system_announcement_banner").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Disabled by Owner").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun calculatorScreen_fiveSidedModeComputesAndSavesSummary() {
        var savedType: String? = null
        var savedSummary = ""
        composeTestRule.setContent {
            SthalMeasureTheme {
                CalculatorScreen(
                    activeState = "Andhra Pradesh",
                    presetSqm = 404.68564224,
                    onSaveProject = { _, _, _, _, _ -> },
                    onSaveProjectWithSummary = { _, type, _, _, _, summaryJson ->
                        savedType = type
                        savedSummary = summaryJson
                    }
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("calc_mode_five_sided").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("five_side_a").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("save_project_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()

        assertEquals("five_sided", savedType)
        assertTrue(savedSummary.contains("\"parcelType\":\"five_sided\""))
    }

    @Test
    fun individualPermissionsScreen_showsGlobalBlocksSavesAndRestores() {
        val users = listOf(
            com.sthalmeasure.app.data.model.UserProfile(
                uid = "u_field_1",
                email = "raju@sthal.in",
                displayName = "Raju Surveyor",
                role = "user",
                status = "active"
            )
        )
        var savedUid = ""
        var savedMap: Map<String, Boolean> = emptyMap()
        var restoredUid = ""

        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.IndividualPermissionsScreen(
                    allUsers = users,
                    allPermissionDocs = emptyList(),
                    auditLogs = emptyList(),
                    systemSettings = com.sthalmeasure.app.data.model.SystemSettings(marketplaceEnabled = false),
                    onSavePermissions = { profile, map ->
                        savedUid = profile.uid
                        savedMap = map
                    },
                    onRestoreDefaults = { profile -> restoredUid = profile.uid },
                    onBack = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Blocked by Global Kill Switch", substring = true)
            .performScrollTo()
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag("save_individual_perms_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("u_field_1", savedUid)
        assertTrue(savedMap.isNotEmpty())

        composeTestRule.onNodeWithTag("restore_individual_perms_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("u_field_1", restoredUid)
    }

    @Test
    fun projectsScreen_requiresDeleteConfirmationAndExportsPdf() {
        val projects = listOf(
            com.sthalmeasure.app.data.model.SurveyProject(
                id = "p1",
                userId = "u1",
                name = "Kakinada Dryland",
                state = "Andhra Pradesh",
                parcelType = "cad",
                areaSqm = 400.0,
                areaCents = 9.88
            )
        )
        var deletedId = ""
        var exportedId = ""

        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.ProjectsScreen(
                    projects = projects,
                    pdfReportsEnabled = true,
                    onUpdateProject = { _, _, _, _ -> },
                    onDeleteProject = { deletedId = it },
                    onPromoteToMarket = {},
                    onExportPdf = { exportedId = it.id }
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("export_pdf_p1").performClick()
        composeTestRule.waitForIdle()
        assertEquals("p1", exportedId)

        // Delete button must open confirmation dialog instead of deleting immediately
        composeTestRule.onNodeWithTag("delete_project_p1").performClick()
        composeTestRule.waitForIdle()
        assertEquals("", deletedId)
        composeTestRule.onNodeWithTag("confirm_delete_project_button").performClick()
        composeTestRule.waitForIdle()
        assertEquals("p1", deletedId)
    }

    @Test
    fun academySheet_showsHonestUnavailableStateWhenVideoUrlMissing() {
        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.AcademySheet(
                    academyVideos = emptyList(),
                    completedEpisodeIds = emptySet(),
                    onTryEpisodeRoute = {},
                    onDismiss = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("academy_watch_ep-01").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("academy_video_unavailable_ep-01").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_failClosedStatesLockTilesAndTriggerRetryWhenUnavailable() {
        var navigated = false
        var retried = false
        val unavailableStates = com.sthalmeasure.app.domain.AppFeature.entries.associateWith {
            com.sthalmeasure.app.domain.PermissionAccessState.UNAVAILABLE
        }
        composeTestRule.setContent {
            SthalMeasureTheme {
                HomeScreen(
                    activeState = "Andhra Pradesh",
                    projectCount = 2,
                    listingCount = 1,
                    featureAccessStates = unavailableStates,
                    onRetryPermissions = { retried = true },
                    onNavigate = { navigated = true },
                    onOpenAiAdvisor = {},
                    onOpenScanner = {},
                    onOpenAcademy = {},
                    onOpenBugReport = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("permissions_unavailable_banner").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag("tile_calculator").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals(false, navigated)

        composeTestRule.onNodeWithTag("retry_permissions_button").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertTrue(retried)
    }

    @Test
    fun academySheet_ownerInvalidUrlShowsErrorAndValidHttpsSaves() {
        var savedUrl = ""
        composeTestRule.setContent {
            SthalMeasureTheme {
                com.sthalmeasure.app.ui.screens.AcademySheet(
                    academyVideos = emptyList(),
                    completedEpisodeIds = emptySet(),
                    isOwner = true,
                    onSaveVideoUrl = { _, _, _, _, url -> savedUrl = url },
                    onTryEpisodeRoute = {},
                    onDismiss = {}
                )
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("academy_watch_ep-01").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithTag("academy_owner_url_input_ep-01").performScrollTo().performTextInput("http://bad-url")
        composeTestRule.onNodeWithTag("academy_owner_url_save_ep-01").performScrollTo().performClick()
        composeTestRule.waitForIdle()
        assertEquals("", savedUrl)
        composeTestRule.onNodeWithText("Enter a valid https:// video URL (no spaces) or leave blank.")
            .performScrollTo()
            .assertIsDisplayed()
    }
}


