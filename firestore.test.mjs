import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const r = createRequire('/usr/local/lib/node_modules/@firebase/rules-unit-testing/package.json');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = r('@firebase/rules-unit-testing');
const firebase = r('firebase/compat/app');
r('firebase/compat/firestore');

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const PROJECT_ID = 'refined-period-j3kqt';
const DATABASE_ID = 'ai-studio-73b42930-76b6-43b5-885b-2613a808d850';
let testEnv;

function validProject(uid) {
  return {
    userId: uid,
    name: 'Amaravati Plot #14',
    state: 'Andhra Pradesh',
    parcelType: 'four_sided',
    areaSqm: 202.34,
    areaSqFt: 2178.0,
    areaSqYards: 242.0,
    areaAcres: 0.05,
    areaCents: 5.0,
    perimeterMeters: 58.0,
    notes: 'Surveyed boundary',
    summaryJson: '{}',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

function validListing(uid) {
  return {
    userId: uid,
    title: '6 Cents Corner Plot',
    state: 'Telangana',
    district: 'Rangareddy',
    surveyNo: 'Sy.88/2',
    areaCents: 6.0,
    areaSqYards: 290.4,
    areaAcres: 0.06,
    priceInr: 4200000,
    sellerName: 'Venkat',
    lat: 17.385,
    lng: 78.4867,
    boundaryGeoJson: '',
    photoUri: '',
    verified: false,
    verificationStatus: 'unverified',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: fs.readFileSync('firestore.rules', 'utf8')
    }
  });
});

test.after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test('survey_projects: denies unauthenticated read/write and cross-user access', async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore(DATABASE_ID);
  const aliceDb = testEnv.authenticatedContext('alice').firestore(DATABASE_ID);
  const bobDb = testEnv.authenticatedContext('bob').firestore(DATABASE_ID);

  await assertFails(unauthDb.doc('survey_projects/proj_1').set(validProject('alice')));
  await assertSucceeds(aliceDb.doc('survey_projects/proj_1').set(validProject('alice')));

  await assertFails(unauthDb.doc('survey_projects/proj_1').get());
  await assertFails(bobDb.doc('survey_projects/proj_1').get());
  await assertFails(bobDb.doc('survey_projects/proj_1').update({ name: 'Stolen', updatedAt: serverTimestamp() }));
  await assertFails(bobDb.doc('survey_projects/proj_1').delete());

  await assertSucceeds(aliceDb.collection('survey_projects').where('userId', '==', 'alice').get());
  await assertFails(bobDb.collection('survey_projects').get());
});

test('survey_projects: rejects id field injection and oversized notes', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore(DATABASE_ID);
  await assertFails(aliceDb.doc('survey_projects/proj_bad_id').set({
    ...validProject('alice'),
    id: 'proj_bad_id'
  }));
  await assertFails(aliceDb.doc('survey_projects/proj_long').set({
    ...validProject('alice'),
    notes: 'x'.repeat(1005)
  }));
});

