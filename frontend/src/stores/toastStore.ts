import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, durationMs?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', durationMs = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, message, type, durationMs };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, durationMs);
    }

    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => {
    set({ toasts: [] });
  },
}));

export const toast = {
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast(message, 'info', durationMs),
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast(message, 'success', durationMs),
  warning: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast(message, 'warning', durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().addToast(message, 'error', durationMs),
};
