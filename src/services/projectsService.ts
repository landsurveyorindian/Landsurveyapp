import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';

export type ProjectSyncState =
  | 'LOCAL_ONLY'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'SYNC_FAILED'
  | 'CONFLICT';

export interface SurveyProject {
  id: string;
  userId: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  type: 'triangulation' | 'traverse' | 'map_polygon' | 'cad_import';
  syncStatus?: ProjectSyncState;
  version?: number;
  notes?: string;
  calculations?: any;
  traverse?: any;
  polygon?: {
    coordinates: [number, number][];
    areaSqm: number;
    areaCents: number;
    areaAcres: number;
    edgeLengths?: { index: number; lengthMeters: number; lengthFeet: number }[];
  };
}

export function normalizeSyncStatus(status?: string): ProjectSyncState {
  if (!status) return 'LOCAL_ONLY';
  switch (status) {
    case 'synced':
    case 'SYNCED':
      return 'SYNCED';
    case 'sync_pending':
    case 'PENDING_SYNC':
      return 'PENDING_SYNC';
    case 'syncing':
    case 'SYNCING':
      return 'SYNCING';
    case 'sync_failed':
    case 'SYNC_FAILED':
      return 'SYNC_FAILED';
    case 'conflict':
    case 'CONFLICT':
      return 'CONFLICT';
    case 'saved_locally':
    case 'LOCAL_ONLY':
    default:
      return 'LOCAL_ONLY';
  }
}

function getProjectsStorageKey(userId?: string | null): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest';
  return `sthal_measure_projects_${uid}`;
}

export function getLocalProjects(userId?: string | null): SurveyProject[] {
  try {
    const key = getProjectsStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw && (!userId || userId === 'guest')) {
      const legacy = localStorage.getItem('sthal_measure_projects');
      if (legacy) {
        localStorage.setItem(key, legacy);
        const parsed = JSON.parse(legacy);
        return Array.isArray(parsed) ? parsed.map(p => ({ ...p, syncStatus: normalizeSyncStatus(p.syncStatus) })) : [];
      }
    }
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(p => ({ ...p, syncStatus: normalizeSyncStatus(p.syncStatus) })) : [];
  } catch {
    return [];
  }
}

