package com.sthalmeasure.app.firebase

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.util.Log
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.auth
import com.sthalmeasure.app.R
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

sealed interface AuthResult {
    data class Success(val user: FirebaseUser) : AuthResult
    data object Cancelled : AuthResult
    data class Error(val message: String) : AuthResult
}

object AuthManager {
    private const val TAG = "Auth"

    private tailrec fun Context.findActivity(): Activity? = when (this) {
        is Activity -> this
        is ContextWrapper -> baseContext.findActivity()
        else -> null
    }

    fun observeAuthState(): Flow<FirebaseUser?> = callbackFlow {
        val auth = Firebase.auth
        trySend(auth.currentUser)
        val listener = com.google.firebase.auth.FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun trySilentGoogleSignIn(context: Context): FirebaseUser? {
        val clientId = try {
            context.getString(R.string.default_web_client_id)
        } catch (e: Exception) {
            Log.w(TAG, "default_web_client_id missing for silent sign-in: ${e.message}")
            return null
        }
        if (clientId.isBlank()) return null
        val hostContext = context.findActivity() ?: context
        return try {
            val credentialManager = CredentialManager.create(hostContext)
            val option = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(true)
                .setServerClientId(clientId)
                .setAutoSelectEnabled(true)
                .build()
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build()
            val response = credentialManager.getCredential(hostContext, request)
            signInWithCredential(response.credential)
        } catch (e: CancellationException) {
            throw e
        } catch (_: NoCredentialException) {
            null
        } catch (e: Throwable) {
            Log.w(TAG, "Silent Google Sign-In skipped: ${e.message}")
            null
        }
    }

    suspend fun signInWithGoogle(activityContext: Context): AuthResult {
        val clientId = try {
            activityContext.getString(R.string.default_web_client_id)
        } catch (e: Exception) {
            Log.e(TAG, "Missing default_web_client_id string resource", e)
            return AuthResult.Error("Google Sign-In client ID is not configured in Firebase resources.")
        }
        if (clientId.isBlank()) {
            return AuthResult.Error("Google Sign-In client ID is not configured in Firebase resources.")
        }

        val hostContext = activityContext.findActivity() ?: activityContext
        val credentialManager = CredentialManager.create(hostContext)
        return try {
            val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(clientId).build()
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build()
            val response = credentialManager.getCredential(hostContext, request)
            val user = signInWithCredential(response.credential)
                ?: return AuthResult.Error("Unexpected credential type received from Google Sign-In.")
            AuthResult.Success(user)
        } catch (e: CancellationException) {
            throw e
        } catch (e: GetCredentialCancellationException) {
            Log.w(TAG, "Google Sign-In flow cancelled or dismissed: ${e.message}", e)
            AuthResult.Cancelled
        } catch (e: NoCredentialException) {
            Log.w(TAG, "No Google credential returned for GetSignInWithGoogleOption: ${e.message}", e)
            AuthResult.Error("No Google account available on this device. Add a Google account in device Settings and try again.")
        } catch (e: GetCredentialException) {
            Log.e(TAG, "Google Sign-In failed (${e.type}): ${e.message}", e)
            val raw = e.localizedMessage ?: e.message.orEmpty()
            val friendly = when {
                raw.contains("28444") ->
                    "Google Sign-In config error [28444] for ${hostContext.packageName}. Install the latest build signed with the SHA-1 registered in Firebase Project Settings."
                else -> raw.ifBlank { "Google Sign-In failed. Check Google Play Services & Firebase OAuth configuration." }
            }
            AuthResult.Error(friendly)
        } catch (e: Throwable) {
            Log.e(TAG, "Google Sign-In failed", e)
            AuthResult.Error(e.localizedMessage ?: "Google Sign-In failed. Check Play Services configuration.")
        }
    }

    private suspend fun signInWithCredential(credential: androidx.credentials.Credential): FirebaseUser? {
        if (credential is CustomCredential &&
            credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            val googleCred = GoogleIdTokenCredential.createFrom(credential.data)
            val firebaseCred = GoogleAuthProvider.getCredential(googleCred.idToken, null)
            return Firebase.auth.signInWithCredential(firebaseCred).await().user
        }
        return null
    }

    suspend fun signOut(context: Context) {
        withContext(NonCancellable) {
            try {
                CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
            } catch (e: Throwable) {
                Log.w(TAG, "Failed to clear credential state: ${e.message}")
            }
            Firebase.auth.signOut()
        }
    }
}