test('market_listings & market_seller_data: blocks self-verification and leaks of private phone', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore(DATABASE_ID);
  const bobDb = testEnv.authenticatedContext('bob').firestore(DATABASE_ID);
  const unauthDb = testEnv.unauthenticatedContext().firestore(DATABASE_ID);

  await assertSucceeds(aliceDb.doc('market_listings/plot_1').set(validListing('alice')));
  await assertSucceeds(aliceDb.doc('market_seller_data/plot_1').set({
    listingId: 'plot_1',
    userId: 'alice',
    sellerName: 'Venkat',
    sellerEmail: 'venkat@example.com',
    sellerPhone: '+919900112233',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await assertSucceeds(unauthDb.doc('market_listings/plot_1').get());
  await assertFails(unauthDb.doc('market_seller_data/plot_1').get());
  await assertFails(bobDb.doc('market_seller_data/plot_1').get());
  await assertSucceeds(aliceDb.doc('market_seller_data/plot_1').get());

  await assertFails(aliceDb.doc('market_listings/plot_1').update({
    verified: true,
    verificationStatus: 'verified',
    updatedAt: serverTimestamp()
  }));
});

test('users & bug_reports: enforces lowest privilege role and initial bug status', async () => {
  const aliceDb = testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true }).firestore(DATABASE_ID);

  await assertFails(aliceDb.doc('users/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
    role: 'owner',
    status: 'active',
    photoUrl: '',
    preferredState: 'Andhra Pradesh',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await assertSucceeds(aliceDb.doc('users/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
    role: 'user',
    status: 'active',
    photoUrl: '',
    preferredState: 'Andhra Pradesh',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await assertSucceeds(aliceDb.doc('bug_reports/bug_1').set({
    userId: 'alice',
    userEmail: 'alice@example.com',
    userName: 'Alice',
    title: 'Unit precision',
    description: 'Check decimal rounding on Guntha',
    module: 'Calculator',
    severity: 'low',
    status: 'new',
    appVersion: '1.0.0',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test('owner controls: manages developer_emails, system_settings feature flags, and developer triage', async () => {
  const ownerDb = testEnv.authenticatedContext('owner_uid', {
    email: 'pavansrirambezawada@gmail.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const devDb = testEnv.authenticatedContext('dev_uid', {
    email: 'dev.engineer@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const userDb = testEnv.authenticatedContext('alice', {
    email: 'alice@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);

  // Non-owner cannot add developer email or change business feature flags
  await assertFails(userDb.doc('developer_emails/dev.engineer@example.com').set({
    email: 'dev.engineer@example.com',
    label: 'Lead Dev',
    active: true,
    addedByUid: 'alice',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertFails(userDb.doc('system_settings/global').set({
    announcementTitle: 'Hijack',
    announcementMessage: '',
    maintenanceMode: false,
    calculatorEnabled: true,
    cadStudioEnabled: true,
    gpsWalkEnabled: true,
    gisImportExportEnabled: true,
    marketplaceEnabled: false,
    aiAdvisorEnabled: true,
    documentScannerEnabled: true,
    academyEnabled: true,
    updatedAt: serverTimestamp()
  }));

  // Owner authorizes developer by email ID and updates feature toggles
  await assertSucceeds(ownerDb.doc('developer_emails/dev.engineer@example.com').set({
    email: 'dev.engineer@example.com',
    label: 'Field GIS Dev',
    active: true,
    addedByUid: 'owner_uid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(ownerDb.doc('system_settings/global').set({
    announcementTitle: 'Survey Drive',
    announcementMessage: 'Kharif survey tools active',
    maintenanceMode: false,
    calculatorEnabled: true,
    cadStudioEnabled: true,
    gpsWalkEnabled: true,
    gisImportExportEnabled: true,
    marketplaceEnabled: false,
    aiAdvisorEnabled: true,
    documentScannerEnabled: true,
    academyEnabled: true,
    updatedAt: serverTimestamp()
  }));

  // Regular user cannot list developer emails or triage bug reports
  await assertFails(userDb.collection('developer_emails').get());
  await assertSucceeds(userDb.doc('bug_reports/bug_2').set({
    userId: 'alice',
    userEmail: 'alice@example.com',
    userName: 'Alice',
    title: 'PDF export check',
    description: 'Check corner labels',
    module: 'CAD Studio',
    severity: 'medium',
    status: 'new',
    appVersion: '1.0.0',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertFails(userDb.doc('bug_reports/bug_2').update({
    status: 'resolved',
    updatedAt: serverTimestamp()
  }));

  // Recognized developer email CAN read allowlist entry and triage bug reports
  await assertSucceeds(devDb.doc('developer_emails/dev.engineer@example.com').get());
  await assertSucceeds(devDb.doc('bug_reports/bug_2').update({
    status: 'investigating',
    updatedAt: serverTimestamp()
  }));
});

test('individual permissions & audit logs: enforces owner-only writes, version increment, and user self-read isolation', async () => {
  const ownerDb = testEnv.authenticatedContext('owner_uid', {
    email: 'pavansrirambezawada@gmail.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const aliceDb = testEnv.authenticatedContext('alice', {
    email: 'alice@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const bobDb = testEnv.authenticatedContext('bob', {
    email: 'bob@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);

  // Regular user cannot create or modify any userFeaturePermissions doc or read others
  await assertFails(aliceDb.doc('userFeaturePermissions/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    username: 'Alice',
    role: 'user',
    permissions: { marketplace: true },
    updatedBy: 'alice',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertFails(aliceDb.collection('userFeaturePermissions').get());

  // Owner creates v1 individual permission doc + audit log
  await assertSucceeds(ownerDb.doc('userFeaturePermissions/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    username: 'Alice',
    role: 'user',
    permissions: { marketplace: false },
    updatedBy: 'owner_uid',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(ownerDb.doc('permissionAuditLogs/log_1').set({
    targetUid: 'alice',
    targetEmail: 'alice@example.com',
    action: 'create',
    changesSummary: 'marketplace=false',
    updatedBy: 'owner_uid',
    updatedByEmail: 'pavansrirambezawada@gmail.com',
    createdAt: serverTimestamp()
  }));

  // Owner updates must increment version by 1; same version fails
  await assertFails(ownerDb.doc('userFeaturePermissions/alice').update({
    permissions: { marketplace: true },
    updatedBy: 'owner_uid',
    version: 1,
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(ownerDb.doc('userFeaturePermissions/alice').update({
    permissions: { marketplace: true },
    updatedBy: 'owner_uid',
    version: 2,
    updatedAt: serverTimestamp()
  }));

  // Alice can read ONLY her own permission doc; Bob cannot read Alice's doc; neither can read audit logs
  await assertSucceeds(aliceDb.doc('userFeaturePermissions/alice').get());
  await assertFails(bobDb.doc('userFeaturePermissions/alice').get());
  await assertFails(aliceDb.collection('permissionAuditLogs').get());
  await assertSucceeds(ownerDb.collection('permissionAuditLogs').get());
});

test('marketplace reports & buyer inquiries: protects seller PII while enabling reports and inquiries', async () => {
  const ownerDb = testEnv.authenticatedContext('owner_uid', {
    email: 'pavansrirambezawada@gmail.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const aliceDb = testEnv.authenticatedContext('alice', {
    email: 'alice@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const bobDb = testEnv.authenticatedContext('bob', {
    email: 'bob@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);

  await assertSucceeds(bobDb.doc('listing_reports/rep_1').set({
    listingId: 'plot_1',
    listingTitle: 'Plot 1',
    reporterUid: 'bob',
    reporterEmail: 'bob@example.com',
    reason: 'Misleading Extent',
    details: 'Boundary check needed',
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertFails(bobDb.collection('listing_reports').get());
  await assertSucceeds(ownerDb.doc('listing_reports/rep_1').update({
    status: 'reviewed',
    updatedAt: serverTimestamp()
  }));

  await assertSucceeds(bobDb.doc('market_inquiries/inq_1').set({
    listingId: 'plot_1',
    listingTitle: 'Plot 1',
    sellerUid: 'alice',
    buyerUid: 'bob',
    buyerName: 'Bob',
    buyerPhone: '+919876543210',
    message: 'Interested in inspection',
    status: 'sent',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(aliceDb.collection('market_inquiries').where('sellerUid', '==', 'alice').get());
  await assertSucceeds(bobDb.collection('market_inquiries').where('buyerUid', '==', 'bob').get());
});

test('backend individual & global permission enforcement: blocks direct API writes when disabled and prevents individual override of global/group locks', async () => {
  const ownerDb = testEnv.authenticatedContext('owner_uid', {
    email: 'pavansrirambezawada@gmail.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const aliceDb = testEnv.authenticatedContext('alice', {
    email: 'alice@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);

  // 1. Disable marketplace and plot_measurement individually for Alice -> direct Firestore writes MUST fail
  await assertSucceeds(ownerDb.doc('userFeaturePermissions/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    username: 'Alice',
    role: 'user',
    permissions: { marketplace: false, plot_measurement: false, video_academy: false },
    updatedBy: 'owner_uid',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await assertFails(aliceDb.doc('market_listings/plot_blocked').set(validListing('alice')));
  await assertFails(aliceDb.doc('survey_projects/proj_blocked').set(validProject('alice')));
  await assertFails(aliceDb.doc('user_video_progress/alice').set({
    uid: 'alice',
    completedEpisodeIds: ['ep-01'],
    updatedAt: serverTimestamp()
  }));

  // Even while plot_measurement is off for Alice, gps_survey remains enabled -> gps_walk write succeeds
  await assertSucceeds(aliceDb.doc('survey_projects/proj_gps_ok').set({
    ...validProject('alice'),
    parcelType: 'gps_walk'
  }));

  // 2. Individual true CANNOT override a Global kill switch false or Role group false
  await assertSucceeds(ownerDb.doc('userFeaturePermissions/alice').update({
    permissions: { marketplace: true, plot_measurement: true, developer_tools: true },
    updatedBy: 'owner_uid',
    version: 2,
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(ownerDb.doc('system_settings/global').set({
    announcementTitle: '',
    announcementMessage: '',
    maintenanceMode: false,
    calculatorEnabled: false,
    cadStudioEnabled: true,
    gpsWalkEnabled: true,
    gisImportExportEnabled: true,
    marketplaceEnabled: true,
    aiAdvisorEnabled: true,
    documentScannerEnabled: true,
    academyEnabled: true,
    userGroupPermissions: { marketplace: false, plot_measurement: true },
    updatedAt: serverTimestamp()
  }));

  // Blocked by global kill switch even though Alice individual permission is true
  await assertFails(aliceDb.doc('survey_projects/proj_global_off').set(validProject('alice')));
  // Blocked by userGroupPermissions.marketplace = false even though Alice individual permission is true
  await assertFails(aliceDb.doc('market_listings/plot_group_off').set(validListing('alice')));
});

test('owner identity security & marketplace anti-tampering: rejects forged users/{uid}.role and blocks cross-seller market_seller_data or developer moderation', async () => {
  const ownerDb = testEnv.authenticatedContext('owner_uid', {
    email: 'pavansrirambezawada@gmail.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const attackerDb = testEnv.authenticatedContext('attacker', {
    email: 'attacker@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const devDb = testEnv.authenticatedContext('dev_uid', {
    email: 'dev.engineer@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);
  const aliceDb = testEnv.authenticatedContext('alice', {
    email: 'alice@example.com',
    email_verified: true
  }).firestore(DATABASE_ID);

  // Even if attacker's users doc claims role: 'owner' in Firestore, Owner checks ignore client-editable profile role
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore(DATABASE_ID);
    await adminDb.doc('users/attacker').set({
      uid: 'attacker',
      email: 'attacker@example.com',
      displayName: 'Fake Owner',
      role: 'owner',
      status: 'active',
      photoUrl: '',
      preferredState: 'Andhra Pradesh',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await assertFails(attackerDb.doc('system_settings/global').set({
    announcementTitle: 'Hijacked',
    announcementMessage: '',
    maintenanceMode: false,
    calculatorEnabled: true,
    cadStudioEnabled: true,
    gpsWalkEnabled: true,
    gisImportExportEnabled: true,
    marketplaceEnabled: true,
    aiAdvisorEnabled: true,
    documentScannerEnabled: true,
    academyEnabled: true,
    updatedAt: serverTimestamp()
  }));
  await assertFails(attackerDb.doc('userFeaturePermissions/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    username: 'Alice',
    role: 'user',
    permissions: { marketplace: false },
    updatedBy: 'attacker',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  // Developer is allowed bug triage (when dev tools active) but CANNOT modify userFeaturePermissions or moderate listing_reports
  await assertSucceeds(ownerDb.doc('developer_emails/dev.engineer@example.com').set({
    email: 'dev.engineer@example.com',
    label: 'Lead Dev',
    active: true,
    addedByUid: 'owner_uid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(aliceDb.doc('market_listings/plot_alice').set(validListing('alice')));
  await assertSucceeds(aliceDb.doc('listing_reports/rep_mod').set({
    listingId: 'plot_alice',
    listingTitle: 'Alice Plot',
    reporterUid: 'alice',
    reporterEmail: 'alice@example.com',
    reason: 'Check boundary',
    details: 'Verify extent',
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));

  await assertFails(devDb.doc('userFeaturePermissions/alice').set({
    uid: 'alice',
    email: 'alice@example.com',
    username: 'Alice',
    role: 'user',
    permissions: { marketplace: false },
    updatedBy: 'dev_uid',
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
  await assertFails(devDb.doc('listing_reports/rep_mod').update({
    status: 'reviewed',
    updatedAt: serverTimestamp()
  }));

  // Attacker cannot create market_seller_data for Alice's listing
  await assertFails(attackerDb.doc('market_seller_data/plot_alice').set({
    listingId: 'plot_alice',
    userId: 'attacker',
    sellerName: 'Spoofed',
    sellerEmail: 'attacker@example.com',
    sellerPhone: '+919999999999',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});