export function saveLocalProjects(projects: SurveyProject[], userId?: string | null) {
  try {
    const key = getProjectsStorageKey(userId);
    const normalized = projects.map(p => ({
      ...p,
      syncStatus: normalizeSyncStatus(p.syncStatus),
    }));
    localStorage.setItem(key, JSON.stringify(normalized));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

// Sample initial project for instant demo exploration (for guest users only)
// All measurements mathematically match WGS84 geodesic coordinates
export const SAMPLE_PROJECT: SurveyProject = {
  id: 'proj-demo-amaravati',
  userId: 'guest',
  name: 'Survey No. 142/3 - Amaravati Capital Region (Demo)',
  state: 'Andhra Pradesh',
  type: 'map_polygon',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  syncStatus: 'LOCAL_ONLY',
  version: 1,
  notes: 'Illustrative demo parcel for exploration only. Not an actual surveyed property or legal title record. All measurements are dynamically computed from geodesic coordinates.',
  polygon: {
    coordinates: [
      [80.52800, 16.51800],
      [80.52903, 16.51800],
      [80.52903, 16.51700],
      [80.52800, 16.51700],
      [80.52800, 16.51800],
    ],
    areaSqm: 12209.73,
    areaCents: 301.71,
    areaAcres: 3.0171,
    edgeLengths: [
      { index: 1, lengthMeters: 109.80, lengthFeet: 360.25 },
      { index: 2, lengthMeters: 111.20, lengthFeet: 364.81 },
      { index: 3, lengthMeters: 109.80, lengthFeet: 360.25 },
      { index: 4, lengthMeters: 111.20, lengthFeet: 364.81 },
    ],
  },
};

export async function fetchUserProjects(userId?: string | null): Promise<SurveyProject[]> {
  const localList = getLocalProjects(userId);
  if (localList.length === 0 && (!userId || userId === 'guest')) {
    saveLocalProjects([SAMPLE_PROJECT], 'guest');
  }

  // If not signed in or guest, return local projects scoped to guest
  if (!userId || userId === 'guest') {
    return getLocalProjects('guest');
  }

  try {
    const q = query(
      collection(db, 'survey_projects'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    const firestoreProjects: SurveyProject[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as SurveyProject;
      firestoreProjects.push({
        ...data,
        syncStatus: 'SYNCED',
      });
    });

    // Merge with any cached offline projects for this specific user
    const combined = [...firestoreProjects];
    const local = getLocalProjects(userId);
    for (const p of local) {
      const existingIdx = combined.findIndex(c => c.id === p.id);
      if (existingIdx === -1) {
        combined.push(p);
      } else {
        // If local has un-synced edits, preserve local status unless remote is newer
        const remoteTime = new Date(combined[existingIdx].updatedAt).getTime();
        const localTime = new Date(p.updatedAt).getTime();
        if (p.syncStatus === 'PENDING_SYNC' || p.syncStatus === 'CONFLICT') {
          if (remoteTime > localTime) {
            combined[existingIdx].syncStatus = 'CONFLICT';
          } else {
            combined[existingIdx] = p;
          }
        }
      }
    }
    // Update local cache for this account
    saveLocalProjects(combined, userId);
    return combined;
  } catch (error) {
    console.warn('Failed to fetch from Firestore, falling back to account local storage:', error);
    return getLocalProjects(userId);
  }
}

function getOfflineQueueKey(userId?: string | null): string {
  const uid = userId && userId.trim() ? userId.trim() : 'guest';
  return `sthal_offline_queue_${uid}`;
}

export function getOfflineQueue(userId?: string | null): SurveyProject[] {
  try {
    const raw = localStorage.getItem(getOfflineQueueKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(p => ({ ...p, syncStatus: normalizeSyncStatus(p.syncStatus) })) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: SurveyProject[], userId?: string | null) {
  try {
    const normalized = queue.map(p => ({
      ...p,
      syncStatus: normalizeSyncStatus(p.syncStatus),
    }));
    localStorage.setItem(getOfflineQueueKey(userId), JSON.stringify(normalized));
  } catch (err) {
    console.warn('Failed to save offline queue:', err);
  }
}

export function getPendingOfflineCount(userId?: string | null): number {
  if (!userId || userId === 'guest') return 0;
  return getOfflineQueue(userId).length;
}

// In-flight sync lock to prevent duplicate retries and race conditions
let isSyncInProgress = false;

export async function syncOfflineProjects(userId?: string | null): Promise<number> {
  if (!userId || userId === 'guest' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }
  if (isSyncInProgress) {
    return 0; // Prevent duplicate concurrent sync runs
  }

  isSyncInProgress = true;
  try {
    const queue = getOfflineQueue(userId);
    if (queue.length === 0) return 0;

    let synced = 0;
    const remaining: SurveyProject[] = [];

    for (const project of queue) {
      try {
        // 1. Conflict detection before writing: check server version
        const docRef = doc(db, 'survey_projects', project.id);
        const serverSnap = await getDoc(docRef);

        if (serverSnap.exists()) {
          const serverData = serverSnap.data() as SurveyProject;
          const serverTime = new Date(serverData.updatedAt).getTime();
          const localTime = new Date(project.updatedAt).getTime();

          // Server data is newer and content differs: flag CONFLICT, do NOT silently overwrite!
          if (serverTime > localTime) {
            const conflictProject: SurveyProject = {
              ...project,
              syncStatus: 'CONFLICT',
            };
            // Update in local projects
            const localProjects = getLocalProjects(userId);
            const pIdx = localProjects.findIndex(p => p.id === project.id);
            if (pIdx >= 0) {
              localProjects[pIdx] = conflictProject;
              saveLocalProjects(localProjects, userId);
            }
            continue; // Do not overwrite newer server data
          }
        }

        // 2. Perform write
        const syncedProject: SurveyProject = {
          ...project,
          syncStatus: 'SYNCED',
          version: (project.version || 1) + 1,
        };
        await setDoc(docRef, syncedProject);
        synced++;

        // Update local store with SYNCED status
        const localProjects = getLocalProjects(userId);
        const pIdx = localProjects.findIndex(p => p.id === project.id);
        if (pIdx >= 0) {
          localProjects[pIdx] = syncedProject;
          saveLocalProjects(localProjects, userId);
        }
      } catch (err) {
        console.warn(`Failed to sync queued project ${project.id}:`, err);
        remaining.push({
          ...project,
          syncStatus: 'SYNC_FAILED',
        });
      }
    }

    saveOfflineQueue(remaining, userId);
    return synced;
  } finally {
    isSyncInProgress = false;
  }
}

// Auto-register online sync listener in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sthal_offline_queue_')) {
          const uid = key.replace('sthal_offline_queue_', '');
          if (uid && uid !== 'guest') {
            syncOfflineProjects(uid).catch(() => {});
          }
        }
      }
    } catch {}
  });
}

