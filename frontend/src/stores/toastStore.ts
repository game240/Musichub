import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
  isExiting?: boolean;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (
    message: string,
    type?: ToastType,
    durationMs?: number,
    action?: ToastAction
  ) => string;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'info', durationMs = 3000, action) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, message, type, durationMs, action };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, durationMs);
    }

    return id;
  },
  dismissToast: (id) => {
    const existing = get().toasts.find((t) => t.id === id);
    if (!existing || existing.isExiting) return;

    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 200);
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
  info: (message: string, durationMs?: number, action?: ToastAction) =>
    useToastStore.getState().addToast(message, 'info', durationMs, action),
  success: (message: string, durationMs?: number, action?: ToastAction) =>
    useToastStore.getState().addToast(message, 'success', durationMs, action),
  warning: (message: string, durationMs?: number, action?: ToastAction) =>
    useToastStore.getState().addToast(message, 'warning', durationMs, action),
  error: (message: string, durationMs?: number, action?: ToastAction) =>
    useToastStore.getState().addToast(message, 'error', durationMs, action),
  dismiss: (id: string) => useToastStore.getState().dismissToast(id),
};
