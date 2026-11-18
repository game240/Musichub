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
import { TooltipProvider, Tooltip } from './components/atoms/Tooltip';

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
      <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400">뮤직허브 불러오는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const headerRight = (
    <>
      {user ? <QuotaIndicator usedBytes={user.storageUsedBytes} /> : null}

      <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={user.displayName || user.email}
            className="w-7 h-7 rounded-full border border-white/[0.1] object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-400">
            <User className="w-4 h-4" />
          </div>
        )}
        <span className="text-xs font-medium text-neutral-200 hidden sm:inline max-w-[120px] truncate">
          {user?.displayName || user?.email}
        </span>
        <Tooltip content="로그아웃" side="bottom">
          <button
            type="button"
            onClick={() => {
              logout();
            }}
            className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </Tooltip>
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
        <TooltipProvider delayDuration={150}>
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
