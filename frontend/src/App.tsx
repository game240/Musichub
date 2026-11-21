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

type LegalRoute = 'privacy' | 'terms' | null;

const getLegalRouteFromPath = (): LegalRoute => {
  const path = window.location.pathname.toLowerCase();
  if (path === '/privacy' || path === '/privacy-policy') return 'privacy';
  if (path === '/terms' || path === '/terms-of-service') return 'terms';
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
  const [legalRoute, setLegalRoute] = useState<LegalRoute>(getLegalRouteFromPath);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  useEffect(() => {
    const handlePopState = () => {
      setLegalRoute(getLegalRouteFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToLegal = (route: 'privacy' | 'terms') => {
    const targetUrl = route === 'privacy' ? '/privacy' : '/terms';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    setLegalRoute(route);
  };

  const navigateBack = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setLegalRoute(null);
  };

  if (legalRoute === 'privacy') {
    return <PrivacyPolicyPage onBack={navigateBack} />;
  }

  if (legalRoute === 'terms') {
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
            onLogout={logout}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <AppLayout headerRight={headerRight} bottomBar={<GlobalPlayer />}>
        <LibraryPage />
      </AppLayout>
      <FloatingTagSyncWidget />
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
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
