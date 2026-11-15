package com.sthalmeasure.app.base

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.MemoryCacheSettings
import com.sthalmeasure.app.R
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@LooperMode(LooperMode.Mode.INSTRUMENTATION_TEST)
abstract class FirestoreEmulatorTestBase {

    protected lateinit var context: Context
    protected lateinit var auth: FirebaseAuth
    protected lateinit var db: FirebaseFirestore
    protected lateinit var testUid: String
    protected lateinit var testEmail: String

    @Before
    fun setUpEmulator() = runBlocking {
        context = ApplicationProvider.getApplicationContext()
        val appName = "test-app-${UUID.randomUUID()}"
        val options = FirebaseOptions.Builder()
            .setProjectId("refined-period-j3kqt")
            .setApplicationId("1:423393024033:android:552f15074d44c4dea3ab60")
            .setApiKey("AIzaSyTestEmulatorKeyOnlyForRobolectric")
            .build()

        val app = FirebaseApp.initializeApp(context, options, appName)
        auth = FirebaseAuth.getInstance(app).apply {
            useEmulator("127.0.0.1", 9099)
        }
        val dbId = context.getString(R.string.firestore_database_id)
        db = FirebaseFirestore.getInstance(app, dbId).apply {
            useEmulator("127.0.0.1", 8085)
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(MemoryCacheSettings.newBuilder().build())
                .build()
        }

        val suffix = UUID.randomUUID().toString().replace("-", "").take(10)
        testEmail = "surveyor_$suffix@sthalmeasure.test"
        withTimeout(15_000L) {
            val result = auth.createUserWithEmailAndPassword(testEmail, "TestPass#2026!").await()
            testUid = result.user!!.uid
        }
    }

    protected suspend fun signInNewUser(prefix: String = "other"): String {
        val suffix = UUID.randomUUID().toString().replace("-", "").take(10)
        val email = "${prefix}_$suffix@sthalmeasure.test"
        return withTimeout(15_000L) {
            auth.signOut()
            val res = auth.createUserWithEmailAndPassword(email, "TestPass#2026!").await()
            res.user!!.uid
        }
    }

    protected suspend fun signInAsPrimary() {
        withTimeout(15_000L) {
            auth.signOut()
            auth.signInWithEmailAndPassword(testEmail, "TestPass#2026!").await()
        }
    }

    @After
    fun tearDownEmulator() {
        try {
            auth.signOut()
        } catch (_: Throwable) {
        }
        try {
            db.terminate()
        } catch (_: Throwable) {
        }
    }
}
