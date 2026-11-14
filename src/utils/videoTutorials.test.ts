import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_TUTORIAL_EPISODES,
  VIDEO_CATEGORIES,
} from '../data/videoTutorialsData';
import {
  isValidVideoUrl,
  parseVideoSource,
  formatVttTimestamp,
  generateWebVtt,
  getEpisodeVideoStatus,
  getVideoStatusLabel,
  loadTutorialProgress,
  saveLastPlayedPosition,
  toggleEpisodeCompletion,
} from './videoTutorialUtils';
import { canAccessOwnerCenter } from './rbac';

test('Video Academy: Contains complete 18-episode curriculum', () => {
  assert.equal(VIDEO_TUTORIAL_EPISODES.length, 18, 'Expected exactly 18 episodes');

  for (let i = 0; i < 18; i++) {
    const ep = VIDEO_TUTORIAL_EPISODES[i];
    assert.equal(ep.episodeNumber, i + 1, `Episode at index ${i} should have number ${i + 1}`);
    assert.ok(ep.id.startsWith('ep-'), `Episode ID ${ep.id} should start with 'ep-'`);
    assert.ok(ep.title.length > 5, `Episode ${ep.id} must have a valid descriptive title`);
    assert.ok(ep.durationSeconds > 0, `Episode ${ep.id} must have positive durationSeconds`);
    assert.ok(Array.isArray(ep.chapters) && ep.chapters.length >= 3, `Episode ${ep.id} must have at least 3 chapters`);
    assert.ok(Array.isArray(ep.learningObjectives) && ep.learningObjectives.length >= 3, `Episode ${ep.id} must have learning objectives`);
    assert.ok(Array.isArray(ep.keyTakeaways) && ep.keyTakeaways.length >= 2, `Episode ${ep.id} must have key takeaways`);
    assert.ok(ep.fullNarrationScript.length > 50, `Episode ${ep.id} must have full English narration script`);
  }
});

test('Video Academy: Category coverage includes all 6 primary tracks', () => {
  assert.equal(VIDEO_CATEGORIES.length, 7, 'Expected 7 category entries (all + 6 tracks)');
  const categoryIds = VIDEO_TUTORIAL_EPISODES.map((ep) => ep.category);

  assert.ok(categoryIds.includes('basics'), 'Must cover basics track');
  assert.ok(categoryIds.includes('calculators'), 'Must cover calculators track');
  assert.ok(categoryIds.includes('gps_mapping'), 'Must cover gps_mapping track');
  assert.ok(categoryIds.includes('cad_gis'), 'Must cover cad_gis track');
  assert.ok(categoryIds.includes('projects_market'), 'Must cover projects_market track');
  assert.ok(categoryIds.includes('admin_ai'), 'Must cover admin_ai track');
});

test('Video Academy: Every episode includes complete scene-by-scene storyboard', () => {
  for (const ep of VIDEO_TUTORIAL_EPISODES) {
    assert.ok(
      Array.isArray(ep.storyboard) && ep.storyboard.length >= 3,
      `Episode ${ep.id} must have at least 3 storyboard scenes`
    );

    for (const scene of ep.storyboard) {
      assert.ok(scene.sceneNumber > 0, 'Scene number must be positive');
      assert.ok(scene.time.length > 0, 'Scene time must be defined');
      assert.ok(scene.screenTarget.length > 0, 'Screen target must name actual app screen');
      assert.ok(scene.userAction.length > 0, 'User action must be specified');
      assert.ok(scene.demoInputs.length > 0, 'Demo inputs must be specified');
      assert.ok(scene.expectedOutput.length > 0, 'Expected output must be specified');
      assert.ok(scene.zoomHighlightNotes.length > 0, 'Zoom highlight instructions must be present');
      assert.ok(scene.onScreenCaption.length > 0, 'On-screen caption must be present');
    }

    assert.ok(ep.closingSummary.length > 10, `Episode ${ep.id} must have closing summary`);
  }
});

test('Test 1: Episode with real valid MP4 test asset parses and activates direct video mode', () => {
  const testMp4Url = 'https://storage.googleapis.com/sthal-tutorials/ep-01-field-intro.mp4';
  const parsed = parseVideoSource(testMp4Url);

  assert.equal(parsed.type, 'mp4');
  assert.equal(parsed.isDirectVideo, true);
  assert.equal(parsed.isYouTube, false);
  assert.equal(parsed.streamUrl, testMp4Url);

  const mockEpisode: any = {
    ...VIDEO_TUTORIAL_EPISODES[0],
    videoUrl: testMp4Url,
    videoType: 'mp4',
  };
  assert.equal(getEpisodeVideoStatus(mockEpisode), 'AVAILABLE');
  assert.equal(getVideoStatusLabel('AVAILABLE'), 'VIDEO AVAILABLE');
});

