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
  addToQueue: (track: MusicFileDto) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
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

// Native HTML5 Audio singleton
const initialVolume = loadSavedVolume();
const audioElement = new Audio();
audioElement.preload = 'metadata';
audioElement.volume = initialVolume;
audioElement.muted = initialVolume === 0;

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Setup audio event listeners
  audioElement.addEventListener('timeupdate', () => {
    set({ currentTime: audioElement.currentTime });
  });

  audioElement.addEventListener('loadedmetadata', () => {
    if (!isNaN(audioElement.duration)) {
      set({ duration: audioElement.duration, isLoading: false });
    }
  });

  audioElement.addEventListener('play', () => {
    set({ isPlaying: true });
  });

  audioElement.addEventListener('pause', () => {
    set({ isPlaying: false });
  });

  audioElement.addEventListener('ended', () => {
    const { repeatMode, playNext } = get();
    if (repeatMode === 'ONE') {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        set({ isPlaying: false });
      });
    } else {
      playNext();
    }
  });

  audioElement.addEventListener('error', () => {
    set({ isPlaying: false, isLoading: false });
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
        updatedQueue = [...playlist];
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

      const posSeconds = state.currentPositionMs / 1000;
      set({
        currentTrack: state.currentTrack,
        queue: state.queue,
        shuffledQueue: state.shuffledQueue,
        queueIndex: state.queueIndex,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        currentTime: posSeconds,
        isPlaying: false,
      });

      if (state.currentTrack) {
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

    addToQueue: (track: MusicFileDto) => {
      set((prev) => {
        const nextQueue = [...prev.queue, track];
        let nextShuffled = prev.shuffledQueue;
        if (prev.isShuffle) {
          nextShuffled = [...prev.shuffledQueue, track];
        }
        return {
          queue: nextQueue,
          shuffledQueue: nextShuffled,
        };
      });
      schedulePlaybackSync();
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

    updateTrackInfo: (track: MusicFileDto) => {
      const { currentTrack, queue, shuffledQueue } = get();
      const updatedQueue = queue.map((t) => (t.id === track.id ? { ...t, ...track } : t));
      const updatedShuffled = shuffledQueue.map((t) =>
        t.id === track.id ? { ...t, ...track } : t,
      );
      const updatedCurrent =
        currentTrack?.id === track.id ? { ...currentTrack, ...track } : currentTrack;
      set({
        queue: updatedQueue,
        shuffledQueue: updatedShuffled,
        currentTrack: updatedCurrent,
      });
    },
  };
});
