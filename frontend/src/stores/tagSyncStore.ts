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
  removeTask: (id: string) => void;
}

const activePollers = new Map<string, ReturnType<typeof setInterval>>();

export const useTagSyncStore = create<TagSyncState>((set) => ({
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
          // 타임아웃
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
        // 일시적인 네트워크 오류 시 바로 중단하지 않고 계속 폴링 시도
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

    return id;
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
