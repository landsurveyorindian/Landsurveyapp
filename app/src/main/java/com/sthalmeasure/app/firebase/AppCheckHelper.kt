package com.sthalmeasure.app.firebase

import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.AppCheckProviderFactory
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.recaptcha.RecaptchaAppCheckProviderFactory
import com.sthalmeasure.app.BuildConfig

object AppCheckHelper {
    private const val TAG = "AppCheckInit"
    private const val DEBUG_TOKEN_EXTRA = "FIREBASE_APPCHECK_DEBUG_TOKEN"
    private const val LEGACY_DEBUG_TOKEN_EXTRA = "test-app-check-token"
    private const val DEBUG_STORE_PREFIX = "com.google.firebase.appcheck.debug.store."
    private const val DEBUG_SECRET_KEY = "com.google.firebase.appcheck.debug.DEBUG_SECRET"
    private const val RECAPTCHA_SITE_KEY_RES = "recaptcha_site_key"
    private const val DEBUG_FACTORY_CLASS = "com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory"

    @Volatile
    private var configured = false

    @Synchronized
    fun configureAppCheck(context: Context, intent: Intent? = null) {
        val debugToken = intent?.getStringExtra(DEBUG_TOKEN_EXTRA)
            ?.takeIf { it.isNotEmpty() }
            ?: intent?.getStringExtra(LEGACY_DEBUG_TOKEN_EXTRA)?.takeIf { it.isNotEmpty() }
        if (configured && debugToken.isNullOrEmpty()) return

        val appContext = context.applicationContext ?: context
        try {
            if (FirebaseApp.getApps(appContext).isEmpty()) {
                FirebaseApp.initializeApp(appContext)
            }

            if (BuildConfig.DEBUG) {
                if (!debugToken.isNullOrEmpty()) {
                    val persistenceKey = FirebaseApp.getInstance().persistenceKey
                    appContext.getSharedPreferences("$DEBUG_STORE_PREFIX$persistenceKey", Context.MODE_PRIVATE)
                        .edit()
                        .putString(DEBUG_SECRET_KEY, debugToken)
                        .apply()
                    Log.d(TAG, "App Check debug secret configured successfully.")
                }
                if (!configured) {
                    val debugFactory = Class.forName(DEBUG_FACTORY_CLASS)
                        .getMethod("getInstance")
                        .invoke(null) as? AppCheckProviderFactory
                    if (debugFactory != null) {
                        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(debugFactory)
                    } else {
                        Log.w(TAG, "DebugAppCheckProviderFactory was not available.")
                    }
                }
            } else if (!configured) {
                val resId = appContext.resources.getIdentifier(RECAPTCHA_SITE_KEY_RES, "string", appContext.packageName)
                if (resId != 0) {
                    val siteKey = appContext.getString(resId)
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
            configured = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Firebase App Check", e)
        }
    }
}
