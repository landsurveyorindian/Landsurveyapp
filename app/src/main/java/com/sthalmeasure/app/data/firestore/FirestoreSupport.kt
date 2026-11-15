package com.sthalmeasure.app.data.firestore

import android.content.Context
import android.util.Log
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.sthalmeasure.app.R
import org.json.JSONObject

object FirestoreProvider {
    fun getDb(context: Context): FirebaseFirestore {
        val dbId = context.getString(R.string.firestore_database_id)
        return FirebaseFirestore.getInstance(dbId)
    }
}

enum class OperationType(val label: String) {
    CREATE("create"),
    UPDATE("update"),
    DELETE("delete"),
    LIST("list"),
    GET("get"),
    WRITE("write")
}

object FirestoreErrorHandler {
    private const val TAG = "FirestoreError"

    fun handleFirestoreError(
        error: Throwable,
        operationType: OperationType,
        path: String?
    ): IllegalStateException {
        val user = try {
            Firebase.auth.currentUser
        } catch (_: Throwable) {
            null
        }
        val provider = user?.providerData?.firstOrNull()?.providerId ?: "unknown"
        val errInfo = JSONObject().apply {
            put("error", error.message ?: error.toString())
            put("operationType", operationType.label)
            put("path", path ?: "")
            put("authInfo", JSONObject().apply {
                put("userId", user?.uid ?: "unauthenticated")
                put("email", user?.email ?: "")
                put("emailVerified", user?.isEmailVerified ?: false)
                put("provider", provider)
            })
        }
        Log.e(TAG, "Firestore Error: $errInfo")
        val msg = error.message.orEmpty()
        val friendly = when {
            msg.contains("PERMISSION_DENIED", ignoreCase = true) ->
                "Access denied for ${operationType.label} at $path. Please verify you are signed in to your account."
            msg.contains("UNAVAILABLE", ignoreCase = true) ->
                "Cloud sync temporarily unavailable. Changes will sync once reconnected."
            else -> error.localizedMessage ?: "Firestore ${operationType.label} failed"
        }
        return IllegalStateException(friendly, error)
    }
}
