package com.sthalmeasure.app.data.repository

import android.content.Context
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.sthalmeasure.app.data.firestore.FirestoreErrorHandler
import com.sthalmeasure.app.data.firestore.FirestoreProvider
import com.sthalmeasure.app.data.firestore.OperationType
import com.sthalmeasure.app.data.model.SurveyProject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class SurveyRepository(
    private val db: FirebaseFirestore
) {
    constructor(context: Context) : this(FirestoreProvider.getDb(context))

    private val collection get() = db.collection(COLLECTION_PROJECTS)

    fun observeUserProjects(userId: String): Flow<List<SurveyProject>> = callbackFlow {
        val registration = collection
            .whereEqualTo("userId", userId)
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(
                        FirestoreErrorHandler.handleFirestoreError(
                            error,
                            OperationType.LIST,
                            COLLECTION_PROJECTS
                        )
                    )
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(SurveyProject::class.java)
                } ?: emptyList()
                trySend(list)
            }
        awaitClose { registration.remove() }
    }

    suspend fun createProject(project: SurveyProject): String {
        val docId = project.id.takeIf { it.isNotBlank() && ID_REGEX.matches(it) }
            ?: "proj_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        val path = "$COLLECTION_PROJECTS/$docId"
        val clean = project.copy(
            id = "",
            name = project.name.trim().take(150),
            state = project.state.trim().ifBlank { "Andhra Pradesh" }.take(80),
            notes = project.notes.trim().take(1000),
            summaryJson = project.summaryJson.take(32768),
            createdAt = null,
            updatedAt = null
        )
        try {
            collection.document(docId).set(clean).await()
            return docId
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.CREATE, path)
        }
    }

    suspend fun updateProject(
        projectId: String,
        name: String,
        state: String,
        notes: String
    ) {
        val path = "$COLLECTION_PROJECTS/$projectId"
        try {
            collection.document(projectId).update(
                mapOf(
                    "name" to name.trim().take(150),
                    "state" to state.trim().take(80),
                    "notes" to notes.trim().take(1000),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.UPDATE, path)
        }
    }

    suspend fun deleteProject(projectId: String) {
        val path = "$COLLECTION_PROJECTS/$projectId"
        try {
            collection.document(projectId).delete().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw FirestoreErrorHandler.handleFirestoreError(e, OperationType.DELETE, path)
        }
    }

    companion object {
        const val COLLECTION_PROJECTS = "survey_projects"
        private val ID_REGEX = Regex("^[a-zA-Z0-9_\\-]+$")
    }
}