export async function saveProject(project: SurveyProject): Promise<void> {
  const uid = project.userId || 'guest';
  let projectToSave: SurveyProject = {
    ...project,
    syncStatus: uid === 'guest' ? 'LOCAL_ONLY' : 'PENDING_SYNC',
    version: (project.version || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  // Always update account-scoped local storage first
  const current = getLocalProjects(uid);
  const index = current.findIndex(p => p.id === projectToSave.id);
  if (index >= 0) {
    current[index] = projectToSave;
  } else {
    current.unshift(projectToSave);
  }
  saveLocalProjects(current, uid);

  // If authenticated user, save to Firestore or queue if offline
  if (uid !== 'guest') {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      projectToSave.syncStatus = 'PENDING_SYNC';
      const queue = getOfflineQueue(uid);
      const qIdx = queue.findIndex(p => p.id === projectToSave.id);
      if (qIdx >= 0) {
        queue[qIdx] = projectToSave;
      } else {
        queue.push(projectToSave);
      }
      saveOfflineQueue(queue, uid);
      return;
    }

    const path = `survey_projects/${projectToSave.id}`;
    try {
      // Conflict detection: verify server updatedAt if doc already exists
      const docRef = doc(db, 'survey_projects', projectToSave.id);
      const serverSnap = await getDoc(docRef);

      if (serverSnap.exists()) {
        const serverData = serverSnap.data() as SurveyProject;
        const serverTime = new Date(serverData.updatedAt).getTime();
        const localTime = new Date(project.updatedAt).getTime();

        // If server is strictly newer, do NOT silently overwrite
        if (serverTime > localTime) {
          projectToSave.syncStatus = 'CONFLICT';
          const localList = getLocalProjects(uid);
          const cIdx = localList.findIndex(p => p.id === projectToSave.id);
          if (cIdx >= 0) {
            localList[cIdx] = projectToSave;
            saveLocalProjects(localList, uid);
          }
          throw new Error('Sync conflict detected: Remote version has newer modifications.');
        }
      }

      projectToSave.syncStatus = 'SYNCED';
      await setDoc(docRef, projectToSave);

      // Update local copy with SYNCED status
      const updatedLocal = getLocalProjects(uid);
      const uIdx = updatedLocal.findIndex(p => p.id === projectToSave.id);
      if (uIdx >= 0) {
        updatedLocal[uIdx] = projectToSave;
        saveLocalProjects(updatedLocal, uid);
      }
    } catch (error: any) {
      console.warn('Network issue or conflict saving project to Firestore:', error?.message || error);
      if (projectToSave.syncStatus !== 'CONFLICT') {
        projectToSave.syncStatus = 'SYNC_FAILED';
        const queue = getOfflineQueue(uid);
        if (!queue.some(p => p.id === projectToSave.id)) {
          queue.push(projectToSave);
          saveOfflineQueue(queue, uid);
        }
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function resolveProjectConflict(
  projectId: string,
  resolution: 'keep_local' | 'take_remote',
  userId: string
): Promise<SurveyProject | null> {
  if (!userId || userId === 'guest') return null;

  const docRef = doc(db, 'survey_projects', projectId);
  if (resolution === 'take_remote') {
    const serverSnap = await getDoc(docRef);
    if (serverSnap.exists()) {
      const serverData = {
        ...(serverSnap.data() as SurveyProject),
        syncStatus: 'SYNCED' as ProjectSyncState,
      };
      const local = getLocalProjects(userId);
      const idx = local.findIndex(p => p.id === projectId);
      if (idx >= 0) local[idx] = serverData;
      else local.unshift(serverData);
      saveLocalProjects(local, userId);
      return serverData;
    }
    return null;
  } else {
    // Force write local version with bumped updatedAt
    const local = getLocalProjects(userId);
    const localProj = local.find(p => p.id === projectId);
    if (!localProj) return null;

    const forced: SurveyProject = {
      ...localProj,
      updatedAt: new Date().toISOString(),
      syncStatus: 'SYNCED',
      version: (localProj.version || 1) + 1,
    };
    await setDoc(docRef, forced);
    const idx = local.findIndex(p => p.id === projectId);
    if (idx >= 0) local[idx] = forced;
    saveLocalProjects(local, userId);
    return forced;
  }
}

export async function migrateGuestProjectsToUser(userId: string): Promise<number> {
  if (!userId || userId === 'guest') return 0;
  const guestProjects = getLocalProjects('guest');
  if (guestProjects.length === 0) return 0;

  let migratedCount = 0;
  for (const proj of guestProjects) {
    if (proj.id === 'proj-demo-amaravati') continue; // Don't migrate demo sample
    const userProject: SurveyProject = {
      ...proj,
      userId,
      syncStatus: 'PENDING_SYNC',
      updatedAt: new Date().toISOString(),
    };
    await saveProject(userProject);
    migratedCount++;
  }

  // Clear migrated guest items
  saveLocalProjects([SAMPLE_PROJECT], 'guest');
  return migratedCount;
}

export async function removeProject(projectId: string, userId?: string | null): Promise<void> {
  const uid = userId || 'guest';
  const current = getLocalProjects(uid).filter(p => p.id !== projectId);
  saveLocalProjects(current, uid);

  // Also remove from offline queue if present
  const queue = getOfflineQueue(uid).filter(p => p.id !== projectId);
  saveOfflineQueue(queue, uid);

  if (userId && userId !== 'guest') {
    const path = `survey_projects/${projectId}`;
    try {
      await deleteDoc(doc(db, 'survey_projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}
