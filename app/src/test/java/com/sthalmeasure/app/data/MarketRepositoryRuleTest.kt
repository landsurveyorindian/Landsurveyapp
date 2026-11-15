package com.sthalmeasure.app.data

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.sthalmeasure.app.base.FirestoreEmulatorTestBase
import com.sthalmeasure.app.data.model.MarketListing
import com.sthalmeasure.app.data.repository.MarketRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class MarketRepositoryRuleTest : FirestoreEmulatorTestBase() {

    @Test
    fun userCanPublishListingAndOnlyOwnerReadsPrivateSellerData() = runBlocking {
        val repo = MarketRepository(db)
        val listing = MarketListing(
            userId = testUid,
            title = "5 Cents Residential Plot in Mangalagiri",
            state = "Andhra Pradesh",
            district = "Guntur",
            surveyNo = "Sy.No 245/A",
            areaCents = 5.0,
            areaSqYards = 242.0,
            areaAcres = 0.05,
            priceInr = 2500000.0,
            sellerName = "Srinivas Rao",
            lat = 16.43,
            lng = 80.55
        )
        val listingId = withTimeout(15_000L) {
            repo.createListing(listing, "+919876543210", testEmail)
        }

        val listings = withTimeout(15_000L) {
            repo.observeListings().first { it.any { item -> item.id == listingId } }
        }
        val created = listings.first { it.id == listingId }
        assertFalse(created.verified)
        assertEquals("unverified", created.verificationStatus)

        val ownerSellerData = withTimeout(15_000L) {
            repo.getSellerDataForOwner(listingId)
        }
        assertEquals("+919876543210", ownerSellerData?.sellerPhone)

        // Another authenticated user CANNOT read private seller PII or delete the listing
        signInNewUser("buyer")
        try {
            withTimeout(15_000L) { repo.getSellerDataForOwner(listingId) }
            fail("Expected PERMISSION_DENIED for non-owner reading market_seller_data")
        } catch (e: Throwable) {
            var cur: Throwable? = e
            var foundPermissionDenied = false
            while (cur != null) {
                if (cur is FirebaseFirestoreException &&
                    cur.code == FirebaseFirestoreException.Code.PERMISSION_DENIED
                ) {
                    foundPermissionDenied = true
                    break
                }
                cur = cur.cause
            }
            assertTrue("Expected PERMISSION_DENIED in cause chain, got $e (cause=${e.cause})", foundPermissionDenied)
        }

        // Sign back in as owner and verify self-verification update is blocked
        signInAsPrimary()
        try {
            withTimeout(15_000L) {
                db.collection(MarketRepository.COLLECTION_LISTINGS)
                    .document(listingId)
                    .update(
                        mapOf(
                            "verified" to true,
                            "verificationStatus" to "verified",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    )
                    .await()
            }
            fail("Expected PERMISSION_DENIED on self-verification")
        } catch (e: FirebaseFirestoreException) {
            assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, e.code)
        }

        // Clean up by owner
        withTimeout(15_000L) { repo.deleteListing(listingId) }
    }

    @Test
    fun crossUserCannotCreateSellerDataForAnothersListing() = runBlocking {
        val repo = MarketRepository(db)
        val listingId = withTimeout(15_000L) {
            repo.createListing(
                MarketListing(
                    userId = testUid,
                    title = "Corner Agri Plot",
                    state = "Andhra Pradesh",
                    areaCents = 4.0,
                    priceInr = 1800000.0,
                    sellerName = "Original Seller",
                    lat = 16.5,
                    lng = 80.6
                ),
                "+919911223344",
                testEmail
            )
        }

        // Delete only seller data or test overwrite attempt by another user
        val attackerUid = signInNewUser("spoof")
        try {
            withTimeout(15_000L) {
                db.collection(MarketRepository.COLLECTION_SELLER_DATA)
                    .document(listingId)
                    .set(
                        mapOf(
                            "listingId" to listingId,
                            "userId" to attackerUid,
                            "sellerName" to "Spoofed",
                            "sellerEmail" to "spoof@test.in",
                            "sellerPhone" to "+919000000000",
                            "createdAt" to FieldValue.serverTimestamp(),
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    )
                    .await()
            }
            fail("Expected PERMISSION_DENIED when non-owner attempts to tamper with market_seller_data")
        } catch (e: FirebaseFirestoreException) {
            assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, e.code)
        } finally {
            signInAsPrimary()
            withTimeout(15_000L) { repo.deleteListing(listingId) }
        }
    }
}