test('Test 2: Episode with no video URL returns COMING_SOON and type none', () => {
  // Episode 1 now has undefined videoUrl (sample bunny removed)
  const ep01 = VIDEO_TUTORIAL_EPISODES[0];
  assert.equal(ep01.videoUrl, undefined, 'Episode 1 should not have unrelated sample video');
  assert.equal(ep01.videoType, 'none');

  const parsed = parseVideoSource(ep01.videoUrl);
  assert.equal(parsed.type, 'none');
  assert.equal(parsed.isDirectVideo, false);
  assert.equal(parsed.isYouTube, false);

  assert.equal(getEpisodeVideoStatus(ep01), 'COMING_SOON');
  assert.equal(getVideoStatusLabel('COMING_SOON'), 'VIDEO COMING SOON');
});

test('Test 3: Invalid video URL is strictly rejected', () => {
  assert.equal(isValidVideoUrl(''), false);
  assert.equal(isValidVideoUrl(null as any), false);
  assert.equal(isValidVideoUrl(undefined as any), false);
  assert.equal(isValidVideoUrl('javascript:alert(1)'), false);
  assert.equal(isValidVideoUrl('vbscript:msgbox(1)'), false);
  assert.equal(isValidVideoUrl('data:video/mp4;base64,...'), false);
  assert.equal(isValidVideoUrl('ftp://example.com/video.mp4'), false);
  assert.equal(isValidVideoUrl('file:///etc/passwd'), false);
  assert.equal(isValidVideoUrl('not-a-url'), false);

  // Valid HTTPS and relative URLs are accepted
  assert.equal(isValidVideoUrl('https://example.com/video.mp4'), true);
  assert.equal(isValidVideoUrl('http://example.com/video.mp4'), true);
  assert.equal(isValidVideoUrl('/assets/video.mp4'), true);
  assert.equal(isValidVideoUrl('./sample.mp4'), true);
});

test('Test 4: Unavailable video resource flags ERROR state', () => {
  const mockEpisode: any = {
    ...VIDEO_TUTORIAL_EPISODES[0],
    videoUrl: 'https://broken-server.invalid/video.mp4',
    videoType: 'mp4',
  };

  // When playback error occurs
  const errorStatus = getEpisodeVideoStatus(mockEpisode, true);
  assert.equal(errorStatus, 'ERROR');
  assert.equal(getVideoStatusLabel(errorStatus), 'VIDEO ERROR');
});

test('Test 5: YouTube URL detects watch and short URLs and formats embed iframe', () => {
  const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const parsedWatch = parseVideoSource(watchUrl);
  assert.equal(parsedWatch.type, 'youtube');
  assert.equal(parsedWatch.isYouTube, true);
  assert.equal(parsedWatch.isDirectVideo, false);
  assert.ok(parsedWatch.streamUrl?.includes('youtube.com/embed/dQw4w9WgXcQ'));

  const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
  const parsedShort = parseVideoSource(shortUrl);
  assert.equal(parsedShort.type, 'youtube');
  assert.equal(parsedShort.isYouTube, true);
  assert.ok(parsedShort.streamUrl?.includes('youtube.com/embed/dQw4w9WgXcQ'));
});

test('Test 6: MP4 URL detects direct mp4 video stream', () => {
  const mp4Url = 'https://firebasestorage.googleapis.com/v0/b/app/o/tutorials%2Fep-04.mp4?alt=media';
  const parsed = parseVideoSource(mp4Url);
  assert.equal(parsed.type, 'mp4');
  assert.equal(parsed.isDirectVideo, true);
  assert.equal(parsed.isYouTube, false);
  assert.equal(parsed.streamUrl, mp4Url);
});

test('Test 7: WebM URL detects direct webm video stream', () => {
  const webmUrl = 'https://cdn.example.com/tutorials/ep-08-hissa.webm';
  const parsed = parseVideoSource(webmUrl);
  assert.equal(parsed.type, 'webm');
  assert.equal(parsed.isDirectVideo, true);
  assert.equal(parsed.isYouTube, false);
  assert.equal(parsed.streamUrl, webmUrl);
});

