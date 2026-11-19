import { create } from 'zustand';

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
  completeSync: (id: string) => void;
  failSync: (id: string, errorMessage?: string) => void;
  removeTask: (id: string) => void;
}

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

    // Realistic optimistic sync timer: transition to completed after 3.5 seconds
    setTimeout(() => {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, status: 'completed' as const } : t,
        ),
      }));

      // Auto dismiss after completion (3.5 seconds later)
      setTimeout(() => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      }, 3500);
    }, 3500);

    return id;
  },

  completeSync: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: 'completed' } : t)),
    }));
    setTimeout(() => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    }, 3500);
  },

  failSync: (id: string, errorMessage?: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'error', errorMessage } : t,
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    }, 5000);
  },

  removeTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },
}));
