package com.sthalmeasure.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CompassCalibration
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sthalmeasure.app.R
import com.sthalmeasure.app.data.model.LoginPortal
import com.sthalmeasure.app.domain.IndianStateUnitsCatalog
import com.sthalmeasure.app.firebase.AuthManager
import com.sthalmeasure.app.firebase.AuthResult
import kotlinx.coroutines.launch

enum class AuthScreenMode {
    LOGIN,
    REGISTER
}

@Composable
fun AuthFlowHost(
    initialMode: AuthScreenMode = AuthScreenMode.LOGIN,
    selectedPortal: LoginPortal = LoginPortal.USER,
    onSelectPortal: (LoginPortal) -> Unit = {},
    onPrepareRegistration: (fullName: String, preferredState: String) -> Unit = { _, _ -> },
    onClearPendingRegistration: () -> Unit = {}
) {
    var mode by remember { mutableStateOf(initialMode) }

    if (mode == AuthScreenMode.REGISTER) {
        BackHandler { mode = AuthScreenMode.LOGIN }
    }

    when (mode) {
        AuthScreenMode.LOGIN -> LoginScreen(
            selectedPortal = selectedPortal,
            onSelectPortal = onSelectPortal,
            onSwitchMode = { mode = it },
            onClearPendingRegistration = onClearPendingRegistration
        )
        AuthScreenMode.REGISTER -> RegisterScreen(
            onPrepareRegistration = onPrepareRegistration,
            onSwitchMode = { mode = it }
        )
    }
}

