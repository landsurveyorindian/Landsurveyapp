package com.sthalmeasure.app.firebase

import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.appcheck.recaptcha.RecaptchaAppCheckProviderFactory
import com.sthalmeasure.app.BuildConfig

object AppCheckHelper {
    private const val TAG = "AppCheckInit"
    private const val DEBUG_TOKEN_EXTRA = "FIREBASE_APPCHECK_DEBUG_TOKEN"
    private const val LEGACY_DEBUG_TOKEN_EXTRA = "test-app-check-token"
    private const val DEBUG_STORE_PREFIX = "com.google.firebase.appcheck.debug.store."
    private const val DEBUG_SECRET_KEY = "com.google.firebase.appcheck.debug.DEBUG_SECRET"
    private const val RECAPTCHA_SITE_KEY_RES = "recaptcha_site_key"

    fun configureAppCheck(context: Context, intent: Intent? = null) {
        try {
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context)
            }

            if (BuildConfig.DEBUG) {
                val debugToken = intent?.getStringExtra(DEBUG_TOKEN_EXTRA)
                    ?.takeIf { it.isNotEmpty() }
                    ?: intent?.getStringExtra(LEGACY_DEBUG_TOKEN_EXTRA)?.takeIf { it.isNotEmpty() }
                if (!debugToken.isNullOrEmpty()) {
                    val persistenceKey = FirebaseApp.getInstance().persistenceKey
                    context.getSharedPreferences("$DEBUG_STORE_PREFIX$persistenceKey", Context.MODE_PRIVATE)
                        .edit()
                        .putString(DEBUG_SECRET_KEY, debugToken)
                        .commit()
                    Log.d(TAG, "App Check debug secret configured successfully.")
                }
                FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
                    DebugAppCheckProviderFactory.getInstance()
                )
            } else {
                val resId = context.resources.getIdentifier(RECAPTCHA_SITE_KEY_RES, "string", context.packageName)
                if (resId != 0) {
                    val siteKey = context.getString(resId)
                    if (siteKey.isNotBlank()) {
                        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
                            RecaptchaAppCheckProviderFactory.getInstance(siteKey)
                        )
                    } else {
                        Log.w(TAG, "recaptcha_site_key string resource is blank.")
                    }
                } else {
                    Log.w(TAG, "recaptcha_site_key string resource not found.")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Firebase App Check", e)
        }
    }
}
