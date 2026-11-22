import { create } from 'zustand';
import type { MusicFileDto } from '../types/music';
import type { PlaybackStateDto } from '../types/playback';
import { musicApi } from '../api/musicApi';
import { userApi } from '../api/userApi';
import { playbackApi } from '../api/playbackApi';

export type RepeatMode = 'OFF' | 'ALL' | 'ONE';

export interface PlayTrackOptions {
  playlist?: MusicFileDto[];
  targetIndex?: number;
  preserveShuffle?: boolean;
}

export interface AddToQueueResult {
  added: boolean;
}

export interface AddTracksToQueueResult {
  addedCount: number;
  duplicateCount: number;
}

interface PlayerState {
  currentTrack: MusicFileDto | null;
  streamUrl: string | null;
  queue: MusicFileDto[];
  shuffledQueue: MusicFileDto[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;

  // Actions
  playTrack: (
    track: MusicFileDto,
    playlistOrOptions?: MusicFileDto[] | PlayTrackOptions,
  ) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (timeInSeconds: number) => void;
  setVolume: (volume: number) => void;
  initVolumeFromUser: (volumePercent: number) => void;
  initPlaybackState: (state: PlaybackStateDto) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (track: MusicFileDto) => AddToQueueResult;
  addTracksToQueue: (tracks: MusicFileDto[]) => AddTracksToQueueResult;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  updateTrackInfo: (track: MusicFileDto) => void;
}

const INITIAL_VOLUME_KEY = 'musichub_volume';
const loadSavedVolume = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(INITIAL_VOLUME_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  }
  return 1;
};

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// In-memory stream URL cache to minimize transition delay & network latency
const STREAM_URL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
interface CachedStreamUrl {
  playUrl: string;
  durationMs?: number;
  cachedAt: number;
}
const streamUrlCache = new Map<number, CachedStreamUrl>();

const getCachedOrFetchPlayUrl = async (trackId: number) => {
  const cached = streamUrlCache.get(trackId);
  const now = Date.now();
  if (cached && now - cached.cachedAt < STREAM_URL_CACHE_TTL_MS) {
    return { playUrl: cached.playUrl, durationMs: cached.durationMs };
  }
  const result = await musicApi.getPlayUrl(trackId);
  streamUrlCache.set(trackId, {
    playUrl: result.playUrl,
    durationMs: result.durationMs,
    cachedAt: now,
  });
  return result;
};

// Monotonically increasing counter to prevent race conditions during rapid track skipping
let playSequenceCounter = 0;

let volumeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let playbackDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const schedulePlaybackSync = () => {
  if (playbackDebounceTimer) {
    clearTimeout(playbackDebounceTimer);
  }
  playbackDebounceTimer = setTimeout(() => {
    if (userApi.isLoggedIn()) {
      const state = usePlayerStore.getState();
      playbackApi
        .updatePlaybackState({
          currentTrackId: state.currentTrack?.id ?? null,
          queueTrackIds: state.queue.map((t) => t.id),
          shuffledTrackIds: state.shuffledQueue.map((t) => t.id),
          queueIndex: state.queueIndex,
          isShuffle: state.isShuffle,
          repeatMode: state.repeatMode,
          currentPositionMs: Math.round(state.currentTime * 1000),
        })
        .catch((err) => {
          console.error('Failed to sync playback state to server:', err);
        });
    }
  }, 2500);
};