@Composable
fun SignInScreen() {
    AuthFlowHost()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    selectedPortal: LoginPortal = LoginPortal.USER,
    onSelectPortal: (LoginPortal) -> Unit = {},
    onSwitchMode: (AuthScreenMode) -> Unit,
    onClearPendingRegistration: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var activePortal by remember(selectedPortal) { mutableStateOf(selectedPortal) }
    var loading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AuthScaffold(
        activeMode = AuthScreenMode.LOGIN,
        onSelectMode = onSwitchMode
    ) {
        // Explicit Portal Role Login Switcher: User | Developer | Owner
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Select Sign-In Portal",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    LoginPortal.entries.forEachIndexed { idx, portal ->
                        SegmentedButton(
                            selected = activePortal == portal,
                            onClick = {
                                activePortal = portal
                                onSelectPortal(portal)
                            },
                            shape = SegmentedButtonDefaults.itemShape(index = idx, count = LoginPortal.entries.size),
                            icon = {},
                            modifier = Modifier.testTag("portal_tab_${portal.name.lowercase()}")
                        ) {
                            Text(
                                text = portal.label,
                                style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp),
                                fontWeight = if (activePortal == portal) FontWeight.Bold else FontWeight.Medium,
                                maxLines = 1,
                                softWrap = false
                            )
                        }
                    }
                }
                Text(
                    text = activePortal.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = when (activePortal) {
                        LoginPortal.USER -> stringResource(R.string.login_title)
                        LoginPortal.DEVELOPER -> "Developer Login"
                        LoginPortal.OWNER -> "Owner Control Login"
                    },
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = when (activePortal) {
                        LoginPortal.USER -> stringResource(R.string.login_subtitle)
                        LoginPortal.DEVELOPER -> "Sign in with an email ID authorized by the App Owner to access bug triage & telemetry."
                        LoginPortal.OWNER -> "Sign in with the verified Owner account to authorize developer emails & manage app features."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                FeatureRow("36 States & UTs", "Cents, Guntas, Pucca/Kacha Bigha, Kanal, Marla, Ground & Ankanam")
                FeatureRow("Field Triangulation & Bowditch", "Heron diagonals, Brahmagupta cyclic plots & Traverse closing error")
                FeatureRow("CAD Studio & GNSS Boundary Walk", "COGO plotting, FMB G-Line ladder, Kalman filter & DXF/GeoJSON I/O")
                FeatureRow("Cloud Vault & AI Scanner", "Private multi-device sync + Gemini ROR / 7-12 document extraction")
            }
        }

        if (errorMessage != null) {
            AuthErrorBanner(errorMessage!!)
        }

        Button(
            onClick = {
                if (loading) return@Button
                loading = true
                errorMessage = null
                onClearPendingRegistration()
                scope.launch {
                    when (val res = AuthManager.signInWithGoogle(context)) {
                        is AuthResult.Success -> Unit
                        AuthResult.Cancelled -> Unit
                        is AuthResult.Error -> errorMessage = res.message
                    }
                    loading = false
                }
            },
            enabled = !loading,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .testTag("google_signin_button"),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (loading) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null)
                Spacer(Modifier.size(10.dp))
                Text(
                    text = when (activePortal) {
                        LoginPortal.USER -> stringResource(R.string.sign_in_google)
                        LoginPortal.DEVELOPER -> "Developer Sign In with Google"
                        LoginPortal.OWNER -> "Owner Sign In with Google"
                    },
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        TextButton(
            onClick = { onSwitchMode(AuthScreenMode.REGISTER) },
            modifier = Modifier.testTag("go_to_register_button")
        ) {
            Text("New to Sthal Measure? Create an Account")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onPrepareRegistration: (fullName: String, preferredState: String) -> Unit,
    onSwitchMode: (AuthScreenMode) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var fullName by remember { mutableStateOf("") }
    var selectedState by remember { mutableStateOf("Andhra Pradesh") }
    var stateExpanded by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AuthScaffold(
        activeMode = AuthScreenMode.REGISTER,
        onSelectMode = onSwitchMode
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = stringResource(R.string.register_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = stringResource(R.string.register_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = fullName,
                    onValueChange = {
                        fullName = it
                        errorMessage = null
                    },
                    label = { Text("Full Name / Surveyor Name") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("register_name_input")
                )

                ExposedDropdownMenuBox(
                    expanded = stateExpanded,
                    onExpandedChange = { stateExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedState,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Home State / UT Jurisdiction") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = stateExpanded) },
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth()
                            .testTag("register_state_dropdown")
                    )
                    ExposedDropdownMenu(
                        expanded = stateExpanded,
                        onDismissRequest = { stateExpanded = false }
                    ) {
                        IndianStateUnitsCatalog.allStates.forEach { st ->
                            DropdownMenuItem(
                                text = { Text("${st.state} (${st.code})") },
                                onClick = {
                                    selectedState = st.state
                                    stateExpanded = false
                                }
                            )
                        }
                    }
                }
            }
        }

        if (errorMessage != null) {
            AuthErrorBanner(errorMessage!!)
        }

        Button(
            onClick = {
                if (loading) return@Button
                if (fullName.trim().length < 2) {
                    errorMessage = "Please enter your full name (at least 2 characters) to register."
                    return@Button
                }
                loading = true
                errorMessage = null
                onPrepareRegistration(fullName.trim(), selectedState)
                scope.launch {
                    when (val res = AuthManager.signInWithGoogle(context)) {
                        is AuthResult.Success -> Unit
                        AuthResult.Cancelled -> Unit
                        is AuthResult.Error -> errorMessage = res.message
                    }
                    loading = false
                }
            },
            enabled = !loading,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .testTag("register_google_button"),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            if (loading) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Icon(Icons.Default.PersonAdd, contentDescription = null)
                Spacer(Modifier.size(10.dp))
                Text(
                    text = stringResource(R.string.register_google),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        TextButton(
            onClick = { onSwitchMode(AuthScreenMode.LOGIN) },
            modifier = Modifier.testTag("go_to_login_button")
        ) {
            Text("Already registered? Sign In")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompleteRegistrationScreen(
    userEmail: String,
    defaultDisplayName: String,
    defaultState: String,
    busy: Boolean,
    errorMessage: String?,
    onCompleteRegistration: (displayName: String, preferredState: String) -> Unit,
    onSignOut: () -> Unit
) {
    var displayName by remember(defaultDisplayName) { mutableStateOf(defaultDisplayName) }
    var selectedState by remember(defaultState) { mutableStateOf(defaultState.ifBlank { "Andhra Pradesh" }) }
    var stateExpanded by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 460.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.CompassCalibration,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)
            )
            Text(
                text = stringResource(R.string.complete_registration_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = stringResource(R.string.complete_registration_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (userEmail.isNotBlank()) {
                        Text(
                            text = "Account: $userEmail",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = { displayName = it },
                        label = { Text("Full Name / Surveyor Name") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("complete_reg_name_input")
                    )
                    ExposedDropdownMenuBox(
                        expanded = stateExpanded,
                        onExpandedChange = { stateExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedState,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Home State / UT Jurisdiction") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = stateExpanded) },
                            modifier = Modifier
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = stateExpanded,
                            onDismissRequest = { stateExpanded = false }
                        ) {
                            IndianStateUnitsCatalog.allStates.forEach { st ->
                                DropdownMenuItem(
                                    text = { Text("${st.state} (${st.code})") },
                                    onClick = {
                                        selectedState = st.state
                                        stateExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            if (errorMessage != null) {
                AuthErrorBanner(errorMessage)
            }

            Button(
                onClick = { onCompleteRegistration(displayName, selectedState) },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("complete_reg_submit_button")
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Complete Registration", style = MaterialTheme.typography.titleMedium)
                }
            }

            OutlinedButton(
                onClick = onSignOut,
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("complete_reg_signout_button")
            ) {
                Text("Use Different Account")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AuthScaffold(
    activeMode: AuthScreenMode,
    onSelectMode: (AuthScreenMode) -> Unit,
    content: @Composable () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 460.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_launcher_foreground_img),
                contentDescription = stringResource(R.string.app_name),
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(22.dp))
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = stringResource(R.string.tagline),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }

            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = activeMode == AuthScreenMode.LOGIN,
                    onClick = { onSelectMode(AuthScreenMode.LOGIN) },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                    modifier = Modifier.testTag("auth_tab_login")
                ) {
                    Text("Sign In")
                }
                SegmentedButton(
                    selected = activeMode == AuthScreenMode.REGISTER,
                    onClick = { onSelectMode(AuthScreenMode.REGISTER) },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                    modifier = Modifier.testTag("auth_tab_register")
                ) {
                    Text("Register")
                }
            }

            content()
        }
    }
}

@Composable
private fun AuthErrorBanner(message: String) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.error.copy(alpha = 0.1f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(12.dp)
        )
    }
}

@Composable
private fun FeatureRow(title: String, detail: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(18.dp).padding(top = 2.dp)
        )
        Column {
            Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(detail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
