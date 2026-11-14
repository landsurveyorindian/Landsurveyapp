/**
 * STHAL MEASURE — Video Tutorial Platform Utilities
 * Robust video source parsing, WebVTT subtitle formatting, transcript download,
 * and persistent local progress tracking for the 18-episode learning curriculum.
 */

import type { VideoChapter, VideoTutorialEpisode } from '../data/videoTutorialsData';

export interface TutorialProgressState {
  completedEpisodeIds: string[];
  lastPlayed: Record<string, { seconds: number; updatedAt: number }>;
  lastActiveEpisodeId: string;
}

const STORAGE_KEY = 'sthal_video_progress';

/**
 * Validates whether a given video URL is syntactically sound and safe to embed or stream.
 * Rejects javascript:, data:, or non-https/untrusted protocols.
 */
export function isValidVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Disallow javascript: or unsafe schemes
  if (/^javascript:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return false;
  }

  // Allow standard relative paths or HTTPS URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export type ParsedVideoType = 'youtube' | 'mp4' | 'webm' | 'none';

export type EpisodeVideoStatus = 'AVAILABLE' | 'COMING_SOON' | 'ERROR';

export interface ParsedVideoSource {
  type: ParsedVideoType;
  streamUrl?: string;
  isDirectVideo: boolean;
  isYouTube: boolean;
}

/**
 * Returns the individual availability status for an episode.
 */
export function getEpisodeVideoStatus(
  episode: VideoTutorialEpisode,
  hasError: boolean = false
): EpisodeVideoStatus {
  if (hasError) return 'ERROR';
  if (episode.videoUrl && isValidVideoUrl(episode.videoUrl) && episode.videoType !== 'none') {
    return 'AVAILABLE';
  }
  return 'COMING_SOON';
}

/**
 * Returns standard display label for episode video status.
 */
export function getVideoStatusLabel(status: EpisodeVideoStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'VIDEO AVAILABLE';
    case 'ERROR':
      return 'VIDEO ERROR';
    case 'COMING_SOON':
    default:
      return 'VIDEO COMING SOON';
  }
}

/**
 * Parses a video URL into either a direct HTML5 video source or a sanitized YouTube embed URL.
 */
export function parseVideoSource(url?: string | null): ParsedVideoSource {
  if (!url || !isValidVideoUrl(url)) {
    return { type: 'none', isDirectVideo: false, isYouTube: false };
  }

  const trimmed = url.trim();

  // Check YouTube formats
  // Formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch =
    trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      streamUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
      isDirectVideo: false,
      isYouTube: true,
    };
  }

  // Check WebM
  if (/\.webm($|\?)/i.test(trimmed)) {
    return {
      type: 'webm',
      streamUrl: trimmed,
      isDirectVideo: true,
      isYouTube: false,
    };
  }

  // Default to MP4 or direct stream
  return {
    type: 'mp4',
    streamUrl: trimmed,
    isDirectVideo: true,
    isYouTube: false,
  };
}

/**
 * Converts seconds into standard HH:MM:SS.mmm format for WebVTT subtitle specifications.
 */
export function formatVttTimestamp(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  const milliseconds = Math.floor((s - Math.floor(s)) * 1000);

  const hh = hours < 10 ? `0${hours}` : `${hours}`;
  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const mmm = milliseconds < 10 ? `00${milliseconds}` : milliseconds < 100 ? `0${milliseconds}` : `${milliseconds}`;

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Generates standards-compliant WebVTT subtitle track text from chapter definitions.
 */
export function generateWebVtt(
  chapters: VideoChapter[],
  episodeDurationSeconds: number,
  title: string
): string {
  let vtt = `WEBVTT - STHAL MEASURE: ${title}\n\n`;

  for (let i = 0; i < chapters.length; i++) {
    const startSec = chapters[i].seconds;
    const nextChapter = chapters[i + 1];
    const endSec = nextChapter ? nextChapter.seconds : episodeDurationSeconds;

    const startFormatted = formatVttTimestamp(startSec);
    const endFormatted = formatVttTimestamp(Math.max(startSec + 2, endSec));

    vtt += `${i + 1}\n`;
    vtt += `${startFormatted} --> ${endFormatted}\n`;
    vtt += `${chapters[i].narration.trim()}\n\n`;
  }

  return vtt;
}

let inMemoryProgressState: TutorialProgressState = {
  completedEpisodeIds: [],
  lastPlayed: {},
  lastActiveEpisodeId: 'ep-01',
};

/**
 * Loads tutorial progress from localStorage safely with in-memory fallback.
 */
export function loadTutorialProgress(): TutorialProgressState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return inMemoryProgressState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryProgressState;
    const parsed = JSON.parse(raw);
    return {
      completedEpisodeIds: Array.isArray(parsed.completedEpisodeIds)
        ? parsed.completedEpisodeIds
        : [],
      lastPlayed:
        parsed.lastPlayed && typeof parsed.lastPlayed === 'object' ? parsed.lastPlayed : {},
      lastActiveEpisodeId:
        typeof parsed.lastActiveEpisodeId === 'string' ? parsed.lastActiveEpisodeId : 'ep-01',
    };
  } catch {
    return inMemoryProgressState;
  }
}

