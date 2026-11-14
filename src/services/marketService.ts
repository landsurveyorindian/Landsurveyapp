import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase/config';
import { PrivateSellerData } from '../types/auth';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

/**
 * Public Market Listing:
 * Contains only non-sensitive plot coordinates, geometric extent, pricing, and verification status.
 * Seller contact details and legal title deeds are segregated into PrivateSellerData (market_seller_data).
 */
export interface MarketListing {
  id: string;
  userId: string;
  title: string;
  state: string;
  district: string;
  surveyNo: string;
  areaCents: number;
  areaSqYards: number;
  areaAcres: number;
  priceInr: number;
  sellerName: string;
  lat: number;
  lng: number;
  boundaryGeoJson?: string;
  verified: boolean; // Must be false unless formally verified through review workflow
  verificationStatus: VerificationStatus;
  isDemo?: boolean; // Distinguishes illustrative sample listings from user listings
  verifiedBy?: string;
  verifiedByUid?: string;
  verifiedAt?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  zoning?: string;
  roadWidthFt?: number;

  // Optional convenience fields when viewing own listings or when admin loads them
  sellerContact?: string;
  userEmail?: string;
  verificationDocuments?: string[];
  verificationNotes?: string;
}

const GLOBAL_MARKET_KEY = 'sthal_measure_market_public_listings';

function getUserMarketStorageKey(userId?: string | null): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest';
  return `sthal_measure_market_user_${uid}`;
}

export const SEED_LISTINGS: MarketListing[] = [
  {
    id: 'plot-amaravati-highway',
    userId: 'demo-sample-01',
    title: 'Sample Listing: 45 Cents Commercial Highway Facing Plot',
    state: 'Andhra Pradesh',
    district: 'Guntur / Amaravati Capital Zone',
    surveyNo: 'Sy No. 204/1A (Sample)',
    areaCents: 45.0,
    areaSqYards: 2178.0,
    areaAcres: 0.45,
    priceInr: 9000000, // 90 Lakhs
    sellerName: 'Sample Seller (Demo Plot)',
    lat: 16.5168,
    lng: 80.5284,
    boundaryGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [80.5284, 16.5168],
          [80.5304, 16.5168],
          [80.5304, 16.5158],
          [80.5284, 16.5158],
          [80.5284, 16.5168],
        ],
      ],
    }),
    verified: false,
    verificationStatus: 'unverified',
    isDemo: true,
    photos: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    zoning: 'Commercial / CRDA (Sample)',
    roadWidthFt: 80,
  },
  {
    id: 'plot-shamshabad-orr',
    userId: 'demo-sample-02',
    title: 'Sample Listing: 1.25 Acres Farm Plot near ORR Exit',
    state: 'Telangana',
    district: 'Ranga Reddy / Shamshabad',
    surveyNo: 'Sy No. 89/Part (Sample)',
    areaCents: 125.0,
    areaSqYards: 6050.0,
    areaAcres: 1.25,
    priceInr: 17500000, // 1.75 Cr
    sellerName: 'Sample Seller (Demo Farm)',
    lat: 17.2403,
    lng: 78.4294,
    boundaryGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [78.4294, 17.2403],
          [78.4324, 17.2403],
          [78.4324, 17.2383],
          [78.4294, 17.2383],
          [78.4294, 17.2403],
        ],
      ],
    }),
    verified: false,
    verificationStatus: 'unverified',
    isDemo: true,
    photos: [],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    zoning: 'Agricultural / Green Belt (Sample)',
    roadWidthFt: 40,
  },
  {
    id: 'plot-devanahalli-aeropolis',
    userId: 'demo-sample-03',
    title: 'Sample Listing: 8,000 Sq. Ft Industrial/Warehouse Land',
    state: 'Karnataka',
    district: 'Bengaluru Rural / Devanahalli',
    surveyNo: 'Sy No. 34/2 (Sample)',
    areaCents: 18.36,
    areaSqYards: 888.89,
    areaAcres: 0.1836,
    priceInr: 12000000, // 1.20 Cr
    sellerName: 'Sample Seller (Demo Industrial)',
    lat: 13.2483,
    lng: 77.7126,
    boundaryGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [77.7126, 13.2483],
          [77.7146, 13.2483],
          [77.7146, 13.2468],
          [77.7126, 13.2468],
          [77.7126, 13.2483],
        ],
      ],
    }),
    verified: false,
    verificationStatus: 'unverified',
    isDemo: true,
    photos: [],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    zoning: 'Industrial / KIADB (Sample)',
    roadWidthFt: 60,
  },
];