// Media Session API helpers
const syncMediaSessionMetadata = (
  track: MusicFileDto | null,
  getCurrentTrackId?: () => number | undefined,
) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  if (!track) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  const buildArtwork = (url?: string | null): MediaImage[] => {
    if (url) {
      return [
        { src: url, sizes: '96x96' },
        { src: url, sizes: '128x128' },
        { src: url, sizes: '192x192' },
        { src: url, sizes: '256x256' },
        { src: url, sizes: '384x384' },
        { src: url, sizes: '512x512' },
      ];
    }
    return [{ src: '/logo.png', sizes: '512x512', type: 'image/png' }];
  };

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || track.fileName,
    artist: track.artist || '알 수 없는 아티스트',
    album: track.album || '',
    artwork: buildArtwork(track.artworkUrl),
  });

  if (!track.artworkUrl && track.hasArtwork) {
    musicApi
      .getArtworkUrl(track.id)
      .then((url) => {
        if (url && (!getCurrentTrackId || getCurrentTrackId() === track.id)) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || track.fileName,
            artist: track.artist || '알 수 없는 아티스트',
            album: track.album || '',
            artwork: buildArtwork(url),
          });
        }
      })
      .catch(() => {
        // Fallback artwork is already in place
      });
  }
};

const syncMediaSessionPlaybackState = (isPlaying: boolean) => {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
};

const syncMediaSessionPosition = () => {
  if (
    typeof window === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession)
  ) {
    return;
  }

  const dur = audioElement.duration;
  if (!isNaN(dur) && dur > 0 && isFinite(dur)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: audioElement.playbackRate || 1,
        position: Math.min(Math.max(0, audioElement.currentTime), dur),
      });
    } catch {
      // Ignore potential state race conditions during rapid skipping
    }
  }
};

