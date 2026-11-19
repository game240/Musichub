import { create } from 'zustand';
import type { MusicFileDto } from '../types/music';
import { musicApi } from '../api/musicApi';
import { userApi } from '../api/userApi';

export type RepeatMode = 'OFF' | 'ALL' | 'ONE';

interface PlayerState {
  currentTrack: MusicFileDto | null;
  streamUrl: string | null;
  queue: MusicFileDto[];
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

let volumeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

      set({
        currentTrack: track,
        queue: updatedQueue,
        queueIndex: newIndex,
        isLoading: true,
        currentTime: 0,
      });

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
    },

    toggleShuffle: () => {
      set((prev) => ({ isShuffle: !prev.isShuffle }));
    },

    playNext: () => {
      const { queue, queueIndex, isShuffle, repeatMode, playTrack } = get();
      if (queue.length === 0) {
        return;
      }

      let nextIndex = queueIndex + 1;
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (nextIndex >= queue.length) {
        if (repeatMode === 'ALL') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }

      const nextTrack = queue[nextIndex];
      if (nextTrack) {
        playTrack(nextTrack);
      }
    },

    playPrev: () => {
      const { queue, queueIndex, playTrack, currentTime } = get();
      if (queue.length === 0) {
        return;
      }

      // If playing for more than 3 seconds, restart current track
      if (currentTime > 3) {
        audioElement.currentTime = 0;
        return;
      }

      let prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
      }

      const prevTrack = queue[prevIndex];
      if (prevTrack) {
        playTrack(prevTrack);
      }
    },

    addToQueue: (track: MusicFileDto) => {
      set((prev) => ({
        queue: [...prev.queue, track],
      }));
    },

    removeFromQueue: (index: number) => {
      set((prev) => {
        const nextQueue = prev.queue.filter((_, i) => i !== index);
        let nextIdx = prev.queueIndex;
        if (index < prev.queueIndex) {
          nextIdx -= 1;
        } else if (index === prev.queueIndex && nextIdx >= nextQueue.length) {
          nextIdx = nextQueue.length - 1;
        }
        return {
          queue: nextQueue,
          queueIndex: nextIdx,
        };
      });
    },

    clearQueue: () => {
      set({ queue: [], queueIndex: -1 });
    },

    updateTrackInfo: (track: MusicFileDto) => {
      const { currentTrack, queue } = get();
      const updatedQueue = queue.map((t) => (t.id === track.id ? { ...t, ...track } : t));
      const updatedCurrent =
        currentTrack?.id === track.id ? { ...currentTrack, ...track } : currentTrack;
      set({ queue: updatedQueue, currentTrack: updatedCurrent });
    },
  };
});