function getGlobalListings(): MarketListing[] {
  try {
    const raw = localStorage.getItem(GLOBAL_MARKET_KEY);
    if (!raw) {
      localStorage.setItem(GLOBAL_MARKET_KEY, JSON.stringify(SEED_LISTINGS));
      return SEED_LISTINGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: MarketListing) => {
        if (item.photos && item.photos.some((p) => p.includes('unsplash.com'))) {
          return { ...item, photos: [] };
        }
        return item;
      });
    }
    return SEED_LISTINGS;
  } catch {
    return SEED_LISTINGS;
  }
}

function saveGlobalListings(listings: MarketListing[]) {
  try {
    localStorage.setItem(GLOBAL_MARKET_KEY, JSON.stringify(listings));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

export function getUserLocalListings(userId?: string | null): MarketListing[] {
  try {
    const key = getUserMarketStorageKey(userId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserLocalListings(listings: MarketListing[], userId?: string | null) {
  try {
    const key = getUserMarketStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(listings));
  } catch (err) {
    console.warn('User local listings save failed:', err);
  }
}

export async function fetchMarketListings(): Promise<MarketListing[]> {
  const localList = getGlobalListings();

  try {
    const q = query(
      collection(db, 'market_listings'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const firestoreListings: MarketListing[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as MarketListing;
      // Strip any sensitive fields from public display
      const sanitized: MarketListing = {
        id: data.id,
        userId: data.userId,
        title: data.title,
        state: data.state,
        district: data.district,
        surveyNo: data.surveyNo,
        areaCents: data.areaCents,
        areaSqYards: data.areaSqYards,
        areaAcres: data.areaAcres,
        priceInr: data.priceInr,
        sellerName: data.sellerName,
        lat: data.lat,
        lng: data.lng,
        boundaryGeoJson: data.boundaryGeoJson,
        verified: data.verified,
        verificationStatus: data.verificationStatus,
        isDemo: data.isDemo,
        photos: data.photos,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        zoning: data.zoning,
        roadWidthFt: data.roadWidthFt,
      };
      firestoreListings.push(sanitized);
    });

    if (firestoreListings.length === 0) {
      return localList;
    }

    // Merge Firestore with local listings
    const combined = [...firestoreListings];
    for (const l of localList) {
      if (!combined.some(c => c.id === l.id)) {
        combined.push(l);
      }
    }
    saveGlobalListings(combined);
    return combined;
  } catch (error) {
    console.warn('Using local market listings fallback:', error);
    return localList;
  }
}

/**
 * Securely fetches private seller data (phone, email, documents) for a listing.
 * Strict Firestore Security Rules ensure this can only be read by the listing owner or the Super Admin Owner.
 */
export async function fetchPrivateSellerData(listingId: string): Promise<PrivateSellerData | null> {
  try {
    const docRef = doc(db, 'market_seller_data', listingId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PrivateSellerData;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch private seller data (access restricted):', err);
    return null;
  }
}

export async function createMarketListing(
  listing: MarketListing,
  privateData?: Partial<PrivateSellerData>
): Promise<void> {
  const now = new Date().toISOString();

  // Public document: no private phone numbers, documents, or personal emails
  const publicListing: MarketListing = {
    id: listing.id,
    userId: listing.userId,
    title: listing.title,
    state: listing.state,
    district: listing.district,
    surveyNo: listing.surveyNo,
    areaCents: listing.areaCents,
    areaSqYards: listing.areaSqYards,
    areaAcres: listing.areaAcres,
    priceInr: listing.priceInr,
    sellerName: listing.sellerName,
    lat: listing.lat,
    lng: listing.lng,
    boundaryGeoJson: listing.boundaryGeoJson,
    verified: false, // Trust & Safety: new listings are always unverified initially
    verificationStatus: listing.verificationStatus || 'unverified',
    isDemo: false,
    photos: listing.photos || [],
    zoning: listing.zoning,
    roadWidthFt: listing.roadWidthFt,
    createdAt: listing.createdAt || now,
    updatedAt: now,
  };

  // Private document: strictly isolated under /market_seller_data/{listingId}
  const sellerData: PrivateSellerData = {
    listingId: listing.id,
    userId: listing.userId,
    sellerName: listing.sellerName,
    sellerEmail: privateData?.sellerEmail || listing.userEmail || '',
    sellerContact: privateData?.sellerContact || listing.sellerContact || '',
    verificationDocuments: privateData?.verificationDocuments || listing.verificationDocuments || [],
    verificationNotes: privateData?.verificationNotes || listing.verificationNotes || '',
    createdAt: now,
    updatedAt: now,
  };

  // Update local caches
  const globalList = getGlobalListings();
  globalList.unshift(publicListing);
  saveGlobalListings(globalList);

  const userList = getUserLocalListings(listing.userId);
  userList.unshift({
    ...publicListing,
    sellerContact: sellerData.sellerContact,
    userEmail: sellerData.sellerEmail,
    verificationDocuments: sellerData.verificationDocuments,
  });
  saveUserLocalListings(userList, listing.userId);

  // Write to Firestore if authenticated
  if (listing.userId && listing.userId !== 'guest') {
    try {
      // 1. Write public listing to /market_listings
      await setDoc(doc(db, 'market_listings', listing.id), publicListing);

      // 2. Write private seller data to /market_seller_data (protected collection)
      await setDoc(doc(db, 'market_seller_data', listing.id), sellerData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `market_listings/${listing.id}`);
    }
  }
}

export async function updateMarketListingVerification(
  listingId: string,
  verificationStatus: VerificationStatus,
  notes?: string,
  listingOwnerUserId?: string | null,
  reviewer?: { uid: string; email?: string }
): Promise<void> {
  const isApproved = verificationStatus === 'verified' || verificationStatus === 'APPROVED';

  // Security Check: Listing creators cannot approve their own listings
  if (reviewer && listingOwnerUserId && reviewer.uid === listingOwnerUserId) {
    throw new Error('Self-approval prohibited: Listing creators cannot approve their own listings.');
  }

  // 1. Authoritative update in Firestore first
  try {
    const listingRef = doc(db, 'market_listings', listingId);
    await updateDoc(listingRef, {
      verified: isApproved,
      verificationStatus,
      verifiedByUid: reviewer?.uid || null,
      verifiedBy: reviewer?.email || null,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // If notes are supplied, store notes in private seller data
    if (notes) {
      try {
        const sellerDataRef = doc(db, 'market_seller_data', listingId);
        await updateDoc(sellerDataRef, {
          verificationNotes: notes,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Non-blocking if seller data doc was not initialized
      }
    }
  } catch (err: any) {
    console.error('Firestore verification update failed:', err);
    throw new Error(err?.message || 'Verification update failed on authoritative server.');
  }

  // 2. Only on confirmed server response, update client local storage caches
  const globalList = getGlobalListings();
  const idx = globalList.findIndex(l => l.id === listingId);
  if (idx >= 0) {
    globalList[idx] = {
      ...globalList[idx],
      verified: isApproved,
      verificationStatus,
      verifiedByUid: reviewer?.uid,
      verifiedBy: reviewer?.email,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGlobalListings(globalList);
  }

  // Update in user scoped list if applicable
  if (listingOwnerUserId) {
    const userList = getUserLocalListings(listingOwnerUserId);
    const uIdx = userList.findIndex(l => l.id === listingId);
    if (uIdx >= 0) {
      userList[uIdx] = {
        ...userList[uIdx],
        verified: isApproved,
        verificationStatus,
        verificationNotes: notes || userList[uIdx].verificationNotes,
        verifiedByUid: reviewer?.uid,
        verifiedBy: reviewer?.email,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveUserLocalListings(userList, listingOwnerUserId);
    }
  }
}

export async function deleteMarketListing(listingId: string, userId?: string | null): Promise<void> {
  const globalList = getGlobalListings().filter(l => l.id !== listingId);
  saveGlobalListings(globalList);

  if (userId) {
    const userList = getUserLocalListings(userId).filter(l => l.id !== listingId);
    saveUserLocalListings(userList, userId);
  }

  if (userId && userId !== 'guest') {
    try {
      await deleteDoc(doc(db, 'market_listings', listingId));
      try {
        await deleteDoc(doc(db, 'market_seller_data', listingId));
      } catch {}
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `market_listings/${listingId}`);
    }
  }
}

/**
 * Uploads a plot photo to Firebase Storage with an offline base64 fallback.
 */
export async function uploadPlotPhoto(file: File, listingId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `market_photos/${listingId}/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase storage upload failed or offline; converting to base64 data URL:', err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read photo file'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Uploads a verification document (PDF or image) to Firebase Storage with an offline base64 fallback.
 */
export async function uploadPlotDocument(file: File, listingId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `market_documents/${listingId}/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase storage document upload failed or offline; converting to base64 data URL:', err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read document file'));
      reader.readAsDataURL(file);
    });
  }
}