// Native HTML5 Audio singleton
const initialVolume = loadSavedVolume();
const audioElement = new Audio();
audioElement.preload = 'metadata';
audioElement.volume = initialVolume;
audioElement.muted = initialVolume === 0;

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Register standard Media Session API action handlers
  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => get().resume()],
      ['pause', () => get().pause()],
      ['previoustrack', () => get().playPrev()],
      ['nexttrack', () => get().playNext()],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
            get().seekTo(details.seekTime);
          }
        },
      ],
      [
        'seekbackward',
        (details) => {
          const skip = details.seekOffset || 10;
          get().seekTo(Math.max(0, audioElement.currentTime - skip));
        },
      ],
      [
        'seekforward',
        (details) => {
          const skip = details.seekOffset || 10;
          const dur = audioElement.duration;
          const target = audioElement.currentTime + skip;
          get().seekTo(dur > 0 && !isNaN(dur) ? Math.min(dur, target) : target);
        },
      ],
      ['stop', () => get().pause()],
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Ignore unsupported optional actions in specific browsers
      }
    }
  }

  // Setup audio event listeners
  audioElement.addEventListener('timeupdate', () => {
    set({ currentTime: audioElement.currentTime });
  });

  audioElement.addEventListener('loadedmetadata', () => {
    if (!isNaN(audioElement.duration)) {
      set({ duration: audioElement.duration, isLoading: false });
      syncMediaSessionPosition();
    }
  });

  audioElement.addEventListener('play', () => {
    set({ isPlaying: true });
    syncMediaSessionPlaybackState(true);
    syncMediaSessionPosition();
  });

  audioElement.addEventListener('pause', () => {
    set({ isPlaying: false });
    syncMediaSessionPlaybackState(false);
    syncMediaSessionPosition();
  });

  audioElement.addEventListener('seeked', () => {
    syncMediaSessionPosition();
  });

  audioElement.addEventListener('ended', () => {
    const { repeatMode, playNext } = get();
    if (repeatMode === 'ONE') {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        set({ isPlaying: false });
        syncMediaSessionPlaybackState(false);
      });
    } else {
      playNext();
    }
  });

  audioElement.addEventListener('error', () => {
    set({ isPlaying: false, isLoading: false });
    syncMediaSessionPlaybackState(false);
  });

  return {
    currentTrack: null,
    streamUrl: null,
    queue: [],
    shuffledQueue: [],
    queueIndex: -1,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    isMuted: initialVolume === 0,
    repeatMode: 'OFF',
    isShuffle: false,

    playTrack: async (
      track: MusicFileDto,
      playlistOrOptions?: MusicFileDto[] | PlayTrackOptions,
    ) => {
      const currentSeq = ++playSequenceCounter;

      // 1. 이전 음원 즉시 일시정지 (새 곡 로딩 중 이전 곡이 계속 나오는 현상 차단)
      audioElement.pause();
      audioElement.currentTime = 0;

      const state = get();
      let playlist: MusicFileDto[] | undefined;
      let targetIndex: number | undefined;
      let preserveShuffle = false;

      if (Array.isArray(playlistOrOptions)) {
        playlist = playlistOrOptions;
      } else if (playlistOrOptions) {
        playlist = playlistOrOptions.playlist;
        targetIndex = playlistOrOptions.targetIndex;
        preserveShuffle = playlistOrOptions.preserveShuffle ?? false;
      }

      let updatedQueue = state.queue;
      let updatedShuffledQueue = state.shuffledQueue;
      let newIndex = targetIndex ?? -1;

      const isNewPlaylist = Boolean(playlist && playlist.length > 0);

      if (isNewPlaylist && playlist) {
        const seenIds = new Set<number>();
        const uniquePlaylist: MusicFileDto[] = [];
        for (const t of playlist) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            uniquePlaylist.push(t);
          }
        }
        updatedQueue = uniquePlaylist;
        if (newIndex === -1) {
          const idx = updatedQueue.findIndex((t) => t.id === track.id);
          newIndex = idx !== -1 ? idx : 0;
        }

        if (state.isShuffle) {
          const others = updatedQueue.filter((t) => t.id !== track.id);
          updatedShuffledQueue = [track, ...fisherYatesShuffle(others)];
          newIndex = 0;
        } else {
          updatedShuffledQueue = [];
        }
      } else {
        // 기존 대기열에서 재생 (playNext, playPrev, 또는 대기열 내 트랙 선택)
        if (state.isShuffle) {
          if (!preserveShuffle) {
            // 셔플 모드에서 큐에 없는 외부 곡을 재생하거나 새 컨텍스트일 때만 재셔플
            const existsInQueue = updatedQueue.some((t) => t.id === track.id);
            if (!existsInQueue) {
              updatedQueue = [...updatedQueue, track];
            }
            const others = updatedQueue.filter((t) => t.id !== track.id);
            updatedShuffledQueue = [track, ...fisherYatesShuffle(others)];
            newIndex = 0;
          } else {
            // preserveShuffle === true (playNext / playPrev 등 기존 셔플 순서 유지)
            if (newIndex === -1) {
              const foundIdx = updatedShuffledQueue.findIndex((t) => t.id === track.id);
              newIndex = foundIdx !== -1 ? foundIdx : 0;
            }
          }
        } else {
          // 순차 모드
          if (newIndex === -1) {
            const foundIdx = updatedQueue.findIndex((t) => t.id === track.id);
            if (foundIdx !== -1) {
              newIndex = foundIdx;
            } else {
              updatedQueue = [...updatedQueue, track];
              newIndex = updatedQueue.length - 1;
            }
          }
        }
      }

      set({
        currentTrack: track,
        queue: updatedQueue,
        shuffledQueue: updatedShuffledQueue,
        queueIndex: newIndex,
        isLoading: true,
        currentTime: 0,
      });

      syncMediaSessionMetadata(track, () => get().currentTrack?.id);
      schedulePlaybackSync();

      try {
        const { playUrl, durationMs } = await getCachedOrFetchPlayUrl(track.id);

        // 사용자가 그 사이에 다른 곡을 요청했으면 이 응답은 무시
        if (currentSeq !== playSequenceCounter) {
          return;
        }

        audioElement.src = playUrl;
        audioElement.currentTime = 0;
        await audioElement.play();

        if (currentSeq !== playSequenceCounter) {
          return;
        }

        set({
          streamUrl: playUrl,
          duration: durationMs ? durationMs / 1000 : 0,
          isPlaying: true,
          isLoading: false,
        });
      } catch (err: unknown) {
        if (currentSeq !== playSequenceCounter) {
          return;
        }

        // AbortError: 다음 곡 선택으로 인해 이전 play()가 중단된 정상 동작이므로 멈춤 상태로 전환하지 않음
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        console.error('Audio playback error:', err);
        set({ isPlaying: false, isLoading: false });
      }
    },

    togglePlay: () => {
      const { isPlaying, currentTrack } = get();
      if (!currentTrack) {
        return;
      }

      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play().catch(() => {
          set({ isPlaying: false });
        });
      }
    },

    pause: () => {
      audioElement.pause();
      schedulePlaybackSync();
    },

    resume: () => {
      if (get().currentTrack) {
        audioElement.play().catch(() => {
          set({ isPlaying: false });
        });
      }
    },

    seekTo: (timeInSeconds: number) => {
      if (isNaN(timeInSeconds)) {
        return;
      }
      audioElement.currentTime = timeInSeconds;
      set({ currentTime: timeInSeconds });
      syncMediaSessionPosition();
    },

    setVolume: (volume: number) => {
      const safeVol = Math.max(0, Math.min(1, volume));
      audioElement.volume = safeVol;
      audioElement.muted = safeVol === 0;
      set({ volume: safeVol, isMuted: safeVol === 0 });

      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIAL_VOLUME_KEY, safeVol.toString());
      }

      // 5초(5000ms) 디바운스로 서버에 동기화
      if (volumeDebounceTimer) {
        clearTimeout(volumeDebounceTimer);
      }
      volumeDebounceTimer = setTimeout(() => {
        if (userApi.isLoggedIn()) {
          const volumePercent = Math.round(safeVol * 100);
          userApi.updateVolume(volumePercent).catch((err) => {
            console.error('Failed to sync volume to server:', err);
          });
        }
      }, 5000);
    },

    initVolumeFromUser: (volumePercent: number) => {
      const safeVol = Math.max(0, Math.min(100, volumePercent)) / 100;
      audioElement.volume = safeVol;
      audioElement.muted = safeVol === 0;
      set({ volume: safeVol, isMuted: safeVol === 0 });

      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIAL_VOLUME_KEY, safeVol.toString());
      }
    },

    initPlaybackState: (state: PlaybackStateDto) => {
      if (!state.currentTrack && state.queue.length === 0) {
        return;
      }

      const seenQueueIds = new Set<number>();
      const dedupedQueue = state.queue.filter((t) => {
        if (seenQueueIds.has(t.id)) return false;
        seenQueueIds.add(t.id);
        return true;
      });

      const seenShuffledIds = new Set<number>();
      const dedupedShuffledQueue = state.shuffledQueue.filter((t) => {
        if (seenShuffledIds.has(t.id)) return false;
        seenShuffledIds.add(t.id);
        return true;
      });

      const posSeconds = state.currentPositionMs / 1000;
      set({
        currentTrack: state.currentTrack,
        queue: dedupedQueue,
        shuffledQueue: dedupedShuffledQueue,
        queueIndex: state.queueIndex,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        currentTime: posSeconds,
        isPlaying: false,
      });

      if (state.currentTrack) {
        syncMediaSessionMetadata(state.currentTrack, () => get().currentTrack?.id);
        musicApi
          .getPlayUrl(state.currentTrack.id)
          .then(({ playUrl, durationMs }) => {
            audioElement.src = playUrl;
            audioElement.currentTime = posSeconds;
            set({
              streamUrl: playUrl,
              duration: durationMs ? durationMs / 1000 : 0,
              currentTime: posSeconds,
              isPlaying: false,
              isLoading: false,
            });
          })
          .catch(() => {
            set({ isLoading: false });
          });
      }
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      const nextMuted = !isMuted;
      audioElement.muted = nextMuted;
      set({ isMuted: nextMuted });
      if (!nextMuted && volume === 0) {
        audioElement.volume = 0.5;
        set({ volume: 0.5 });
      }
    },

    toggleRepeat: () => {
      const current = get().repeatMode;
      const next: RepeatMode = current === 'OFF' ? 'ALL' : current === 'ALL' ? 'ONE' : 'OFF';
      set({ repeatMode: next });
      schedulePlaybackSync();
    },

    toggleShuffle: () => {
      const { isShuffle, queue, currentTrack } = get();
      const nextShuffle = !isShuffle;

      if (nextShuffle) {
        if (queue.length > 0 && currentTrack) {
          const others = queue.filter((t) => t.id !== currentTrack.id);
          const shuffled = [currentTrack, ...fisherYatesShuffle(others)];
          set({
            isShuffle: true,
            shuffledQueue: shuffled,
            queueIndex: 0,
          });
        } else {
          set({
            isShuffle: true,
            shuffledQueue: fisherYatesShuffle(queue),
            queueIndex: 0,
          });
        }
      } else {
        let originalIdx = 0;
        if (currentTrack) {
          const found = queue.findIndex((t) => t.id === currentTrack.id);
          if (found !== -1) {
            originalIdx = found;
          }
        }
        set({
          isShuffle: false,
          shuffledQueue: [],
          queueIndex: originalIdx,
        });
      }
      schedulePlaybackSync();
    },

    playNext: () => {
      const { queue, shuffledQueue, queueIndex, isShuffle, repeatMode, playTrack } = get();
      const activeQueue = isShuffle && shuffledQueue.length > 0 ? shuffledQueue : queue;
      if (activeQueue.length === 0) {
        return;
      }

      let nextIndex = queueIndex + 1;
      if (nextIndex >= activeQueue.length) {
        if (repeatMode === 'ALL') {
          if (isShuffle) {
            const reShuffled = fisherYatesShuffle(activeQueue);
            set({ shuffledQueue: reShuffled, queueIndex: 0 });
            const nextTrack = reShuffled[0];
            if (nextTrack) {
              playTrack(nextTrack, { targetIndex: 0, preserveShuffle: true });
            }
            return;
          }
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          schedulePlaybackSync();
          return;
        }
      }

      const nextTrack = activeQueue[nextIndex];
      if (nextTrack) {
        playTrack(nextTrack, { targetIndex: nextIndex, preserveShuffle: true });
      }
    },

    playPrev: () => {
      const { queue, shuffledQueue, queueIndex, isShuffle, playTrack, currentTime } = get();
      const activeQueue = isShuffle && shuffledQueue.length > 0 ? shuffledQueue : queue;
      if (activeQueue.length === 0) {
        return;
      }

      // If playing for more than 3 seconds, restart current track
      if (currentTime > 3) {
        audioElement.currentTime = 0;
        return;
      }

      let prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = activeQueue.length - 1;
      }

      const prevTrack = activeQueue[prevIndex];
      if (prevTrack) {
        playTrack(prevTrack, { targetIndex: prevIndex, preserveShuffle: true });
      }
    },

    addToQueue: (track: MusicFileDto): AddToQueueResult => {
      let added = false;
      set((prev) => {
        if (prev.queue.some((t) => t.id === track.id)) {
          return prev;
        }
        added = true;
        const nextQueue = [...prev.queue, track];
        const nextShuffled = prev.isShuffle ? [...prev.shuffledQueue, track] : prev.shuffledQueue;
        return {
          queue: nextQueue,
          shuffledQueue: nextShuffled,
        };
      });
      if (added) {
        schedulePlaybackSync();
      }
      return { added };
    },

    addTracksToQueue: (newTracks: MusicFileDto[]): AddTracksToQueueResult => {
      if (newTracks.length === 0) return { addedCount: 0, duplicateCount: 0 };
      let addedCount = 0;
      let duplicateCount = 0;
      set((prev) => {
        const existingIds = new Set(prev.queue.map((t) => t.id));
        const uniqueIncoming: MusicFileDto[] = [];
        for (const t of newTracks) {
          if (!existingIds.has(t.id)) {
            existingIds.add(t.id);
            uniqueIncoming.push(t);
          } else {
            duplicateCount++;
          }
        }
        if (uniqueIncoming.length === 0) return prev;
        addedCount = uniqueIncoming.length;
        const nextQueue = [...prev.queue, ...uniqueIncoming];
        const nextShuffled = prev.isShuffle
          ? [...prev.shuffledQueue, ...uniqueIncoming]
          : prev.shuffledQueue;
        return {
          queue: nextQueue,
          shuffledQueue: nextShuffled,
        };
      });
      if (addedCount > 0) {
        schedulePlaybackSync();
      }
      return { addedCount, duplicateCount };
    },

    removeFromQueue: (index: number) => {
      set((prev) => {
        const activeQueue =
          prev.isShuffle && prev.shuffledQueue.length > 0 ? prev.shuffledQueue : prev.queue;
        const trackToRemove = activeQueue[index];
        if (!trackToRemove) return prev;

        const isCurrentPlaying = prev.currentTrack?.id === trackToRemove.id;
        const nextQueue = prev.queue.filter((t) => t.id !== trackToRemove.id);
        const nextShuffled = prev.shuffledQueue.filter((t) => t.id !== trackToRemove.id);

        const currentList = prev.isShuffle ? nextShuffled : nextQueue;
        let nextIdx = prev.queueIndex;
        if (index < prev.queueIndex) {
          nextIdx -= 1;
        } else if (index === prev.queueIndex && nextIdx >= currentList.length) {
          nextIdx = Math.max(0, currentList.length - 1);
        }

        if (isCurrentPlaying) {
          playSequenceCounter++;
          audioElement.pause();
          audioElement.currentTime = 0;
          syncMediaSessionMetadata(null);
          return {
            currentTrack: null,
            streamUrl: null,
            queue: nextQueue,
            shuffledQueue: nextShuffled,
            queueIndex: -1,
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
          };
        }

        return {
          queue: nextQueue,
          shuffledQueue: nextShuffled,
          queueIndex: nextIdx,
        };
      });
      schedulePlaybackSync();
    },

    clearQueue: () => {
      playSequenceCounter++;
      audioElement.pause();
      audioElement.currentTime = 0;
      syncMediaSessionMetadata(null);
      set({
        currentTrack: null,
        streamUrl: null,
        queue: [],
        shuffledQueue: [],
        queueIndex: -1,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      });
      schedulePlaybackSync();
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
      set((prev) => {
        const isShuffleActive = prev.isShuffle && prev.shuffledQueue.length > 0;
        const activeList = isShuffleActive ? [...prev.shuffledQueue] : [...prev.queue];
        if (
          fromIndex < 0 ||
          fromIndex >= activeList.length ||
          toIndex < 0 ||
          toIndex >= activeList.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }

        const [movedItem] = activeList.splice(fromIndex, 1);
        activeList.splice(toIndex, 0, movedItem);

        // Keep queueIndex synchronized with currentTrack
        let nextQueueIndex = prev.queueIndex;
        if (prev.currentTrack) {
          const foundIdx = activeList.findIndex((t) => t.id === prev.currentTrack?.id);
          if (foundIdx !== -1) {
            nextQueueIndex = foundIdx;
          }
        }

        if (isShuffleActive) {
          return {
            shuffledQueue: activeList,
            queueIndex: nextQueueIndex,
          };
        } else {
          return {
            queue: activeList,
            queueIndex: nextQueueIndex,
          };
        }
      });
      schedulePlaybackSync();
    },

    updateTrackInfo: (track: MusicFileDto) => {
      const { currentTrack, queue, shuffledQueue } = get();
      const updatedQueue = queue.map((t) => (t.id === track.id ? { ...t, ...track } : t));
      const updatedShuffled = shuffledQueue.map((t) =>
        t.id === track.id ? { ...t, ...track } : t,
      );
      const updatedCurrent =
        currentTrack?.id === track.id ? { ...currentTrack, ...track } : currentTrack;
      if (currentTrack?.id === track.id) {
        syncMediaSessionMetadata(updatedCurrent, () => get().currentTrack?.id);
      }
      set({
        queue: updatedQueue,
        shuffledQueue: updatedShuffled,
        currentTrack: updatedCurrent,
      });
    },
  };
});
