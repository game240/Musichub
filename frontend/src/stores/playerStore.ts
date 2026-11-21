import { create } from 'zustand';
import type { MusicFileDto } from '../types/music';
import type { PlaybackStateDto } from '../types/playback';
import { musicApi } from '../api/musicApi';
import { userApi } from '../api/userApi';
import { playbackApi } from '../api/playbackApi';

export type RepeatMode = 'OFF' | 'ALL' | 'ONE';

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
  playTrack: (track: MusicFileDto, playlist?: MusicFileDto[]) => Promise<void>;
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

    playTrack: async (track: MusicFileDto, playlist?: MusicFileDto[]) => {
      const state = get();
      let updatedQueue = state.queue;
      let newIndex: number;

      if (playlist && playlist.length > 0) {
        updatedQueue = [...playlist];
        newIndex = updatedQueue.findIndex((t) => t.id === track.id);
        if (newIndex === -1) {
          updatedQueue.unshift(track);
          newIndex = 0;
        }
      } else {
        const existingIdx = updatedQueue.findIndex((t) => t.id === track.id);
        if (existingIdx !== -1) {
          newIndex = existingIdx;
        } else {
          updatedQueue = [...updatedQueue, track];
          newIndex = updatedQueue.length - 1;
        }
      }

      let newShuffledQueue = state.shuffledQueue;
      if (state.isShuffle) {
        const others = updatedQueue.filter((t) => t.id !== track.id);
        newShuffledQueue = [track, ...fisherYatesShuffle(others)];
        newIndex = 0;
      }

      set({
        currentTrack: track,
        queue: updatedQueue,
        shuffledQueue: newShuffledQueue,
        queueIndex: newIndex,
        isLoading: true,
        currentTime: 0,
      });

      schedulePlaybackSync();

      try {
        const { playUrl, durationMs } = await musicApi.getPlayUrl(track.id);
        audioElement.src = playUrl;
        audioElement.currentTime = 0;
        await audioElement.play();

        set({
          streamUrl: playUrl,
          duration: durationMs ? durationMs / 1000 : 0,
          isPlaying: true,
          isLoading: false,
        });
      } catch {
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
      const activeQueue = isShuffle ? shuffledQueue : queue;
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
              playTrack(nextTrack);
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
        set({ queueIndex: nextIndex });
        playTrack(nextTrack);
      }
    },

    playPrev: () => {
      const { queue, shuffledQueue, queueIndex, isShuffle, playTrack, currentTime } = get();
      const activeQueue = isShuffle ? shuffledQueue : queue;
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
        set({ queueIndex: prevIndex });
        playTrack(prevTrack);
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
        const activeQueue = prev.isShuffle ? prev.shuffledQueue : prev.queue;
        const trackToRemove = activeQueue[index];
        if (!trackToRemove) return prev;

        const nextQueue = prev.queue.filter((t) => t.id !== trackToRemove.id);
        const nextShuffled = prev.shuffledQueue.filter((t) => t.id !== trackToRemove.id);

        const currentList = prev.isShuffle ? nextShuffled : nextQueue;
        let nextIdx = prev.queueIndex;
        if (index < prev.queueIndex) {
          nextIdx -= 1;
        } else if (index === prev.queueIndex && nextIdx >= currentList.length) {
          nextIdx = Math.max(0, currentList.length - 1);
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
      set({ queue: [], shuffledQueue: [], queueIndex: -1 });
      schedulePlaybackSync();
    },

    updateTrackInfo: (track: MusicFileDto) => {
      const { currentTrack, queue, shuffledQueue } = get();
      const updatedQueue = queue.map((t) => (t.id === track.id ? { ...t, ...track } : t));
      const updatedShuffled = shuffledQueue.map((t) => (t.id === track.id ? { ...t, ...track } : t));
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
