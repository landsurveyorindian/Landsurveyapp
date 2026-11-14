import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Radio,
  Sun,
  Moon,
  Tv,
  ListFilter,
  CheckCircle2,
  Circle,
  FileText,
  Download,
  AlertCircle,
  Clock,
  Film,
  Subtitles,
  Copy,
  Check,
  FastForward,
  Rewind,
  MonitorPlay,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  VIDEO_TUTORIAL_EPISODES,
  VIDEO_CATEGORIES,
  VideoTutorialEpisode,
  SceneStoryboard,
} from '../../data/videoTutorialsData';
import { NavigateTarget } from '../home/TilesDashboard';
import { useTheme } from '../../context/ThemeContext';
import {
  parseVideoSource,
  loadTutorialProgress,
  saveLastPlayedPosition,
  toggleEpisodeCompletion,
  downloadTranscriptFile,
  getEpisodeVideoStatus,
  getVideoStatusLabel,
  TutorialProgressState,
} from '../../utils/videoTutorialUtils';
import { fetchTutorialVideoOverrides } from '../../services/adminService';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEpisodeId?: string;
  onNavigateToTool?: (target: NavigateTarget) => void;
}

type ActiveTab = 'chapters' | 'overview' | 'storyboard' | 'script';

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({
  isOpen,
  onClose,
  initialEpisodeId = 'ep-01',
  onNavigateToTool,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>(initialEpisodeId);
  const [mobileView, setMobileView] = useState<'player' | 'catalog'>('player');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chapters');

  // Dynamic server-side video overrides (from Owner Video Manager)
  const [serverOverrides, setServerOverrides] = useState<Record<string, any>>({});

  // Real video player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Script & UI helpers
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [resumePromptTime, setResumePromptTime] = useState<number | null>(null);

  // Persistent progress state
  const [progressState, setProgressState] = useState<TutorialProgressState>(() =>
    loadTutorialProgress()
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const vttTrackUrlRef = useRef<string | null>(null);
  const activeEpisodeIdRef = useRef<string>(activeEpisodeId);

  // Keep track of active episode ID in ref to prevent stale events
  useEffect(() => {
    activeEpisodeIdRef.current = activeEpisodeId;
  }, [activeEpisodeId]);

  // Fetch any owner-published video overrides on mount
  useEffect(() => {
    if (isOpen) {
      fetchTutorialVideoOverrides()
        .then((overrides) => {
          if (overrides && Object.keys(overrides).length > 0) {
            setServerOverrides(overrides);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Sync initial episode when modal opens
  useEffect(() => {
    if (initialEpisodeId && isOpen) {
      setActiveEpisodeId(initialEpisodeId);
      setMobileView('player');
    }
  }, [initialEpisodeId, isOpen]);

  // Merge static episode catalog with server overrides
  const episodesList = useMemo(() => {
    return VIDEO_TUTORIAL_EPISODES.map((ep) => {
      const override = serverOverrides[ep.id];
      if (override) {
        return {
          ...ep,
          videoUrl: override.videoUrl !== undefined ? override.videoUrl : ep.videoUrl,
          videoType: override.videoType !== undefined ? override.videoType : ep.videoType,
          posterUrl: override.posterUrl || ep.posterUrl,
          captionsUrl: override.captionsUrl || ep.captionsUrl,
        };
      }
      return ep;
    });
  }, [serverOverrides]);

  // Find active episode object
  const activeEpisode = useMemo(() => {
    return (
      episodesList.find((ep) => ep.id === activeEpisodeId) ||
      episodesList[0]
    );
  }, [episodesList, activeEpisodeId]);

  const parsedSource = useMemo(() => {
    return parseVideoSource(activeEpisode.videoUrl);
  }, [activeEpisode.videoUrl]);

  // Episode video status
  const currentVideoStatus = useMemo(() => {
    return getEpisodeVideoStatus(activeEpisode, hasError);
  }, [activeEpisode, hasError]);

  // Active chapter index based on currentTime
  const activeChapterIndex = useMemo(() => {
    let idx = 0;
    const chapters = activeEpisode.chapters;
    for (let i = 0; i < chapters.length; i++) {
      if (currentTime >= chapters[i].seconds) {
        idx = i;
      }
    }
    return idx;
  }, [activeEpisode.chapters, currentTime]);

  const activeChapter =
    activeEpisode.chapters[activeChapterIndex] || activeEpisode.chapters[0];

  // Filtered episodes list
  const filteredEpisodes = useMemo(() => {
    return episodesList.filter((ep) => {
      const matchCat = selectedCategory === 'all' || ep.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;
      const matchQuery =
        ep.title.toLowerCase().includes(q) ||
        ep.subtitle.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [episodesList, selectedCategory, searchQuery]);

  // Compute completion metrics
  const completedCount = useMemo(() => {
    return progressState.completedEpisodeIds.length;
  }, [progressState.completedEpisodeIds]);

  const completionPercentage = useMemo(() => {
    return Math.round((completedCount / episodesList.length) * 100);
  }, [completedCount, episodesList.length]);

  // Setup WebVTT blob for active episode subtitles
  useEffect(() => {
    if (vttTrackUrlRef.current) {
      URL.revokeObjectURL(vttTrackUrlRef.current);
      vttTrackUrlRef.current = null;
    }

    if (activeEpisode.captionsVtt) {
      try {
        const blob = new Blob([activeEpisode.captionsVtt], {
          type: 'text/vtt;charset=utf-8',
        });
        vttTrackUrlRef.current = URL.createObjectURL(blob);
      } catch (e) {
        console.warn('Failed to construct WebVTT blob track:', e);
      }
    }

    return () => {
      if (vttTrackUrlRef.current) {
        URL.revokeObjectURL(vttTrackUrlRef.current);
        vttTrackUrlRef.current = null;
      }
    };
  }, [activeEpisode]);

  // Handle episode switching: cleanly stop old video and reset playback state
  useEffect(() => {
    // Stop any existing video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setErrorMessage('');

    // Check last saved position for this episode
    const saved = progressState.lastPlayed[activeEpisode.id];
    if (saved && saved.seconds > 10 && saved.seconds < activeEpisode.durationSeconds - 10) {
      setResumePromptTime(saved.seconds);
    } else {
      setResumePromptTime(null);
    }

    // Set initial loading state only if there is a direct video to stream
    if (parsedSource.isDirectVideo && parsedSource.streamUrl) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [activeEpisode.id, parsedSource.isDirectVideo, parsedSource.streamUrl]);

  // Sync playback rate & volume with HTML5 video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [playbackRate, volume, isMuted]);

  // Handle video playback time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (activeEpisodeIdRef.current !== activeEpisode.id) return;

    const sec = videoRef.current.currentTime;
    setCurrentTime(sec);

    // Auto mark as completed only after user has actually watched >= 90% of duration
    if (videoRef.current.duration > 0 && sec / videoRef.current.duration >= 0.9 && sec > 10) {
      if (!progressState.completedEpisodeIds.includes(activeEpisode.id)) {
        const updated = toggleEpisodeCompletion(activeEpisode.id, true);
        setProgressState(updated);
      }
    }

    // Persist position every ~5 seconds
    if (Math.floor(sec) % 5 === 0) {
      saveLastPlayedPosition(activeEpisode.id, sec);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (activeEpisodeIdRef.current !== activeEpisode.id) return;

    setDuration(videoRef.current.duration || activeEpisode.durationSeconds);
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    if (activeEpisodeIdRef.current !== activeEpisode.id) return;

    setIsLoading(false);
    setIsPlaying(false);
    setHasError(true);
    setErrorMessage(
      'Unable to stream tutorial video from the specified host. Please check network connection or verify media URL.'
    );
  };

  const handleRetryPlayback = () => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Playback Control Handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
    }
  }, [isPlaying]);

  const seekTo = (seconds: number) => {
    const maxDur = duration > 0 ? duration : activeEpisode.durationSeconds;
    const target = Math.max(0, Math.min(seconds, maxDur));
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    } else {
      setCurrentTime(target);
    }
    saveLastPlayedPosition(activeEpisode.id, target);
  };

  const handleResumePlayback = () => {
    if (resumePromptTime !== null) {
      seekTo(resumePromptTime);
      setResumePromptTime(null);
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
  };

  const handleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleToggleCompletion = (episodeId: string) => {
    const updated = toggleEpisodeCompletion(episodeId);
    setProgressState(updated);
  };

  const handleNextEpisode = () => {
    const idx = episodesList.findIndex((ep) => ep.id === activeEpisode.id);
    if (idx < episodesList.length - 1) {
      selectEpisode(episodesList[idx + 1]);
    }
  };

  const handlePrevEpisode = () => {
    const idx = episodesList.findIndex((ep) => ep.id === activeEpisode.id);
    if (idx > 0) {
      selectEpisode(episodesList[idx - 1]);
    }
  };

  const selectEpisode = (episode: VideoTutorialEpisode) => {
    setActiveEpisodeId(episode.id);
    setMobileView('player');
  };

  const handleCopyScript = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(activeEpisode.fullNarrationScript);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const handleTryItNow = () => {
    if (!activeEpisode.tryItTarget || !onNavigateToTool) return;
    const target = activeEpisode.tryItTarget;
    onClose();

    if (target.tab === 'home') {
      // modal closes returning user to dashboard
    } else if (target.tab === 'calc') {
      onNavigateToTool({ tab: 'calc', subTab: target.subTab || '4sided' });
    } else if (target.tab === 'bhuvan') {
      onNavigateToTool({ tab: 'bhuvan', initialWalkMode: target.walkMode });
    } else if (target.tab === 'cadtools') {
      onNavigateToTool({ tab: 'cadtools' });
    } else if (target.tab === 'cad') {
      onNavigateToTool({ tab: 'cad' });
    } else if (target.tab === 'projects') {
      onNavigateToTool({ tab: 'projects' });
    } else if (target.tab === 'market') {
      onNavigateToTool({ tab: 'market' });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none animate-fadeIn">
      {/* Container Frame with Full Day/Night Theme Support */}
      <div
        className={`rounded-2xl w-full max-w-7xl h-[94vh] max-h-[960px] flex flex-col shadow-2xl overflow-hidden relative transition-colors duration-200 border ${
          isDark
            ? 'bg-[#071317] border-emerald-900/60 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-300 text-slate-800 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.15)]'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`px-3 sm:px-4 py-2.5 border-b flex items-center justify-between shrink-0 transition-colors duration-200 ${
            isDark ? 'bg-[#0a1b20] border-emerald-950/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-xs shrink-0">
              <div
                className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-[#071317]' : 'bg-white'
                }`}
              >
                <MonitorPlay className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className={`font-extrabold text-xs sm:text-sm tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  STHAL MEASURE <span className="text-emerald-500">VIDEO ACADEMY</span>
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                  18 Episodes Curriculum
                </span>
              </div>
              {/* Progress Summary Ticker */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Progress: {completedCount} of {episodesList.length} Completed ({completionPercentage}%)</span>
                <div className="hidden md:block w-24 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mark Active Episode Completed */}
            <button
              type="button"
              onClick={() => handleToggleCompletion(activeEpisode.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                progressState.completedEpisodeIds.includes(activeEpisode.id)
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Toggle Episode Completed"
            >
              {progressState.completedEpisodeIds.includes(activeEpisode.id) ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {progressState.completedEpisodeIds.includes(activeEpisode.id)
                  ? 'Completed'
                  : 'Mark Done'}
              </span>
            </button>

            {/* Day / Night Mode Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-bold text-xs transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              aria-label="Toggle Day and Night theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span className="hidden md:inline text-amber-300">Day</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" />
                  <span className="hidden md:inline text-slate-700">Night</span>
                </>
              )}
            </button>

            {/* Try It Now in App Button */}
            {activeEpisode.tryItTarget && onNavigateToTool && (
              <button
                type="button"
                onClick={handleTryItNow}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activeEpisode.tryItTarget.buttonLabel}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border-slate-700/60'
                  : 'bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 border-slate-300'
              }`}
              title="Close Academy"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Responsive View Selector Tabs */}
        <div
          className={`lg:hidden flex items-center border-b px-2 py-1.5 shrink-0 gap-2 transition-colors duration-200 ${
            isDark ? 'bg-[#091a1f] border-emerald-950/80' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileView('player')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileView === 'player'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Watch Video Player</span>
            {isPlaying && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileView('catalog')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileView === 'catalog'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>18 Episodes ({filteredEpisodes.length})</span>
          </button>
        </div>

        {/* Main Content Area: Split Player Stage & Sidebar */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Column: Video Player Stage, Controls & Information Tabs */}
          <div
            className={`flex-1 flex flex-col overflow-y-auto lg:overflow-hidden relative ${
              mobileView === 'player' ? 'flex' : 'hidden lg:flex'
            } ${isDark ? 'bg-[#03090c]' : 'bg-slate-900'}`}
          >
            {/* Real Video Player Viewport Container (16:9 Aspect Ratio) */}
            <div
              ref={videoContainerRef}
              className={`relative w-full aspect-video max-h-[55vh] lg:max-h-[62vh] bg-black flex items-center justify-center overflow-hidden group select-none ${
                isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen max-h-none' : ''
              }`}
            >
              {/* CASE 1: REAL DIRECT HTML5 VIDEO (MP4 / WebM) */}
              {parsedSource.isDirectVideo && parsedSource.streamUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={parsedSource.streamUrl}
                    poster={activeEpisode.posterUrl}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onWaiting={() => setIsLoading(true)}
                    onPlaying={() => {
                      setIsLoading(false);
                      setIsPlaying(true);
                    }}
                    onError={handleVideoError}
                    playsInline
                  >
                    {vttTrackUrlRef.current && showCaptions && (
                      <track
                        kind="subtitles"
                        src={vttTrackUrlRef.current}
                        srcLang="en"
                        label="English Captions"
                        default
                      />
                    )}
                  </video>

                  {/* Active Subtitle Overlay */}
                  {showCaptions && activeChapter && (
                    <div className="absolute bottom-14 left-4 right-4 z-20 pointer-events-none text-center">
                      <div className="inline-block bg-black/85 text-white text-xs sm:text-sm font-medium px-4 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm shadow-xl max-w-2xl leading-relaxed">
                        <span className="text-emerald-400 font-bold mr-1">
                          [{activeChapter.title}]:
                        </span>
                        {activeChapter.narration}
                      </div>
                    </div>
                  )}

                  {/* Big Central Play Button Overlay when Paused */}
                  {!isPlaying && !isLoading && !hasError && (
                    <div
                      onClick={togglePlay}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer transition hover:bg-black/30"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-2xl transform transition hover:scale-110 active:scale-95">
                        <Play className="w-7 h-7 fill-current ml-1" />
                      </div>
                      <span className="mt-3 text-xs sm:text-sm font-bold text-white tracking-wide bg-slate-950/80 px-4 py-1 rounded-full border border-emerald-500/40 shadow-lg">
                        Click to Play Episode {activeEpisode.episodeNumber}
                      </span>
                    </div>
                  )}
                </>
              ) : parsedSource.isYouTube && parsedSource.streamUrl ? (
                /* CASE 2: YOUTUBE EMBED PLAYER */
                <iframe
                  src={parsedSource.streamUrl}
                  title={activeEpisode.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                /* CASE 3: NO REAL VIDEO UPLOADED YET — CLEAN PRODUCTION PLACEHOLDER */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#06151a] to-[#020709] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#10b981_0.8px,transparent_0.8px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                  <div className="relative z-10 max-w-md space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                      <Film className="w-7 h-7" />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {getVideoStatusLabel(currentVideoStatus)}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-white mt-2 leading-snug">
                        Tutorial video coming soon. The lesson script and recording guide are available below.
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        The complete verified lesson plan, exact field inputs/outputs, and full voiceover narration script are ready for this episode.
                      </p>
                    </div>

                    {/* Production Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('script')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Read Lesson Script</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('storyboard')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>View Recording Guide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadTranscriptFile(activeEpisode)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download (.txt)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Buffering Loading Spinner */}
              {isLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                  <div className="w-10 h-10 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin" />
                </div>
              )}

              {/* Error Banner if Video Fails to Stream */}
              {hasError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2">
                    {getVideoStatusLabel('ERROR')}
                  </span>
                  <p className="text-xs text-rose-300 max-w-md font-medium leading-relaxed">
                    {errorMessage}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryPlayback}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Loading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('script')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      Read Script Instead
                    </button>
                  </div>
                </div>
              )}

              {/* Resume Prompt Banner */}
              {resumePromptTime !== null && parsedSource.isDirectVideo && (
                <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/60 backdrop-blur-md shadow-2xl text-xs text-white">
                  <span>Resume watching from {formatTime(resumePromptTime)}?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResumePlayback}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumePromptTime(null)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Bar for Direct Video or Episode Switcher for YouTube */}
            {parsedSource.isDirectVideo && parsedSource.streamUrl ? (
              <div
                className={`p-3 border-t shrink-0 space-y-2 transition-colors duration-200 ${
                  isDark
                    ? 'bg-[#081b20] border-emerald-950/80 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                {/* Timeline Progress Bar with Chapter Jump Ticks */}
                <div className="space-y-1">
                  <div
                    className={`relative w-full h-2 rounded-full cursor-pointer overflow-hidden group ${
                      isDark ? 'bg-slate-800' : 'bg-slate-300'
                    }`}
                  >
                    {/* Progress Fill */}
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100 relative"
                      style={{
                        width: `${
                          ((currentTime || 0) / (duration || activeEpisode.durationSeconds)) * 100
                        }%`,
                      }}
                    />
                    {/* Scrubber Input */}
                    <input
                      type="range"
                      min={0}
                      max={duration || activeEpisode.durationSeconds}
                      value={currentTime}
                      onChange={(e) => seekTo(parseFloat(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Seek video timeline"
                    />
                  </div>

                  {/* Time & Chapter Markers */}
                  <div
                    className={`flex justify-between items-center text-[10px] font-mono px-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    <span>{formatTime(currentTime)}</span>
                    <div className="hidden sm:flex items-center gap-2 truncate max-w-[60%]">
                      {activeEpisode.chapters.map((ch, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => seekTo(ch.seconds)}
                          className={`truncate hover:text-emerald-500 transition cursor-pointer text-[10px] ${
                            activeChapterIndex === idx ? 'text-emerald-500 font-bold underline' : ''
                          }`}
                          title={`Jump to ${ch.title} (${ch.time})`}
                        >
                          {ch.title}
                        </button>
                      ))}
                    </div>
                    <span>{formatTime(duration || activeEpisode.durationSeconds)}</span>
                  </div>
                </div>

                {/* Direct Video Control Buttons Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left Controls: Prev, Rewind, Play/Pause, FastForward, Next, Replay */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevEpisode}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title="Previous Episode"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => seekTo(currentTime - 10)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title="Rewind 10 Seconds"
                    >
                      <Rewind className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlay}
                      className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => seekTo(currentTime + 10)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title="Forward 10 Seconds"
                    >
                      <FastForward className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextEpisode}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title="Next Episode"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => seekTo(0)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title="Replay from Start"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-1 ml-1 sm:ml-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isMuted
                            ? 'text-rose-400'
                            : isDark
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-12 sm:w-16 h-1.5 rounded-lg accent-emerald-500 cursor-pointer hidden xs:block"
                        title="Adjust Volume"
                      />
                    </div>
                  </div>

                  {/* Right Controls: Speed Selector, Captions, Fullscreen */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Speed Selector */}
                    <div
                      className={`flex items-center rounded-lg p-0.5 border text-[10px] font-mono ${
                        isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-slate-300'
                      }`}
                    >
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setPlaybackRate(rate)}
                          className={`px-1 sm:px-1.5 py-0.5 rounded transition cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : isDark
                              ? 'text-slate-300 hover:text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    {/* Subtitles / CC Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCaptions(!showCaptions)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        showCaptions
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : isDark
                          ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                      title={showCaptions ? 'Captions Enabled' : 'Enable Captions'}
                    >
                      <Subtitles className="w-3.5 h-3.5" />
                      <span className="text-[10px]">CC</span>
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : parsedSource.isYouTube && parsedSource.streamUrl ? (
              /* YouTube Player Controls Bar */
              <div
                className={`p-2.5 border-t shrink-0 flex items-center justify-between text-xs transition-colors duration-200 ${
                  isDark
                    ? 'bg-[#081b20] border-emerald-950/80 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevEpisode}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-200 border'
                    }`}
                    title="Previous Episode"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-200 border'
                    }`}
                    title="Next Episode"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  YouTube Player — use on-video controls for volume, playback speed, and fullscreen.
                </span>
              </div>
            ) : null}

            {/* Information Tabs Navigation (Strictly User-Facing Tabs Only) */}
            <div
              className={`border-t flex items-center px-3 pt-2 gap-1 overflow-x-auto scrollbar-none transition-colors duration-200 shrink-0 ${
                isDark ? 'border-emerald-950/80 bg-[#07171c]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {[
                { id: 'chapters', label: 'Chapters & Timeline', icon: Clock },
                { id: 'overview', label: 'Overview & Objectives', icon: BookOpen },
                { id: 'storyboard', label: 'Scene Storyboard', icon: Film },
                { id: 'script', label: 'Voiceover Script', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`py-1.5 px-3 rounded-t-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
                      isActive
                        ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                        : isDark
                        ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body Content Area */}
            <div
              className={`flex-1 p-3 sm:p-4 overflow-y-auto transition-colors duration-200 ${
                isDark ? 'bg-[#051114] text-slate-200' : 'bg-white text-slate-800'
              }`}
            >
              {/* TAB 1: CHAPTERS & TIMELINE */}
              {activeTab === 'chapters' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-500">
                        Interactive Episode Chapters ({activeEpisode.chapters.length})
                      </h4>
                      <p className="text-xs text-slate-400">
                        Click any chapter timestamp to immediately seek the video player to that lesson.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {activeEpisode.chapters.map((ch, idx) => {
                      const isCurrent = activeChapterIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => seekTo(ch.seconds)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                            isCurrent
                              ? isDark
                                ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md'
                                : 'bg-emerald-50 border-emerald-500 shadow-sm'
                              : isDark
                              ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 ${
                              isCurrent
                                ? 'bg-emerald-500 text-slate-950'
                                : isDark
                                ? 'bg-slate-800 text-emerald-400'
                                : 'bg-slate-200 text-emerald-700'
                            }`}
                          >
                            {ch.time}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-xs font-bold truncate">{ch.title}</h5>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                {ch.screenTarget}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              "{ch.narration}"
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW & OBJECTIVES */}
              {activeTab === 'overview' && (
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                      EPISODE {activeEpisode.episodeNumber < 10 ? '0' : ''}
                      {activeEpisode.episodeNumber} // {activeEpisode.category.toUpperCase()}
                    </span>
                    <h3 className="text-base sm:text-lg font-black mt-0.5">
                      {activeEpisode.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{activeEpisode.subtitle}</p>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                    {activeEpisode.summary}
                  </p>

                  {/* Target Audience */}
                  <div
                    className={`p-3 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Target Audience:
                    </span>
                    <span className="text-xs font-medium">{activeEpisode.targetAudience}</span>
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                      Learning Objectives
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeEpisode.learningObjectives.map((obj, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                            isDark
                              ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      Key Takeaways
                    </h4>
                    <div className="space-y-1.5">
                      {activeEpisode.keyTakeaways.map((takeaway, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-300 pl-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5" />
                          <span>{takeaway}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SCENE-BY-SCENE STORYBOARD & RECORDING GUIDE */}
              {activeTab === 'storyboard' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-500">
                        Production Recording Guide &amp; Scene Storyboard
                      </h4>
                      <p className="text-xs text-slate-400">
                        Exact verified steps, demo inputs, and expected mathematical outputs for screen recording.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadTranscriptFile(activeEpisode)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Storyboard (.txt)</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {activeEpisode.storyboard && activeEpisode.storyboard.length > 0 ? (
                      activeEpisode.storyboard.map((scene: SceneStoryboard) => (
                        <div
                          key={scene.sceneNumber}
                          className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                            isDark
                              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b pb-1.5 border-emerald-950/60">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px]">
                                SCENE {scene.sceneNumber} [{scene.time}]
                              </span>
                              <span className="font-bold text-white text-xs">
                                {scene.screenTarget}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Zoom: {scene.zoomHighlightNotes}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="font-bold text-slate-400 block">Exact User Action:</span>
                              <span className="text-slate-300">{scene.userAction}</span>
                            </div>

                            <div>
                              <span className="font-bold text-slate-400 block">Demonstration Inputs:</span>
                              <span className="font-mono text-emerald-400">{scene.demoInputs}</span>
                            </div>

                            <div>
                              <span className="font-bold text-slate-400 block">Expected Verified Output:</span>
                              <span className="font-mono text-teal-300">{scene.expectedOutput}</span>
                            </div>

                            <div>
                              <span className="font-bold text-slate-400 block">On-Screen Caption:</span>
                              <span className="italic text-slate-300">"{scene.onScreenCaption}"</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">
                        Storyboard defined in video chapters breakdown.
                      </p>
                    )}
                  </div>

                  {activeEpisode.closingSummary && (
                    <div
                      className={`p-3 rounded-xl border mt-3 text-xs ${
                        isDark
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <span className="font-bold block mb-0.5">Closing Takeaway:</span>
                      <span>{activeEpisode.closingSummary}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COMPLETE ENGLISH NARRATION SCRIPT (TRANSCRIPT) */}
              {activeTab === 'script' && (
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-500">
                        Full English Voiceover Script
                      </h4>
                      <p className="text-xs text-slate-400">
                        Complete verbatim technical narration script for voice artists and AI speech models.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {copiedScript ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedScript ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadTranscriptFile(activeEpisode)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download (.txt)</span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed font-mono whitespace-pre-wrap ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {activeEpisode.fullNarrationScript}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Episode Catalog & Category Filter Drawer */}
          <div
            className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l flex flex-col shrink-0 overflow-hidden transition-colors duration-200 ${
              mobileView === 'catalog' ? 'flex' : 'hidden lg:flex'
            } ${isDark ? 'bg-[#07171c] border-emerald-950/80' : 'bg-slate-50 border-slate-200'}`}
          >
            {/* Search & Filter Header */}
            <div
              className={`p-3 border-b space-y-2 transition-colors duration-200 ${
                isDark ? 'border-emerald-950/80 bg-[#091f26]' : 'border-slate-200 bg-white'
              }`}
            >
              {/* Search Bar */}
              <div className="relative">
                <Search
                  className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search 18 tutorial episodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs transition focus:outline-none focus:border-emerald-500 border ${
                    isDark
                      ? 'bg-[#051418] border-emerald-900/60 text-white placeholder-slate-500'
                      : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {VIDEO_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Episodes List */}
            <div
              className={`flex-1 overflow-y-auto p-2 space-y-1.5 divide-y ${
                isDark ? 'divide-emerald-950/60' : 'divide-slate-200'
              }`}
            >
              {filteredEpisodes.map((ep) => {
                const isCurrent = ep.id === activeEpisode.id;
                const isCompleted = progressState.completedEpisodeIds.includes(ep.id);
                const epStatus = getEpisodeVideoStatus(ep, isCurrent ? hasError : false);

                return (
                  <div
                    key={ep.id}
                    className={`rounded-xl transition overflow-hidden border pt-1.5 first:pt-0 ${
                      isCurrent
                        ? isDark
                          ? 'bg-[#0b2830] border-emerald-500/80 shadow-md'
                          : 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : isDark
                        ? 'bg-[#081a20]/60 border-emerald-950/60 hover:bg-[#0a222a] hover:border-emerald-800/60'
                        : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {/* Episode Card Header */}
                    <div
                      onClick={() => selectEpisode(ep)}
                      className="p-2.5 cursor-pointer flex items-start gap-2.5"
                    >
                      {/* Episode Badge Number & Completion Status */}
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs font-black shrink-0 relative ${
                          isCompleted
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : isCurrent
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : ep.episodeNumber < 10 ? (
                          `0${ep.episodeNumber}`
                        ) : (
                          ep.episodeNumber
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate leading-tight ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {ep.title}
                          </h4>
                          <span
                            className={`text-[10px] font-mono shrink-0 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {ep.duration}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {ep.subtitle}
                        </p>

                        {/* Individual Episode Video Status Badge */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              epStatus === 'AVAILABLE'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : epStatus === 'ERROR'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : isDark
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {getVideoStatusLabel(epStatus)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Episode Details & Action Bar */}
                    {isCurrent && (
                      <div
                        className={`px-3 pb-3 pt-1 border-t space-y-2 text-[11px] ${
                          isDark
                            ? 'border-emerald-900/40 bg-[#071f25]'
                            : 'border-emerald-200 bg-emerald-50/50'
                        }`}
                      >
                        <p
                          className={`text-[10px] leading-relaxed ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {ep.summary}
                        </p>

                        {/* Action Buttons: Try in App & Download Script */}
                        <div
                          className={`pt-2 flex items-center gap-1.5 border-t ${
                            isDark ? 'border-emerald-950/80' : 'border-slate-200'
                          }`}
                        >
                          {ep.tryItTarget && onNavigateToTool && (
                            <button
                              type="button"
                              onClick={handleTryItNow}
                              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{ep.tryItTarget.buttonLabel}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => downloadTranscriptFile(ep)}
                            className={`text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            }`}
                            title="Download complete technical transcript file"
                          >
                            <Download className="w-3 h-3 text-emerald-500" />
                            <span>Script</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
