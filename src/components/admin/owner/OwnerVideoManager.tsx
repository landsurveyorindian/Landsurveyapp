import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  VIDEO_TUTORIAL_EPISODES,
  VIDEO_CATEGORIES,
  VideoTutorialEpisode,
} from '../../../data/videoTutorialsData';
import {
  isValidVideoUrl,
  parseVideoSource,
  getEpisodeVideoStatus,
  getVideoStatusLabel,
} from '../../../utils/videoTutorialUtils';
import {
  fetchTutorialVideoOverrides,
  updateTutorialVideoConfig,
} from '../../../services/adminService';
import { AppUserRole } from '../../../types/auth';

interface OwnerVideoManagerProps {
  actor: {
    uid: string;
    email: string;
    role: AppUserRole;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const OwnerVideoManager: React.FC<OwnerVideoManagerProps> = ({
  actor,
  showToast,
}) => {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('ep-01');
  const [serverOverrides, setServerOverrides] = useState<Record<string, any>>({});
  const [isLoadingOverrides, setIsLoadingOverrides] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Editor form state for selected episode
  const [formVideoUrl, setFormVideoUrl] = useState<string>('');
  const [formVideoType, setFormVideoType] = useState<'mp4' | 'webm' | 'youtube' | 'none'>('none');
  const [formPosterUrl, setFormPosterUrl] = useState<string>('');
  const [formCaptionsUrl, setFormCaptionsUrl] = useState<string>('');
  const [formIsPublished, setFormIsPublished] = useState<boolean>(true);

  // Preview player state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load server-side tutorial overrides on mount
  const loadOverrides = async () => {
    setIsLoadingOverrides(true);
    try {
      const data = await fetchTutorialVideoOverrides();
      if (data) {
        setServerOverrides(data);
      }
    } catch (e: any) {
      console.warn('Failed to load tutorial overrides:', e);
    } finally {
      setIsLoadingOverrides(false);
    }
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  // Merged episodes with server overrides
  const effectiveEpisodes = useMemo(() => {
    return VIDEO_TUTORIAL_EPISODES.map((ep) => {
      const override = serverOverrides[ep.id];
      if (override) {
        return {
          ...ep,
          videoUrl: override.videoUrl !== undefined ? override.videoUrl : ep.videoUrl,
          videoType: override.videoType !== undefined ? override.videoType : ep.videoType,
          posterUrl: override.posterUrl || ep.posterUrl,
          captionsUrl: override.captionsUrl || ep.captionsUrl,
          isPublished: override.isPublished !== undefined ? override.isPublished : true,
        };
      }
      return {
        ...ep,
        isPublished: true,
      };
    });
  }, [serverOverrides]);

  const selectedEpisode = useMemo(() => {
    return (
      effectiveEpisodes.find((ep) => ep.id === selectedEpisodeId) ||
      effectiveEpisodes[0]
    );
  }, [effectiveEpisodes, selectedEpisodeId]);

  // Sync editor form when selected episode changes
  useEffect(() => {
    setFormVideoUrl(selectedEpisode.videoUrl || '');
    setFormVideoType(selectedEpisode.videoType || 'none');
    setFormPosterUrl(selectedEpisode.posterUrl || '');
    setFormCaptionsUrl(selectedEpisode.captionsUrl || '');
    setFormIsPublished(selectedEpisode.isPublished !== false);
    setIsPreviewPlaying(false);
    setPreviewError(null);
  }, [selectedEpisode]);

  const previewSource = useMemo(() => {
    return parseVideoSource(formVideoUrl);
  }, [formVideoUrl]);

  // Handle Save
  const handleSaveEpisodeConfig = async () => {
    if (formVideoUrl && !isValidVideoUrl(formVideoUrl)) {
      showToast('error', 'Invalid video URL. Must use HTTPS, HTTP, or a valid relative URL.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTutorialVideoConfig(
        {
          episodeId: selectedEpisode.id,
          videoUrl: formVideoUrl.trim() || undefined,
          videoType: formVideoType,
          posterUrl: formPosterUrl.trim() || undefined,
          captionsUrl: formCaptionsUrl.trim() || undefined,
          isPublished: formIsPublished,
        },
        actor
      );

      if (res.ok) {
        showToast('success', res.message);
        await loadOverrides();
      } else {
        showToast('error', res.message);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearVideo = () => {
    setFormVideoUrl('');
    setFormVideoType('none');
    setPreviewError(null);
  };

  const filteredEpisodes = useMemo(() => {
    return effectiveEpisodes.filter((ep) => {
      const matchCat = categoryFilter === 'all' || ep.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;
      return (
        matchCat &&
        (ep.title.toLowerCase().includes(q) ||
          ep.subtitle.toLowerCase().includes(q) ||
          ep.id.toLowerCase().includes(q))
      );
    });
  }, [effectiveEpisodes, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-900/50 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Video Academy Administration &amp; Stream Vault
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
                Owner Role Required
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely assign verified tutorial streams, configure poster artwork, toggle publication, and review streaming health.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOverrides}
          disabled={isLoadingOverrides}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverrides ? 'animate-spin' : ''}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Main Split Grid: Episode Selector vs Editor & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 18 Episodes Table / Selector (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 flex flex-col max-h-[780px]">
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>18 Episodes Master Roster</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {filteredEpisodes.length} Episodes
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search episodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
              {VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Episode List Items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredEpisodes.map((ep) => {
              const isSelected = ep.id === selectedEpisode.id;
              const status = getEpisodeVideoStatus(ep);

              return (
                <div
                  key={ep.id}
                  onClick={() => setSelectedEpisodeId(ep.id)}
                  className={`p-2.5 rounded-xl transition cursor-pointer border pt-2 first:pt-2 flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-xs truncate text-slate-900 dark:text-white">
                        {ep.title}
                      </h5>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {ep.duration}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                            : status === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {getVideoStatusLabel(status)}
                      </span>

                      {ep.isPublished === false && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          UNPUBLISHED
                        </span>
                      )}

                      {ep.videoType && ep.videoType !== 'none' && (
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          [{ep.videoType}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Episode Video Configuration & Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0b1e28] border border-slate-200 dark:border-slate-800/80 p-5 space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                  EDITING EPISODE {selectedEpisode.episodeNumber < 10 ? '0' : ''}
                  {selectedEpisode.episodeNumber}
                </span>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                  {selectedEpisode.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedEpisode.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Remove video URL for this episode"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unlink Video</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEpisodeConfig}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
                </button>
              </div>
            </div>

            {/* Video Configuration Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Video Stream URL (Direct MP4, WebM, or YouTube link):
                </label>
                <input
                  type="url"
                  placeholder="https://firebasestorage.googleapis.com/.../ep-01.mp4 or https://youtube.com/watch?v=..."
                  value={formVideoUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormVideoUrl(url);
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                      setFormVideoType('youtube');
                    } else if (url.endsWith('.webm')) {
                      setFormVideoType('webm');
                    } else if (url.trim()) {
                      setFormVideoType('mp4');
                    } else {
                      setFormVideoType('none');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Leave blank to set this episode to <strong>VIDEO COMING SOON</strong> with the recording guide displayed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Stream Type:
                  </label>
                  <select
                    value={formVideoType}
                    onChange={(e) =>
                      setFormVideoType(e.target.value as 'mp4' | 'webm' | 'youtube' | 'none')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none">None (Coming Soon)</option>
                    <option value="mp4">MP4 (Direct Video)</option>
                    <option value="webm">WebM (Direct Video)</option>
                    <option value="youtube">YouTube (Embed Iframe)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Publication Status:
                  </label>
                  <select
                    value={formIsPublished ? 'published' : 'draft'}
                    onChange={(e) => setFormIsPublished(e.target.value === 'published')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="published">Published (Visible to all users)</option>
                    <option value="draft">Draft / Unpublished (Owner only)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Poster Artwork URL (Optional):
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../thumbnail.jpg"
                    value={formPosterUrl}
                    onChange={(e) => setFormPosterUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subtitles (.vtt) URL (Optional):
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../captions.vtt"
                    value={formCaptionsUrl}
                    onChange={(e) => setFormCaptionsUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Owner Live Preview Stage */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Owner Stream Verification Preview</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {previewSource.type.toUpperCase()}
                </span>
              </div>

              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800">
                {previewSource.isDirectVideo && previewSource.streamUrl ? (
                  <video
                    ref={previewVideoRef}
                    src={previewSource.streamUrl}
                    poster={formPosterUrl || undefined}
                    controls
                    className="w-full h-full object-contain"
                    onError={() => {
                      setPreviewError(
                        'Video stream failed to load. Check that the URL is public and CORS is configured.'
                      );
                    }}
                    onPlaying={() => setPreviewError(null)}
                  />
                ) : previewSource.isYouTube && previewSource.streamUrl ? (
                  <iframe
                    src={previewSource.streamUrl}
                    title="Owner Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="text-center p-4 space-y-1">
                    <Film className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No video stream linked for this episode.
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Users will see: "Tutorial video coming soon. The lesson script and recording guide are available below."
                    </p>
                  </div>
                )}

                {previewError && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-400 mb-1" />
                    <p className="text-xs text-rose-300 font-semibold">{previewError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Architecture & Hosting Guide (Secured for Owner View Only) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>Tutorial Storage Rules &amp; Network Specifications</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Video files must be hosted on Firebase Storage, Google Cloud Storage, or YouTube. Never store video binaries in Firestore documents or the React client bundle.
            </p>
            <div className="p-2.5 rounded-xl bg-black/60 font-mono text-[10px] text-emerald-300 space-y-1 overflow-x-auto">
              <div>// Firebase Storage Location: /tutorials/{selectedEpisode.id}.mp4</div>
              <div>// Required Codec: H.264 (AVC) / AAC Audio @ 1080p 16:9</div>
              <div>// Byte-range HTTP requests supported for seeking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