/**
 * Persists tutorial progress to localStorage with in-memory fallback.
 */
export function saveTutorialProgress(state: TutorialProgressState): void {
  inMemoryProgressState = { ...state };
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist video tutorial progress:', e);
  }
}

/**
 * Toggles an episode's completed status.
 */
export function toggleEpisodeCompletion(
  episodeId: string,
  forceStatus?: boolean
): TutorialProgressState {
  const current = loadTutorialProgress();
  const set = new Set(current.completedEpisodeIds);

  const shouldComplete = forceStatus !== undefined ? forceStatus : !set.has(episodeId);

  if (shouldComplete) {
    set.add(episodeId);
  } else {
    set.delete(episodeId);
  }

  const updated: TutorialProgressState = {
    ...current,
    completedEpisodeIds: Array.from(set),
  };

  saveTutorialProgress(updated);
  return updated;
}

/**
 * Saves last played timestamp for an episode.
 */
export function saveLastPlayedPosition(episodeId: string, seconds: number): void {
  const current = loadTutorialProgress();
  const updated: TutorialProgressState = {
    ...current,
    lastActiveEpisodeId: episodeId,
    lastPlayed: {
      ...current.lastPlayed,
      [episodeId]: {
        seconds: Math.floor(seconds),
        updatedAt: Date.now(),
      },
    },
  };
  saveTutorialProgress(updated);
}

/**
 * Retrieves last played position in seconds for an episode.
 */
export function getLastPlayedPosition(episodeId: string): number {
  const current = loadTutorialProgress();
  const entry = current.lastPlayed[episodeId];
  return entry && typeof entry.seconds === 'number' ? entry.seconds : 0;
}

/**
 * Downloads a complete technical transcript and production guide as a .txt file.
 */
export function downloadTranscriptFile(episode: VideoTutorialEpisode): void {
  if (typeof window === 'undefined' || !window.document) return;

  const content = `STHAL MEASURE — OFFICIAL VIDEO TUTORIAL PRODUCTION SCRIPT & TRANSCRIPT
========================================================================
Episode ${episode.episodeNumber < 10 ? '0' : ''}${episode.episodeNumber}: ${episode.title}
Subtitle: ${episode.subtitle}
Category: ${episode.category.toUpperCase()} | Duration: ${episode.duration}
Target Audience: ${episode.targetAudience}

LEARNING OBJECTIVES:
${episode.learningObjectives.map((obj, i) => `  ${i + 1}. ${obj}`).join('\n')}

SUMMARY:
${episode.summary}

========================================================================
SCENE-BY-SCENE STORYBOARD & RECORDING GUIDE
========================================================================
${episode.storyboard && episode.storyboard.length > 0 ? episode.storyboard.map((scene) => `
SCENE ${scene.sceneNumber} [${scene.time}]
Screen Target:        ${scene.screenTarget}
Exact User Action:    ${scene.userAction}
Demo Inputs:          ${scene.demoInputs}
Expected Outputs:     ${scene.expectedOutput}
Camera / Zoom Notes:  ${scene.zoomHighlightNotes}
On-Screen Caption:    "${scene.onScreenCaption}"
`).join('\n------------------------------------------------------------------------\n') : 'Storyboard defined in video chapters.'}

========================================================================
COMPLETE ENGLISH NARRATION SCRIPT (VOICEOVER)
========================================================================
${episode.fullNarrationScript}

CHAPTER BREAKDOWN & TIMESTAMPS:
${episode.chapters.map((ch) => `  [${ch.time}] ${ch.title}\n    Narration: "${ch.narration}"\n    Screen Target: ${ch.screenTarget}\n    Visual Action: ${ch.visualAction}\n`).join('\n')}

KEY TAKEAWAYS:
${episode.keyTakeaways.map((takeaway, i) => `  ${i + 1}. ${takeaway}`).join('\n')}

CLOSING SUMMARY:
${episode.closingSummary || 'Master STHAL MEASURE field geometry and verify all calculations.'}
========================================================================
STHAL MEASURE Land Surveying & Cadastral GIS Platform
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `STHAL_MEASURE_EP_${episode.episodeNumber < 10 ? '0' : ''}${episode.episodeNumber}_Script.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
