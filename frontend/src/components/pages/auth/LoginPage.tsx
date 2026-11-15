import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Disc3, Cloud, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { authApi } from '../../../api/authApi';
import { Button } from '../../atoms/Button';

export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Failed to obtain Google ID Token.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await authApi.loginWithGoogle(credentialResponse.credential);
      setAuth(res.user, res.accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was closed or failed to initialize.');
  };

  // Mock login for local development / testing without Google credentials configured
  const handleDevBypass = () => {
    setAuth(
      {
        id: 1,
        email: 'developer@musichub.local',
        displayName: 'Local Developer',
        profileImageUrl: null,
        storageUsedBytes: 0,
      },
      'dev-access-token-local',
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="p-4 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-xl shadow-indigo-500/25 text-white mb-6 animate-pulse">
          <Disc3 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Music Hub</h1>
        <p className="text-sm text-slate-400 mb-8 max-w-xs">
          Your personal cloud music locker with zero egress fees and high-fidelity streaming.
        </p>

        {/* Features highlights */}
        <div className="grid grid-cols-3 gap-2 w-full mb-8 text-xs text-slate-300">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col items-center gap-1.5">
            <Cloud className="w-4 h-4 text-indigo-400" />
            <span>R2 Storage</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Range Seek</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OIDC Auth</span>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl w-full mb-6 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Google Login Provider */}
        <div className="w-full flex justify-center mb-6">
          {isLoading ? (
            <p className="text-sm text-indigo-400">Authenticating with Music Hub...</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="pill"
              size="large"
              width="100%"
            />
          )}
        </div>

        {/* Developer Sandbox Mode Bypass */}
        <div className="pt-6 border-t border-slate-800 w-full flex flex-col items-center gap-2">
          <p className="text-[11px] text-slate-400">Testing in local development?</p>
          <Button variant="ghost" size="sm" onClick={handleDevBypass}>
            Enter Dev Sandbox
          </Button>
        </div>
      </div>
    </div>
  );
};
