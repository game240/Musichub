import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { AppLayout } from './components/templates/AppLayout';
import { LoginPage } from './components/pages/auth/LoginPage';
import { LibraryPage } from './components/pages/library/LibraryPage';
import { GlobalPlayer } from './components/pages/player/GlobalPlayer';
import { QuotaIndicator } from './components/organisms/QuotaIndicator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  'your-google-client-id.apps.googleusercontent.com';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, checkAuthSession, logout } = useAuthStore();

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading Music Hub...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const headerRight = (
    <>
      {user ? <QuotaIndicator usedBytes={user.storageUsedBytes} /> : null}

      <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={user.displayName || user.email}
            className="w-7 h-7 rounded-full border border-slate-700 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <User className="w-4 h-4" />
          </div>
        )}
        <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[120px] truncate">
          {user?.displayName || user?.email}
        </span>
        <button
          type="button"
          title="Sign out"
          onClick={() => {
            logout();
          }}
          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <AppLayout headerRight={headerRight} bottomBar={<GlobalPlayer />}>
      <LibraryPage />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
