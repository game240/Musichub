import { create } from 'zustand';
import type { UserDto } from '../types/auth';
import { setAccessToken, registerLogoutHandler } from '../api/client';
import { authApi } from '../api/authApi';

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserDto, token: string) => void;
  updateStorageUsage: (deltaBytes: number) => void;
  clearAuth: () => void;
  checkAuthSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register interceptor fallback
  registerLogoutHandler(() => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    setAuth: (user: UserDto, token: string) => {
      setAccessToken(token);
      set({ user, isAuthenticated: true, isLoading: false });
    },

    updateStorageUsage: (deltaBytes: number) => {
      const currentUser = get().user;
      if (currentUser) {
        set({
          user: {
            ...currentUser,
            storageUsedBytes: Math.max(0, currentUser.storageUsedBytes + deltaBytes),
          },
        });
      }
    },

    clearAuth: () => {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    },

    checkAuthSession: async () => {
      try {
        set({ isLoading: true });
        const response = await authApi.refresh();
        setAccessToken(response.accessToken);
        set({ user: response.user, isAuthenticated: true, isLoading: false });
        return true;
      } catch {
        setAccessToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch {
        // Ignore network errors on logout
      } finally {
        get().clearAuth();
      }
    },
  };
});
