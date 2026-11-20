package com.sthalmeasure.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import com.sthalmeasure.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class MainActivityLaunchRobolectricTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun mainActivity_launchesDirectlyIntoWorkspaceWithoutLoginOrSignOutUi() {
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("google_signin_button").assertDoesNotExist()
        composeRule.onNodeWithTag("header_signout_button").assertDoesNotExist()
        composeRule.onNodeWithText("Continue with Google", substring = true).assertDoesNotExist()
        composeRule.onNodeWithText("Welcome Back").assertDoesNotExist()

        composeRule.onNodeWithText("Surveying Workspaces").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithTag("home_state_dropdown").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithTag("tile_bhuvan_map_2d").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithTag("tile_cad").performScrollTo().assertIsDisplayed()
    }
}
