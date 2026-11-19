import { create } from 'zustand';
import { musicApi } from '../api/musicApi';

export interface TagSyncTask {
  id: string;
  trackId: number;
  title: string;
  status: 'syncing' | 'completed' | 'error';
  errorMessage?: string;
  startedAt: number;
}

interface TagSyncState {
  tasks: TagSyncTask[];
  startSync: (trackId: number, title: string) => string;
  retrySync: (id: string) => Promise<void>;
  removeTask: (id: string) => void;
}

const activePollers = new Map<string, ReturnType<typeof setInterval>>();

const setupPolling = (
  id: string,
  trackId: number,
  set: (fn: (state: TagSyncState) => Partial<TagSyncState>) => void,
) => {
  let pollCount = 0;
  const maxPolls = 40; // 최대 약 60초 (1.5s * 40)

  const pollInterval = setInterval(async () => {
    pollCount++;

    try {
      const result = await musicApi.getSyncStatus(trackId);

      if (result.status === 'SYNCED') {
        clearInterval(pollInterval);
        activePollers.delete(id);

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: 'completed' as const } : t,
          ),
        }));

        // 3.5초 후 위젯에서 자동 제거
        setTimeout(() => {
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }));
        }, 3500);
      } else if (result.status === 'FAILED') {
        clearInterval(pollInterval);
        activePollers.delete(id);

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'error' as const,
                  errorMessage: '클라우드 오디오 파일(R2) 태그 쓰기에 실패했습니다.',
                }
              : t,
          ),
        }));
      } else if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        activePollers.delete(id);

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'error' as const,
                  errorMessage: '동기화 응답 시간이 초과되었습니다.',
                }
              : t,
          ),
        }));
      }
    } catch {
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        activePollers.delete(id);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'error' as const,
                  errorMessage: '네트워크 연결 오류로 동기화 상태를 확인할 수 없습니다.',
                }
              : t,
          ),
        }));
      }
    }
  }, 1500);

  activePollers.set(id, pollInterval);
};

export const useTagSyncStore = create<TagSyncState>((set, get) => ({
  tasks: [],

  startSync: (trackId: number, title: string) => {
    const id = `sync-${trackId}-${Date.now()}`;
    const newTask: TagSyncTask = {
      id,
      trackId,
      title,
      status: 'syncing',
      startedAt: Date.now(),
    };

    set((state) => ({
      tasks: [...state.tasks, newTask],
    }));

    setupPolling(id, trackId, set);

    return id;
  },

  retrySync: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const existing = activePollers.get(id);
    if (existing) {
      clearInterval(existing);
      activePollers.delete(id);
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'syncing' as const, errorMessage: undefined } : t,
      ),
    }));

    try {
      await musicApi.resyncTags(task.trackId);
      setupPolling(id, task.trackId, set);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재동기화 요청 실패';
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, status: 'error' as const, errorMessage: message } : t,
        ),
      }));
    }
  },

  removeTask: (id: string) => {
    const timer = activePollers.get(id);
    if (timer) {
      clearInterval(timer);
      activePollers.delete(id);
    }
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },
}));