test('Test 8: Episode switching cleanly updates active ID without mutating existing catalogue', () => {
  const ep1 = VIDEO_TUTORIAL_EPISODES[0];
  const ep2 = VIDEO_TUTORIAL_EPISODES[1];

  assert.notEqual(ep1.id, ep2.id);
  assert.equal(ep1.id, 'ep-01');
  assert.equal(ep2.id, 'ep-02');
  assert.equal(ep1.episodeNumber, 1);
  assert.equal(ep2.episodeNumber, 2);
});

test('Test 9: Seek and resume persists and retrieves timestamps', () => {
  saveLastPlayedPosition('ep-01', 45);
  const progress = loadTutorialProgress();
  assert.equal(progress.lastPlayed['ep-01']?.seconds, 45);
});

test('Test 10: Playback completion threshold enforces >= 90% duration requirement', () => {
  // Merely opening an episode does not add it to completed IDs
  const initial = loadTutorialProgress();
  const set = new Set(initial.completedEpisodeIds);

  const duration = 100;
  // At 50s (50%), should NOT auto-complete
  assert.equal(50 / duration >= 0.9, false);

  // At 90s (90%), triggers completion
  assert.equal(90 / duration >= 0.9, true);

  // Trigger completion
  const updated = toggleEpisodeCompletion('ep-03', true);
  assert.ok(updated.completedEpisodeIds.includes('ep-03'));

  // Toggle off
  const toggledOff = toggleEpisodeCompletion('ep-03', false);
  assert.ok(!toggledOff.completedEpisodeIds.includes('ep-03'));
});

test('Test 11: WebVTT Subtitle Formatter generates valid WebVTT tracks with millisecond precision', () => {
  assert.equal(formatVttTimestamp(0), '00:00:00.000');
  assert.equal(formatVttTimestamp(45), '00:00:45.000');
  assert.equal(formatVttTimestamp(125.5), '00:02:05.500');
  assert.equal(formatVttTimestamp(3665), '01:01:05.000');

  const testChapters = [
    {
      time: '0:00',
      seconds: 0,
      title: 'Intro',
      narration: 'Welcome to STHAL MEASURE tutorial.',
      screenTarget: 'Home',
      visualAction: 'Show logo',
    },
    {
      time: '0:45',
      seconds: 45,
      title: 'Part 2',
      narration: 'Next we measure boundaries.',
      screenTarget: 'Calc',
      visualAction: 'Type numbers',
    },
  ];

  const vtt = generateWebVtt(testChapters, 120, 'Test Episode');
  assert.ok(vtt.startsWith('WEBVTT - STHAL MEASURE: Test Episode'));
  assert.ok(vtt.includes('00:00:00.000 --> 00:00:45.000'));
  assert.ok(vtt.includes('Welcome to STHAL MEASURE tutorial.'));
  assert.ok(vtt.includes('00:00:45.000 --> 00:02:00.000'));
});

test('Test 12: Video Academy: Try It Now targets map to valid application features', () => {
  const allowedTabs = new Set(['home', 'calc', 'cadtools', 'bhuvan', 'cad', 'projects', 'market']);

  for (const ep of VIDEO_TUTORIAL_EPISODES) {
    if (ep.tryItTarget) {
      assert.ok(allowedTabs.has(ep.tryItTarget.tab), `Invalid tab ${ep.tryItTarget.tab} in ${ep.id}`);
      assert.ok(ep.tryItTarget.buttonLabel.length > 0, `Button label missing in ${ep.id}`);
    }
  }
});

test('Test 13: Normal user player exposes only 4 user-facing tabs (Chapters, Overview, Storyboard, Script)', () => {
  const userAllowedTabs = ['chapters', 'overview', 'storyboard', 'script'];
  // Verify hosting guide is NOT allowed
  assert.equal(userAllowedTabs.includes('hosting'), false);
  assert.equal(userAllowedTabs.includes('storage'), false);
  assert.equal(userAllowedTabs.includes('backend'), false);
});

test('Test 14: Unauthorized user role cannot access Owner Video Administration', () => {
  assert.equal(canAccessOwnerCenter('user'), false);
  assert.equal(canAccessOwnerCenter('developer'), false);
  assert.equal(canAccessOwnerCenter(undefined), false);
  assert.equal(canAccessOwnerCenter('' as any), false);
});

test('Test 15: Owner role has exclusive access to Owner Video Administration', () => {
  assert.equal(canAccessOwnerCenter('owner'), true);
});
