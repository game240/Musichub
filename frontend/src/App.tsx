import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './stores/authStore';
import { AppLayout } from './components/templates/AppLayout';
import { LoginPage } from './components/pages/auth/LoginPage';
import { LibraryPage } from './components/pages/library/LibraryPage';
import { GlobalPlayer } from './components/pages/player/GlobalPlayer';
import { QuotaIndicator } from './components/organisms/QuotaIndicator';
import { FloatingTagSyncWidget } from './components/organisms/FloatingTagSyncWidget';
import { AccountDropdown } from './components/organisms/AccountDropdown';
import { AccountSecurityModal } from './components/organisms/AccountSecurityModal';
import { TooltipProvider } from './components/atoms/Tooltip';
import { PrivacyPolicyPage } from './components/pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/pages/legal/TermsOfServicePage';
import { AdminUsersPage } from './components/pages/admin/users/AdminUsersPage';
import { ExtractionPage } from './components/pages/extraction/ExtractionPage';

type AppRoute = 'privacy' | 'terms' | 'admin-users' | 'extractions' | null;

const getRouteFromPath = (): AppRoute => {
  const path = window.location.pathname.toLowerCase();
  if (path === '/privacy' || path === '/privacy-policy') return 'privacy';
  if (path === '/terms' || path === '/terms-of-service') return 'terms';
  if (path === '/admin' || path === '/admin/users') return 'admin-users';
  if (path === '/extractions' || path === '/extraction') return 'extractions';
  return null;
};

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
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getRouteFromPath);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getRouteFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToLegal = (route: 'privacy' | 'terms') => {
    const targetUrl = route === 'privacy' ? '/privacy' : '/terms';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    setCurrentRoute(route);
  };

  const navigateToAdmin = () => {
    if (window.location.pathname !== '/admin/users') {
      window.history.pushState({}, '', '/admin/users');
    }
    setCurrentRoute('admin-users');
  };

  const navigateToExtraction = () => {
    if (window.location.pathname !== '/extractions') {
      window.history.pushState({}, '', '/extractions');
    }
    setCurrentRoute('extractions');
  };

  const navigateBack = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setCurrentRoute(null);
  };

  if (currentRoute === 'privacy') {
    return <PrivacyPolicyPage onBack={navigateBack} />;
  }

  if (currentRoute === 'terms') {
    return <TermsOfServicePage onBack={navigateBack} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400">뮤직허브 불러오는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onNavigateLegal={navigateToLegal} />;
  }

  if (currentRoute === 'admin-users' && user?.role === 'ADMIN') {
    return <AdminUsersPage onBack={navigateBack} />;
  }

  if (currentRoute === 'extractions') {
    if (user?.role === 'ADMIN' || user?.role === 'DOWNLOADER') {
      return <ExtractionPage onBack={navigateBack} />;
    }
    // Stealth 404 behavior: unauthorized users are redirected to /
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    setCurrentRoute(null);
  }

  const headerRight = (
    <>
      {user ? (
        <div className="hidden md:flex">
          <QuotaIndicator usedBytes={user.storageUsedBytes} />
        </div>
      ) : null}

      {user ? (
        <div className="md:pl-3 md:border-l border-white/[0.08]">
          <AccountDropdown
            user={user}
            onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            onNavigateAdmin={navigateToAdmin}
            onLogout={logout}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <AppLayout headerRight={headerRight} bottomBar={<GlobalPlayer />}>
        <LibraryPage onNavigateExtraction={navigateToExtraction} />
      </AppLayout>
      {user ? (
        <AccountSecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          userEmail={user.email}
        />
      ) : null}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <AppContent />
          <FloatingTagSyncWidget />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
