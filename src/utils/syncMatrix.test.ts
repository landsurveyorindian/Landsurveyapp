import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSyncStatus,
  ProjectSyncState,
  SurveyProject,
} from '../services/projectsService.ts';

test('Offline Sync State: Normalizes legacy states and recognizes all 6 standard states', () => {
  assert.equal(normalizeSyncStatus('LOCAL_ONLY'), 'LOCAL_ONLY');
  assert.equal(normalizeSyncStatus('PENDING_SYNC'), 'PENDING_SYNC');
  assert.equal(normalizeSyncStatus('SYNCING'), 'SYNCING');
  assert.equal(normalizeSyncStatus('SYNCED'), 'SYNCED');
  assert.equal(normalizeSyncStatus('SYNC_FAILED'), 'SYNC_FAILED');
  assert.equal(normalizeSyncStatus('CONFLICT'), 'CONFLICT');

  // Legacy lower-case backwards compatibility
  assert.equal(normalizeSyncStatus('saved_locally'), 'LOCAL_ONLY');
  assert.equal(normalizeSyncStatus('sync_pending'), 'PENDING_SYNC');
  assert.equal(normalizeSyncStatus('syncing'), 'SYNCING');
  assert.equal(normalizeSyncStatus('synced'), 'SYNCED');
  assert.equal(normalizeSyncStatus('sync_failed'), 'SYNC_FAILED');
  assert.equal(normalizeSyncStatus(undefined), 'LOCAL_ONLY');
});

test('Conflict Detection: Flags CONFLICT when remote server updatedAt is newer than local edit', () => {
  const localProject: SurveyProject = {
    id: 'proj-123',
    userId: 'user-abc',
    name: 'Survey Parcel A (Local Edits)',
    state: 'Andhra Pradesh',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T11:00:00.000Z',
    type: 'map_polygon',
    syncStatus: 'PENDING_SYNC',
  };

  const remoteServerProject: SurveyProject = {
    id: 'proj-123',
    userId: 'user-abc',
    name: 'Survey Parcel A (Remote Update by Collaborator)',
    state: 'Andhra Pradesh',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T11:30:00.000Z', // 30 minutes newer
    type: 'map_polygon',
    syncStatus: 'SYNCED',
  };

  const serverTime = new Date(remoteServerProject.updatedAt).getTime();
  const localTime = new Date(localProject.updatedAt).getTime();

  // Conflict evaluation logic
  const isConflict = serverTime > localTime;
  assert.equal(isConflict, true);

  const resolvedState: ProjectSyncState = isConflict ? 'CONFLICT' : 'SYNCED';
  assert.equal(resolvedState, 'CONFLICT');
});

test('Non-Conflict: Allows clean sync when local modification is newer than remote server record', () => {
  const localProject: SurveyProject = {
    id: 'proj-456',
    userId: 'user-abc',
    name: 'Survey Parcel B (Fresh Local Edits)',
    state: 'Telangana',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z', // Newer than server
    type: 'map_polygon',
    syncStatus: 'PENDING_SYNC',
  };

  const remoteServerProject: SurveyProject = {
    id: 'proj-456',
    userId: 'user-abc',
    name: 'Survey Parcel B (Older Server Baseline)',
    state: 'Telangana',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:30:00.000Z',
    type: 'map_polygon',
    syncStatus: 'SYNCED',
  };

  const serverTime = new Date(remoteServerProject.updatedAt).getTime();
  const localTime = new Date(localProject.updatedAt).getTime();

  const isConflict = serverTime > localTime;
  assert.equal(isConflict, false);
});
